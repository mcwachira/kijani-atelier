<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessMpesaCallback;
use App\Jobs\ProcessPesapalNotification;
use App\Models\Order;
use App\Models\Payment;
use App\Models\WebhookEvent;
use App\Services\Mpesa\MpesaService;
use App\Services\Pesapal\PesapalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * @group Payments
 */
class PaymentController extends Controller
{
    public function __construct(
        private MpesaService $mpesa,
        private PesapalService $pesapal,
    ) {}

    public function initiateMpesa(Request $request)
    {
        $data = $request->validate([
            'order_reference' => ['required', 'string', 'exists:orders,reference'],
            'phone' => ['required', 'string', 'regex:/^(0|\+?254)[71]\d{8}$/'],
        ]);

        $order = Order::where('reference', $data['order_reference'])->firstOrFail();
        $amount = $order->total;

        try {
            $result = $this->mpesa->stkPush(
                phone: $data['phone'],
                amount: $amount,
                accountReference: $order->reference,
                description: "Payment for order {$order->reference}",
            );
        } catch (\Throwable $e) {
            Log::warning('M-Pesa initiation failed', ['order' => $order->reference, 'error' => $e->getMessage()]);

            return response()->json(['message' => 'M-Pesa is temporarily unavailable. Please try again or pay by card.'], 503);
        }

        $payment = Payment::create([
            'order_id' => $order->id,
            'method' => 'mpesa',
            'checkout_request_id' => $result['CheckoutRequestID'],
            'amount' => $amount,
        ]);

        return response()->json([
            'message' => 'Check your phone to complete payment.',
            'payment_id' => $payment->id,
        ], 202);
    }

    public function mpesaCallback(Request $request)
    {
        $payload = $request->all();
        Log::info('M-Pesa callback received', $payload);

        $stkCallBack = $payload['Body']['stkCallback'] ?? null;

        if (! $stkCallBack) {
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Ignored']);
        }

        $checkoutRequestId = $stkCallBack['CheckoutRequestID'] ?? null;
        $resultCode = $stkCallBack['ResultCode'] ?? null;

        $payment = Payment::where('checkout_request_id', $checkoutRequestId)->first();

        if (! $payment) {
            Log::warning('M-Pesa callback for unknown checkout_request_id', ['id' => $checkoutRequestId]);
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Ignored']);
        }

        if ($payment->status !== 'pending') {
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Already processed']);
        }

        // Persist-then-queue: the raw callback is stored before anything
        // else, so even a crash mid-processing keeps the evidence. A
        // replayed delivery is marked as a duplicate and acked without
        // dispatching — the job itself stays idempotent as a second guard.
        [$webhookEvent, $created] = WebhookEvent::recordOnce(
            'mpesa',
            $checkoutRequestId,
            $payload
        );

        if (! $created) {
            $webhookEvent->mark('duplicate');

            return response()->json([
                'ResultCode' => 0,
                'ResultDesc' => 'Already received',
            ]);
        }

        // Heavy lifting happens on the queue — Safaricom gets its
        // acknowledgement immediately, the DB work follows. With a sync
        // queue driver (tests, some dev setups) this still runs inline.
        ProcessMpesaCallback::dispatch($payment->id, $stkCallBack, $payload);

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Success']);
    }

    /**
     * Initialize a Pesapal card transaction
     *
     * The customer pays on Pesapal's hosted page (cards, bank, mobile
     * money) — card details are entered there, never on this site. We
     * submit the order, store the tracking ID on a pending payment, and
     * hand the redirect URL to the frontend.
     *
     * @unauthenticated
     * @bodyParam order_reference string required Example: KJ-AB12CD
     * @bodyParam email string required Example: customer@example.com
     */
    public function initiatePesapal(Request $request)
    {
        $data = $request->validate([
            'order_reference' => ['required', 'string', 'exists:orders,reference'],
            'email' => ['required', 'email'],
        ]);

        $order = Order::where('reference', $data['order_reference'])->firstOrFail();

        if ($order->status !== 'pending') {
            return response()->json(['message' => 'This order can no longer be paid for.'], 422);
        }

        $names = preg_split('/\s+/', trim($order->customer_name), 2);

        try {
            $result = $this->pesapal->submitOrder(
            merchantReference: $order->reference . '-' . uniqid(),
            amount: $order->total,
            currency: 'KES',
            description: "Kijani Atelier order {$order->reference}",
            callbackUrl: config('pesapal.callback_url'),
            email: $data['email'],
            phone: $order->phone,
            firstName: $names[0] ?? $order->customer_name,
            lastName: $names[1] ?? '',
        );
        } catch (\App\Services\Pesapal\PesapalException $e) {
            Log::warning('Pesapal initiation failed', ['order' => $order->reference, 'error' => $e->getMessage()]);

            return response()->json(['message' => 'Card payments are temporarily unavailable. Please try again or pay with M-Pesa.'], 503);
        }

        $payment = Payment::create([
            'order_id' => $order->id,
            'method' => 'card',
            'checkout_request_id' => $result['order_tracking_id'],
            'amount' => $order->total,
        ]);

        return response()->json([
            'redirect_url' => $result['redirect_url'],
            'order_tracking_id' => $result['order_tracking_id'],
            'payment_id' => $payment->id,
        ], 202);
    }

    /**
     * Pesapal IPN endpoint.
     *
     * The IPN carries NO payment status by Pesapal's design — so this
     * only extracts the tracking ID, queues the authoritative status
     * check, and acknowledges immediately.
     *
     * @unauthenticated
     */
    public function pesapalIpn(Request $request)
    {
        $trackingId = $request->input('OrderTrackingId')
            ?? $request->input('order_tracking_id');

        if (! $trackingId) {
            return response()->json(['message' => 'Missing tracking ID.'], 400);
        }

        // Audit-only record: Pesapal re-fires the IPN when the status
        // CHANGES (e.g. INVALID → COMPLETED), so a replay must still
        // dispatch — the job re-fetches the authoritative status and its
        // guards make repeat runs safe no-ops.
        WebhookEvent::recordOnce('pesapal', $trackingId, $request->all());

        ProcessPesapalNotification::dispatch($trackingId);

        return response()->json(['received' => true]);
    }

    /**
     * Check a Pesapal transaction directly — used when the customer
     * returns from hosted checkout before the IPN has been processed.
     * Queues the same idempotent job the IPN uses, so both paths share
     * one code path and one outcome.
     *
     * @unauthenticated
     */
    public function verifyPesapal(string $trackingId)
    {
        ProcessPesapalNotification::dispatch($trackingId);

        $payment = Payment::with('order')->where('checkout_request_id', $trackingId)->first();

        return response()->json([
            'status' => $payment?->status ?? 'unknown',
            'order_status' => $payment?->order->status,
        ]);
    }

    public function status(int $paymentId)
    {
        $payment = Payment::findOrFail($paymentId);

        return response()->json([
            'status' => $payment->status,
            'order_status' => $payment->order->status,
        ]);
    }
}

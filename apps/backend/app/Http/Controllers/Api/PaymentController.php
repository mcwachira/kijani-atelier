<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Mpesa\MpesaService;
use App\Services\Paystack\PaystackService;
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
        private PaystackService $paystack,
    ) {}

    public function initiateMpesa(Request $request)
    {
        $data = $request->validate([
            'order_reference' => ['required', 'string', 'exists:orders,reference'],
            'phone' => ['required', 'string', 'regex:/^(0|\+?254)[71]\d{8}$/'],
        ]);

        $order = Order::where('reference', $data['order_reference'])->firstOrFail();
        $amount = $order->total;

        $result = $this->mpesa->stkPush(
            phone: $data['phone'],
            amount: $amount,
            accountReference: $order->reference,
            description: "Payment for order {$order->reference}",
        );

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

        DB::transaction(function () use ($payment, $stkCallBack, $resultCode, $payload) {
            if ((int) $resultCode === 0) {
                $metadata = collect($stkCallBack['CallbackMetadata']['Item'] ?? [])->pluck('Value', 'Name');
                $previousStatus = $payment->order->status;

                $payment->forceFill([
                    'status' => 'completed',
                    'provider_reference' => $metadata->get('MpesaReceiptNumber'),
                    'raw_payload' => $payload,
                ])->save();

                $payment->order->forceFill(['status' => 'paid'])->save();

                \App\Models\OrderStatusEvent::create([
                    'order_id' => $payment->order_id,
                    'actor_id' => null,
                    'from_status' => $previousStatus,
                    'to_status' => 'paid',
                    'note' => 'Paid via M-Pesa (' . $metadata->get('MpesaReceiptNumber') . ')',
                    'actor' => 'M-Pesa',
                ]);
            } else {
                $payment->forceFill(['status' => 'failed', 'raw_payload' => $payload])->save();
            }
        });

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Success']);
    }

    /**
     * Initialize a Paystack transaction
     *
     * @unauthenticated
     * @bodyParam order_reference string required Example: KJ-AB12CD
     * @bodyParam email string required Example: customer@example.com
     */
    public function initiatePaystack(Request $request)
    {
        $data = $request->validate([
            'order_reference' => ['required', 'string', 'exists:orders,reference'],
            'email' => ['required', 'email'],
        ]);

        $order = Order::where('reference', $data['order_reference'])->firstOrFail();
        $amount = $order->total;

        $result = $this->paystack->initialize(
            email: $data['email'],
            amountInSmallestUnit: $amount * 100,
            reference: $order->reference . '-' . uniqid(),
            callbackUrl: config('services.paystack.callback_url'),
            metadata: ['order_reference' => $order->reference],
        );

        $payment = Payment::create([
            'order_id' => $order->id,
            'method' => 'card',
            'checkout_request_id' => $result['reference'],
            'amount' => $amount,
        ]);

        return response()->json([
            'authorization_url' => $result['authorization_url'],
            'reference' => $result['reference'],
            'payment_id' => $payment->id,
        ], 202);
    }


    /**
     * Paystack webhook
     *
     * @unauthenticated
     */
    public function paystackWebhook(Request $request)
    {
        if (! $this->paystack->verifyWebhookSignature($request->getContent(), $request->header('X-Paystack-Signature'))) {
            Log::warning('Invalid Paystack webhook signature');
            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $event = $request->input('event');
        $data = $request->input('data');

        if ($event === 'charge.success') {
            $payment = Payment::where('checkout_request_id', $data['reference'])->first();

            if ($payment && $payment->status === 'pending') {
                DB::transaction(function () use ($payment, $data, $request) {
                    $previousStatus = $payment->order->status;

                    $payment->forceFill([
                        'status' => 'completed',
                        'provider_reference' => $data['id'],
                        'raw_payload' => $request->all(),
                    ])->save();

                    $payment->order->forceFill(['status' => 'paid'])->save();

                    \App\Models\OrderStatusEvent::create([
                        'order_id' => $payment->order_id,
                        'actor_id' => null,
                        'from_status' => $previousStatus,
                        'to_status' => 'paid',
                        'note' => 'Paid via card (Paystack ref: ' . $data['reference'] . ')',
                        'actor' => 'Paystack',
                    ]);
                });
            }
        } elseif ($event === 'charge.failed') {
            $payment = Payment::where('checkout_request_id', $data['reference'] ?? null)->first();
            $payment?->forceFill(['status' => 'failed', 'raw_payload' => $request->all()])->save();
        }

        return response()->json(['received' => true]);
    }


    /**
     * Verify a transaction directly
     *
     * @unauthenticated
     */
    public function verifyPaystack(string $reference)
    {
        $data = $this->paystack->verify($reference);

        $payment = Payment::where('checkout_request_id', $reference)->first();

        if ($payment && $data['status'] === 'success' && $payment->status === 'pending') {
            DB::transaction(function () use ($payment, $data) {
                $payment->forceFill([
                    'status' => 'completed',
                    'provider_reference' => $data['id'],
                    'raw_payload' => $data,
                ])->save();

                $payment->order->forceFill(['status' => 'paid'])->save();
            });
        }

        return response()->json([
            'status' => $payment?->status ?? $data['status'],
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

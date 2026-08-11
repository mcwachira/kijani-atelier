<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Mpesa\MpesaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * @group Payments
 */
class PaymentController extends Controller
{
    public function __construct(private MpesaService $mpesa) {}

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

                // forceFill, not update() — status/provider_reference/
                // raw_payload are deliberately NOT in Payment::$fillable
                // (same pattern as Order's status/total, Message's unread)
                // so they can only ever be set by trusted server-side code
                // like this callback handler, never by a client request.
                // Plain update() would silently drop all three fields.
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

    public function status(int $paymentId)
    {
        $payment = Payment::findOrFail($paymentId);

        return response()->json([
            'status' => $payment->status,
            'order_status' => $payment->order->status,
        ]);
    }
}

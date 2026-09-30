<?php

namespace App\Jobs;

use App\Models\OrderStatusEvent;
use App\Models\Payment;
use App\Models\WebhookEvent;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Applies an M-Pesa STK callback to its payment + order.
 *
 * The HTTP endpoint acknowledges Safaricom immediately and dispatches
 * this job — slow DB work and any future notification fan-out never
 * block the webhook response. All guards are idempotent: a duplicate
 * or late callback changes nothing twice.
 */
class ProcessMpesaCallback implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function backoff(): array
    {
        return [30, 120, 600];
    }

    public function __construct(
        public int $paymentId,
        public array $stkCallback,
        public array $rawPayload,
    ) {
    }

    public function handle(): void
    {
        // Fast exit before touching the database transaction — already-
        // processed callbacks return immediately. This is NOT the
        // concurrency guarantee; the lock + re-check inside the
        // transaction below is.
        $existing = Payment::find($this->paymentId, ['id', 'status']);

        if (! $existing || $existing->status !== 'pending') {
            return;
        }

        $resultCode = $this->stkCallback['ResultCode'] ?? null;

        try {
            // The authoritative state decision happens here, on freshly
            // locked rows, so two workers racing on the same callback
            // can't both transition the payment.
            DB::transaction(function () use ($resultCode) {
            $payment = Payment::with('order')->lockForUpdate()->find($this->paymentId);

            if (! $payment || $payment->status !== 'pending') {
                return;
            }

            $order = $payment->order()->lockForUpdate()->first();

            if ((int) $resultCode === 0) {
                // The order may have been cancelled (and its stock
                // released) while the customer was still entering their
                // PIN — a late success must never resurrect it into
                // 'paid'. The money is real, so log loudly for manual
                // reconciliation instead of silently applying it.
                if (! $order || $order->status !== 'pending') {
                    Log::warning('M-Pesa success callback for non-pending order — needs manual reconciliation', [
                        'order_id' => $payment->order_id,
                        'order_status' => $order?->status,
                    ]);

                    return;
                }

                $metadata = collect($this->stkCallback['CallbackMetadata']['Item'] ?? [])->pluck('Value', 'Name');
                $previousStatus = $order->status;

                $payment->forceFill([
                    'status' => 'completed',
                    'provider_reference' => $metadata->get('MpesaReceiptNumber'),
                    'raw_payload' => $this->rawPayload,
                ])->save();

                $order->forceFill(['status' => 'paid'])->save();

                OrderStatusEvent::create([
                    'order_id' => $payment->order_id,
                    'actor_id' => null,
                    'from_status' => $previousStatus,
                    'to_status' => 'paid',
                    'note' => 'Paid via M-Pesa (' . $metadata->get('MpesaReceiptNumber') . ')',
                    'actor' => 'M-Pesa',
                ]);
            } else {
                $payment->forceFill(['status' => 'failed', 'raw_payload' => $this->rawPayload])->save();
            }
            });

            WebhookEvent::where('provider', 'mpesa')
                ->where('event_id', $this->stkCallback['CheckoutRequestID'] ?? '')
                ->first()?->mark('processed');
        } catch (\Throwable $e) {
            WebhookEvent::where('provider', 'mpesa')
                ->where('event_id', $this->stkCallback['CheckoutRequestID'] ?? '')
                ->first()?->mark('failed', $e->getMessage());
            throw $e;
        }
    }

    /**
     * Last resort: all retries exhausted. The callback payload is already
     * persisted on webhook_events, so nothing is lost — this just makes
     * the failure visible for manual follow-up instead of silent.
     */
    public function failed(\Throwable $e): void
    {
        WebhookEvent::where('provider', 'mpesa')
            ->where('event_id', $this->stkCallback['CheckoutRequestID'] ?? '')
            ->first()?->mark('failed', $e->getMessage());
    }
}

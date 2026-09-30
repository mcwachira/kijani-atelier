<?php

namespace App\Jobs;

use App\Models\OrderStatusEvent;
use App\Models\Payment;
use App\Models\WebhookEvent;
use App\Services\Pesapal\PesapalService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Applies a Pesapal IPN/callback to its payment + order.
 *
 * Pesapal's IPN and customer callback carry NO status by design — so
 * this job always fetches the authoritative status via
 * GetTransactionStatus before touching anything. Idempotent: only a
 * pending payment on a pending order transitions, exactly once.
 */
class ProcessPesapalNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function backoff(): array
    {
        return [30, 120, 600];
    }

    public function __construct(public string $orderTrackingId)
    {
    }

    public function handle(PesapalService $pesapal): void
    {
        // Fast exit before the network call — already-processed
        // notifications never reach Pesapal's API. This is NOT the
        // concurrency guarantee; the lock + re-check inside the
        // transaction below is.
        $existing = Payment::where('checkout_request_id', $this->orderTrackingId)->first(['id', 'status']);

        if (! $existing || $existing->status !== 'pending') {
            return;
        }

        try {
            $status = $pesapal->getTransactionStatus($this->orderTrackingId);
        } catch (\Throwable $e) {
            WebhookEvent::where('provider', 'pesapal')
                ->where('event_id', $this->orderTrackingId)
                ->first()?->mark('failed', $e->getMessage());
            throw $e;
        }

        $code = (int) ($status['status_code'] ?? 0);

        // The status fetch above runs OUTSIDE the transaction on purpose —
        // a network call must never hold database locks. The authoritative
        // state decision happens here, on freshly locked rows, so two
        // workers racing on the same notification can't both transition.
        DB::transaction(function () use ($status, $code) {
            $payment = Payment::with('order')
                ->where('checkout_request_id', $this->orderTrackingId)
                ->lockForUpdate()
                ->first();

            if (! $payment || $payment->status !== 'pending') {
                return;
            }

            $order = $payment->order()->lockForUpdate()->first();

            if ($code === PesapalService::STATUS_COMPLETED) {
                if (! $order || $order->status !== 'pending') {
                    Log::warning('Pesapal success for non-pending order — needs manual reconciliation', [
                        'order_id' => $payment->order_id,
                        'order_status' => $order?->status,
                    ]);

                    return;
                }

                $previousStatus = $order->status;

                $payment->forceFill([
                    'status' => 'completed',
                    'provider_reference' => $status['confirmation_code'] ?? $this->orderTrackingId,
                    'raw_payload' => $status,
                ])->save();

                $order->forceFill(['status' => 'paid'])->save();

                OrderStatusEvent::create([
                    'order_id' => $payment->order_id,
                    'actor_id' => null,
                    'from_status' => $previousStatus,
                    'to_status' => 'paid',
                    'note' => 'Paid via card (Pesapal ' . $this->orderTrackingId . ')',
                    'actor' => 'Pesapal',
                ]);
            } elseif (in_array($code, [2, 3], true)) {
                $payment->forceFill(['status' => 'failed', 'raw_payload' => $status])->save();
            }
            // Code 0 (INVALID / still processing): leave pending so
            // polling and reconciliation can check again later.
        });

        WebhookEvent::where('provider', 'pesapal')
            ->where('event_id', $this->orderTrackingId)
            ->first()?->mark('processed');
    }

    /**
     * Last resort: all retries exhausted. The notification is already
     * persisted on webhook_events, so nothing is lost — this just makes
     * the failure visible for manual follow-up instead of silent.
     */
    public function failed(\Throwable $e): void
    {
        WebhookEvent::where('provider', 'pesapal')
            ->where('event_id', $this->orderTrackingId)
            ->first()?->mark('failed', $e->getMessage());
    }
}

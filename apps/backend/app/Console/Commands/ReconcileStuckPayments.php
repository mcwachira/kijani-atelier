<?php

namespace App\Console\Commands;

use App\Jobs\ProcessMpesaCallback;
use App\Jobs\ProcessPesapalNotification;
use App\Models\Payment;
use Illuminate\Console\Command;

/**
 * Finds payments stuck in a pending state past the grace window and
 * re-drives their authoritative verification:
 *
 * - card (Pesapal) payments → re-dispatch the status-check job, which
 *   fetches GetTransactionStatus and applies the outcome idempotently.
 * - mpesa payments → logged for manual follow-up. Daraja's
 *   TransactionStatus query API requires a separate queue-timeout setup
 *   and shortcode configuration beyond STK push, so automatic
 *   re-querying is intentionally NOT attempted here — the callback job
 *   plus order expiry already bound the risk window.
 *
 * Safe to run every few minutes: every path it triggers is idempotent.
 */
class ReconcileStuckPayments extends Command
{
    protected $signature = 'payments:reconcile {--minutes=30 : Re-check pending payments older than this}';

    protected $description = 'Re-verify payments stuck pending past the grace window.';

    public function handle(): int
    {
        $cutoff = now()->subMinutes((int) $this->option('minutes'));

        $stuck = Payment::with('order')
            ->where('status', 'pending')
            ->where('created_at', '<', $cutoff)
            ->whereHas('order', fn ($q) => $q->where('status', 'pending'))
            ->get();

        $redispatched = 0;

        foreach ($stuck as $payment) {
            if ($payment->method === 'card') {
                ProcessPesapalNotification::dispatch($payment->checkout_request_id);
                $redispatched++;
            } else {
                $this->warn("M-Pesa payment {$payment->id} (order {$payment->order->reference}) still pending — needs manual Daraja follow-up.");
            }
        }

        $this->info("Reconciled {$redispatched} card payment(s), {$stuck->count()} stuck total.");

        return self::SUCCESS;
    }
}

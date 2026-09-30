<?php

namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;

/**
 * Cancel pending orders older than the reservation TTL and release
 * their stock. Each cancellation funnels through
 * Order::cancelAndRestoreStock(), so stock is restored exactly once
 * per order even if this command overlaps with itself.
 */
class ExpireStaleOrders extends Command
{
    protected $signature = 'orders:expire-stale';

    protected $description = 'Cancel unpaid orders past the reservation TTL and release their stock.';

    public function handle(): int
    {
        $cutoff = now()->subMinutes((int) config('orders.pending_ttl_minutes'));

        $stale = Order::with('items')
            ->where('status', 'pending')
            ->where('created_at', '<', $cutoff)
            ->get();

        foreach ($stale as $order) {
            $order->cancelAndRestoreStock(
                'System',
                'Auto-cancelled: payment not completed within the reservation window — stock released.'
            );
        }

        $this->info("Expired {$stale->count()} stale order(s).");

        return self::SUCCESS;
    }
}

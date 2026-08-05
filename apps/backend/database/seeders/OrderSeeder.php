<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusEvent;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    /**
     * Generates 14 fake orders cycling through every possible status
     * (pending → paid → shipped → delivered → cancelled), each with one
     * order item and a full status history — mirroring the
     * statusHistory() generator from the original mock data.
     */
    public function run(): void
    {
        // Guard against duplicate runs. Unlike ProductSeeder (which can key
        // off a unique slug) or Review/MessageSeeder (which check per-row),
        // there's no clean natural key here to dedupe against — so we just
        // skip entirely if ANY orders already exist.
        if (Order::count() > 0) {
            return; // already seeded — skip so re-running doesn't duplicate 14 more orders
        }

        $counties = ['Nairobi','Mombasa','Kisumu','Nakuru','Kiambu','Machakos','Eldoret'];
        $towns = ['Westlands','Nyali','Milimani','Naka','Ruaka','Mlolongo','Kapsoya'];
        // The full status cycle, including terminal states, used to pick
        // each order's FINAL status (order #0 = pending, #1 = paid, ... #4
        // = cancelled, #5 = pending again, and so on).
        $statusSequence = ['pending','paid','shipped','delivered','cancelled'];
        // The "happy path" progression, used to reconstruct which
        // intermediate statuses an order passed through on its way to
        // its final status (a "shipped" order must have been pending
        // and paid first).
        $orderPath = ['pending','paid','shipped','delivered'];

        $products = Product::all();
        $customers = User::where('role', 'customer')->get();
        $admin = User::where('role', 'admin')->first();

        foreach (range(0, 13) as $i) {
            $product = $products[$i % $products->count()];
            $qty = 1 + ($i % 3);
            $status = $statusSequence[$i % count($statusSequence)];
            // Grab whatever size this product supports, if any (kiondos/bags
            // have none, so this will be null for those — same as the mock).
            $size = $product->sizes()->first()?->value;

            // Every 3rd order (i % 3 === 0) is a GUEST checkout — no account
            // attached. This models a real storefront where not every buyer
            // registers. Adjust this ratio if you want more/fewer guest orders.
            $customer = $i % 3 === 0 ? null : $customers[$i % $customers->count()];

            // Build the order in one go — fill() for fillable fields,
            // forceFill() for status/total, ONE save() at the end. This
            // avoids the not-null violation you just hit: total has no
            // default in the migration, so create()-then-forceFill()->save()
            // fails on the first INSERT before forceFill ever runs.
            $order = new Order();

            $order->fill([
                'user_id' => $customer?->id,
                'reference' => 'KJ-' . (2600 + $i),
                'customer_name' => $customer->name ?? $customers[$i % $customers->count()]->name,
                'email' => $customer->email ?? 'guest@example.com',
                'phone' => '+254 7xx xxx xxx',
                'county' => $counties[$i % count($counties)],
                'town' => $towns[$i % count($towns)],
                'address' => 'P.O. Box 1123',
                'payment_method' => $i % 3 === 0 ? 'card' : 'mpesa',
            ]);

            $order->forceFill([
                'status' => $status,
                'total' => $product->price * $qty,
            ]);

            $order->save();

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'price' => $product->price,
                'quantity' => $qty,
                'size' => $size,
            ]);

            $chain = $status === 'cancelled' ? ['pending', 'cancelled']
                : array_slice($orderPath, 0, array_search($status, $orderPath) + 1);

            foreach ($chain as $index => $to) {
                OrderStatusEvent::create([
                    'order_id' => $order->id,
                    'actor_id' => $index === 0 ? null : $admin->id,
                    'from_status' => $index === 0 ? null : $chain[$index - 1],
                    'to_status' => $to,
                    'note' => $index === 0
                        ? 'Order placed by customer.'
                        : ($to === 'cancelled' ? 'Cancelled before dispatch.' : "Marked {$to}."),
                    'actor' => $index === 0 ? 'System' : 'Admin',
                    'created_at' => now()->subHours(13 - $i)->addHours($index * 10),
                ]);
            }
        }
    }
}

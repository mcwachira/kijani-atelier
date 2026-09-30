<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;

function placeReservedOrder(Product $product, int $quantity): Order
{
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();
    OrderItem::create([
        'order_id' => $order->id,
        'product_id' => $product->id,
        'product_name' => $product->name,
        'price' => $product->price,
        'quantity' => $quantity,
        'size' => null,
    ]);
    $product->decrement('stock', $quantity);

    return $order->fresh();
}

it('restores stock when an admin cancels a pending order', function () {
    [, $adminToken] = actingAsAdmin();
    $product = Product::factory()->create(['stock' => 10]);
    $order = placeReservedOrder($product, 2);

    expect($product->fresh()->stock)->toBe(8);

    $this->withHeader('Authorization', "Bearer {$adminToken}")
        ->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'cancelled'])
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'cancelled');

    expect($product->fresh()->stock)->toBe(10);
    $this->assertDatabaseHas('order_status_events', [
        'order_id' => $order->id,
        'to_status' => 'cancelled',
    ]);
});

it('expires stale pending orders and releases their stock', function () {
    config(['orders.pending_ttl_minutes' => 120]);
    $product = Product::factory()->create(['stock' => 10]);
    $stale = placeReservedOrder($product, 2);
    // Backdate past the TTL without touching anything else.
    Order::where('id', $stale->id)->update(['created_at' => now()->subHours(3)]);

    $fresh = placeReservedOrder($product, 1);

    $this->artisan('orders:expire-stale')->assertSuccessful();

    expect($stale->fresh()->status)->toBe('cancelled');
    expect($fresh->fresh()->status)->toBe('pending');
    // 10 - 2 - 1 + 2 (stale released) = 9.
    expect($product->fresh()->stock)->toBe(9);
});

it('ignores a late payment success for an already-cancelled order', function () {
    $product = Product::factory()->create(['stock' => 10]);
    $order = placeReservedOrder($product, 2);
    $order->cancelAndRestoreStock('System', 'test cancel');

    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'method' => 'mpesa',
        'checkout_request_id' => 'ws_CO_late1',
    ]);
    $payment->forceFill(['status' => 'pending'])->save();

    $this->postJson('/api/v1/payments/mpesa/callback', [
        'Body' => [
            'stkCallback' => [
                'CheckoutRequestID' => 'ws_CO_late1',
                'ResultCode' => 0,
                'ResultDesc' => 'Success',
                'CallbackMetadata' => [
                    'Item' => [
                        ['Name' => 'Amount', 'Value' => $order->total],
                        ['Name' => 'MpesaReceiptNumber', 'Value' => 'LATE123'],
                        ['Name' => 'PhoneNumber', 'Value' => 254712345678],
                    ],
                ],
            ],
        ],
    ])->assertStatus(200);

    // Order must NOT resurrect into paid; stock stays released.
    expect($order->fresh()->status)->toBe('cancelled');
    expect($payment->fresh()->status)->toBe('pending');
    expect($product->fresh()->stock)->toBe(10);
});

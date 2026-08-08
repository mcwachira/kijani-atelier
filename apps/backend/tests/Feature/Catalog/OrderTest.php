<?php

use App\Models\Order;
use App\Models\Product;
use App\Models\User;

it('lets a guest check out without an account', function () {
    $product = Product::factory()->create(['price' => 5000, 'stock' => 10]);

    $response = $this->postJson('/api/v1/orders', [
        'name' => 'Wanjiru Kamau',
        'email' => 'wanjiru@example.com',
        'phone' => '+254700000000',
        'county' => 'Nairobi',
        'town' => 'Westlands',
        'address' => 'P.O. Box 1123',
        'payment_method' => 'mpesa',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 2],
        ],
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.total', 10000) // price * quantity, computed server-side
        ->assertJsonCount(1, 'data.items')
        ->assertJsonCount(1, 'data.status_history');

    $this->assertDatabaseHas('orders', ['user_id' => null, 'email' => 'wanjiru@example.com']);
});

it('decrements product stock after checkout', function () {
    $product = Product::factory()->create(['stock' => 10]);

    $this->postJson('/api/v1/orders', [
        'name' => 'Test Customer', 'email' => 'test@example.com', 'phone' => '+254700000000',
        'county' => 'Nairobi', 'town' => 'Westlands', 'address' => 'P.O. Box 1',
        'payment_method' => 'mpesa',
        'items' => [['product_id' => $product->id, 'quantity' => 3]],
    ]);

    expect($product->fresh()->stock)->toBe(7);
});

it('rejects checkout when requested quantity exceeds available stock', function () {
    $product = Product::factory()->create(['stock' => 2]);

    $response = $this->postJson('/api/v1/orders', [
        'name' => 'Test Customer', 'email' => 'test@example.com', 'phone' => '+254700000000',
        'county' => 'Nairobi', 'town' => 'Westlands', 'address' => 'P.O. Box 1',
        'payment_method' => 'mpesa',
        'items' => [['product_id' => $product->id, 'quantity' => 5]],
    ]);

    $response->assertStatus(422);

    // Stock must remain UNCHANGED — proves the transaction rolled back
    // cleanly rather than partially decrementing before failing.
    expect($product->fresh()->stock)->toBe(2);
    $this->assertDatabaseCount('orders', 0);
});

it('never trusts a client-supplied price — total is computed from the real product price', function () {
    // This directly tests the security property described in
    // CheckoutRequest's comments: 'items' never accepts a price field at
    // all, so there's nothing here to "send a fake price" WITH — but we
    // confirm the resulting total matches the DB price regardless.
    $product = Product::factory()->create(['price' => 9999]);

    $response = $this->postJson('/api/v1/orders', [
        'name' => 'Test Customer', 'email' => 'test@example.com', 'phone' => '+254700000000',
        'county' => 'Nairobi', 'town' => 'Westlands', 'address' => 'P.O. Box 1',
        'payment_method' => 'mpesa',
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
    ]);

    $response->assertJsonPath('data.total', 9999);
});

it('clears the cart after a logged-in user checks out', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $product = Product::factory()->create(['stock' => 10]);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/cart', ['product_id' => $product->id, 'quantity' => 2]);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/orders', [
            'name' => $user->name, 'email' => $user->email, 'phone' => '+254700000000',
            'county' => 'Nairobi', 'town' => 'Westlands', 'address' => 'P.O. Box 1',
            'payment_method' => 'mpesa',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ]);

    $cartResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/cart');

    $cartResponse->assertJsonCount(0, 'data.items');
});

it('looks up an order by reference publicly, with no login required', function () {
    $order = Order::factory()->create(['reference' => 'KJ-TESTREF']);

    $this->getJson('/api/v1/orders/KJ-TESTREF')
        ->assertStatus(200)
        ->assertJsonPath('data.reference', 'KJ-TESTREF');
});

it('lets a logged-in user list their own orders only', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    Order::factory()->count(2)->create(['user_id' => $user->id]);
    Order::factory()->count(3)->create(); // someone else's orders

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/my-orders');

    $response->assertJsonCount(2, 'data');
});

it('rejects non-admin access to the admin orders list', function () {
    [, $token] = actingAsCustomer();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/admin/orders')
        ->assertStatus(403);
});

it('lets an admin update an order status and records a status event', function () {
    [, $adminToken] = actingAsAdmin();
    $order = Order::factory()->create();
    $order->forceFill(['status' => 'pending'])->save();

    $response = $this->withHeader('Authorization', "Bearer {$adminToken}")
        ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'paid',
            'note' => 'Payment confirmed via M-Pesa.',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'paid');

    $this->assertDatabaseHas('order_status_events', [
        'order_id' => $order->id,
        'from_status' => 'pending',
        'to_status' => 'paid',
    ]);
});

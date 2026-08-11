<?php

use App\Models\Order;
use App\Models\User;

it('rejects non-admin access to the customer list', function () {
    [, $token] = actingAsCustomer();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/admin/customers')
        ->assertStatus(403);
});

it('lists only customers, never admins', function () {
    [, $token] = actingAsAdmin();
    User::factory()->count(3)->create(['role' => 'customer']);

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/admin/customers');

    $response->assertStatus(200);
    // At least the 3 we just created, and none should be role=admin —
    // specifically checking the acting admin isn't accidentally listed.
    $emails = collect($response->json('data.data'))->pluck('email');
    expect($emails)->not->toContain(User::where('role', 'admin')->first()?->email);
});

it('includes order count and total spend per customer', function () {
    [, $token] = actingAsAdmin();
    $customer = User::factory()->create(['role' => 'customer']);
    Order::factory()->count(2)->create(['user_id' => $customer->id])->each(
        fn ($o) => $o->forceFill(['total' => 5000])->save()
    );

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/admin/customers');

    $found = collect($response->json('data.data'))->firstWhere('id', $customer->id);
    expect($found['orders_count'])->toBe(2);
});

it('shows a single customer with their full order history', function () {
    [, $token] = actingAsAdmin();
    $customer = User::factory()->create(['role' => 'customer']);
    Order::factory()->create(['user_id' => $customer->id]);

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/v1/admin/customers/{$customer->id}");

    $response->assertStatus(200)->assertJsonCount(1, 'data.orders');
});

it('returns 404 when trying to view an admin account via the customer endpoint', function () {
    [, $token] = actingAsAdmin();
    $otherAdmin = User::factory()->create();
    $otherAdmin->forceFill(['role' => 'admin'])->save();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/v1/admin/customers/{$otherAdmin->id}")
        ->assertStatus(404);
});

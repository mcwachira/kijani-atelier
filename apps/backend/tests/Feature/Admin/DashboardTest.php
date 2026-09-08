<?php

use App\Models\Order;

it('rejects non-admin access to dashboard stats', function () {
    [, $token] = actingAsCustomer();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/admin/dashboard/stats')
        ->assertStatus(403);
});

it('rejects guest access entirely', function () {
    $this->getJson('/api/v1/admin/dashboard/stats')->assertStatus(401);
});

it('returns dashboard stats computed from real order data', function () {
    [, $token] = actingAsAdmin();

    Order::factory()->create(['status' => 'paid'])->forceFill(['total' => 5000])->save();
    Order::factory()->create(['status' => 'paid'])->forceFill(['total' => 3000])->save();
    // Cancelled orders should NOT count toward total_sales
    Order::factory()->create(['status' => 'cancelled'])->forceFill(['total' => 9999])->save();

    // Two real customers, distinct from the admin acting here — proves
    // customers_count only counts role=customer users, and that the key
    // is spelled exactly as the frontend reads it (a mismatch here once
    // shipped a silently-blank "Customers" tile on the admin dashboard).
    \App\Models\User::factory()->count(2)->create(['role' => 'customer']);

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/admin/dashboard/stats');


    $response->assertStatus(200);
    expect($response->json('data.total_sales'))->toBe(8000); // 5000 + 3000, cancelled excluded
    expect($response->json('data.orders_count'))->toBe(3); // count includes ALL orders, per current implementation
    expect($response->json('data.customers_count'))->toBe(2); // admin excluded, only role=customer counted
});

it('returns sales analytics filtered by region', function () {
    [, $token] = actingAsAdmin();

    Order::factory()->create(['county' => 'Nairobi', 'status' => 'paid'])->forceFill(['total' => 4000])->save();
    Order::factory()->create(['county' => 'Mombasa', 'status' => 'paid'])->forceFill(['total' => 2000])->save();

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/admin/analytics/sales?region=Nairobi');

    $response->assertStatus(200);
    $regions = collect($response->json('data.by_region'))->pluck('region');
    expect($regions)->toContain('Nairobi');
    expect($regions)->not->toContain('Mombasa');
});

it('includes monthly revenue in sales analytics', function () {
    [, $token] = actingAsAdmin();

    Order::factory()->create(['status' => 'paid'])->forceFill(['total' => 5000])->save();

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/admin/analytics/sales');

    $response->assertStatus(200);
    expect($response->json('data.by_month'))->not->toBeEmpty();
    expect($response->json('data.by_month.0'))->toHaveKeys(['month', 'revenue']);
});

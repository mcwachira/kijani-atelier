<?php

use App\Models\Size;

it('lists all sizes', function () {
    Size::factory()->create(['value' => '38']);
    Size::factory()->create(['value' => '39']);

    $this->getJson('/api/v1/sizes')
        ->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('lets an admin add a size', function () {
    [, $token] = actingAsAdmin();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/sizes', ['value' => '42'])
        ->assertStatus(201);

    $this->assertDatabaseHas('sizes', ['value' => '42']);
});

it('rejects a duplicate size value', function () {
    [, $token] = actingAsAdmin();
    Size::factory()->create(['value' => '38']);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/sizes', ['value' => '38'])
        ->assertStatus(422);
});

it('rejects size creation from a non-admin', function () {
    [, $token] = actingAsCustomer();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/sizes', ['value' => '42'])
        ->assertStatus(403);
});

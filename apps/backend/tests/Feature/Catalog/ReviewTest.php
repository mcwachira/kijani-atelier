<?php

use App\Models\Product;
use App\Models\Review;
use App\Models\User;

it('lists reviews for a product publicly', function () {
    $product = Product::factory()->create();
    Review::factory()->count(3)->create(['product_id' => $product->id]);

    $this->getJson("/api/v1/products/{$product->id}/reviews")
        ->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('rejects review submission from a guest', function () {
    $product = Product::factory()->create();

    $this->postJson("/api/v1/products/{$product->id}/reviews", [
        'rating' => 5,
        'body' => 'Great product, would buy again.',
    ])->assertStatus(401);
});

it('lets a logged-in user submit a review', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $product = Product::factory()->create();

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/products/{$product->id}/reviews", [
            'rating' => 5,
            'body' => 'Great product, would buy again.',
        ]);

    $response->assertStatus(201)
        // author comes from the LOGGED-IN USER'S name, not client input —
        // proves that field can't be spoofed to impersonate someone else.
        ->assertJsonPath('data.author', $user->name);
});

it('rejects a review with a rating outside 1-5', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $product = Product::factory()->create();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/products/{$product->id}/reviews", [
            'rating' => 6,
            'body' => 'This rating is out of range.',
        ])->assertStatus(422);
});

it('rejects a review body that is too short', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $product = Product::factory()->create();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/products/{$product->id}/reviews", [
            'rating' => 5,
            'body' => 'Too short',
        ])->assertStatus(422);
});

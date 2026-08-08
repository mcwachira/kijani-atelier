<?php

use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;

it('rejects wishlist access from a guest — login required', function () {
    $this->getJson('/api/v1/wishlist')->assertStatus(401);
});

it('lets a logged-in user add a product to their wishlist', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $product = Product::factory()->create();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/wishlist', ['product_id' => $product->id])
        ->assertStatus(201);

    $this->assertDatabaseHas('wishlist_items', ['user_id' => $user->id, 'product_id' => $product->id]);
});

it('is idempotent — adding the same product twice does not duplicate it', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $product = Product::factory()->create();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

    expect(WishlistItem::where('user_id', $user->id)->count())->toBe(1);
});

it('lets a user remove their own wishlist item', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $item = WishlistItem::factory()->create(['user_id' => $user->id]);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/v1/wishlist/{$item->id}")
        ->assertStatus(200);

    $this->assertDatabaseMissing('wishlist_items', ['id' => $item->id]);
});

it('prevents removing another user\'s wishlist item', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $intruderToken = $intruder->createToken('t')->plainTextToken;
    $item = WishlistItem::factory()->create(['user_id' => $owner->id]);

    $this->withHeader('Authorization', "Bearer {$intruderToken}")
        ->deleteJson("/api/v1/wishlist/{$item->id}")
        ->assertStatus(404);
});

it('syncs a guest wishlist into the account on login', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $products = Product::factory()->count(2)->create();

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/wishlist/sync', [
            'items' => [
                ['product_id' => $products[0]->id],
                ['product_id' => $products[1]->id, 'size' => '38'],
            ],
        ]);

    $response->assertStatus(200)->assertJsonCount(2, 'data');
});

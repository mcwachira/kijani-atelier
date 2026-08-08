<?php

use App\Models\Cart;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Str;

it('lets a guest add a product to the cart using X-Cart-Token', function () {

    $product = Product::factory()->create();
    $token = Str::uuid()->toString();

    $response = $this->withHeader('X-Cart-Token', $token)
        ->postJson("/api/v1/cart", ['product_id' => $product->id, 'quantity' => 2]);

    $response->assertStatus(201)
    ->assertJsonCount(1, 'data.items')
    ->assertJsonPath('data.items.0.quantity', 2);

    // Confirms a real Cart row was created and correctly keyed by the
    // guest_token — not just that the API responded with something plausible.
    $this->assertDatabaseHas('carts', ['guest_token' => $token]);
});

it('rejects a guest cart request with a malformed token', function () {
    $product = Product::factory()->create();

    $this->withHeader('X-Cart-Token', 'not-a-real-uuid')
        ->postJson('/api/v1/cart', ['product_id' => $product->id])
        ->assertStatus(422);
});

it('rejects adding to cart with no token and no login at all', function () {
    $product = Product::factory()->create();

    $this->postJson('/api/v1/cart', ['product_id' => $product->id])
        ->assertStatus(422);
});

it('increments quantity instead of duplicating when the same product+size is added twice', function () {
    $product = Product::factory()->create();
    $token = Str::uuid()->toString();

    $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart', ['product_id' => $product->id, 'quantity' => 1]);

    $response = $this->withHeader('X-Cart-Token', $token)
        ->postJson('/api/v1/cart', ['product_id' => $product->id, 'quantity' => 2]);

    // ONE line item, quantity summed to 3 — not two separate rows.
    $response->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.quantity', 3);
});

it('lets a logged-in user add to their own cart without any token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;
    $product = Product::factory()->create();

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/cart', ['product_id' => $product->id]);




    $response->assertStatus(201);
    $this->assertDatabaseHas('carts', ['user_id' => $user->id]);
});


it('lets a user update a cart item quantity', function () {
    $user = User::factory()->create();
    $authToken = $user->createToken('t')->plainTextToken;
    $cart = Cart::factory()->create(['user_id' => $user->id, 'guest_token' => null]);
    $item = $cart->items()->create(['product_id' => Product::factory()->create()->id, 'quantity' => 1]);


    $response = $this->withHeader('Authorization', "Bearer {$authToken}")
        ->putJson("/api/v1/cart/{$item->id}", ['quantity' => 5]);



    $response->assertStatus(200)
        ->assertJsonPath('data.items.0.quantity', 5);
});

it('prevents one user from modifying another user\'s cart item', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $intruderToken = $intruder->createToken('t')->plainTextToken;

    $cart = Cart::factory()->create(['user_id' => $owner->id, 'guest_token' => null]);
    $item = $cart->items()->create(['product_id' => Product::factory()->create()->id, 'quantity' => 1]);

    // This is the real security-relevant test — proves the ownership
    // check in CartController::update() actually blocks cross-user access.
    $this->withHeader('Authorization', "Bearer {$intruderToken}")
        ->putJson("/api/v1/cart/{$item->id}", ['quantity' => 99])
        ->assertStatus(404);
});

it('removes an item from the cart', function () {
    $user = User::factory()->create();
    $authToken = $user->createToken('t')->plainTextToken;
    $cart = Cart::factory()->create(['user_id' => $user->id, 'guest_token' => null]);
    $item = $cart->items()->create(['product_id' => Product::factory()->create()->id, 'quantity' => 1]);

    $this->withHeader('Authorization', "Bearer {$authToken}")
        ->deleteJson("/api/v1/cart/{$item->id}")
        ->assertStatus(200)
        ->assertJsonCount(0, 'data.items');
});

it('merges a guest cart into the logged-in user\'s cart on login', function () {
    $user = User::factory()->create();
    $authToken = $user->createToken('t')->plainTextToken;
    $guestToken = Str::uuid()->toString();
    $product = Product::factory()->create();

    $this->withHeader('X-Cart-Token', $guestToken)
        ->postJson('/api/v1/cart', ['product_id' => $product->id, 'quantity' => 2]);

    $response = $this->withHeader('Authorization', "Bearer {$authToken}")
        ->withHeader('X-Cart-Token', $guestToken)
        ->postJson('/api/v1/cart/merge');



    $response->assertStatus(200)
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.quantity', 2);
});

it('combines quantities on merge when the user already has the same product in their cart', function () {
    $user = User::factory()->create();
    $authToken = $user->createToken('t')->plainTextToken;
    $guestToken = Str::uuid()->toString();
    $product = Product::factory()->create();

    // User already has 1 of this product in their OWN cart
    $this->withHeader('Authorization', "Bearer {$authToken}")
        ->postJson('/api/v1/cart', ['product_id' => $product->id, 'quantity' => 1]);

    // Guest cart (different browser/session) also has 3 of the same product
    $this->withHeader('X-Cart-Token', $guestToken)
        ->postJson('/api/v1/cart', ['product_id' => $product->id, 'quantity' => 3]);

    $response = $this->withHeader('Authorization', "Bearer {$authToken}")
        ->withHeader('X-Cart-Token', $guestToken)
        ->postJson('/api/v1/cart/merge');

    // Combined into ONE line item with quantity 4, not two separate lines.
    $response->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.quantity', 4);
});

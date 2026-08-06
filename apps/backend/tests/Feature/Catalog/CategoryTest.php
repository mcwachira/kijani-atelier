<?php

use App\Models\Category;
use App\Models\Product;

it('lists all categories with a product count', function () {
    $category = Category::factory()->create();
    Product::factory()->count(3)->create(['category_id' => $category->id]);

    $response = $this->getJson('/api/v1/categories');

    $response->assertStatus(200);
    // Find this category in the response and confirm its count reflects
    // the 3 products we just attached — proves withCount() is actually
    // wired up, not just that the endpoint returns SOMETHING.
    $found = collect($response->json('data'))->firstWhere('id', $category->id);
    expect($found['products_count'])->toBe(3);
});

it('gets a single category by slug', function () {
    $category = Category::factory()->create(['slug' => 'sandals']);

    $this->getJson('/api/v1/categories/sandals')
        ->assertStatus(200)
        ->assertJsonPath('data.slug', 'sandals');
});

it('returns 404 for an unknown category slug', function () {
    $this->getJson('/api/v1/categories/does-not-exist')->assertStatus(404);
});

it('lets an admin create a category', function () {
    [, $token] = actingAsAdmin();

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/categories', [
            'name' => 'Accessories',
            'description' => 'Brass and bead pieces.',
        ]);

    $response->assertStatus(201)
        // Confirms the auto-slug generation from StoreCategoryRequest's
        // resolvedSlug() actually ran, since we didn't submit a slug.
        ->assertJsonPath('data.slug', 'accessories');

    $this->assertDatabaseHas('categories', ['name' => 'Accessories', 'slug' => 'accessories']);
});

it('rejects category creation from a non-admin, even if logged in', function () {
    [, $token] = actingAsCustomer();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/categories', ['name' => 'Accessories'])
        ->assertStatus(403);
});

it('rejects category creation from a guest entirely', function () {
    $this->postJson('/api/v1/categories', ['name' => 'Accessories'])
        ->assertStatus(401);
});

it('lets an admin update a category', function () {
    [, $token] = actingAsAdmin();
    $category = Category::factory()->create(['name' => 'Old Name']);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/v1/categories/{$category->id}", ['name' => 'New Name'])
        ->assertStatus(200)
        ->assertJsonPath('data.name', 'New Name');
});

it('lets an admin delete a category', function () {
    [, $token] = actingAsAdmin();
    $category = Category::factory()->create();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/v1/categories/{$category->id}")
        ->assertStatus(200);

    $this->assertDatabaseMissing('categories', ['id' => $category->id]);
});

it('cascades product deletion when a category is deleted', function () {
    // This proves the migration's cascadeOnDelete on category_id actually
    // behaves as designed — a real, DB-level property worth pinning down,
    // not just an application-layer assumption.
    [, $token] = actingAsAdmin();
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/v1/categories/{$category->id}")
        ->assertStatus(200);

    $this->assertDatabaseMissing('products', ['id' => $product->id]);
});

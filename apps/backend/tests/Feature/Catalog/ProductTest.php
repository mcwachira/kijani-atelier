<?php

use App\Models\Category;
use App\Models\Material;
use App\Models\Product;
use App\Models\Size;

it('lists products with pagination', function () {
    $category = Category::factory()->create();
    Product::factory()->count(15)->create(['category_id' => $category->id]);

    $response = $this->getJson('/api/v1/products');

    $response->assertStatus(200);
    // Default per_page is 12 (set in ProductController::index) — confirms
    // the pagination default is actually being applied, not returning
    // all 15 rows unpaginated.
    expect($response->json('data'))->toHaveCount(12);
    expect($response->json('meta.total'))->toBe(15);
});


it('caps per_page at 50 even if a caller asks for more', function () {
    $category = Category::factory()->create();
    Product::factory()->count(60)->create(['category_id' => $category->id]);

    $response = $this->getJson('/api/v1/products?per_page=1000');

    // Proves the min((int) $request->input('per_page', 12), 50) clamp in
    // the controller actually works — a caller can't force an unbounded
    // result set by just asking for a huge per_page value.
    expect($response->json('data'))->toHaveCount(50);
});


it('filters products by category slug', function () {
    $sandals = Category::factory()->create(['slug' => 'sandals']);
    $bags = Category::factory()->create(['slug' => 'handbags']);
    Product::factory()->count(2)->create(['category_id' => $sandals->id]);
    Product::factory()->count(3)->create(['category_id' => $bags->id]);

    $response = $this->getJson('/api/v1/products?category=sandals');

    expect($response->json('meta.total'))->toBe(2);
});


it('filters products by material', function () {
    $category = Category::factory()->create();
    $leather = Material::factory()->create(['name' => 'leather']);
    $brass = Material::factory()->create(['name' => 'brass']);

    $leatherProduct = Product::factory()->create(['category_id' => $category->id]);
    $leatherProduct->materials()->attach($leather->id);

    $brassProduct = Product::factory()->create(['category_id' => $category->id]);
    $brassProduct->materials()->attach($brass->id);

    $response = $this->getJson('/api/v1/products?material=leather');

    expect($response->json('meta.total'))->toBe(1);
});

it('filters products by size', function () {
    $category = Category::factory()->create();
    $size38 = Size::factory()->create(['value' => '38']);

    $sized = Product::factory()->create(['category_id' => $category->id]);
    $sized->sizes()->attach($size38->id);

    Product::factory()->create(['category_id' => $category->id]); // no size attached

    $response = $this->getJson('/api/v1/products?size=38');

    expect($response->json('meta.total'))->toBe(1);
});


it('searches products by name', function () {
    $category = Category::factory()->create();
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Amani Beaded Slide']);
    Product::factory()->create(['category_id' => $category->id, 'name' => 'Kiondo Classic Tote']);

    $response = $this->getJson('/api/v1/products?search=Beaded');

    expect($response->json('meta.total'))->toBe(1);
});

it('filters to only new-arrival products', function () {
    $category = Category::factory()->create();
    Product::factory()->create(['category_id' => $category->id, 'is_new' => true]);
    Product::factory()->create(['category_id' => $category->id, 'is_new' => false]);

    $response = $this->getJson('/api/v1/products?is_new=true');

    expect($response->json('meta.total'))->toBe(1);
});

it('sorts products by price ascending and descending', function () {
    $category = Category::factory()->create();
    Product::factory()->create(['category_id' => $category->id, 'price' => 9000]);
    Product::factory()->create(['category_id' => $category->id, 'price' => 3000]);

    $asc = $this->getJson('/api/v1/products?sort=price_asc')->json('data');
    expect($asc[0]['price'])->toBe(3000);

    $desc = $this->getJson('/api/v1/products?sort=price_desc')->json('data');
    expect($desc[0]['price'])->toBe(9000);
});

it('gets a single product by slug with all relations loaded', function () {
    $category = Category::factory()->create();
    $material = Material::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id, 'slug' => 'test-product']);
    $product->materials()->attach($material->id);

    $response = $this->getJson('/api/v1/products/test-product');

    $response->assertStatus(200)
        ->assertJsonPath('data.slug', 'test-product')
        ->assertJsonPath('data.category.id', $category->id)
        ->assertJsonCount(1, 'data.materials');
});

it('lets an admin create a product with materials and sizes attached', function () {
    [, $token] = actingAsAdmin();
    $category = Category::factory()->create();
    $material = Material::factory()->create();
    $size = Size::factory()->create();

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/products', [
            'category_id' => $category->id,
            'name' => 'Test Sandal',
            'price' => 6800,
            'materials' => [$material->id],
            'sizes' => [$size->id],
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.slug', 'test-sandal') // auto-generated
        ->assertJsonCount(1, 'data.materials')
        ->assertJsonCount(1, 'data.sizes');
});

it('rejects a compare_at_price that is not greater than price', function () {
    // Directly exercises the 'gt:price' validation rule — proves the
    // application-layer check matches the DB's own CHECK constraint on
    // this same rule, so a bad request fails cleanly with a 422 rather
    // than ever reaching (and being rejected by) the database.
    [, $token] = actingAsAdmin();
    $category = Category::factory()->create();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/products', [
            'category_id' => $category->id,
            'name' => 'Test Sandal',
            'price' => 6800,
            'compare_at_price' => 5000, // LOWER than price — invalid
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('compare_at_price');
});

it('rejects product creation from a non-admin', function () {
    [, $token] = actingAsCustomer();
    $category = Category::factory()->create();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/products', [
            'category_id' => $category->id,
            'name' => 'Test Sandal',
            'price' => 6800,
        ])
        ->assertStatus(403);
});

it('lets an admin update a product and replace its materials via sync', function () {
    [, $token] = actingAsAdmin();
    $category = Category::factory()->create();
    $oldMaterial = Material::factory()->create();
    $newMaterial = Material::factory()->create();

    $product = Product::factory()->create(['category_id' => $category->id]);
    $product->materials()->attach($oldMaterial->id);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/v1/products/{$product->id}", [
            'materials' => [$newMaterial->id],
        ])
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.materials')
        ->assertJsonPath('data.materials.0.id', $newMaterial->id);

    // Confirms sync() REPLACED the set — old material should be detached,
    // not left attached alongside the new one.
    expect($product->fresh()->materials()->count())->toBe(1);
});

it('lets an admin delete a product without deleting past order items referencing it', function () {
    // Proves the nullOnDelete() behavior on order_items.product_id — an
    // order's historical record must survive even if the product itself
    // is later removed from the catalog.
    [, $token] = actingAsAdmin();
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);

    $order = \App\Models\Order::factory()->create();
    $orderItem = \App\Models\OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_id' => $product->id,
        'product_name' => $product->name,
        'price' => $product->price,
    ]);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/v1/products/{$product->id}")
        ->assertStatus(200);

    $this->assertDatabaseMissing('products', ['id' => $product->id]);

    // The order item survives, just with product_id now null.
    $orderItem->refresh();
    expect($orderItem->product_id)->toBeNull();
    expect($orderItem->product_name)->not->toBeNull(); // snapshot data intact
});

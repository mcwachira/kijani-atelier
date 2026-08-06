<?php


use App\Models\Material;

it('lists all materials', function () {
    Material::factory()->create(['name' => 'leather']);
    Material::factory()->create(['name' => 'woven']);

    $this->getJson('/api/v1/materials')
        ->assertStatus(200)
        ->assertJsonCount(2, 'data');
});



it('lets an admin add a material', function () {
    [, $token] = actingAsAdmin();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/materials', ['name' => 'raffia'])
        ->assertStatus(201);

    $this->assertDatabaseHas('materials', ['name' => 'raffia']);
});


it('rejects a duplicate material name', function () {
    [, $token] = actingAsAdmin();
    Material::factory()->create(['name' => 'leather']);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/materials', ['name' => 'leather'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('name');
});

it('rejects material creation from a non-admin', function () {
    [, $token] = actingAsCustomer();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/materials', ['name' => 'raffia'])
        ->assertStatus(403);
});


it('lets an admin delete a material without deleting the products using it', function () {
    // This is the important distinction from category deletion above —
    // deleting a material should only remove the PIVOT ROW (the tag),
    // never the product itself.
    [, $token] = actingAsAdmin();
    $material = Material::factory()->create();
    $product = \App\Models\Product::factory()->create();
    $product->materials()->attach($material->id);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/v1/materials/{$material->id}")
        ->assertStatus(200);

    $this->assertDatabaseMissing('materials', ['id' => $material->id]);
    $this->assertDatabaseHas('products', ['id' => $product->id]); // still exists
});

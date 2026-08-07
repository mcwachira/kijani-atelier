<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'category_id' => Category::factory(),
            'name' => ucwords($name),
            'slug' => Str::slug($name),
            'description' => fake()->paragraph(),
            'craft_note' => fake()->sentence(),
            'price' => fake()->numberBetween(2000, 20000),
            'compare_at_price' => null,
            'stock' => fake()->numberBetween(0, 30),
            'is_new' => false,
        ];
    }
}

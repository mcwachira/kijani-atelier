<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class OrderItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_name' => fake()->words(3, true),
            'price' => fake()->numberBetween(2000, 20000),
            'quantity' => 1,
            'size' => null,
        ];
    }
}

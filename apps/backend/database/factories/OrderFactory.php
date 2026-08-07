<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reference' => 'KJ-' . fake()->unique()->numberBetween(1000, 9999),
            'customer_name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => '+254 7xx xxx xxx',
            'county' => 'Nairobi',
            'town' => 'Westlands',
            'address' => 'P.O. Box 1123',
            'payment_method' => 'mpesa',
            'status' => 'pending',
            'total' => fake()->numberBetween(3000, 30000),
        ];
    }
}

<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SizeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'value' => (string) fake()->unique()->numberBetween(35, 45),
        ];
    }
}

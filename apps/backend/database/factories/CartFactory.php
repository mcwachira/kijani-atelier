<?php

namespace Database\Factories;

use App\Models\Cart;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Cart>
 */
class CartFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Defaults to a guest cart — tests needing a user's cart
        // explicitly pass ['user_id' => $user->id, 'guest_token' => null].
        return [
            'guest_token' => $this->faker->uuid(),
        ];
    }
}

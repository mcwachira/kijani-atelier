<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'method' => $this->faker->randomElement(['mpesa', 'card']),
            'status' => 'pending',
            'amount' => $this->faker->numberBetween(2000, 20000),
            'checkout_request_id' => $this->faker->uuid(),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Message;
use App\Models\MessageReply;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MessageReply>
 */
class MessageReplyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'message_id' => Message::factory(),
            'body' => $this->faker->paragraph(),
            'actor' => 'Admin',
        ];
    }
}

<?php

use App\Models\Message;

it('lets anyone submit a contact message', function () {
    $response = $this->postJson('/api/v1/messages', [
        'name' => 'Wanjiru Kamau',
        'email' => 'wanjiru@example.com',
        'subject' => 'Sizing question',
        'body' => 'I wanted to ask about the fit of the Amani slide.',
        'phone' => '+254712345678',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.unread', true)
        ->assertJsonPath('data.phone', '+254712345678');
});

it('links a contact message to the sender when logged in', function () {
    [$customer, $token] = actingAsCustomer();

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/messages', [
            'name' => $customer->name,
            'email' => $customer->email,
            'subject' => 'Sizing question',
            'body' => 'I wanted to ask about the fit of the Amani slide.',
            'phone' => '0712345678',
        ]);

    $response->assertStatus(201);
    $this->assertDatabaseHas('messages', [
        'id' => $response->json('data.id'),
        'user_id' => $customer->id,
    ]);
});

it('rejects a contact message that is too short', function () {
    $this->postJson('/api/v1/messages', [
        'name' => 'W',
        'email' => 'wanjiru@example.com',
        'subject' => 'Hi',
        'body' => 'Short',
        'phone' => '+254712345678',
    ])->assertStatus(422);
});

it('rejects non-admin access to the message inbox', function () {
    [, $token] = actingAsCustomer();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/admin/messages')
        ->assertStatus(403);
});

it('lets an admin view and reply to a message', function () {
    [, $adminToken] = actingAsAdmin();
    $message = Message::factory()->create();

    $response = $this->withHeader('Authorization', "Bearer {$adminToken}")
        ->postJson("/api/v1/admin/messages/{$message->id}/reply", [
            'body' => 'Thanks for reaching out — sizes run true to fit.',
        ]);

    $response->assertStatus(201)
        ->assertJsonCount(1, 'data.replies');
});

it('lets an admin mark a message as read', function () {
    [, $adminToken] = actingAsAdmin();
    $message = Message::factory()->create();
    $message->forceFill(['unread' => true])->save();

    $this->withHeader('Authorization', "Bearer {$adminToken}")
        ->patchJson("/api/v1/admin/messages/{$message->id}/read")
        ->assertStatus(200)
        ->assertJsonPath('data.unread', false);
});

it('rejects a contact message with an invalid phone number', function () {
    $this->postJson('/api/v1/messages', [
        'name' => 'Wanjiru Kamau',
        'email' => 'wanjiru@example.com',
        'subject' => 'Sizing question',
        'body' => 'I wanted to ask about the fit of the Amani slide.',
        'phone' => 'not-a-phone',
    ])->assertStatus(422)->assertJsonValidationErrors('phone');
});

it('rejects a contact message with no phone number', function () {
    $this->postJson('/api/v1/messages', [
        'name' => 'Wanjiru Kamau',
        'email' => 'wanjiru@example.com',
        'subject' => 'Sizing question',
        'body' => 'I wanted to ask about the fit of the Amani slide.',
    ])->assertStatus(422)->assertJsonValidationErrors('phone');
});

it('queues an admin SMS notification when a message is submitted', function () {
    Illuminate\Support\Facades\Queue::fake();

    $this->postJson('/api/v1/messages', [
        'name' => 'Wanjiru Kamau',
        'email' => 'wanjiru@example.com',
        'subject' => 'Sizing question',
        'body' => 'I wanted to ask about the fit of the Amani slide.',
        'phone' => '+254712345678',
    ])->assertStatus(201);

    Illuminate\Support\Facades\Queue::assertPushed(\App\Jobs\SendContactMessageSms::class);
});

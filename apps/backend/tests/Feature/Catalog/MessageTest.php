<?php

use App\Models\Message;

it('lets anyone submit a contact message', function () {
    $response = $this->postJson('/api/v1/messages', [
        'name' => 'Wanjiru Kamau',
        'email' => 'wanjiru@example.com',
        'subject' => 'Sizing question',
        'body' => 'I wanted to ask about the fit of the Amani slide.',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.unread', true);
});

it('rejects a contact message that is too short', function () {
    $this->postJson('/api/v1/messages', [
        'name' => 'W',
        'email' => 'wanjiru@example.com',
        'subject' => 'Hi',
        'body' => 'Short',
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

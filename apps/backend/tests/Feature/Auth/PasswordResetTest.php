<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

it('accepts a reset link request for a real email', function (){
    User::factory()->create(['email' => 'kevin@example.com']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'kevin@example.com'])
        ->assertStatus(200);
});


it('gives an identical response for an unknown email, to prevent enumeration', function () {
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])
        ->assertStatus(200)
        ->assertJson(['message' => 'If an account exists for that email, a reset link has been sent.']);
});

it('reset the password with a valid token', function (){
    $user = User::factory()->create(['email' => 'kevin@example.com']);
    $token = Password::createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'kevin@example.com',
        'password' => 'NewSecurePass456',
        'password_confirmation' => 'NewSecurePass456',
    ])->assertStatus(200);

    expect(Hash::check('NewSecurePass456', $user->fresh()->password))->toBeTrue();
});

it('rejects an invalid reset token', function () {
    User::factory()->create(['email' => 'kevin@example.com']);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'not-a-real-token',
        'email' => 'kevin@example.com',
        'password' => 'NewSecurePass456',
        'password_confirmation' => 'NewSecurePass456',
    ])->assertStatus(422);
});

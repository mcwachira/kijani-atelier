<?php

use App\Models\User;
use Illuminate\Support\Facades\URL;

it('verifies email with a valid signed url', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)]
    );
    $path = parse_url($url, PHP_URL_PATH) . '?' . parse_url($url, PHP_URL_QUERY);

    // No Authorization header — proves this now works without being
    // logged in on this device, which is the whole point of the change.
    $this->getJson($path)->assertStatus(200);

    expect($user->fresh()->email_verified_at)->not->toBeNull();
});

it('rejects verification with an invalid hash', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => 'wrong-hash']
    );
    $path = parse_url($url, PHP_URL_PATH) . '?' . parse_url($url, PHP_URL_QUERY);

    $this->getJson($path)->assertStatus(403);
});

it('resends a verification email for an unverified user', function () {
    // resend() still requires auth:sanctum — this one keeps its token.
    $user = User::factory()->unverified()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/auth/email/resend')
        ->assertStatus(200);
});

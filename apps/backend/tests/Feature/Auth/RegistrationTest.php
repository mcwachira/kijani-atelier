<?php
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;


it('register a new user with valid data', function (){
    Notification::fake();

    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Kevin Otieno',
        'email' => 'kevin@example.com',
        'password' => 'SecurePass123',
        'password_confirmation' => 'SecurePass123',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['message', 'user' => ['id', 'name', 'email', 'role'], 'token']);
    $this->assertDatabaseHas('users', ['email' => 'kevin@example.com']);

    $user = User::where('email', 'kevin@example.com')->first();
    expect($user->role)->toBe('customer');

    Notification::assertSentTo($user , VerifyEmail::class);
});

it("rejects registration with a duplicate email", function(){
    User::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Someone Else',
        'email' => 'taken@example.com',
        'password' => 'SecurePass123',
        'password_confirmation' => 'SecurePass123',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});


it('rejects registration when passwords do not match', function () {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Kevin Otieno',
        'email' => 'kevin@example.com',
        'password' => 'SecurePass123',
        'password_confirmation' => 'DifferentPass456',
    ])->assertStatus(422)->assertJsonValidationErrors('password');
});

it('never allow role to be set via the registration request ', function(){
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Attempted Admin',
        'email' => 'attacker@example.com',
        'password' => 'SecurePass123',
        'password_confirmation' => 'SecurePass123',
        'role' => 'admin',
    ])->assertStatus(201);

    expect(User::where('email', 'attacker@example.com')->first()->role)->toBe('customer');
});

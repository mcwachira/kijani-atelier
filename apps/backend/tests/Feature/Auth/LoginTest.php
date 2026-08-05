<?php
use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('logs in with correct credentials', function() {
    User::factory()->create([
        'email' => 'kevin@example.com',
        'password' => Hash::make('SecurePass123'),
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'kevin@example.com',
        'password' => 'SecurePass123',
    ])->assertStatus(200)->assertJsonStructure(['user', 'token']);
});

it('reject login with an incorrect password', function (){
    User::factory()->create([
        'email' => 'kevin@example.com',
        'password' => Hash::make('SecurePass123'),
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'kevin@example.com',
        'password' => 'WrongPassword',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});


it('revokes only the current token on logout, not every device ', function (){
    $user = User::factory()->create();
    $tokenA = $user->createToken('device-a')->plainTextToken;
    $tokenB = $user->createToken('device-b')->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$tokenA}")
        ->postJson('/api/v1/auth/logout')
        ->assertStatus(200);


    // Force the auth guard to forget any cached user before the next
    // request — otherwise Laravel's test client can reuse the already-
    // resolved user from the logout call above instead of re-validating
    // tokenA fresh, masking the fact that it's actually been deleted.
    $this->app['auth']->forgetGuards();

    $this->withHeader('Authorization', "Bearer {$tokenA}")
        ->getJson('/api/v1/auth/me')
        ->assertStatus(401);

    $this->withHeader('Authorization', "Bearer {$tokenB}")
        ->getJson('/api/v1/auth/me')
        ->assertStatus(200);
});

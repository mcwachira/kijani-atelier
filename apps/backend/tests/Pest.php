<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(function () {
        // Clears whatever cache store is actually active — including
        // rate-limiter counters — before EVERY test. This makes tests
        // immune to throttle state leaking in from a previous test or a
        // previous `make test` run, regardless of which cache driver
        // .env.testing actually resolves to.
        Cache::flush();
    })
    ->in('Feature');


/**
 * Creates a real admin user and returns [user, bearerToken] — used by
 * every write-endpoint test that needs to authenticate as an admin.
 * Centralized here so the "role isn't mass-assignable, must forceFill"
 * rule (see UserSeeder) is only written once, not copy-pasted into every
 * test file.
 */

function actingAsAdmin():array
{
    $admin = \App\Models\User::factory()->create();
    $admin -> forceFill(['role' => 'admin'])->save();

    $token = $admin-> createToken('text-token')->plainTextToken;

    return [$admin, $token];
}

/**
 * Same idea, but for an ordinary customer — used by tests proving that a
 * logged-in-but-non-admin user still gets a 403 on admin-only routes.
 */

function actingAsCustomer():array
{
    $customer = \App\Models\User::factory()->create();
    $token = $customer-> createToken('text-token')->plainTextToken;

    return [$customer, $token];
}


/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

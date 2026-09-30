<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Force the test environment.
     *
     * The <env> block in phpunit.xml is not applied by this project's
     * Pest runner, so without this the suite silently inherits .env
     * values (database queue/cache, APP_ENV=local) — which meant queued
     * jobs dispatched during tests were pushed to Postgres and never
     * ran, instead of executing inline as the tests assume.
     *
     * Env vars go in BEFORE parent::setUp() boots the app (that's when
     * the environment is detected); driver overrides go after, since
     * config is resolved lazily.
     */
    protected function setUp(): void
    {
        $_SERVER['APP_ENV'] = $_ENV['APP_ENV'] = 'testing';
        putenv('APP_ENV=testing');

        parent::setUp();

        config([
            'queue.default' => 'sync',
            'cache.default' => 'array',
            'session.driver' => 'array',
            'mail.default' => 'array',
            'hashing.bcrypt.rounds' => 4,
        ]);
    }
}

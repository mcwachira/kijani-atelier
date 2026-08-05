<?php

return [
    // Only /api/* routes get CORS headers at all — your admin panel or
    // any server-rendered routes (if you ever add any) aren't affected.
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    // Pulled from .env so this can differ between local dev and production
    // without touching code — just change FRONTEND_URL in each environment.
    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // FALSE, deliberately. 'supports_credentials' controls whether the
    // browser is allowed to send/receive COOKIES cross-origin. We're using
    // bearer tokens in a plain Authorization header instead — no cookies
    // are involved in this auth flow at all, so this stays false. If you
    // ever migrate to Sanctum's SPA cookie mode, this MUST flip to true,
    // or the browser will silently refuse to send the session cookie.
    'supports_credentials' => false,
];

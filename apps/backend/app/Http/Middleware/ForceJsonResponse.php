<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Every /api/* request is JSON, even when the client forgets the
 * Accept header (curl, uptime monitors, misconfigured frontends).
 * Without this, auth failures take the HTML redirect path to a
 * 'login' route that doesn't exist in this API-only backend and blow
 * up with a 500 instead of a clean 401 JSON body.
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        return $next($request);
    }
}

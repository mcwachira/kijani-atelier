<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class OptionalSanctumAuth
{
    /**
     * Cart routes must work for BOTH guests and logged-in users on the
     * SAME endpoint. 'auth:sanctum' can't be used here — it throws a 401
     * whenever no token is present at all, which would break every guest
     * request. But with NO auth middleware at all, $request->user() falls
     * back to the app's default guard (session-based 'web'), which never
     * looks at the Authorization header — so a logged-in user's bearer
     * token would be silently ignored.
     *
     * This middleware bridges the gap: if a bearer token IS present, it
     * resolves the user via the 'sanctum' guard explicitly and attaches
     * it to the request. If there's no token, or it's invalid, it does
     * nothing — the request proceeds as a guest, exactly as before.
     */
    public function handle(Request $request, Closure $next)
    {
        if ($request->bearerToken()) {
            if ($user = auth('sanctum')->user()) {
                $request->setUserResolver(fn () => $user);
            }
        }

        return $next($request);
    }
}

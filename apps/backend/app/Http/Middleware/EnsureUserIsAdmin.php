<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Blocks any request whose authenticated user isn't role='admin'.
     *
     * This runs AFTER 'auth:sanctum' in the middleware stack (see
     * routes/api.php), so $request->user() is guaranteed to be a real,
     * logged-in user by the time this executes — we only need to check
     * their role, not whether they're logged in at all.
     */

    public function handle(Request $request, Closure $next): Response
    {
       if($request->user()?->role !== 'admin'){
           abort(403, 'this action requires admin account');
       }
       return $next($request);
    }
}

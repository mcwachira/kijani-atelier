<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class VerifyMpesaIp
{
    /**
     * Safaricom's Daraja callbacks carry no cryptographic signature,
     * unlike Paystack's HMAC-signed webhooks — this is inherent to how
     * M-Pesa's API works, not something we can fix on our side. IP
     * allowlisting is the practical defense-in-depth available here:
     * restrict the callback route to Safaricom's own published IP
     * ranges, so a forged "payment succeeded" POST from an arbitrary
     * source can't reach the handler at all.
     */
    public function handle(Request $request, Closure $next)
    {
        if (! config('mpesa.verify_callback_ip', true)) {
            return $next($request);
        }

        $allowed = config('mpesa.allowed_callback_ips', []);

        if (! in_array($request->ip(), $allowed, true)) {
            return response()->json(['message' => 'Unrecognized callback origin.'], 403);
        }

        return $next($request);
    }
}

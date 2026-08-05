<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    /**
     * Verify email
     *
     * Confirms an account's email address using the signed link sent at
     * registration. The link is valid for 60 minutes and can only be used once.
     *
     * @unauthenticated
     */
    public function verify(Request $request, int $id, string $hash)
    {
        // EmailVerificationRequest resolves the target user from the
        // {id} route parameter (via its own internal route-model binding),
        // NOT from Sanctum/auth:sanctum — this is what makes it correctly
        // usable without the user being logged in on this device at all.
        // The 'signed' middleware already proved the link is authentic
        // before this method body even runs.
        $user = User::findOrFail($request->route('id'));

        if (! hash_equals(sha1($user->getEmailForVerification()), (string) $request->route('hash'))) {
            abort(403, 'Invalid verification link.');
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->markEmailAsVerified();

        return response()->json(['message' => 'Email verified successfully.']);
    }

    /**
     * Resend verification email
     *
     * Sends a new verification link if the account's email is not yet verified.
     *
     * @authenticated
     */
    public function resend(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification link sent.']);
    }
}

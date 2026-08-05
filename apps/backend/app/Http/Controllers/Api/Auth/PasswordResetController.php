<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;



/**
 * @group Password Reset
 *
 * Endpoints for requesting and completing a password reset via email.
 */
class PasswordResetController extends Controller
{

    /**
     * Request a reset link
     *
     * Sends a password reset link to the given email if an account exists
     * for it. Always returns the same success message regardless of
     * whether the email is registered, to prevent account enumeration.
     *
     * @unauthenticated
     */

    public function sendResetLink(ForgotPasswordRequest $request)
    {
        // We DO call Password::sendResetLink and it DOES behave differently
        // internally depending on whether the email exists — but we
        // deliberately throw away that distinction in the HTTP response
        // below. $status is unused past this line on purpose.
        Password::sendResetLink($request->only('email'));

        // SECURITY: this message is returned identically whether the email
        // exists or not. If we returned "email not found" for unregistered
        // emails, an attacker could silently check thousands of addresses
        // against your platform and build a list of who has an account —
        // account enumeration. One message for both cases closes that gap.
        return response()->json([
            'message' => 'If an account exists for that email, a reset link has been sent.',
        ]);
    }


    /**
     * Reset password
     *
     * Sets a new password using the token emailed by the "request a reset
     * link" endpoint above. Tokens expire after 60 minutes and are single-use.
     *
     * @unauthenticated
     */
    public function reset(ResetPasswordRequest $request)
    {
        // Password::reset handles token verification, expiry (default 60
        // min), and one-time-use invalidation internally — none of that
        // logic lives in this controller.
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                // forceFill, not a plain assignment: 'password' being
                // fillable doesn't matter here since we're not mass-
                // assigning a request body — but forceFill is the
                // consistent, explicit way we set protected/sensitive
                // fields throughout this app (see role in UserSeeder).
                $user->forceFill(['password' => Hash::make($password)])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            // __($status) translates Laravel's internal status string
            // (e.g. 'passwords.token') into a human-readable message via
            // the framework's built-in language files.
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => 'Password has been reset successfully.']);
    }
}

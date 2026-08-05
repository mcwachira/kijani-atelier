<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;


/**
 * @group Authentication
 *
 * Endpoints for registering, logging in, and managing an authenticated session.
 */

class AuthController extends Controller
{

    /**
     * Register a new account
     *
     * Creates a new customer account and sends an email verification link.
     * The account remains unverified until the link is clicked. Returns a
     * bearer token that can be used immediately, even before verification.
     *
     * @unauthenticated
     */

    public function register(RegisterRequest $request)
    {
        // $request->validated() only returns fields declared in
        // RegisterRequest::rules() — 'role' isn't one of them, and 'role'
        // also isn't in User::$fillable. Even if someone adds
        // "role": "admin" to their JSON body, it's silently dropped at
        // TWO separate layers before it ever reaches the database.
        $user = User::create($request->validated());

        // Fires Laravel's built-in VerifyEmail notification, which builds
        // a signed URL pointing at the 'verification.verify' named route
        // (see routes/api.php) and emails it via whatever MAIL_MAILER is
        // configured (Mailpit in local dev).
        $user->sendEmailVerificationNotification();

        // plainTextToken is visible ONLY right now, at creation. Sanctum
        // stores a hashed version in personal_access_tokens — if the
        // client loses this string, there's no "recover it," they log in
        // again for a new one, exactly like a forgotten password.
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Registered successfully. Please check your email to verify your account.',
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }


    /**
     * Log in
     *
     * Authenticates an existing account with email and password, returning
     * a new bearer token to use on subsequent requests.
     *
     * @unauthenticated
     */
    public function login(LoginRequest $request)
    {
        $credentials = $request->validated();

        // Auth::attempt hashes the given password internally and compares
        // it to the stored hash — you never call Hash::check() yourself.
        // It returns false for BOTH "no such email" and "wrong password",
        // which is why LoginRequest doesn't pre-validate email existence —
        // that symmetry is what prevents email enumeration via login.
        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        /** @var User $user */
        $user = Auth::user();

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }


    /**
     * Log out
     *
     * Revokes the bearer token used to authenticate this request only —
     * other active sessions on other devices remain logged in.
     *
     * @authenticated
     */
    public function logout(Request $request)
    {
        // currentAccessToken() — NOT $user->tokens(). This deletes only
        // the ONE token used to authenticate this specific request. Using
        // $user->tokens()->delete() instead would log the user out
        // everywhere they're signed in (phone, laptop, etc.) — a much
        // more aggressive action than "logout" usually implies.
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }


    /**
     * Get current user
     *
     * Returns the account details of the currently authenticated user.
     *
     * @authenticated
     */
    public function me(Request $request)
    {
        // $request->user() is populated by the 'auth:sanctum' middleware
        // after it resolves the Bearer token from the Authorization header
        // — by the time code reaches here, we already know who this is.
        return new UserResource($request->user());
    }
}

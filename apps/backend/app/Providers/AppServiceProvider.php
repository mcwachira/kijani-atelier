<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // General safety net for the whole API. Both limiters return
        // Limit::none() under testing — the suite fires far more requests
        // than either ceiling within the single wall-clock minute it runs
        // in, and app()->environment() is only safe to call from here
        // (after full bootstrap), not from bootstrap/app.php itself.
        RateLimiter::for('api', function (Request $request) {
            return app()->environment('testing')
                ? Limit::none()
                : Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // Tighter limiter for the unauthenticated auth endpoints
        // specifically (register/login/forgot-password) — these are the
        // ones credential stuffing, registration spam, and reset-email
        // bombing actually target, so they get a much lower ceiling than
        // the general API traffic.
        RateLimiter::for('auth', function (Request $request) {
            return app()->environment('testing')
                ? Limit::none()
                : Limit::perMinute(5)->by($request->ip());
        });

        // By default, Laravel's password-reset email links to a
        // `password.reset` NAMED ROUTE — a Blade page that only exists in
        // apps with server-rendered views. We're an API-only backend with
        // a SEPARATE TanStack frontend, so there's no such route here.
        //
        // This override replaces the generated link with one pointing
        // directly at the frontend's /reset-password page, passing token
        // + email as query params — exactly what that page's
        // validateSearch() expects to read.

        ResetPassword::createUrlUsing(function($notifiable, string $token) {
            $frontendUrl = config('app.frontend_url');

            return "{$frontendUrl}/reset-password?token={$token}&email=" . urlencode($notifiable->getEmailForPasswordReset());
        });
        // Same idea as ResetPassword above: by default this notification
        // links to the BACKEND's own verification route, which is fine for
        // curl but shows raw JSON if a real person clicks it in an email
        // client. We build the same signed URL Laravel would have used —
        // required so the signature/expiry still validate correctly —
        // but point it at the frontend instead, passing every piece
        // (id, hash, expires, signature) as query params for the frontend
        // page to read and forward back to the real API endpoint.
        VerifyEmail::createUrlUsing(function ($notifiable) {
            $backendSignedUrl = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );

            // Pull expires/signature back out of the signed URL Laravel
            // just built, so we can hand them to the frontend intact.
            $query = [];
            parse_str(parse_url($backendSignedUrl, PHP_URL_QUERY), $query);

            $frontendUrl = config('app.frontend_url');

            return "{$frontendUrl}/verify-email"
                . '?id=' . $notifiable->getKey()
                . '&hash=' . sha1($notifiable->getEmailForVerification())
                . '&expires=' . $query['expires']
                . '&signature=' . $query['signature'];
        });
    }
}

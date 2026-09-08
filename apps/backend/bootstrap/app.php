<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //

//        $middleware->api(prepend: [
//            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
//        ]);

        // Applies the 'api' limiter registered in AppServiceProvider to
        // the whole api middleware group. That limiter itself returns an
        // unlimited Limit under testing (app()->environment() isn't safe
        // to call THIS early in bootstrap — it runs before the container
        // has 'env' bound — so the environment check has to live in the
        // limiter closure, not here).
        $middleware->throttleApi();

        //let routes reference this as ->middleware('admin') instead of the
        //full class path - same pattern Laravel uses for 'auth','verified', etc.

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'auth.optional' => \App\Http\Middleware\OptionalSanctumAuth::class,
            'verify.mpesa.ip' => \App\Http\Middleware\VerifyMpesaIp::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();

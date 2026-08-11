<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\Auth\VerificationController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SizeController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\CustomerController;
use Illuminate\Support\Facades\Route;

// prefix('v1') — every URL becomes /api/v1/... . Versioning from the very
// first route costs nothing today and avoids a painful breaking-change
// migration later if a mobile client is ever calling /api/register directly
// while you need to change its response shape.
Route::prefix('v1')->group(function () {

    Route::prefix('auth')->group(function () {

        // PUBLIC — no token required to reach these.
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
        Route::post('/reset-password', [PasswordResetController::class, 'reset']);


        // Also public — moved OUT of auth:sanctum. The signed URL itself
        // (id + hash + expires + signature, all checked by 'signed'
        // middleware below) is the actual proof this request is
        // legitimate. Requiring a bearer token ON TOP of that broke the
        // common case of someone opening their verification email on a
        // different browser/device than the one they registered from —
        // that device has no token in localStorage, so it could never
        // pass auth:sanctum even with a perfectly valid signed link.
        Route::get('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
            ->middleware('signed')
            ->name('verification.verify');
        // Requires a valid Sanctum token, but NOT a verified email — you
        // must be logged in to log out or check /me, but you shouldn't be
        // blocked from verifying your OWN email just because it's unverified
        // (that would be a chicken-and-egg lockout).
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/email/resend', [VerificationController::class, 'resend']);

        });
    });


    // ---------------------------------------------------------------
    // Catalog — PUBLIC reads. Anyone can browse categories/materials/
    // sizes/products without an account, exactly like any storefront.
    // ---------------------------------------------------------------
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show']);

    Route::get('/materials', [MaterialController::class, 'index']);
    Route::get('/sizes', [SizeController::class, 'index']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);

    // ---------------------------------------------------------------
    // Catalog management — ADMIN ONLY. Both 'auth:sanctum' (must be
    // logged in) and 'admin' (must specifically be role=admin) are
    // required — a logged-in customer token still gets a 403 here.
    // ---------------------------------------------------------------
    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::post('/materials', [MaterialController::class, 'store']);
        Route::delete('/materials/{material}', [MaterialController::class, 'destroy']);

        Route::post('/sizes', [SizeController::class, 'store']);
        Route::delete('/sizes/{size}', [SizeController::class, 'destroy']);

        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    });




// --- Cart — public (guests via X-Cart-Token, users via bearer token) ---
    Route::middleware('auth.optional')->group(function () {
        Route::get('/cart', [CartController::class, 'index']);
        Route::post('/cart', [CartController::class, 'store']);
        Route::put('/cart/{cartItem}', [CartController::class, 'update']);
        Route::delete('/cart/{cartItem}', [CartController::class, 'destroy']);
    });
    Route::middleware('auth:sanctum')->post('/cart/merge', [CartController::class, 'merge']);


// --- Wishlist — requires login ---
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/wishlist', [WishlistController::class, 'index']);
        Route::post('/wishlist', [WishlistController::class, 'store']);
        Route::delete('/wishlist/{wishlistItem}', [WishlistController::class, 'destroy']);
        Route::post('/wishlist/sync', [WishlistController::class, 'sync']);
    });

// --- Reviews — public read, login required to submit ---
    Route::get('/products/{product}/reviews', [ReviewController::class, 'index']);
    Route::middleware('auth:sanctum')->post('/products/{product}/reviews', [ReviewController::class, 'store']);

// --- Orders — guest checkout allowed, lookup by reference is public ---
// --- Orders — guest checkout allowed, lookup by reference is public ---
    Route::middleware('auth.optional')->post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{reference}', [OrderController::class, 'show']);
    Route::middleware('auth:sanctum')->get('/my-orders', [OrderController::class, 'index']);

    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::get('/admin/orders', [OrderController::class, 'adminIndex']);
        Route::patch('/admin/orders/{order}/status', [OrderController::class, 'updateStatus']);
    });

// --- Messages — public submit, admin-only management ---
    Route::post('/messages', [MessageController::class, 'store']);

    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::get('/admin/messages', [MessageController::class, 'index']);
        Route::get('/admin/messages/{message}', [MessageController::class, 'show']);
        Route::post('/admin/messages/{message}/reply', [MessageController::class, 'reply']);
        Route::patch('/admin/messages/{message}/read', [MessageController::class, 'markRead']);
    });


    Route::prefix('payments')->group(function () {
        Route::post('/mpesa/initiate', [PaymentController::class, 'initiateMpesa']);
        Route::post('/mpesa/callback', [PaymentController::class, 'mpesaCallback']);
        Route::get('/{paymentId}/status', [PaymentController::class, 'status']);
    });

    Route::post('/mpesa/initiate', [PaymentController::class, 'initiateMpesa'])
        ->middleware('throttle:5,1'); // 5 attempts per minute per IP


    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('/analytics/sales', [DashboardController::class, 'analytics']);
        Route::get('/customers', [CustomerController::class, 'index']);
        Route::get('/customers/{customer}', [CustomerController::class, 'show']);
    });

});




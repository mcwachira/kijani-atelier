<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\AddCartItemRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Http\Resources\CartResource;
use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Http\Request;

/**
 * @group Cart
 *
 * Works for both guests and logged-in users. Guests identify their cart
 * via an X-Cart-Token header carrying a client-generated UUID (the
 * frontend should use crypto.randomUUID() and persist it in localStorage
 * — the backend's guest_token column is a native Postgres uuid type and
 * will reject anything that isn't a well-formed UUID). Logged-in users
 * are identified by their bearer token — no header needed once authenticated.
 */
class CartController extends Controller
{
    /**
     * Finds or creates the ONE Cart row that belongs to this request —
     * either the logged-in user's cart, or the guest's cart identified by
     * X-Cart-Token. Every method below calls this first; centralizing it
     * means the guest/user branching logic only has to be correct once.
     */
    private function resolveCart(Request $request): ?Cart
    {
        if ($request->user()) {
            return Cart::firstOrCreate(['user_id' => $request->user()->id]);
        }

        $token = $request->header('X-Cart-Token');

        if (! $token) {
            // No logged-in user AND no guest token — there's genuinely no
            // cart to resolve. Callers handle this null case explicitly.
            return null;
        }

        // firstOrCreate against the uuid column — if $token isn't a
        // validly-formatted UUID, Postgres rejects the insert outright
        // (see AddCartItemRequest's validation for the app-layer check
        // that catches this BEFORE it ever reaches the database).
        return Cart::firstOrCreate(['guest_token' => $token]);
    }

    /**
     * Get the current cart
     *
     * @unauthenticated
     * @header X-Cart-Token Required for guests — a client-generated UUID. Example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
     */
    public function index(Request $request)
    {
        $cart = $this->resolveCart($request);

        if (! $cart) {
            return response()->json(['data' => ['id' => null, 'items' => [], 'subtotal' => 0]]);
        }

        $cart->load('items.product.category', 'items.product.images');

        return new CartResource($cart);
    }

    /**
     * Add an item to the cart
     *
     * If the same product+size is already in the cart, this INCREMENTS
     * its quantity rather than creating a duplicate line — matches the
     * unique(cart_id, product_id, size) constraint on cart_items.
     *
     * @unauthenticated
     * @header X-Cart-Token Required for guests — a client-generated UUID. Example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
     * @bodyParam product_id integer required Example: 1
     * @bodyParam quantity integer Defaults to 1. Example: 2
     * @bodyParam size string Example: 38
     */
    public function store(AddCartItemRequest $request)
    {
        $cart = $this->resolveCart($request);

        // A guest with no X-Cart-Token yet has no cart to attach to — the
        // frontend is expected to generate a UUID BEFORE the first
        // add-to-cart call, so reaching here with no cart is a client
        // bug, not a normal state.
        abort_if(! $cart, 422, 'Missing or invalid X-Cart-Token for guest cart.');

        $data = $request->validated();
        $quantity = $data['quantity'] ?? 1;
        $size = $data['size'] ?? null;

        $existing = $cart->items()
            ->where('product_id', $data['product_id'])
            ->where('size', $size)
            ->first();

        if ($existing) {
            $existing->increment('quantity', $quantity);
        } else {
            $cart->items()->create([
                'product_id' => $data['product_id'],
                'size' => $size,
                'quantity' => $quantity,
            ]);
        }

        $cart->load('items.product.category', 'items.product.images');

        return (new CartResource($cart))->response()->setStatusCode(201);
    }

    /**
     * Update a cart item's quantity
     *
     * @unauthenticated
     * @header X-Cart-Token Required for guests.
     */
    public function update(UpdateCartItemRequest $request, CartItem $cartItem)
    {
        $cart = $this->resolveCart($request);

        // Ownership check — a request can only modify items belonging to
        // ITS OWN cart. Without this, anyone could update any cart item
        // just by guessing an id.
        abort_unless($cart && $cartItem->cart_id === $cart->id, 404);

        $cartItem->update($request->validated());

        $cart->load('items.product.category', 'items.product.images');

        return new CartResource($cart);
    }

    /**
     * Remove an item from the cart
     *
     * @unauthenticated
     * @header X-Cart-Token Required for guests.
     */
    public function destroy(Request $request, CartItem $cartItem)
    {
        $cart = $this->resolveCart($request);

        abort_unless($cart && $cartItem->cart_id === $cart->id, 404);

        $cartItem->delete();

        $cart->load('items.product.category', 'items.product.images');

        return new CartResource($cart);
    }

    /**
     * Merge a guest cart into the logged-in user's cart
     *
     * Call this right after login/registration, still passing the
     * guest's X-Cart-Token — every item from that guest cart moves into
     * the now-authenticated user's cart. Matching product+size lines
     * already present get their quantities combined instead of
     * duplicated; the now-empty guest Cart row is deleted.
     *
     * @authenticated
     * @header X-Cart-Token The guest cart's UUID to merge in. Example: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
     */
    public function merge(Request $request)
    {
        $token = $request->header('X-Cart-Token');
        $userCart = Cart::firstOrCreate(['user_id' => $request->user()->id]);

        if (! $token) {
            $userCart->load('items.product.category', 'items.product.images');

            // Explicit 200 — without this, Laravel auto-returns 201 whenever
            // firstOrCreate() above happened to CREATE the cart (a user's
            // first-ever merge call), since JsonResource defaults to 201 for
            // a freshly-created underlying model. A merge should always read
            // as "here's your current cart," never "something was created."
            return (new CartResource($userCart))->response()->setStatusCode(200);
        }

        $guestCart = Cart::where('guest_token', $token)->first();

        if ($guestCart) {
            foreach ($guestCart->items as $guestItem) {
                $existing = $userCart->items()
                    ->where('product_id', $guestItem->product_id)
                    ->where('size', $guestItem->size)
                    ->first();

                if ($existing) {
                    $existing->increment('quantity', $guestItem->quantity);
                } else {
                    $userCart->items()->create([
                        'product_id' => $guestItem->product_id,
                        'size' => $guestItem->size,
                        'quantity' => $guestItem->quantity,
                    ]);
                }
            }

            $guestCart->delete();
        }

        $userCart->load('items.product.category', 'items.product.images');

        return (new CartResource($userCart))->response()->setStatusCode(200);
    }
}

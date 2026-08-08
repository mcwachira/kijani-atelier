<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Wishlist\AddWishlistItemRequest;
use App\Http\Resources\WishlistItemResource;
use App\Models\WishlistItem;
use Illuminate\Http\Request;


/**
 * @group Wishlist
 *
 * Requires login — unlike cart, there's no guest wishlist support.
 */
class WishlistController extends Controller
{
    /**
     * Get the current user's wishlist
     *
     * @authenticated
     */
    public function index(Request $request)
    {
        $items = $request->user()->wishlistItems()->with('product.category', 'product.images')->get();

        return WishlistItemResource::collection($items);
    }

    /**
     * Add a product to the wishlist
     *
     * @authenticated
     * @bodyParam product_id integer required Example: 1
     * @bodyParam size string Example: 38
     */

    public function store(AddWishlistItemRequest $request)
    {
        $data = $request->validated();

        // firstOrCreate respects the unique(user_id, product_id, size)
        // constraint — calling this twice for the same product+size is a
        // safe no-op, not a duplicate-row error.
        $item = WishlistItem::firstOrCreate([
            'user_id' => $request->user()->id,
            'product_id' => $data['product_id'],
            'size' => $data['size'] ?? null,
        ]);

        $item->load('product.category', 'product.images');

        return (new WishlistItemResource($item))->response()->setStatusCode(201);
    }

    /**
     * Remove a product from the wishlist
     *
     * @authenticated
     */


    public function destroy(Request $request, WishlistItem $wishlistItem)
    {
        abort_unless($wishlistItem->user_id === $request->user()->id, 404);

        $wishlistItem->delete();

        return response()->json(['message' => 'Removed from wishlist.']);
    }

    /**
     * Sync a guest wishlist into the account
     *
     * Called right after login — the frontend sends whatever it tracked
     * in localStorage as a guest, and this merges it into the user's
     * real, server-side wishlist.
     *
     * @authenticated
     * @bodyParam items array required
     * @bodyParam items.*.product_id integer required
     * @bodyParam items.*.size string
     */
    public function sync(Request $request)
    {
        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.size' => ['nullable', 'string', 'max:20'],
        ]);

        foreach ($validated['items'] as $line) {
            WishlistItem::firstOrCreate([
                'user_id' => $request->user()->id,
                'product_id' => $line['product_id'],
                'size' => $line['size'] ?? null,
            ]);
        }

        $items = $request->user()->wishlistItems()->with('product.category', 'product.images')->get();

        return WishlistItemResource::collection($items);
    }
}

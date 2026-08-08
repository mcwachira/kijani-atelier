<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Product;
use App\Models\Review;

/**
 * @group Reviews
 */

class ReviewController extends Controller
{
    /**
     * List reviews for a product
     *
     * @unauthenticated
     * @urlParam product integer required Product id. Example: 1
     */
    public function index(Product $product)
    {
        $reviews = $product->reviews()->latest()->get();

        return ReviewResource::collection($reviews);
    }

    /**
     * Submit a review for a product
     *
     * @authenticated
     * @urlParam product integer required Product id. Example: 1
     * @bodyParam rating integer required 1–5. Example: 5
     * @bodyParam body string required Example: The craftsmanship is beautiful.
     */
    public function store(StoreReviewRequest $request, Product $product)
    {
        $review = Review::create([
            'product_id' => $product->id,
            'user_id' => $request->user()->id,
            // author is the DISPLAY name, taken from the logged-in
            // account itself — never a free-text field the request
            // submits, so a review can't be spoofed to display someone
            // else's name while actually posted by a different account.
            'author' => $request->user()->name,
            'rating' => $request->validated()['rating'],
            'body' => $request->validated()['body'],
        ]);

        return (new ReviewResource($review))->response()->setStatusCode(201);
    }
}

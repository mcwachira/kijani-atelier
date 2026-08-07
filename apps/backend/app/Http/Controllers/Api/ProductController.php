<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;


/**
 * @group Products
 *
 * Browse the catalog with filtering, sorting, and pagination, and
 * (admin-only) manage products.
 */
class ProductController extends Controller
{
    /**
     * List products
     *
     * Supports filtering by category, material, size, price range, a
     * free-text search, and sorting — mirrors the filter set the frontend
     * catalog page needs (category grid, material/size facets, price
     * slider, "New Arrivals" toggle).
     *
     * @unauthenticated
     * @queryParam category string Filter by category slug. Example: sandals
     * @queryParam material string Filter by material name. Example: leather
     * @queryParam size string Filter by size value. Example: 38
     * @queryParam min_price integer Minimum price in whole shillings. Example: 5000
     * @queryParam max_price integer Maximum price in whole shillings. Example: 15000
     * @queryParam search string Matches against product name. Example: sandal
     * @queryParam is_new boolean Only return products marked as new arrivals. Example: true
     * @queryParam sort string One of: price_asc, price_desc, newest. Example: price_asc
     * @queryParam per_page integer Results per page (default 12, max 50). Example: 12
     */

    public function index(Request $request)
    {
        // Always eager-load these four — ProductResource's whenLoaded()
        // checks depend on them being present, and loading them here
        // (once, via joins/subqueries) instead of forgetting to on some
        // code path is what prevents an N+1 query bug down the line.
        $query = Product::query()
            ->with(['category', 'materials', 'sizes', 'images'])
            ->withRatingStats();

        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->string('category')));
        }

        if ($request->filled('material')) {
            $query->whereHas('materials', fn ($q) => $q->where('name', $request->string('material')));
        }

        if ($request->filled('size')) {
            $query->whereHas('sizes', fn ($q) => $q->where('value', $request->string('size')));
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', (int) $request->input('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', (int) $request->input('max_price'));
        }

        if ($request->filled('search')) {
            // A simple LIKE search — fine at this catalog's current size.
            // If the catalog grows into thousands of products, this is
            // the spot to swap in a real search engine (e.g. Meilisearch
            // via Laravel Scout) without touching anything else here.
            $query->where('name', 'like', '%' . $request->string('search') . '%');
        }

        if ($request->boolean('is_new')) {
            $query->where('is_new', true);
        }

        match ($request->input('sort')) {
            'price_asc' => $query->orderBy('price', 'asc'),
            'price_desc' => $query->orderBy('price', 'desc'),
            'newest' => $query->orderBy('created_at', 'desc'),
            default => $query->orderBy('name', 'asc'),
        };

        // Clamp per_page so a caller can't request an absurdly large page
        // (e.g. ?per_page=100000) and force the DB to return everything
        // at once — 50 is a generous but bounded ceiling.
        $perPage = min((int) $request->input('per_page', 12), 50);

        return ProductResource::collection($query->paginate($perPage));
    }

    /**
     * Get a single product
     *
     * Looked up by slug. Includes full relationship data plus live
     * rating/review-count stats.
     *
     * @unauthenticated
     * @urlParam slug string required The product's slug. Example: amani-beaded-slide
     */
    public function show(string $slug)
    {
        $product = Product::query()
            ->with(['category', 'materials', 'sizes', 'images', 'reviews'])
            ->withRatingStats()
            ->where('slug', $slug)
            ->firstOrFail();

        return new ProductResource($product);
    }

    /**
     * Create a product
     *
     * @authenticated
     * @bodyParam category_id integer required Must reference an existing category. Example: 1
     * @bodyParam name string required Example: Amani Beaded Slide
     * @bodyParam slug string Auto-generated from name if omitted. Example: amani-beaded-slide
     * @bodyParam description string Example: A quiet, considered piece made in small batches.
     * @bodyParam craft_note string Example: Made over three to five days in Nairobi.
     * @bodyParam price integer required Whole shillings, no decimals. Example: 6800
     * @bodyParam compare_at_price integer Must be greater than price if present. Example: 8500
     * @bodyParam stock integer Example: 12
     * @bodyParam is_new boolean Example: true
     * @bodyParam materials integer[] Existing material ids to attach. Example: [1, 2]
     * @bodyParam sizes integer[] Existing size ids to attach. Example: [1, 2, 3]
     */
    public function store(StoreProductRequest $request)
    {
        $data = $request->validated();

        $product = Product::create([
            ...collect($data)->except(['materials', 'sizes'])->all(),
            'slug' => $data['slug'] ?? \Illuminate\Support\Str::slug($data['name']),
        ]);

        // sync() on a freshly-created product with no prior pivot rows
        // behaves identically to attach() here, but using sync()
        // consistently (matching ProductSeeder) means the same method
        // works correctly whether this is a brand-new product or one
        // being re-saved with a changed material/size list.
        if (isset($data['materials'])) {
            $product->materials()->sync($data['materials']);
        }
        if (isset($data['sizes'])) {
            $product->sizes()->sync($data['sizes']);
        }

        $product->load(['category', 'materials', 'sizes', 'images']);

        return (new ProductResource($product))->response()->setStatusCode(201);
    }

    /**
     * Update a product
     *
     * Partial updates are supported — send only the fields you want to
     * change. Sending 'materials' or 'sizes' REPLACES the existing set
     * entirely (via sync), it does not merge with what's already attached.
     *
     * @authenticated
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        $data = $request->validated();

        $product->update(collect($data)->except(['materials', 'sizes'])->all());

        if (array_key_exists('materials', $data)) {
            $product->materials()->sync($data['materials']);
        }
        if (array_key_exists('sizes', $data)) {
            $product->sizes()->sync($data['sizes']);
        }

        $product->load(['category', 'materials', 'sizes', 'images']);

        return new ProductResource($product);
    }

    /**
     * Delete a product
     *
     * Cascades to delete this product's images, material/size pivot rows,
     * and reviews. Order items referencing this product are NOT deleted —
     * they keep their own snapshot data (product_name, price at time of
     * purchase) so past orders remain intact.
     *
     * @authenticated
     */
    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;

/**
 * @group Categories
 *
 * Browse product categories, and (admin-only) manage them.
 */
class CategoryController extends Controller
{
    /**
     * List categories
     *
     * Returns every category with a live count of how many products
     * belong to it.
     *
     * @unauthenticated
     */

    public function index()
    {
        // withCount('products') computes the count via a single SQL
        // subquery, not by loading every product — this is what makes
        // CategoryResource's whenCounted('products') actually populate.
        $categories = Category::withCount('products')->orderBy('name')->get();

        return CategoryResource::collection($categories);
    }

    /**
     * Get a single category
     *
     * Looked up by slug, not numeric id — matches how the frontend routes
     * category pages (/categories/sandals, not /categories/1).
     *
     * @unauthenticated
     * @urlParam slug string required The category's slug. Example: sandals
     */
    public function show(string $slug)
    {
        $category = Category::withCount('products')
            ->where('slug', $slug)
            ->firstOrFail();

        return new CategoryResource($category);
    }

    /**
     * Create a category
     *
     * @authenticated
     * @bodyParam name string required Example: Sandals
     * @bodyParam slug string A URL-safe slug. Auto-generated from name if omitted. Example: sandals
     * @bodyParam description string Example: Hand-cut leather and beaded sandals.
     * @bodyParam image string A path/URL to the category's image. Example: categories/sandals.jpg
     */

    public function store(StoreCategoryRequest $request)
    {
        $category = Category::create([
            ...$request->validated(),

            // resolvedSlug() (defined on the Request itself) either uses
            // what was submitted or derives one from 'name' — kept off
            // the controller so the "how do we get a slug" rule lives in
            // exactly one place.
            'slug' => $request->resolvedSlug(),
        ]);

        return (new CategoryResource($category))->response()->setStatusCode(201);
    }

    /**
     * Update a category
     *
     * @authenticated
     */
    public function update(UpdateCategoryRequest $request, Category $category)
    {
        $category->update($request->validated());

        return new CategoryResource($category);
    }

    /**
     * Delete a category
     *
     * Cascades to delete every product in this category too (see the
     * products table's cascadeOnDelete on category_id) — this is a
     * DESTRUCTIVE action, not a soft archive.
     *
     * @authenticated
     */
    public function destroy(Category $category)
    {
        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }
}

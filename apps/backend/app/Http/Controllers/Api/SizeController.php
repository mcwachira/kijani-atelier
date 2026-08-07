<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Size\StoreSizeRequest;
use App\Http\Resources\SizeResource;
use App\Models\Size;
use Illuminate\Http\Request;


/**
 * @group Sizes
 *
 * The fixed lookup list of sizes products can offer. Same pattern as
 * Materials — public read, admin-only write.
 */
class SizeController extends Controller
{
    /**
     * List all sizes
     *
     * @unauthenticated
     */

    public function index()
    {
        return SizeResource::collection(Size::orderBy('value') ->get());
    }

    /**
     * Add a new size
     *
     * @authenticated
     * @bodyParam value string required Example: 42
     */

    public function store(StoreSizeRequest $request)
    {
        $size = Size::create($request->validated());
        return (new SizeResource($size)) -> response() -> setStatusCode(201);
    }

    /**
     * Delete a size
     *
     * @authenticated
     */
    public function destroy(Size $size)
    {
        $size->delete();

        return response()->json(['message' => 'Size deleted.']);
    }
}

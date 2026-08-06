<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Material\StoreMaterialRequest;
use App\Http\Resources\MaterialResource;
use App\Models\Material;
use Illuminate\Http\Request;


/**
 * @group Materials
 *
 * The fixed lookup list of materials products can be tagged with (leather,
 * beads, woven, brass, ...). Read access is public; only admins add new ones.
 */

class MaterialController extends Controller
{
    /**
     * List all materials
     *
     * @unauthenticated
     */

    public function index()
    {
        return MaterialResource::collection(Material::orderBy("name")->get());
    }

    /**
     * Add a new material
     *
     * @authenticated
     * @bodyParam name string required Example: raffia
     */

    public function store(StoreMaterialRequest $request)
    {
        $material = Material::create($request->validated());
        return (new MaterialResource($material)) -> response() -> setStatusCode(201);
    }

    /**
     * Delete a material
     *
     * Also removes this material from every product currently tagged with
     * it (see product_material's cascadeOnDelete on material_id) — it
     * does NOT delete the products themselves, only the tag.
     *
     * @authenticated
     */
    public function destroy(Material $material)
    {
        $material->delete();

        return response()->json(['message' => 'Material deleted.']);
    }
}

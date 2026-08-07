<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image' => $this->image,
            // whenCounted() only includes this key when the controller
            // actually eager-loaded a count via withCount('products') —
            // avoids an extra query on every single category fetch just
            // to support the one listing view that wants counts.
            'products_count' => $this->whenCounted('products'),
            'created_at' => $this->created_at,
        ];
    }
}

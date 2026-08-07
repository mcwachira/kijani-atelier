<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
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
            'craft_note' => $this->craft_note,
            'price' => $this->price,
            'compare_at_price' => $this->compare_at_price,
            'stock' => $this->stock,
            'in_stock' => $this->stock > 0,
            'is_new' => $this->is_new,

            // whenLoaded() only includes these keys if the controller
            // eager-loaded the relation (via ->with([...])) — prevents
            // Eloquent from firing a fresh query PER PRODUCT for each
            // relation if a controller action forgets to eager-load,
            // which would otherwise silently create an N+1 query bug.
            'category' => new CategoryResource($this->whenLoaded('category')),
            'materials' => MaterialResource::collection($this->whenLoaded('materials')),
            'sizes' => SizeResource::collection($this->whenLoaded('sizes')),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),

              // These two only appear when the controller used the
            // withRatingStats() scope (adds withCount + withAvg under the
            // hood) — same whenCounted/conditional pattern as products_count
            // above, so a plain Product::find() doesn't need to compute
            // review stats it wasn't asked for.
            'reviews_count' => $this->whenCounted('reviews'),
            'rating' => $this->when(isset($this->reviews_avg_rating),
        fn () => round((float) $this->reviews_avg_rating, 1)
    ),

            'created_at' => $this->created_at,

            ];
    }
}

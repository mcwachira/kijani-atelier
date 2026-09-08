<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CartResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {

       $representativeImage = $this->representativeProduct ?->image ?->first();

       return [
           'id' => $this->id,
           'name' => $this->name,
           'slug' => $this->slug,
           'description' => $this->description,

           // Keep the existing manually assigned category image.
           'image' => $this->image,

           // Automatically use a product image for the homepage.
           'product_image' => $representativeImage
               ? Storage::disk('supabase')->url($representativeImage->path)
               : null,

           'products_count' => $this->whenCounted('products'),
           'created_at' => $this->created_at,
       ]
    }
}

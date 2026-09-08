<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductImageResource extends JsonResource
{
    /**
     * Transform the product image into an API response.
     *
     * The database stores only the Storage path:
     *
     * products/amani-beaded-slide/1.png
     *
     * We generate the complete public URL here instead of storing
     * the full URL in PostgreSQL.
     */
    public function toArray(Request $request): array
    {
        return [
            /*
            |--------------------------------------------------------------------------
            | Image ID
            |--------------------------------------------------------------------------
            */

            'id' => $this->id,


            /*
            |--------------------------------------------------------------------------
            | Storage Path
            |--------------------------------------------------------------------------
            |
            | This is the path stored in the database.
            |
            | Example:
            |
            | products/amani-beaded-slide/1.png
            |
            */

            'path' => $this->path,


            /*
            |--------------------------------------------------------------------------
            | Public Image URL
            |--------------------------------------------------------------------------
            |
            | Storage::disk('supabase')->url() uses the Supabase disk
            | configuration in config/filesystems.php.
            |
            | It converts:
            |
            | products/amani-beaded-slide/1.png
            |
            | into:
            |
            | https://...supabase.co/storage/v1/object/public/
            | product-images/products/amani-beaded-slide/1.png
            |
            */

            'url' => Storage::disk('supabase')->url($this->path),


            /*
            |--------------------------------------------------------------------------
            | Image Ordering
            |--------------------------------------------------------------------------
            |
            | 1 = primary image
            | 2 = secondary image
            | 3 = third image
            |
            */

            'sort_order' => $this->sort_order,
        ];
    }
}

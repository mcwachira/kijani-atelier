<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            // Deliberately the SNAPSHOT fields stored on the order item
            // itself, never the live product's current name/price — this
            // is what keeps order history immutable even after a product
            // changes or is deleted later.
            'product_name' => $this->product_name,
            'price' => $this->price,
            'quantity' => $this->quantity,
            'size' => $this->size,
        ];
    }
}

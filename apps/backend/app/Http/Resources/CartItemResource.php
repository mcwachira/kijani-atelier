<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartItemResource extends JsonResource
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
            'quantity'=> $this-> quantity,
            'size'=> $this->size,

            // Computed here, never stored — always reflects the
            // PRODUCT'S CURRENT price, unlike an order line item, which
            // snapshots price permanently at the moment of purchase.
            'line_total' => $this->quantity * $this->product->price,
            'product' => new ProductResource($this->whenLoaded('product')),
        ];
    }
}

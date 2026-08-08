<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {

        $items  = $this->whenLoaded('items');
        return[
            'id'=> $this->id,
            'items'=> CartItemResource::collection($items),
            // Subtotal is computed from the loaded items, not stored —
            // this is the ONE place cart-level totals get calculated, so
            // frontend code never has to sum line_totals itself.
            'subtotal' => $items instanceof \Illuminate\Support\Collection
                ? $items->sum(fn ($item) => $item->quantity * $item->product->price)
                : 0,
        ];
    }
}

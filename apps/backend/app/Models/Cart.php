<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{

    use HasFactory;

    protected $fillable = ['user_id', 'guest_token'];
    public function user():BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items():HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    // Live total, computed from current product prices — not stored,
    // since a cart (unlike an order) should always reflect current prices.
    public function total(): int
    {
        return $this->items->sum(fn (CartItem $item) => $item->product->price * $item->quantity);
    }
}

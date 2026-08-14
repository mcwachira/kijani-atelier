<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasFactory;
    protected $fillable = ['user_id','reference', 'customer_name', 'email','phone',
         'county', 'town', 'address', 'payment_method',];


    //Relationship with user
    public function user():BelongsTo
    {
            return $this->belongsTo(User::class);
    }

    // Relationship with order items
    public function items():HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    //Relationship with order status
    public function statusHistory():HasMany
    {
        return $this-> hasMany(OrderStatusEvent::class)->orderBy('created_at');
}


public function payments():HasMany
{
    return $this-> hasMany(Payment::class);
}

    /**
     * Defines which status transitions are actually valid. Mirrors the
     * frontend's ORDER_TRANSITIONS UX guardrail in lib/api.ts, but THIS is
     * the version that's actually enforced — the frontend one only shapes
     * which buttons are shown, it was never a real guarantee.
     */

    public static function validTransitions():array
    {
        return [
            'pending' => ['paid', 'cancelled'],
            'paid' => ['shipped', 'cancelled'],
            'shipped' => ['delivered'],
            'delivered' => [],
            'cancelled' => [],
        ];
    }


    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, self::validTransitions()[$this->status] ?? [], true);
    }

}

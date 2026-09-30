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

    /**
     * Cancel the order and give its stock back, atomically.
     *
     * This is the ONLY place stock restoration happens, which is what
     * makes it exactly-once: every cancellation path (payment failure
     * expiry, admin cancel) funnels through here, and canTransitionTo()
     * refuses to cancel an already-cancelled order — so the increment
     * can never run twice for the same order.
     *
     * Returns false when cancellation isn't a valid transition (e.g.
     * the order already shipped), in which case nothing is touched.
     */
    public function cancelAndRestoreStock(string $actor, string $note): bool
    {
        if (! $this->canTransitionTo('cancelled')) {
            return false;
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($actor, $note) {
            $previousStatus = $this->status;

            foreach ($this->items as $item) {
                \App\Models\Product::where('id', $item->product_id)
                    ->lockForUpdate()
                    ->increment('stock', $item->quantity);
            }

            $this->forceFill(['status' => 'cancelled'])->save();

            OrderStatusEvent::create([
                'order_id' => $this->id,
                'actor_id' => null,
                'from_status' => $previousStatus,
                'to_status' => 'cancelled',
                'note' => $note,
                'actor' => $actor,
            ]);
        });

        return true;
    }

}

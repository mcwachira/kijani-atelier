<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{

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
}

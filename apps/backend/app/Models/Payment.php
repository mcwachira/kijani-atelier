<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{

    use HasFactory;
    protected $fillable = ['order_id', 'method', 'checkout_request_id', 'amount'];
    public function casts():array
    {
        return ['raw_payload' => 'array'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageReply extends Model
{
    protected $fillable = ['message_id', 'actor_id','actor', 'body'];

    public function message():BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function actor():BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

}

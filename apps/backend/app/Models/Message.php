<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class Message extends Model
{

    use HasFactory;
    protected $fillable = ['user_id','name', 'email', 'subject', 'body'];

    protected function casts():array
    {
        return [
            'unread' => 'boolean',
        ];
    }

    public function user():BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function replies():HasMany
    {
        return $this->hasMany(MessageReply::class);
    }

    protected function preview():Attribute
    {
        return Attribute::make(
            get:fn()=> Str::limit($this -> body, 100)
        );
    }
}

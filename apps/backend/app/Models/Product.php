<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'name', 'slug', 'description', 'craft_note',
        'price', 'compare_at_price', 'stock', 'is_new',
    ];

    protected function casts(): array
    {
        return [
            'is_new' => 'boolean',
        ];
    }

    // Relationship with category
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function materials(): BelongsToMany
    {
        return $this->belongsToMany(Material::class, 'product_material');
    }

    public function sizes(): BelongsToMany
    {
        return $this->belongsToMany(Size::class, 'product_size');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    // Relationship with reviews
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function scopeWithRatingStats($query)
    {
        return $query->withCount('reviews')->withAvg('reviews', 'rating');
    }

    public function scopeInStock($query)
    {
        return $query->where('stock', '>', 0);
    }
}

<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{

    /**
     * The 4 top-level product categories. This is a direct translation of
     * the `categories` array from the original TanStack mock data file —
     * if the storefront ever adds a 5th category, add it here too.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Sandals', 'slug' => 'sandals',
                'description' => 'Hand-cut leather and beaded sandals, stitched sole to strap.',
                'image' => 'categories/sandals.jpg'],
            ['name' => 'Kiondos', 'slug' => 'kiondos',
                'description' => 'Sisal baskets woven the slow way, finished in vegetable-tanned leather.',
                'image' => 'categories/kiondos.jpg'],
            ['name' => 'Woven Handbags', 'slug' => 'handbags',
                'description' => 'Raffia and leather bags for the everyday and the evening.',
                'image' => 'categories/bags.jpg'],
            ['name' => 'Accessories', 'slug' => 'accessories',
                'description' => 'Brass, bone and glass-bead pieces made one at a time.',
                'image' => 'categories/accessories.jpg'],
        ];

        foreach ($categories as $category) {

            // Look up by slug (not name) since slug is the unique, URL-safe
            // identifier — matches how ProductSeeder finds categories below.
            Category::firstOrCreate(['slug' => $category['slug']], $category);
        }
    }
}

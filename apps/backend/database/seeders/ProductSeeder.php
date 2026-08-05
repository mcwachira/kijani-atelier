<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Material;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Size;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{

    /**
     * Depends on CategorySeeder, MaterialSeeder, and SizeSeeder having
     * already run — this seeder looks all three up by name/slug and will
     * throw firstOrFail() errors if they don't exist yet.
     *
     * This is a direct translation of the `seeds` array from the original
     * TanStack mock data. To add a new product to the catalog later, just
     * add a new entry to the $seeds array below — everything else
     * (materials, sizes, images) is generated automatically from it.
     */
    public function run(): void
    {
        $seeds = [
            ['name' => 'Amani Beaded Slide', 'price' => 6800, 'category' => 'sandals',
                'materials' => ['leather', 'beads'], 'sizes' => ['36','37','38','39','40','41'],
                'is_new' => true, 'compare' => null],
            ['name' => 'Nia T-Strap Sandal', 'price' => 7400, 'category' => 'sandals',
                'materials' => ['leather'], 'sizes' => ['36','37','38','39','40'],
                'is_new' => false, 'compare' => null],
            ['name' => 'Sanaa Ankle Wrap', 'price' => 8900, 'category' => 'sandals',
                'materials' => ['leather', 'beads'], 'sizes' => ['37','38','39','40','41'],
                'is_new' => false, 'compare' => 10500],
            ['name' => 'Zuri Flat Sandal', 'price' => 5900, 'category' => 'sandals',
                'materials' => ['leather'], 'sizes' => ['36','37','38','39'],
                'is_new' => false, 'compare' => null],
            ['name' => 'Kiondo Classic Tote', 'price' => 9500, 'category' => 'kiondos',
                'materials' => ['woven', 'leather'], 'sizes' => [],
                'is_new' => true, 'compare' => null],
            ['name' => 'Kiondo Ochre Stripe', 'price' => 10800, 'category' => 'kiondos',
                'materials' => ['woven'], 'sizes' => [],
                'is_new' => false, 'compare' => null],
            ['name' => 'Kiondo Petite Market', 'price' => 7200, 'category' => 'kiondos',
                'materials' => ['woven', 'leather'], 'sizes' => [],
                'is_new' => false, 'compare' => null],
            ['name' => 'Malaika Raffia Shoulder', 'price' => 11500, 'category' => 'handbags',
                'materials' => ['woven', 'leather'], 'sizes' => [],
                'is_new' => true, 'compare' => null],
            ['name' => 'Dunia Woven Clutch', 'price' => 6400, 'category' => 'handbags',
                'materials' => ['woven'], 'sizes' => [],
                'is_new' => false, 'compare' => null],
            ['name' => 'Tala Structured Basket', 'price' => 13200, 'category' => 'handbags',
                'materials' => ['woven', 'leather'], 'sizes' => [],
                'is_new' => false, 'compare' => 15000],
            ['name' => 'Imani Brass Cuff', 'price' => 4200, 'category' => 'accessories',
                'materials' => ['brass', 'beads'], 'sizes' => [],
                'is_new' => false, 'compare' => null],
            ['name' => 'Rehema Bead Necklace', 'price' => 3800, 'category' => 'accessories',
                'materials' => ['beads', 'brass'], 'sizes' => [],
                'is_new' => true, 'compare' => null],
        ];

        foreach ($seeds as $i => $seed) {
            // firstOrFail: if this throws "no query results", it means
            // CategorySeeder hasn't run, or the category slug here is wrong.
            $category = Category::where('slug', $seed['category'])->firstOrFail();
            $slug = Str::slug($seed['name']);

            // firstOrCreate by slug — running this seeder twice updates
            // nothing and creates nothing extra, it just finds the existing
            // product and moves on to re-syncing its materials/sizes/images.
            $product = Product::firstOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $category->id,
                    'name' => $seed['name'],
                    // Shared placeholder copy for every product — swap this
                    // out once real per-product descriptions are written.
                    'description' => 'A quiet, considered piece made in small batches. Each one is cut, '
                        . 'stitched and finished by hand, so no two are ever identical — small variations '
                        . 'are the signature of the maker, not a flaw.',
                    'craft_note' => 'Made over three to five days by artisans in Nairobi, '
                        . 'using tanned leather and locally sourced sisal.',
                    'price' => $seed['price'],
                    'compare_at_price' => $seed['compare'],

                    // Deterministic fake stock count so re-seeding always
                    // produces the same numbers — not random, so demo data
                    // doesn't change every time you run this.
                    'stock' => 4 + (($i * 7) % 20),
                    'is_new' => $seed['is_new'],
                ]
            );

            // sync() (not attach()) — replaces the product's material list
            // with exactly this set every time the seeder runs. attach()
            // would keep adding duplicate pivot rows on every re-run.

            $materialIds = Material::whereIn('name', $seed['materials'])->pluck('id');
            $product->materials()->sync($materialIds);

            if (! empty($seed['sizes'])) {
                $sizeIds = Size::whereIn('value', $seed['sizes'])->pluck('id');
                $product->sizes()->sync($sizeIds);
            }

            // Only create images if none exist yet — otherwise re-running
            // this seeder would pile up 3 more duplicate image rows every
            // single time, since there's no natural unique key to sync() by.
            if ($product->images()->count() === 0) {
                foreach (range(1, 3) as $sort) {
                    ProductImage::create([
                        'product_id' => $product->id,
                        // Placeholder path — replace with real uploaded
                        // image paths once product photography exists.
                        'path' => "products/{$slug}.jpg",
                        'sort_order' => $sort,
                    ]);
                }
            }
        }
    }
}

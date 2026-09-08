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
     * already run.
     *
     * Each product contains:
     * - Basic product information
     * - Materials
     * - Available sizes
     * - Three product images
     *
     * The image paths point to files stored in Supabase Storage.
     */
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Product seed data
        |--------------------------------------------------------------------------
        |
        | The "images" array contains the paths of the images in Supabase
        | Storage.
        |
        | Example:
        |
        | products/amani-beaded-slide/1.png
        |
        | These correspond to:
        |
        | product-images/
        | └── products/
        |     └── amani-beaded-slide/
        |         ├── 1.png
        |         ├── 2.png
        |         └── 3.png
        |
        */

        $seeds = [

            [
                'name' => 'Amani Beaded Slide',
                'price' => 6800,
                'category' => 'sandals',
                'materials' => ['leather', 'beads'],
                'sizes' => ['36', '37', '38', '39', '40', '41'],
                'is_new' => true,
                'compare' => null,

                'images' => [
                    'products/amani-beaded-slide/1.png',
                    'products/amani-beaded-slide/2.png',
                    'products/amani-beaded-slide/3.png',
                ],
            ],

            [
                'name' => 'Nia T-Strap Sandal',
                'price' => 7400,
                'category' => 'sandals',
                'materials' => ['leather'],
                'sizes' => ['36', '37', '38', '39', '40'],
                'is_new' => false,
                'compare' => null,

                'images' => [
                    'products/nia-t-strap-sandal/1.png',
                    'products/nia-t-strap-sandal/2.png',
                    'products/nia-t-strap-sandal/3.png',
                ],
            ],

            [
                'name' => 'Sanaa Ankle Wrap',
                'price' => 8900,
                'category' => 'sandals',
                'materials' => ['leather', 'beads'],
                'sizes' => ['37', '38', '39', '40', '41'],
                'is_new' => false,
                'compare' => 10500,

                'images' => [
                    'products/sanaa-ankle-wrap/1.png',
                    'products/sanaa-ankle-wrap/2.png',
                    'products/sanaa-ankle-wrap/3.png',
                ],
            ],

            [
                'name' => 'Zuri Flat Sandal',
                'price' => 5900,
                'category' => 'sandals',
                'materials' => ['leather'],
                'sizes' => ['36', '37', '38', '39'],
                'is_new' => false,
                'compare' => null,

                'images' => [
                    'products/zuri-flat-sandal/1.png',
                    'products/zuri-flat-sandal/2.png',
                    'products/zuri-flat-sandal/3.png',
                ],
            ],

            [
                'name' => 'Kiondo Classic Tote',
                'price' => 9500,
                'category' => 'kiondos',
                'materials' => ['woven', 'leather'],
                'sizes' => [],
                'is_new' => true,
                'compare' => null,

                'images' => [
                    'products/kiondo-classic-tote/1.png',
                    'products/kiondo-classic-tote/2.png',
                    'products/kiondo-classic-tote/3.png',
                ],
            ],

            [
                'name' => 'Kiondo Ochre Stripe',
                'price' => 10800,
                'category' => 'kiondos',
                'materials' => ['woven'],
                'sizes' => [],
                'is_new' => false,
                'compare' => null,

                'images' => [
                    'products/kiondo-ochre-stripe/1.png',
                    'products/kiondo-ochre-stripe/2.png',
                    'products/kiondo-ochre-stripe/3.png',
                ],
            ],

            [
                'name' => 'Kiondo Petite Market',
                'price' => 7200,
                'category' => 'kiondos',
                'materials' => ['woven', 'leather'],
                'sizes' => [],
                'is_new' => false,
                'compare' => null,

                'images' => [
                    'products/kiondo-petite-market/1.png',
                    'products/kiondo-petite-market/2.png',
                    'products/kiondo-petite-market/3.png',
                ],
            ],

            [
                'name' => 'Malaika Raffia Shoulder',
                'price' => 11500,
                'category' => 'handbags',
                'materials' => ['woven', 'leather'],
                'sizes' => [],
                'is_new' => true,
                'compare' => null,

                'images' => [
                    'products/malaika-raffia-shoulder/1.png',
                    'products/malaika-raffia-shoulder/2.png',
                    'products/malaika-raffia-shoulder/3.png',
                ],
            ],

            [
                'name' => 'Dunia Woven Clutch',
                'price' => 6400,
                'category' => 'handbags',
                'materials' => ['woven'],
                'sizes' => [],
                'is_new' => false,
                'compare' => null,

                'images' => [
                    'products/dunia-woven-clutch/1.png',
                    'products/dunia-woven-clutch/2.png',
                    'products/dunia-woven-clutch/3.png',
                ],
            ],

            [
                'name' => 'Tala Structured Basket',
                'price' => 13200,
                'category' => 'handbags',
                'materials' => ['woven', 'leather'],
                'sizes' => [],
                'is_new' => false,
                'compare' => 15000,

                'images' => [
                    'products/tala-structured-basket/1.png',
                    'products/tala-structured-basket/2.png',
                    'products/tala-structured-basket/3.png',
                ],
            ],

            [
                'name' => 'Imani Brass Cuff',
                'price' => 4200,
                'category' => 'accessories',
                'materials' => ['brass', 'beads'],
                'sizes' => [],
                'is_new' => false,
                'compare' => null,

                'images' => [
                    'products/imani-brass-cuff/1.png',
                    'products/imani-brass-cuff/2.png',
                    'products/imani-brass-cuff/3.png',
                ],
            ],

            [
                'name' => 'Rehema Bead Necklace',
                'price' => 3800,
                'category' => 'accessories',
                'materials' => ['beads', 'brass'],
                'sizes' => [],
                'is_new' => true,
                'compare' => null,

                'images' => [
                    'products/rehema-bead-necklace/1.png',
                    'products/rehema-bead-necklace/2.png',
                    'products/rehema-bead-necklace/3.png',
                ],
            ],
        ];


        /*
        |--------------------------------------------------------------------------
        | Create / update products
        |--------------------------------------------------------------------------
        */

        foreach ($seeds as $i => $seed) {

            /*
            |--------------------------------------------------------------------------
            | Find the product category
            |--------------------------------------------------------------------------
            |
            | Example:
            | "sandals" -> Category with slug "sandals"
            |
            | firstOrFail() makes the seeder fail immediately if the category
            | hasn't been seeded yet.
            |
            */

            $category = Category::where(
                'slug',
                $seed['category']
            )->firstOrFail();


            /*
            |--------------------------------------------------------------------------
            | Generate the product slug
            |--------------------------------------------------------------------------
            |
            | "Amani Beaded Slide"
            | becomes:
            |
            | "amani-beaded-slide"
            |
            */

            $slug = Str::slug($seed['name']);


            /*
            |--------------------------------------------------------------------------
            | Create the product if it doesn't exist
            |--------------------------------------------------------------------------
            |
            | If the product already exists, firstOrCreate() simply retrieves
            | it instead of creating a duplicate.
            |
            */

            $product = Product::firstOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $category->id,

                    'name' => $seed['name'],

                    /*
                    |--------------------------------------------------------------------------
                    | Product description
                    |--------------------------------------------------------------------------
                    |
                    | This is currently shared by all products.
                    | We can replace these with individual descriptions later.
                    |
                    */

                    'description' => 'A quiet, considered piece made in small batches. Each one is cut, '
                        . 'stitched and finished by hand, so no two are ever identical — small variations '
                        . 'are the signature of the maker, not a flaw.',

                    /*
                    |--------------------------------------------------------------------------
                    | Craft note
                    |--------------------------------------------------------------------------
                    */

                    'craft_note' => 'Made over three to five days by artisans in Nairobi, '
                        . 'using tanned leather and locally sourced sisal.',

                    'price' => $seed['price'],

                    'compare_at_price' => $seed['compare'],

                    /*
                    |--------------------------------------------------------------------------
                    | Deterministic stock
                    |--------------------------------------------------------------------------
                    |
                    | Instead of using random stock values, we generate predictable
                    | values so the same seed always produces the same demo data.
                    |
                    */

                    'stock' => 4 + (($i * 7) % 20),

                    'is_new' => $seed['is_new'],
                ]
            );


            /*
            |--------------------------------------------------------------------------
            | Sync materials
            |--------------------------------------------------------------------------
            |
            | sync() replaces the existing material relationships with the
            | exact materials specified in this seeder.
            |
            */

            $materialIds = Material::whereIn(
                'name',
                $seed['materials']
            )->pluck('id');

            $product->materials()->sync($materialIds);


            /*
            |--------------------------------------------------------------------------
            | Sync sizes
            |--------------------------------------------------------------------------
            |
            | Some products have sizes while others don't.
            |
            | We always call sync(), including for an empty array.
            | This ensures that re-running the seeder removes old sizes
            | if a product was previously configured with sizes.
            |
            */

            $sizeIds = Size::whereIn(
                'value',
                $seed['sizes']
            )->pluck('id');

            $product->sizes()->sync($sizeIds);


            /*
            |--------------------------------------------------------------------------
            | Sync product images
            |--------------------------------------------------------------------------
            |
            | The images are already uploaded to Supabase Storage.
            |
            | We store only the STORAGE PATH in PostgreSQL.
            |
            | Example:
            |
            | products/amani-beaded-slide/1.png
            |
            | We do NOT store the full Supabase URL in the database.
            |
            */

            /*
            |--------------------------------------------------------------------------
            | Remove old image records
            |--------------------------------------------------------------------------
            |
            | This makes the seeder safe to re-run.
            |
            | If you previously had:
            |
            | products/amani-beaded-slide.jpg
            |
            | those old records will be removed and replaced with the
            | correct three image paths.
            |
            */

            $product->images()->delete();


            /*
            |--------------------------------------------------------------------------
            | Create the three image records
            |--------------------------------------------------------------------------
            |
            | sort_order determines the order in which the frontend receives
            | the images.
            |
            | 1.png -> sort_order 1 -> primary image
            | 2.png -> sort_order 2
            | 3.png -> sort_order 3
            |
            */

            foreach ($seed['images'] as $sort => $path) {

                ProductImage::create([
                    'product_id' => $product->id,

                    // Path/key of the image inside Supabase Storage.
                    'path' => $path,

                    // Convert zero-based array index into 1, 2, 3.
                    'sort_order' => $sort + 1,
                ]);
            }
        }
    }
}

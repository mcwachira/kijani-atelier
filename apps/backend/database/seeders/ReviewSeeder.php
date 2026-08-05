<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{

    /**
     * Attaches the same 2 template reviews to EVERY product, matching the
     * original mock data's flatMap() pattern. This is obviously fake data —
     * once real customer reviews start coming in, this seeder becomes
     * irrelevant and can eventually be deleted.
     */
    public function run(): void
    {
        $template = [
            ['name' => 'Wanjiru K.', 'email' => 'wanjiru@example.com', 'rating' => 5,
                'body' => 'The craftsmanship is beautiful — the leather softened perfectly after a week. Worth every shilling.'],
            ['name' => 'Amina O.', 'email' => 'amina@example.com', 'rating' => 4,
                'body' => 'Elegant and comfortable. Shipping to Mombasa took three days, packaging was lovely.'],
        ];

        Product::all()->each(function (Product $product) use ($template) {
            foreach ($template as $review) {

                // user_id is nullable on purpose — a review can exist without
                // a real account attached (a guest review, or historical data
                // imported from elsewhere). `author` is the display name and
                // is ALWAYS set, whether or not user_id resolves to anyone.
                $user = User::where('email', $review['email'])->first();

                // Manual duplicate check (product + author) since there's no
                // unique constraint on this table — without this, re-running
                // the seeder would double up every product's review count.
                $exists = Review::where('product_id', $product->id)
                    ->where('author', $review['name'])
                    ->exists();

                if (! $exists) {
                    Review::create([
                        'product_id' => $product->id,
                        'user_id' => $user?->id,
                        'author' => $review['name'],
                        'rating' => $review['rating'],
                        'body' => $review['body'],
                    ]);
                }
            }
        });
    }
}

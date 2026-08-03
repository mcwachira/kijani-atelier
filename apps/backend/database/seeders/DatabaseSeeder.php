<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * ORDER MATTERS HERE. Each seeder below depends on the ones above it
     * having already created the rows it needs to look up:
     *
     *   UserSeeder      → no dependencies, must run first
     *   CategorySeeder  → no dependencies
     *   MaterialSeeder  → no dependencies
     *   SizeSeeder      → no dependencies
     *   ProductSeeder   → needs Category, Material, Size
     *   ReviewSeeder    → needs Product, User
     *   OrderSeeder     → needs Product, User
     *   MessageSeeder   → needs User
     *
     * If you add a new seeder later, figure out what it depends on and
     * insert it in the right position — don't just append it to the end.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            CategorySeeder::class,
            MaterialSeeder::class,
            SizeSeeder::class,
            ProductSeeder::class,
            ReviewSeeder::class,
            OrderSeeder::class,
            MessageSeeder::class,
        ]);
    }
}

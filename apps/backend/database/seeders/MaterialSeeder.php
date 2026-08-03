<?php

namespace Database\Seeders;

use App\Models\Material;
use Illuminate\Database\Seeder;

class MaterialSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['leather', 'beads', 'woven', 'brass'] as $name) {
            Material::firstOrCreate(['name' => $name]);
        }
    }
}

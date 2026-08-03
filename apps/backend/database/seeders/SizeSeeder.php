<?php

namespace Database\Seeders;

use App\Models\Size;
use Illuminate\Database\Seeder;

class SizeSeeder extends Seeder
{
    /**
     * Sandal sizes only, for now. Note `value` is stored as a STRING in the
     * migration (not integer) — deliberately, so this list can later grow
     * to include non-numeric sizes ("S", "M", "L") without a column-type
     * migration. Add new sizes here as new sandal styles are introduced.
     */
    public function run(): void
    {
        foreach (['36', '37', '38', '39', '40', '41','42','43'] as $value) {
            Size::firstOrCreate(['value' => $value]);
        }
    }
}

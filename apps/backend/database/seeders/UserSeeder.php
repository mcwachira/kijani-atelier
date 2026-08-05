<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * This seeder MUST run before every other seeder.
     *
     * Orders, reviews, and messages all have a nullable user_id/actor_id
     * foreign key. If this seeder hasn't run yet, those other seeders will
     * either fail outright or just leave every user_id as null — which
     * defeats the point of testing the relationships.
     */
    public function run(): void
    {
        $customers = [
            ['name' => 'Wanjiru Kamau', 'email' => 'wanjiru@example.com'],
            ['name' => 'Amina Osman', 'email' => 'amina@example.com'],
            ['name' => 'Grace Njeri', 'email' => 'grace@example.com'],
            ['name' => 'Leila Hassan', 'email' => 'leila@example.com'],
            ['name' => 'Faith Mwikali', 'email' => 'faith@example.com'],
        ];

        foreach ($customers as $customer) {
            // firstOrCreate (not create!) — makes this seeder safe to run
            // more than once. Without this, re-running the seeder would
            // crash on the second run with a "duplicate email" error.
            $user  = User::firstOrCreate(
                ['email' => $customer['email']],
                [
                    "name" => $customer['name'],
                    'password'=> Hash::make('password'), //dev-only placeholder
                    // Pre-verified so you don't have to click a verification
                    // link for every seeded test account during development.
                    'email_verified_at' => now(),

                ]);

            // WHY forceFill() instead of just adding 'role' to the array above:
            // `role` is intentionally excluded from User::$fillable so that no
            // API request body can ever set it (that would let anyone register
            // as an admin). Seeders are trusted, first-party code, so we
            // deliberately bypass that protection here with forceFill().
            if ($user->role !== 'customer') {
                $user->forceFill(['role' => 'customer'])->save();
            }
        }

        // One admin account — this is the "actor" behind every OrderStatusEvent
        // and MessageReply marked "Admin" in the other seeders below.
        $admin = User::firstOrCreate(
            ['email' => 'admin@kijani-atelier.test'],
            [
                'name' => 'Store Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        if ($admin->role !== 'admin') {
            $admin->forceFill(['role' => 'admin'])->save();
        }
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            // Exactly one of these two is set: a logged-in user's cart,
            // OR a guest cart identified by a client-generated token
            // (a UUID the frontend creates once and stores in localStorage,
            // sent as an X-Cart-Token header on every request).
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->uuid('guest_token')->nullable()->unique();
            $table->timestamps();

            // A logged-in user should only ever have ONE cart row — this
            // constraint is what makes Cart::firstOrCreate(['user_id' =>
            // ...]) safe and idempotent, rather than risking two carts
            // silently existing for the same user.
            $table->unique('user_id');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carts');
    }
};

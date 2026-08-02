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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->text('craft_note')->nullable();
            $table->unsignedInteger('price');
            $table->unsignedInteger('compare_at_price')->nullable();
            $table->unsignedInteger('stock')->default(0);
            $table->boolean('is_new')->default(false);
            $table->timestamps();

            $table->index('category_id');
            $table->index('is_new');
        });
// Defense in depth: if a bug or bad seed ever tries to store a
        // "sale" price higher than the original price, the DB rejects it
        // outright rather than silently displaying a nonsensical discount.
        DB::statement('
            ALTER TABLE products
            ADD CONSTRAINT products_compare_price_check
            CHECK (compare_at_price IS NULL OR compare_at_price > price)
        ');

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

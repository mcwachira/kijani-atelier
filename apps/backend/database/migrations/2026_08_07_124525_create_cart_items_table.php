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
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('size')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();

            // A cart can't have the same product+size combo as two
            // separate rows — adding it again should increment quantity
            // instead (handled in the controller), not create a duplicate.
            $table->unique(['cart_id', 'product_id', 'size']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};

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
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('author');
            $table->unsignedInteger('rating');
            $table->text('body')->nullable();
            $table->timestamps();

            $table->index('product_id');
            $table->index('user_id');
        });

        DB::statement('
            ALTER TABLE reviews
            ADD CONSTRAINT reviews_rating_check
            CHECK (rating BETWEEN 1 AND 5)
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};



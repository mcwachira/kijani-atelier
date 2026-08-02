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
        Schema::create('order_status_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('from_status', ['pending', 'paid', 'shipped', 'delivered', 'cancelled'])->nullable();
            $table->enum('to_status', ['pending', 'paid', 'shipped', 'delivered', 'cancelled']);
            $table->string('note')->nullable();
            $table->string('actor')->default('System');
            $table->timestamp('created_at')->useCurrent();

            $table->index('order_id');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_status_events');
    }
};

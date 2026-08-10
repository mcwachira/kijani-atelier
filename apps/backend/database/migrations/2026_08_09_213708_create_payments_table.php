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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->enum('method', ['mpesa', 'card']);
            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
            $table->unsignedInteger('amount');


            // M-Pesa's CheckoutRequestID — the ONE field that lets us match
            // an async callback back to the payment that initiated it.
            // Unique so the same STK push can never be recorded twice.
            $table->string('checkout_request_id')->nullable()->unique();

            // The provider's own receipt/transaction id once payment
            // actually completes (M-Pesa receipt number, or a card
            // gateway's charge id) — what you'd show a customer as proof.
            $table->string('provider_reference')->nullable();

            // Full raw callback payload, stored verbatim — invaluable for
            // debugging a disputed payment later, and required for audit
            // trails in most payment integrations.
            $table->jsonb('raw_payload')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};

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
        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            // mpesa | pesapal — which gateway sent this.
            $table->string('provider', 20);
            // Provider-side unique ID (CheckoutRequestID / OrderTrackingId).
            // Unique per provider: the same notification delivered twice
            // is recorded once and never processed twice.
            $table->string('event_id');
            $table->json('payload');
            // received → processed | failed | duplicate | ignored
            $table->string('status', 20)->default('received');
            $table->text('error')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'event_id']);
            $table->index(['provider', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
    }
};

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
        Schema::table('messages', function (Blueprint $table) {
            // Nullable at the DB level so pre-existing rows (saved before
            // the contact form collected phone numbers) stay valid.
            // New submissions always provide one — enforced by
            // StoreMessageRequest, not by the column.
            $table->string('phone', 20)->nullable()->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('phone');
        });
    }
};

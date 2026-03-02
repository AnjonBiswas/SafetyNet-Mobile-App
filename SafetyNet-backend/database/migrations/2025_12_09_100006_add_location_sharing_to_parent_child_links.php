<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('parent_child_links', function (Blueprint $table) {
            $table->boolean('location_sharing_enabled')->default(true)->after('linked_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('parent_child_links', function (Blueprint $table) {
            $table->dropColumn('location_sharing_enabled');
        });
    }
};


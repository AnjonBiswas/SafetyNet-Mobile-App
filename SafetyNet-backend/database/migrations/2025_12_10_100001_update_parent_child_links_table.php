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
            $table->enum('linked_via', ['parent_request', 'child_request'])->nullable()->after('link_code');
            $table->unsignedBigInteger('link_request_id')->nullable()->after('linked_via');
            
            $table->foreign('link_request_id')->references('id')->on('link_requests')->onDelete('set null');
            $table->index('link_request_id');
            $table->index('linked_via');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('parent_child_links', function (Blueprint $table) {
            $table->dropForeign(['link_request_id']);
            $table->dropIndex(['link_request_id']);
            $table->dropIndex(['linked_via']);
            $table->dropColumn(['linked_via', 'link_request_id']);
        });
    }
};


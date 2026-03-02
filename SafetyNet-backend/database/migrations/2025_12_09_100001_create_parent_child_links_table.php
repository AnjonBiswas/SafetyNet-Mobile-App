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
        Schema::create('parent_child_links', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id');
            $table->unsignedBigInteger('child_id');
            $table->string('link_code', 20)->unique();
            $table->enum('status', ['pending', 'active', 'revoked'])->default('pending');
            $table->timestamp('linked_at')->nullable();
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('parents')->onDelete('cascade');
            $table->foreign('child_id')->references('id')->on('login')->onDelete('cascade');
            
            $table->index('parent_id');
            $table->index('child_id');
            $table->index('link_code');
            $table->index('status');
            
            // Ensure one parent-child link per pair
            $table->unique(['parent_id', 'child_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parent_child_links');
    }
};


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
        Schema::create('link_requests', function (Blueprint $table) {
            $table->id();
            $table->enum('requester_type', ['parent', 'child']);
            $table->unsignedBigInteger('requester_id');
            $table->enum('target_type', ['parent', 'child']);
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('target_email');
            $table->enum('status', ['pending', 'accepted', 'rejected', 'cancelled'])->default('pending');
            $table->text('message')->nullable();
            $table->timestamp('requested_at');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            // Indexes for efficient queries
            $table->index(['requester_type', 'requester_id']);
            $table->index(['target_type', 'target_id']);
            $table->index('target_email');
            $table->index('status');
            $table->index('requested_at');
            
            // Composite index for finding pending requests
            $table->index(['target_type', 'target_id', 'status']);
            
            // Prevent duplicate pending requests
            $table->unique(['requester_type', 'requester_id', 'target_email', 'status'], 'unique_pending_request');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('link_requests');
    }
};


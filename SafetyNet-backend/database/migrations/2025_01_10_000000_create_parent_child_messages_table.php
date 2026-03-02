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
        // Drop table if it exists (in case of previous failed migration)
        Schema::dropIfExists('parent_child_messages');
        
        Schema::create('parent_child_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id');
            $table->unsignedBigInteger('child_id');
            $table->string('sender_type', 10); // 'parent' or 'child'
            $table->text('message')->nullable();
            $table->string('message_type', 10)->default('text'); // 'text', 'image', 'video', 'audio'
            $table->string('media_url')->nullable();
            $table->string('media_thumbnail')->nullable();
            $table->integer('media_duration')->nullable(); // For audio/video in seconds
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('parent_id')->references('id')->on('parents')->onDelete('cascade');
            $table->foreign('child_id')->references('id')->on('login')->onDelete('cascade');

            // Indexes for performance
            $table->index(['parent_id', 'child_id', 'created_at']);
            $table->index(['child_id', 'parent_id', 'created_at']);
            $table->index('is_read');
            $table->index('sender_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parent_child_messages');
    }
};

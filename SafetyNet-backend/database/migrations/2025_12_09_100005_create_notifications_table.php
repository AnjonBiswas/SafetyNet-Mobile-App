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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id');
            $table->unsignedBigInteger('child_id');
            $table->enum('type', ['sos', 'geofence', 'checkin', 'battery'])->default('sos');
            $table->string('title', 255);
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('parents')->onDelete('cascade');
            $table->foreign('child_id')->references('id')->on('login')->onDelete('cascade');
            
            $table->index('parent_id');
            $table->index('child_id');
            $table->index('type');
            $table->index('is_read');
            $table->index('created_at');
            
            // Composite index for efficient unread notifications query
            $table->index(['parent_id', 'is_read', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};


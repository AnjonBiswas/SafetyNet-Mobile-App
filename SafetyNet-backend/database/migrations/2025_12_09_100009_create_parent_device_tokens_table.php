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
        Schema::create('parent_device_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id');
            $table->string('token', 500); // FCM/APNS token can be long
            $table->enum('platform', ['android', 'ios', 'web'])->default('android');
            $table->string('device_id')->nullable(); // Unique device identifier
            $table->string('device_name')->nullable(); // Device name/model
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('parents')->onDelete('cascade');
            
            $table->index('parent_id');
            $table->index('token');
            $table->index('platform');
            $table->index('is_active');
            
            // Ensure one token per device per parent
            $table->unique(['parent_id', 'device_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parent_device_tokens');
    }
};


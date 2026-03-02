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
        Schema::create('child_device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('child_id')->constrained('users')->onDelete('cascade');
            $table->string('token', 500);
            $table->enum('platform', ['android', 'ios', 'web'])->default('android');
            $table->string('device_id', 255)->nullable();
            $table->string('device_name', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('child_id');
            $table->index('token');
            $table->index(['child_id', 'is_active']);
            $table->index(['child_id', 'device_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('child_device_tokens');
    }
};

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
        Schema::create('location_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('child_id');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->text('address')->nullable();
            $table->integer('battery_level')->nullable();
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamps();

            $table->foreign('child_id')->references('id')->on('login')->onDelete('cascade');
            
            $table->index('child_id');
            $table->index('recorded_at');
            $table->index(['latitude', 'longitude']);
            
            // Composite index for efficient queries by child and time
            $table->index(['child_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('location_history');
    }
};


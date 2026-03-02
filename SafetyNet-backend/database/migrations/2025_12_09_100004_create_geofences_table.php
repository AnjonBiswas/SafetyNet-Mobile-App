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
        Schema::create('geofences', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id');
            $table->unsignedBigInteger('child_id');
            $table->string('name', 100); // Home, School, etc.
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->integer('radius')->default(100); // Radius in meters
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('parents')->onDelete('cascade');
            $table->foreign('child_id')->references('id')->on('login')->onDelete('cascade');
            
            $table->index('parent_id');
            $table->index('child_id');
            $table->index('is_active');
            $table->index(['latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('geofences');
    }
};


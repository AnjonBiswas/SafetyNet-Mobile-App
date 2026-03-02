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
        Schema::create('geofence_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('geofence_id');
            $table->unsignedBigInteger('child_id');
            $table->unsignedBigInteger('parent_id');
            $table->enum('event_type', ['enter', 'exit'])->default('enter');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->text('address')->nullable();
            $table->integer('distance_from_center')->nullable(); // Distance in meters
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamps();

            $table->foreign('geofence_id')->references('id')->on('geofences')->onDelete('cascade');
            $table->foreign('child_id')->references('id')->on('login')->onDelete('cascade');
            $table->foreign('parent_id')->references('id')->on('parents')->onDelete('cascade');
            
            $table->index('geofence_id');
            $table->index('child_id');
            $table->index('parent_id');
            $table->index('event_type');
            $table->index('occurred_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('geofence_events');
    }
};


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
        Schema::create('safe_zones', function (Blueprint $table) {
            $table->id();
            $table->string('area_name', 255);
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->integer('radius'); // in meters
            $table->enum('risk_level', ['green', 'orange', 'red']);
            $table->integer('incident_count')->default(0);
            $table->text('incident_details')->nullable(); // JSON stored as text
            $table->timestamps();

            // Indexes for better query performance
            $table->index('risk_level');
            $table->index('latitude');
            $table->index('longitude');
            $table->index('updated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('safe_zones');
    }
};

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
        Schema::create('public_report', function (Blueprint $table) {
            $table->id();
            $table->string('reporter_name', 255);
            $table->string('contact_info', 255);
            $table->string('area_name', 255);
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->enum('incident_type', ['harassment', 'theft', 'assault', 'stalking', 'other']);
            $table->text('incident_description');
            $table->date('incident_date');
            $table->time('incident_time')->nullable();
            $table->enum('risk_level', ['low', 'medium', 'high'])->default('medium');
            $table->boolean('is_verified')->default(false);
            $table->text('admin_notes')->nullable();
            $table->timestamps();

            $table->index('area_name');
            $table->index('incident_date');
            $table->index('risk_level');
            $table->index(['latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('public_report');
    }
};

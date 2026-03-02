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
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('incident_type', 50);
            $table->dateTime('incident_date');
            $table->text('description');
            $table->string('victim_name', 255);
            $table->string('victim_contact', 50);
            $table->string('location_street', 255);
            $table->string('city', 100);
            $table->text('location_details')->nullable();
            $table->text('evidence_files')->nullable(); // JSON stored as text
            $table->text('perpetrator_description')->nullable();
            $table->text('witnesses')->nullable();
            $table->enum('status', ['pending', 'processing', 'completed', 'rejected'])->default('pending');
            $table->text('admin_notes')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('login')->onDelete('set null');
            $table->index('user_id');
            $table->index('incident_type');
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};

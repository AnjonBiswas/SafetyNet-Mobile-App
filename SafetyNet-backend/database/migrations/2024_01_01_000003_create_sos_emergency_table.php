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
        Schema::create('sos_emergency', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_name', 255);
            $table->string('user_email', 255);
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->text('location_address')->nullable();
            $table->enum('emergency_status', ['active', 'resolved', 'false_alarm'])->default('active');
            $table->string('emergency_type', 100)->default('general');
            $table->text('description')->nullable();
            $table->json('alert_sent_to')->nullable();
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->timestamp('resolved_at')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->text('admin_notes')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('login')->onDelete('cascade');
            $table->foreign('resolved_by')->references('id')->on('login')->onDelete('set null');
            $table->index('user_id');
            $table->index('emergency_status');
            $table->index('priority');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sos_emergency');
    }
};

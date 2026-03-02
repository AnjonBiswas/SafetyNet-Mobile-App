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
        Schema::create('sos_alerts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('child_id');
            $table->unsignedBigInteger('parent_id');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->text('address')->nullable();
            $table->enum('status', ['active', 'acknowledged', 'resolved'])->default('active');
            $table->timestamp('triggered_at')->useCurrent();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->foreign('child_id')->references('id')->on('login')->onDelete('cascade');
            $table->foreign('parent_id')->references('id')->on('parents')->onDelete('cascade');
            
            $table->index('child_id');
            $table->index('parent_id');
            $table->index('status');
            $table->index('triggered_at');
            $table->index(['latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sos_alerts');
    }
};


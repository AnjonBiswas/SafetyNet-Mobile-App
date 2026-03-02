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
        Schema::create('chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 255);
            $table->string('session_id', 255)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();

            $table->index('user_id');
            $table->index('session_id');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_sessions');
    }
};

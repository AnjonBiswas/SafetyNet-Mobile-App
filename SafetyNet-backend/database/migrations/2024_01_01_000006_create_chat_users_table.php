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
        Schema::create('chat_users', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 255)->unique();
            $table->string('name', 255);
            $table->string('email', 255)->nullable();
            $table->enum('user_type', ['user', 'admin', 'developer'])->default('user');
            $table->boolean('is_online')->default(false);
            $table->timestamp('last_seen')->useCurrent()->useCurrentOnUpdate();
            $table->timestamps();

            $table->index('user_id');
            $table->index('is_online');
            $table->index('last_seen');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_users');
    }
};

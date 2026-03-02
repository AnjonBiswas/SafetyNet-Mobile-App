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
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->string('sender_id', 255);
            $table->string('receiver_id', 255);
            $table->text('message');
            $table->enum('message_type', ['text', 'image', 'file'])->default('text');
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->index('sender_id');
            $table->index('receiver_id');
            $table->index('created_at');
            $table->index(['sender_id', 'receiver_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
    }
};

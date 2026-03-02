<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if using SQLite
        $isSqlite = DB::getDriverName() === 'sqlite';
        
        Schema::table('notifications', function (Blueprint $table) use ($isSqlite) {
            // Make parent_id and child_id nullable (skip for SQLite as it requires table recreation)
            if (!$isSqlite) {
                try {
                    $table->unsignedBigInteger('parent_id')->nullable()->change();
                    $table->unsignedBigInteger('child_id')->nullable()->change();
                } catch (\Exception $e) {
                    // Column might already be nullable, ignore
                }
            }
            
            // Add new fields for bidirectional notifications
            if ($isSqlite) {
                // SQLite: Add as nullable with default (no 'after()' support)
                $table->string('recipient_type')->nullable()->default('parent');
                $table->unsignedBigInteger('recipient_id')->nullable();
                $table->json('data')->nullable(); // Laravel handles JSON for SQLite
            } else {
                // MySQL/PostgreSQL: Use enum and proper positioning
                $table->enum('recipient_type', ['parent', 'child'])->default('parent')->after('id');
                $table->unsignedBigInteger('recipient_id')->after('recipient_type');
                $table->json('data')->nullable()->after('message');
            }
        });

        // Populate recipient_type and recipient_id from existing parent_id/child_id
        // For existing notifications, assume they are for parents (backward compatibility)
        DB::statement("UPDATE notifications SET recipient_type = 'parent', recipient_id = parent_id WHERE parent_id IS NOT NULL AND (recipient_type IS NULL OR recipient_type = '')");
        
        // For any notifications with child_id but no parent_id, set as child recipient
        DB::statement("UPDATE notifications SET recipient_type = 'child', recipient_id = child_id WHERE child_id IS NOT NULL AND parent_id IS NULL AND (recipient_type IS NULL OR recipient_type = '')");

        // Add indexes
        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['recipient_type', 'recipient_id']);
            $table->index(['recipient_type', 'recipient_id', 'is_read']);
            
            // Update composite index (drop old one if exists)
            try {
                $table->dropIndex(['parent_id', 'is_read', 'created_at']);
            } catch (\Exception $e) {
                // Index might not exist or have different name, ignore
            }
            
            $table->index(['recipient_type', 'recipient_id', 'is_read', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $isSqlite = DB::getDriverName() === 'sqlite';
        
        Schema::table('notifications', function (Blueprint $table) use ($isSqlite) {
            try {
                $table->dropIndex(['recipient_type', 'recipient_id']);
            } catch (\Exception $e) {}
            try {
                $table->dropIndex(['recipient_type', 'recipient_id', 'is_read']);
            } catch (\Exception $e) {}
            try {
                $table->dropIndex(['recipient_type', 'recipient_id', 'is_read', 'created_at']);
            } catch (\Exception $e) {}
            
            $table->dropColumn(['recipient_type', 'recipient_id', 'data']);
            
            if (!$isSqlite) {
                try {
                    $table->enum('type', ['sos', 'geofence', 'checkin', 'battery'])->default('sos')->change();
                } catch (\Exception $e) {}
                $table->unsignedBigInteger('parent_id')->nullable(false)->change();
                $table->unsignedBigInteger('child_id')->nullable(false)->change();
            }
            
            try {
                $table->index(['parent_id', 'is_read', 'created_at']);
            } catch (\Exception $e) {}
        });
    }
};


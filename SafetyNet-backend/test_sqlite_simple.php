<?php

/**
 * Simple SQLite Database Test
 * Quick test to verify database is working
 * Run: php test_sqlite_simple.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "\n=== SQLite Database Quick Test ===\n\n";

// 1. Check connection
try {
    DB::connection()->getPdo();
    echo "✓ Database connected\n";
} catch (Exception $e) {
    echo "✗ Connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

// 2. Check database file
$dbPath = config('database.connections.sqlite.database');
if (file_exists($dbPath)) {
    echo "✓ Database file exists: " . basename($dbPath) . "\n";
    echo "  Size: " . number_format(filesize($dbPath)) . " bytes\n";
} else {
    echo "✗ Database file not found: {$dbPath}\n";
    exit(1);
}

// 3. Check tables
$tables = ['login', 'reports', 'sos_emergency', 'public_report'];
$foundTables = 0;

foreach ($tables as $table) {
    if (Schema::hasTable($table)) {
        $count = DB::table($table)->count();
        echo "✓ Table '{$table}': {$count} records\n";
        $foundTables++;
    }
}

if ($foundTables === 0) {
    echo "\n⚠ No tables found. Run migrations:\n";
    echo "  php artisan migrate\n";
} else {
    echo "\n✓ Found {$foundTables} tables\n";
}

// 4. Test insert
try {
    $testData = [
        'full_name' => 'Test User ' . time(),
        'email' => 'test' . time() . '@test.com',
        'password' => bcrypt('test123'),
        'is_active' => true
    ];

    $id = DB::table('login')->insertGetId($testData);
    echo "✓ Test insert successful (ID: {$id})\n";

    // Verify
    $user = DB::table('login')->where('id', $id)->first();
    if ($user) {
        echo "✓ Data retrieved: {$user->full_name} ({$user->email})\n";

        // Clean up
        DB::table('login')->where('id', $id)->delete();
        echo "✓ Test data cleaned up\n";
    }
} catch (Exception $e) {
    echo "✗ Insert test failed: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n\n";

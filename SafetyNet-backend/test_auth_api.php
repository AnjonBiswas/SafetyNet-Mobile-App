<?php

/**
 * Test Authentication API Endpoints
 * Run: php test_auth_api.php
 * 
 * This script tests all authentication endpoints
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Http;
use App\Models\User;

echo "\n";
echo "========================================\n";
echo "Authentication API Test\n";
echo "========================================\n\n";

$baseUrl = 'http://localhost:8000/api';
$testEmail = 'test_' . time() . '@example.com';
$testPassword = 'password123';
$authToken = null;

// Test 1: Register
echo "1. Testing Registration...\n";
try {
    $response = Http::post("{$baseUrl}/register", [
        'full_name' => 'Test User',
        'email' => $testEmail,
        'password' => $testPassword,
        'password_confirmation' => $testPassword,
    ]);

    $data = $response->json();

    if ($response->successful() && isset($data['success']) && $data['success']) {
        echo "   ✓ Registration successful\n";
        echo "   ✓ User ID: {$data['data']['user']['id']}\n";
        echo "   ✓ Email: {$data['data']['user']['email']}\n";
        $authToken = $data['data']['token'];
        echo "   ✓ Token received: " . substr($authToken, 0, 20) . "...\n";
    } else {
        echo "   ✗ Registration failed\n";
        echo "   Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 2: Login
echo "2. Testing Login...\n";
try {
    $response = Http::post("{$baseUrl}/login", [
        'email' => $testEmail,
        'password' => $testPassword,
    ]);

    $data = $response->json();

    if ($response->successful() && isset($data['success']) && $data['success']) {
        echo "   ✓ Login successful\n";
        echo "   ✓ User: {$data['data']['user']['full_name']}\n";
        $authToken = $data['data']['token'];
        echo "   ✓ Token received: " . substr($authToken, 0, 20) . "...\n";
    } else {
        echo "   ✗ Login failed\n";
        echo "   Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 3: Get User (Protected)
if ($authToken) {
    echo "3. Testing Get User (Protected Route)...\n";
    try {
        $response = Http::withToken($authToken)->get("{$baseUrl}/user");
        $data = $response->json();

        if ($response->successful() && isset($data['success']) && $data['success']) {
            echo "   ✓ User data retrieved\n";
            echo "   ✓ Name: {$data['data']['user']['full_name']}\n";
            echo "   ✓ Email: {$data['data']['user']['email']}\n";
        } else {
            echo "   ✗ Failed to get user data\n";
            echo "   Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
        }
    } catch (Exception $e) {
        echo "   ✗ Error: " . $e->getMessage() . "\n";
    }
} else {
    echo "3. Skipping Get User test (no token)\n";
}

echo "\n";

// Test 4: Logout
if ($authToken) {
    echo "4. Testing Logout...\n";
    try {
        $response = Http::withToken($authToken)->post("{$baseUrl}/logout");
        $data = $response->json();

        if ($response->successful() && isset($data['success']) && $data['success']) {
            echo "   ✓ Logout successful\n";
        } else {
            echo "   ✗ Logout failed\n";
            echo "   Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
        }
    } catch (Exception $e) {
        echo "   ✗ Error: " . $e->getMessage() . "\n";
    }
} else {
    echo "4. Skipping Logout test (no token)\n";
}

echo "\n";

// Test 5: Test Invalid Login
echo "5. Testing Invalid Login...\n";
try {
    $response = Http::post("{$baseUrl}/login", [
        'email' => 'wrong@example.com',
        'password' => 'wrongpassword',
    ]);

    $data = $response->json();

    if ($response->status() === 401 && isset($data['success']) && !$data['success']) {
        echo "   ✓ Invalid credentials properly rejected\n";
        echo "   ✓ Message: {$data['message']}\n";
    } else {
        echo "   ✗ Expected 401 error\n";
    }
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 6: Test Protected Route Without Token
echo "6. Testing Protected Route Without Token...\n";
try {
    $response = Http::get("{$baseUrl}/user");

    if ($response->status() === 401) {
        echo "   ✓ Unauthorized access properly blocked\n";
    } else {
        echo "   ✗ Expected 401 error, got: {$response->status()}\n";
    }
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Cleanup
echo "7. Cleaning up test data...\n";
try {
    $user = User::where('email', $testEmail)->first();
    if ($user) {
        // Delete all tokens
        $user->tokens()->delete();
        // Delete user
        $user->delete();
        echo "   ✓ Test user deleted\n";
    }
} catch (Exception $e) {
    echo "   ⚠ Could not clean up: " . $e->getMessage() . "\n";
}

echo "\n";
echo "========================================\n";
echo "Test Complete\n";
echo "========================================\n";
echo "\n";
echo "Note: Make sure Laravel development server is running:\n";
echo "  php artisan serve\n";
echo "\n";


<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function register(Request $request)
    {
        try {
            // Validate input
            $validator = Validator::make($request->all(), [
                'full_name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:login,email',
                'password' => 'required|string|min:6|confirmed',
            ], [
                'full_name.required' => 'Full name is required.',
                'email.required' => 'Email is required.',
                'email.email' => 'Please provide a valid email address.',
                'email.unique' => 'This email is already registered.',
                'password.required' => 'Password is required.',
                'password.min' => 'Password must be at least 6 characters.',
                'password.confirmed' => 'Password confirmation does not match.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Create user
            $user = User::create([
                'full_name' => $request->full_name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'is_active' => true,
            ]);

            // Create token
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Registration successful!',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'full_name' => $user->full_name,
                        'email' => $user->email,
                        'is_active' => $user->is_active,
                    ],
                    'token' => $token,
                    'token_type' => 'Bearer',
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Login user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(Request $request)
    {
        try {
            // Validate input
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'password' => 'required|string',
            ], [
                'email.required' => 'Email is required.',
                'email.email' => 'Please provide a valid email address.',
                'password.required' => 'Password is required.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Find user by email
            $user = User::where('email', $request->email)->first();

            // Check if user exists and password is correct
            if (!$user || !Hash::check($request->password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid email or password.',
                ], 401);
            }

            // Check if user is active
            if (!$user->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Account is deactivated. Please contact support.',
                ], 403);
            }

            // Update last login
            $user->update([
                'last_login' => now(),
            ]);

            // Delete existing tokens (optional - for single device login)
            // $user->tokens()->delete();

            // Create new token
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Login successful.',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'full_name' => $user->full_name,
                        'email' => $user->email,
                        'is_active' => $user->is_active,
                        'last_login' => $user->last_login,
                    ],
                    'token' => $token,
                    'token_type' => 'Bearer',
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Login failed. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Logout user (revoke token)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(Request $request)
    {
        try {
            // Revoke current token
            $request->user()->currentAccessToken()->delete();

            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully.',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout failed. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get authenticated user data
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function user(Request $request)
    {
        try {
            $user = $request->user();

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'full_name' => $user->full_name,
                        'email' => $user->email,
                        'is_active' => $user->is_active,
                        'last_login' => $user->last_login,
                        'created_at' => $user->created_at,
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve user data.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}

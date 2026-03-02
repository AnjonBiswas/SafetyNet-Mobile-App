<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Http\Requests\Api\RegisterParentRequest;
use App\Http\Requests\Api\LoginParentRequest;
use App\Http\Requests\Api\UpdateParentProfileRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ParentAuthController extends Controller
{
    /**
     * Register a new parent
     *
     * @param RegisterParentRequest $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function register(RegisterParentRequest $request)
    {
        try {
            // Use transaction to ensure atomicity and reduce lock time
            DB::beginTransaction();
            
            try {
                // Create parent
                $parent = Guardian::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => Hash::make($request->password),
                    'phone' => $request->phone,
                ]);

                // Create token
                $token = $parent->createToken('parent_auth_token')->plainTextToken;
                
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            return response()->json([
                'success' => true,
                'message' => 'Registration successful!',
                'data' => [
                    'parent' => [
                        'id' => $parent->id,
                        'name' => $parent->name,
                        'email' => $parent->email,
                        'phone' => $parent->phone,
                        'profile_image' => $parent->profile_image,
                        'created_at' => $parent->created_at,
                    ],
                    'token' => $token,
                    'token_type' => 'Bearer',
                ]
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Registration error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Registration failed. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Login parent
     *
     * @param LoginParentRequest $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(LoginParentRequest $request)
    {
        try {
            // Find parent by email
            $parent = Guardian::where('email', $request->email)->first();

            // Check if parent exists and password is correct
            if (!$parent || !Hash::check($request->password, $parent->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid email or password.',
                ], 401);
            }

            // Delete existing tokens (optional - for single device login)
            // $parent->tokens()->delete();

            // Create new token
            $token = $parent->createToken('parent_auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Login successful.',
                'data' => [
                    'parent' => [
                        'id' => $parent->id,
                        'name' => $parent->name,
                        'email' => $parent->email,
                        'phone' => $parent->phone,
                        'profile_image' => $parent->profile_image,
                        'created_at' => $parent->created_at,
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
     * Logout parent (revoke token)
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
     * Get authenticated parent profile
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function profile(Request $request)
    {
        try {
            $parent = $request->user();

            // Load relationships
            $parent->loadCount([
                'children',
                'activeChildren',
                'sosAlerts',
                'activeSosAlerts',
                'unreadNotifications'
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'parent' => [
                        'id' => $parent->id,
                        'name' => $parent->name,
                        'email' => $parent->email,
                        'phone' => $parent->phone,
                        'profile_image' => $parent->profile_image,
                        'children_count' => $parent->children_count,
                        'active_children_count' => $parent->active_children_count,
                        'sos_alerts_count' => $parent->sos_alerts_count,
                        'active_sos_alerts_count' => $parent->active_sos_alerts_count,
                        'unread_notifications_count' => $parent->unread_notifications_count,
                        'created_at' => $parent->created_at,
                        'updated_at' => $parent->updated_at,
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve profile data.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Update parent profile
     *
     * @param UpdateParentProfileRequest $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateProfile(UpdateParentProfileRequest $request)
    {
        try {
            $parent = $request->user();

            // Prepare update data
            $updateData = [
                'name' => $request->name ?? $parent->name,
                'phone' => $request->phone ?? $parent->phone,
            ];

            // Handle profile image upload
            if ($request->hasFile('profile_image')) {
                // Delete old image if exists
                if ($parent->profile_image) {
                    Storage::disk('public')->delete($parent->profile_image);
                }

                // Store new image
                $imagePath = $request->file('profile_image')->store('parent-profiles', 'public');
                $updateData['profile_image'] = $imagePath;
            }

            // Update parent
            $parent->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully.',
                'data' => [
                    'parent' => [
                        'id' => $parent->id,
                        'name' => $parent->name,
                        'email' => $parent->email,
                        'phone' => $parent->phone,
                        'profile_image' => $parent->profile_image,
                        'updated_at' => $parent->updated_at,
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}


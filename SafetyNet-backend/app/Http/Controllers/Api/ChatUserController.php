<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ChatUserController extends Controller
{
    /**
     * List chat users.
     */
    public function index()
    {
        try {
            $users = ChatUser::latest('last_seen')->get();

            return response()->json([
                'success' => true,
                'data' => $users,
                'count' => $users->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch chat users.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Show a chat user (by user_id).
     */
    public function show(string $userId)
    {
        $user = ChatUser::where('user_id', $userId)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Chat user not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    /**
     * Store a chat user.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string|max:255|unique:chat_users,user_id',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'user_type' => 'nullable|in:user,admin,developer',
            'is_online' => 'nullable|boolean',
            'last_seen' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = ChatUser::create($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Chat user created successfully.',
                'data' => $user,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create chat user.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update a chat user (by user_id).
     */
    public function update(Request $request, string $userId)
    {
        $user = ChatUser::where('user_id', $userId)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Chat user not found.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'user_type' => 'nullable|in:user,admin,developer',
            'is_online' => 'nullable|boolean',
            'last_seen' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user->fill($validator->validated());
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Chat user updated successfully.',
                'data' => $user,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update chat user.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Delete a chat user (by user_id).
     */
    public function destroy(string $userId)
    {
        $user = ChatUser::where('user_id', $userId)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Chat user not found.',
            ], 404);
        }

        try {
            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'Chat user deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete chat user.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

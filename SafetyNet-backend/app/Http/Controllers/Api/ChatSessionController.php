<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ChatSessionController extends Controller
{
    /**
     * List chat sessions.
     */
    public function index()
    {
        try {
            $sessions = ChatSession::latest('started_at')->get();

            return response()->json([
                'success' => true,
                'data' => $sessions,
                'count' => $sessions->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch chat sessions.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Show a chat session.
     */
    public function show(int $id)
    {
        $session = ChatSession::find($id);

        if (!$session) {
            return response()->json([
                'success' => false,
                'message' => 'Chat session not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $session,
        ]);
    }

    /**
     * Store a chat session.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|string|exists:chat_users,user_id',
            'session_id' => 'required|string|max:255|unique:chat_sessions,session_id',
            'is_active' => 'nullable|boolean',
            'started_at' => 'nullable|date',
            'ended_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $session = ChatSession::create($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Chat session created successfully.',
                'data' => $session,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create chat session.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update a chat session.
     */
    public function update(Request $request, int $id)
    {
        $session = ChatSession::find($id);

        if (!$session) {
            return response()->json([
                'success' => false,
                'message' => 'Chat session not found.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|required|string|exists:chat_users,user_id',
            'session_id' => 'sometimes|required|string|max:255|unique:chat_sessions,session_id,' . $id,
            'is_active' => 'nullable|boolean',
            'started_at' => 'nullable|date',
            'ended_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $session->fill($validator->validated());
            $session->save();

            return response()->json([
                'success' => true,
                'message' => 'Chat session updated successfully.',
                'data' => $session,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update chat session.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Delete a chat session.
     */
    public function destroy(int $id)
    {
        $session = ChatSession::find($id);

        if (!$session) {
            return response()->json([
                'success' => false,
                'message' => 'Chat session not found.',
            ], 404);
        }

        try {
            $session->delete();

            return response()->json([
                'success' => true,
                'message' => 'Chat session deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete chat session.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

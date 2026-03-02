<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ChatMessageController extends Controller
{
    /**
     * List chat messages.
     */
    public function index()
    {
        try {
            $messages = ChatMessage::latest('created_at')->get();

            return response()->json([
                'success' => true,
                'data' => $messages,
                'count' => $messages->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch chat messages.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Show a chat message.
     */
    public function show(int $id)
    {
        $message = ChatMessage::find($id);

        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Chat message not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $message,
        ]);
    }

    /**
     * Store a chat message.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'sender_id' => 'required|string|exists:chat_users,user_id',
            'receiver_id' => 'required|string|exists:chat_users,user_id',
            'message' => 'required|string',
            'message_type' => 'nullable|in:text,image,file',
            'is_read' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $message = ChatMessage::create($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Chat message sent successfully.',
                'data' => $message,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send chat message.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update a chat message.
     */
    public function update(Request $request, int $id)
    {
        $message = ChatMessage::find($id);

        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Chat message not found.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'sender_id' => 'sometimes|required|string|exists:chat_users,user_id',
            'receiver_id' => 'sometimes|required|string|exists:chat_users,user_id',
            'message' => 'sometimes|required|string',
            'message_type' => 'nullable|in:text,image,file',
            'is_read' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $message->fill($validator->validated());
            $message->save();

            return response()->json([
                'success' => true,
                'message' => 'Chat message updated successfully.',
                'data' => $message,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update chat message.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Delete a chat message.
     */
    public function destroy(int $id)
    {
        $message = ChatMessage::find($id);

        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Chat message not found.',
            ], 404);
        }

        try {
            $message->delete();

            return response()->json([
                'success' => true,
                'message' => 'Chat message deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete chat message.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

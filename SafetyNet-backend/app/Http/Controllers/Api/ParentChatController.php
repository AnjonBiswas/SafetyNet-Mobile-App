<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\ChatMessageSent;
use App\Models\ParentChildMessage;
use App\Models\Guardian;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ParentChatController extends Controller
{
    /**
     * Get messages between parent and child
     * GET /api/parent/chat/{childId}/messages
     */
    public function getMessages(Request $request, $childId)
    {
        try {
            $parent = $request->user();

            if (!$parent instanceof Guardian) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            // Verify parent-child relationship
            $link = \App\Models\ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $childId)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active link found with this child',
                ], 403);
            }

            $messages = ParentChildMessage::between($parent->id, $childId)
                ->orderBy('created_at', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $messages,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching messages:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch messages',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Send a text message
     * POST /api/parent/chat/{childId}/send
     */
    public function sendMessage(Request $request, $childId)
    {
        try {
            $parent = $request->user();

            if (!$parent instanceof Guardian) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            // Verify parent-child relationship
            $link = \App\Models\ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $childId)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active link found with this child',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'message' => 'required|string|max:5000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $message = ParentChildMessage::create([
                'parent_id' => $parent->id,
                'child_id' => $childId,
                'sender_type' => 'parent',
                'message' => $request->message,
                'message_type' => 'text',
                'is_read' => false, // Explicitly set as unread
            ]);
            
            Log::info('Parent message created', [
                'message_id' => $message->id,
                'parent_id' => $parent->id,
                'child_id' => $childId,
                'is_read' => $message->is_read,
            ]);

            // Create notification for child
            try {
                $notificationService = app(NotificationService::class);
                $notificationService->createMessageNotification(
                    $parent->id,
                    $childId,
                    'parent',
                    $message->id,
                    $request->message,
                    'text'
                );
                Log::info('Message notification created for child', [
                    'child_id' => $childId,
                    'message_id' => $message->id,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to create message notification', [
                    'error' => $e->getMessage(),
                    'parent_id' => $parent->id,
                    'child_id' => $childId,
                    'message_id' => $message->id,
                ]);
            }

            // Broadcast the message
            broadcast(new ChatMessageSent($message))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Message sent successfully',
                'data' => $message,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error sending message:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send message',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Send media (image, video, audio)
     * POST /api/parent/chat/{childId}/send-media
     */
    public function sendMedia(Request $request, $childId)
    {
        try {
            $parent = $request->user();

            if (!$parent instanceof Guardian) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            // Verify parent-child relationship
            $link = \App\Models\ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $childId)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active link found with this child',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'media' => 'required|file|mimes:jpeg,jpg,png,gif,mp4,mov,avi,m4a,mp3,wav|max:50000', // 50MB max
                'message_type' => 'required|in:image,video,audio',
                'message' => 'nullable|string|max:1000', // Optional caption
                'media_duration' => 'nullable|numeric|min:0', // Duration in seconds for audio/video
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $file = $request->file('media');
            $messageType = $request->input('message_type');

            // Store file
            $fileName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('chat-media/' . $messageType, $fileName, 'public');
            // Generate full URL for media
            $mediaUrl = url(Storage::url($path));

            // Generate thumbnail for videos
            $thumbnail = null;
            if ($messageType === 'video') {
                // You can add video thumbnail generation here if needed
                // For now, we'll use the first frame or a placeholder
            }

            $message = ParentChildMessage::create([
                'parent_id' => $parent->id,
                'child_id' => $childId,
                'sender_type' => 'parent',
                'message' => $request->input('message'),
                'message_type' => $messageType,
                'media_url' => $mediaUrl,
                'media_thumbnail' => $thumbnail,
                'media_duration' => $request->input('media_duration'), // Duration in seconds
                'is_read' => false, // Explicitly set as unread
            ]);
            
            Log::info('Parent media message created', [
                'message_id' => $message->id,
                'parent_id' => $parent->id,
                'child_id' => $childId,
                'is_read' => $message->is_read,
            ]);

            // Create notification for child
            try {
                $notificationService = app(NotificationService::class);
                $notificationService->createMessageNotification(
                    $parent->id,
                    $childId,
                    'parent',
                    $message->id,
                    $request->input('message') ?? '',
                    $messageType
                );
                Log::info('Media message notification created for child', [
                    'child_id' => $childId,
                    'message_id' => $message->id,
                    'message_type' => $messageType,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to create media message notification', [
                    'error' => $e->getMessage(),
                    'parent_id' => $parent->id,
                    'child_id' => $childId,
                    'message_id' => $message->id,
                ]);
            }

            // Broadcast the message
            broadcast(new ChatMessageSent($message))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Media sent successfully',
                'data' => $message,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error sending media:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send media',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Mark messages as read
     * PUT /api/parent/chat/{childId}/read
     */
    public function markAsRead(Request $request, $childId)
    {
        try {
            $parent = $request->user();

            if (!$parent instanceof Guardian) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            ParentChildMessage::between($parent->id, $childId)
                ->where('sender_type', 'child')
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Messages marked as read',
            ]);
        } catch (\Exception $e) {
            Log::error('Error marking messages as read:', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to mark messages as read',
            ], 500);
        }
    }

    /**
     * Get unread message count
     * GET /api/parent/chat/unread-count
     */
    public function getUnreadCount(Request $request)
    {
        try {
            $parent = $request->user();

            if (!$parent instanceof Guardian) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            // Get detailed info for debugging
            $totalMessages = ParentChildMessage::where('parent_id', $parent->id)
                ->where('sender_type', 'child')
                ->count();
            
            $unreadMessages = ParentChildMessage::where('parent_id', $parent->id)
                ->where('sender_type', 'child')
                ->where('is_read', false)
                ->get();
            
            $count = $unreadMessages->count();

            // Also check ALL messages for this parent to debug
            $allMessages = ParentChildMessage::where('parent_id', $parent->id)
                ->where('sender_type', 'child')
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get(['id', 'child_id', 'is_read', 'created_at', 'message']);

            Log::info('Unread message count for parent', [
                'parent_id' => $parent->id,
                'total_child_messages' => $totalMessages,
                'unread_count' => $count,
                'unread_message_ids' => $unreadMessages->pluck('id')->toArray(),
                'sample_unread' => $unreadMessages->take(3)->map(function($msg) {
                    return [
                        'id' => $msg->id,
                        'child_id' => $msg->child_id,
                        'is_read' => $msg->is_read,
                        'created_at' => $msg->created_at,
                    ];
                })->toArray(),
                'recent_all_messages' => $allMessages->map(function($msg) {
                    return [
                        'id' => $msg->id,
                        'child_id' => $msg->child_id,
                        'is_read' => $msg->is_read ? 'true' : 'false',
                        'created_at' => $msg->created_at,
                        'message_preview' => substr($msg->message, 0, 50),
                    ];
                })->toArray(),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'unread_count' => (int) $count,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get unread count',
            ], 500);
        }
    }
}

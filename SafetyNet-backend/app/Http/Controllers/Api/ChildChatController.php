<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\ChatMessageSent;
use App\Models\ParentChildMessage;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ChildChatController extends Controller
{
    /**
     * Get messages between child and parent
     * GET /api/child/chat/{parentId}/messages
     */
    public function getMessages(Request $request, $parentId)
    {
        try {
            $child = $request->user();

            if (!$child instanceof User) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            // Verify parent-child relationship
            $link = \App\Models\ParentChildLink::where('parent_id', $parentId)
                ->where('child_id', $child->id)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active link found with this parent',
                ], 403);
            }

            $messages = ParentChildMessage::between($parentId, $child->id)
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
     * POST /api/child/chat/{parentId}/send
     */
    public function sendMessage(Request $request, $parentId)
    {
        try {
            $child = $request->user();

            if (!$child instanceof User) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            // Verify parent-child relationship
            $link = \App\Models\ParentChildLink::where('parent_id', $parentId)
                ->where('child_id', $child->id)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active link found with this parent',
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
                'parent_id' => $parentId,
                'child_id' => $child->id,
                'sender_type' => 'child',
                'message' => $request->message,
                'message_type' => 'text',
                'is_read' => false, // Explicitly set as unread
            ]);
            
            Log::info('Child message created', [
                'message_id' => $message->id,
                'parent_id' => $parentId,
                'child_id' => $child->id,
                'is_read' => $message->is_read,
            ]);

            // Create notification for parent
            try {
                $notificationService = app(NotificationService::class);
                $notificationService->createMessageNotification(
                    $parentId,
                    $child->id,
                    'child',
                    $message->id,
                    $request->message,
                    'text'
                );
                Log::info('Message notification created for parent', [
                    'parent_id' => $parentId,
                    'message_id' => $message->id,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to create message notification', [
                    'error' => $e->getMessage(),
                    'parent_id' => $parentId,
                    'child_id' => $child->id,
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
     * POST /api/child/chat/{parentId}/send-media
     */
    public function sendMedia(Request $request, $parentId)
    {
        try {
            $child = $request->user();

            if (!$child instanceof User) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            // Verify parent-child relationship
            $link = \App\Models\ParentChildLink::where('parent_id', $parentId)
                ->where('child_id', $child->id)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active link found with this parent',
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
            }

            $message = ParentChildMessage::create([
                'parent_id' => $parentId,
                'child_id' => $child->id,
                'sender_type' => 'child',
                'message' => $request->input('message'),
                'message_type' => $messageType,
                'media_url' => $mediaUrl,
                'media_thumbnail' => $thumbnail,
                'media_duration' => $request->input('media_duration'), // Duration in seconds
                'is_read' => false, // Explicitly set as unread
            ]);
            
            Log::info('Child media message created', [
                'message_id' => $message->id,
                'parent_id' => $parentId,
                'child_id' => $child->id,
                'is_read' => $message->is_read,
            ]);

            // Create notification for parent
            try {
                $notificationService = app(NotificationService::class);
                $notificationService->createMessageNotification(
                    $parentId,
                    $child->id,
                    'child',
                    $message->id,
                    $request->input('message') ?? '',
                    $messageType
                );
                Log::info('Media message notification created for parent', [
                    'parent_id' => $parentId,
                    'message_id' => $message->id,
                    'message_type' => $messageType,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to create media message notification', [
                    'error' => $e->getMessage(),
                    'parent_id' => $parentId,
                    'child_id' => $child->id,
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
     * PUT /api/child/chat/{parentId}/read
     */
    public function markAsRead(Request $request, $parentId)
    {
        try {
            $child = $request->user();

            if (!$child instanceof User) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            ParentChildMessage::between($parentId, $child->id)
                ->where('sender_type', 'parent')
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
     * GET /api/child/chat/unread-count
     */
    public function getUnreadCount(Request $request)
    {
        try {
            $child = $request->user();

            if (!$child instanceof User) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }

            // Get detailed info for debugging
            $totalMessages = ParentChildMessage::where('child_id', $child->id)
                ->where('sender_type', 'parent')
                ->count();
            
            $unreadMessages = ParentChildMessage::where('child_id', $child->id)
                ->where('sender_type', 'parent')
                ->where('is_read', false)
                ->get();
            
            $count = $unreadMessages->count();

            Log::info('Unread message count for child', [
                'child_id' => $child->id,
                'total_parent_messages' => $totalMessages,
                'unread_count' => $count,
                'unread_message_ids' => $unreadMessages->pluck('id')->toArray(),
                'sample_unread' => $unreadMessages->take(3)->map(function($msg) {
                    return [
                        'id' => $msg->id,
                        'parent_id' => $msg->parent_id,
                        'is_read' => $msg->is_read,
                        'created_at' => $msg->created_at,
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

    /**
     * Register device token for push notifications
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function registerDeviceToken(Request $request)
    {
        try {
            $validator = \Validator::make($request->all(), [
                'token' => 'required|string|max:500',
                'platform' => 'required|in:android,ios,web',
                'device_id' => 'nullable|string|max:255',
                'device_name' => 'nullable|string|max:255',
            ], [
                'token.required' => 'Device token is required.',
                'platform.required' => 'Platform is required.',
                'platform.in' => 'Platform must be android, ios, or web.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $child = $request->user();

            \Illuminate\Support\Facades\Log::info('Child device token registration request', [
                'child_id' => $child->id,
                'platform' => $request->platform,
                'has_device_id' => !empty($request->device_id),
                'has_device_name' => !empty($request->device_name),
                'token_preview' => substr($request->token, 0, 30) . '...',
            ]);

            // Check if token already exists for this device or token
            $deviceToken = null;
            
            if ($request->device_id) {
                // Try to find by device_id first
                $deviceToken = \App\Models\ChildDeviceToken::where('child_id', $child->id)
                    ->where('device_id', $request->device_id)
                    ->first();
            }
            
            // If not found by device_id, try to find by token
            if (!$deviceToken) {
                $deviceToken = \App\Models\ChildDeviceToken::where('child_id', $child->id)
                    ->where('token', $request->token)
                    ->first();
            }

            if ($deviceToken) {
                // Update existing token
                $deviceToken->update([
                    'token' => $request->token,
                    'platform' => $request->platform,
                    'device_id' => $request->device_id ?? $deviceToken->device_id,
                    'device_name' => $request->device_name ?? $deviceToken->device_name,
                    'is_active' => true,
                    'last_used_at' => now(),
                ]);
                
                \Illuminate\Support\Facades\Log::info('Child device token updated', [
                    'device_token_id' => $deviceToken->id,
                    'child_id' => $child->id,
                    'platform' => $request->platform,
                ]);
            } else {
                // Create new token
                $deviceToken = \App\Models\ChildDeviceToken::create([
                    'child_id' => $child->id,
                    'token' => $request->token,
                    'platform' => $request->platform,
                    'device_id' => $request->device_id,
                    'device_name' => $request->device_name ?? ($request->platform === 'android' ? 'Android Device' : 'iOS Device'),
                    'is_active' => true,
                    'last_used_at' => now(),
                ]);
                
                \Illuminate\Support\Facades\Log::info('New child device token created', [
                    'device_token_id' => $deviceToken->id,
                    'child_id' => $child->id,
                    'platform' => $request->platform,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Device token registered successfully.',
                'data' => [
                    'device_token' => [
                        'id' => $deviceToken->id,
                        'platform' => $deviceToken->platform,
                        'device_id' => $deviceToken->device_id,
                        'device_name' => $deviceToken->device_name,
                        'is_active' => $deviceToken->is_active,
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to register child device token', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to register device token.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}

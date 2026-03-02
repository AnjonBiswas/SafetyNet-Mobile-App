<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Notification;
use App\Models\ParentDeviceToken;
use Illuminate\Http\Request;

class ParentNotificationController extends Controller
{
    /**
     * Get all notifications
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $parent = $request->user();
            $isRead = $request->query('is_read'); // true, false, or all
            $type = $request->query('type'); // sos, geofence, checkin, battery

            // Get notifications where parent is the recipient
            // Check both old format (parent_id only) and new format (recipient_type + recipient_id)
            $query = Notification::where(function($q) use ($parent) {
                $q->where(function($subQ) use ($parent) {
                    // New format: recipient_type = 'parent' and recipient_id = parent.id
                    $subQ->where('recipient_type', 'parent')
                         ->where('recipient_id', $parent->id);
                })->orWhere(function($subQ) use ($parent) {
                    // Old format: parent_id = parent.id (for backward compatibility)
                    $subQ->where('parent_id', $parent->id)
                         ->whereNull('recipient_type');
                });
            })
            ->with(['child:id,full_name,email'])
            ->orderBy('created_at', 'desc');

            // Filter by read status
            if ($isRead === 'true' || $isRead === '1') {
                $query->where('is_read', true);
            } elseif ($isRead === 'false' || $isRead === '0') {
                $query->where('is_read', false);
            }
            // If 'all' or not specified, show all

            // Filter by type
            if ($type) {
                $query->where('type', $type);
            }

            $notifications = $query->paginate(20);

            $notificationsData = $notifications->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'is_read' => $notification->is_read,
                    'data' => $notification->data ?? [], // Include data field for alert_id, etc.
                    'child' => $notification->child ? [
                        'id' => $notification->child->id,
                        'name' => $notification->child->full_name,
                        'email' => $notification->child->email,
                    ] : null,
                    'child_id' => $notification->child_id,
                    'created_at' => $notification->created_at,
                    'time_ago' => $notification->created_at->diffForHumans(),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'notifications' => $notificationsData,
                    'pagination' => [
                        'current_page' => $notifications->currentPage(),
                        'last_page' => $notifications->lastPage(),
                        'per_page' => $notifications->perPage(),
                        'total' => $notifications->total(),
                    ],
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve notifications.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Mark notification as read
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function markAsRead(Request $request, $id)
    {
        try {
            $parent = $request->user();

            // Check both old format (parent_id only) and new format (recipient_type + recipient_id)
            $notification = Notification::where('id', $id)
                ->where(function($query) use ($parent) {
                    $query->where(function($q) use ($parent) {
                        // New format: recipient_type = 'parent' and recipient_id = parent.id
                        $q->where('recipient_type', 'parent')
                          ->where('recipient_id', $parent->id);
                    })->orWhere(function($q) use ($parent) {
                        // Old format: parent_id = parent.id (for backward compatibility)
                        $q->where('parent_id', $parent->id)
                          ->whereNull('recipient_type');
                    });
                })
                ->first();

            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification not found.',
                ], 404);
            }

            $notification->markAsRead();

            \Illuminate\Support\Facades\Log::info('Notification marked as read', [
                'notification_id' => $id,
                'parent_id' => $parent->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notification marked as read.',
                'data' => [
                    'notification' => [
                        'id' => $notification->id,
                        'is_read' => $notification->is_read,
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark notification as read.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Mark all notifications as read
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function markAllAsRead(Request $request)
    {
        try {
            $parent = $request->user();

            // Mark all notifications as read where parent is the recipient
            $count = Notification::where(function($query) use ($parent) {
                $query->where(function($q) use ($parent) {
                    // New format: recipient_type = 'parent' and recipient_id = parent.id
                    $q->where('recipient_type', 'parent')
                      ->where('recipient_id', $parent->id);
                })->orWhere(function($q) use ($parent) {
                    // Old format: parent_id = parent.id (for backward compatibility)
                    $q->where('parent_id', $parent->id)
                      ->whereNull('recipient_type');
                });
            })
            ->where('is_read', false)
            ->update(['is_read' => true]);
            
            \Illuminate\Support\Facades\Log::info('All notifications marked as read', [
                'parent_id' => $parent->id,
                'count' => $count,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'All notifications marked as read.',
                'data' => [
                    'notifications_marked' => $count,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark all notifications as read.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Delete notification
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request, $id)
    {
        try {
            $parent = $request->user();

            // Check both old format (parent_id only) and new format (recipient_type + recipient_id)
            $notification = Notification::where('id', $id)
                ->where(function($query) use ($parent) {
                    $query->where(function($q) use ($parent) {
                        // New format: recipient_type = 'parent' and recipient_id = parent.id
                        $q->where('recipient_type', 'parent')
                          ->where('recipient_id', $parent->id);
                    })->orWhere(function($q) use ($parent) {
                        // Old format: parent_id = parent.id (for backward compatibility)
                        $q->where('parent_id', $parent->id)
                          ->whereNull('recipient_type');
                    });
                })
                ->first();

            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification not found.',
                ], 404);
            }

            $notification->delete();
            
            \Illuminate\Support\Facades\Log::info('Notification deleted', [
                'notification_id' => $id,
                'parent_id' => $parent->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notification deleted successfully.',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete notification.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get unread notifications count
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUnreadCount(Request $request)
    {
        try {
            $parent = $request->user();

            // Count notifications where parent is the recipient
            // Check both old format (parent_id only) and new format (recipient_type + recipient_id)
            $unreadCount = Notification::where(function($query) use ($parent) {
                $query->where(function($q) use ($parent) {
                    // New format: recipient_type = 'parent' and recipient_id = parent.id
                    $q->where('recipient_type', 'parent')
                      ->where('recipient_id', $parent->id);
                })->orWhere(function($q) use ($parent) {
                    // Old format: parent_id = parent.id (for backward compatibility)
                    $q->where('parent_id', $parent->id)
                      ->whereNull('recipient_type');
                });
            })
            ->where('is_read', false)
            ->count();

            // Count by type
            $countByType = Notification::where(function($query) use ($parent) {
                $query->where(function($q) use ($parent) {
                    $q->where('recipient_type', 'parent')
                      ->where('recipient_id', $parent->id);
                })->orWhere(function($q) use ($parent) {
                    $q->where('parent_id', $parent->id)
                      ->whereNull('recipient_type');
                });
            })
            ->where('is_read', false)
            ->selectRaw('type, count(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->toArray();

            \Illuminate\Support\Facades\Log::info('Unread notification count for parent', [
                'parent_id' => $parent->id,
                'unread_count' => $unreadCount,
                'count_by_type' => $countByType,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'unread_count' => (int) $unreadCount,
                    'count_by_type' => [
                        'sos' => $countByType['sos'] ?? 0,
                        'geofence' => $countByType['geofence'] ?? 0,
                        'checkin' => $countByType['checkin'] ?? 0,
                        'battery' => $countByType['battery'] ?? 0,
                        'message' => $countByType['message'] ?? 0,
                    ],
                ]
            ], 200);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error getting unread notification count', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve unread count.',
                'error' => config('app.debug') ? $e->getMessage() : null
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

            \Illuminate\Support\Facades\Log::info('Device token registration request', [
                'parent_id' => $request->user()->id,
                'platform' => $request->platform,
                'has_device_id' => !empty($request->device_id),
                'has_device_name' => !empty($request->device_name),
                'token_preview' => substr($request->token, 0, 30) . '...',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $parent = $request->user();

            // Check if token already exists for this device or token
            $deviceToken = null;
            
            if ($request->device_id) {
                // Try to find by device_id first
                $deviceToken = ParentDeviceToken::where('parent_id', $parent->id)
                    ->where('device_id', $request->device_id)
                    ->first();
            }
            
            // If not found by device_id, try to find by token
            if (!$deviceToken) {
                $deviceToken = ParentDeviceToken::where('parent_id', $parent->id)
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
                
                \Illuminate\Support\Facades\Log::info('Device token updated', [
                    'device_token_id' => $deviceToken->id,
                    'parent_id' => $parent->id,
                    'platform' => $request->platform,
                ]);
            } else {
                // Create new token
                $deviceToken = ParentDeviceToken::create([
                    'parent_id' => $parent->id,
                    'token' => $request->token,
                    'platform' => $request->platform,
                    'device_id' => $request->device_id,
                    'device_name' => $request->device_name ?? ($request->platform === 'android' ? 'Android Device' : 'iOS Device'),
                    'is_active' => true,
                    'last_used_at' => now(),
                ]);
                
                \Illuminate\Support\Facades\Log::info('New device token created', [
                    'device_token_id' => $deviceToken->id,
                    'parent_id' => $parent->id,
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
            return response()->json([
                'success' => false,
                'message' => 'Failed to register device token.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Test push notification (for debugging)
     * POST /api/parent/test-push-notification
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function testPushNotification(Request $request)
    {
        try {
            $parent = $request->user();

            // Get active device tokens
            $tokens = ParentDeviceToken::where('parent_id', $parent->id)
                ->where('is_active', true)
                ->get();

            if ($tokens->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active device tokens found. Please ensure push notifications are enabled in the app.',
                    'data' => [
                        'parent_id' => $parent->id,
                        'tokens_count' => 0,
                    ]
                ], 404);
            }

            $pushService = app(\App\Services\PushNotificationService::class);
            
            $title = '🧪 Test Notification';
            $message = 'This is a test push notification from SafetyNet backend. If you receive this, push notifications are working correctly!';
            $data = [
                'type' => 'test',
                'timestamp' => now()->toISOString(),
            ];

            $successCount = 0;
            $results = [];

            foreach ($tokens as $token) {
                $sent = $pushService->sendToParent($parent, $title, $message, $data, 'normal');
                $results[] = [
                    'token_id' => $token->id,
                    'platform' => $token->platform,
                    'sent' => $sent,
                    'token_preview' => substr($token->token, 0, 30) . '...',
                ];
                if ($sent) {
                    $successCount++;
                }
            }

            \Illuminate\Support\Facades\Log::info('Test push notification sent', [
                'parent_id' => $parent->id,
                'total_tokens' => $tokens->count(),
                'success_count' => $successCount,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Test notification sent to ' . $successCount . ' device(s).',
                'data' => [
                    'total_tokens' => $tokens->count(),
                    'success_count' => $successCount,
                    'results' => $results,
                ]
            ], 200);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Test push notification error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send test notification.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}


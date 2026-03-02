<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Guardian;
use App\Models\User;
use App\Services\PushNotificationService;

class NotificationService
{
    protected $pushService;

    public function __construct(PushNotificationService $pushService)
    {
        $this->pushService = $pushService;
    }

    /**
     * Create and send notification to parent
     *
     * @param Guardian $parent
     * @param User $child
     * @param string $type
     * @param string $title
     * @param string $message
     * @param array $data
     * @param bool $sendPush
     * @return Notification
     */
    public function createNotification(
        Guardian $parent,
        User $child,
        string $type,
        string $title,
        string $message,
        array $data = [],
        bool $sendPush = true
    ): Notification {
        // Create notification record
        $notification = Notification::create([
            'parent_id' => $parent->id,
            'child_id' => $child->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data, // Save data field (alert_id, latitude, longitude, etc.)
            'is_read' => false,
        ]);

        // Send push notification if enabled
        if ($sendPush) {
            $priority = $this->getPriorityForType($type);
            $this->pushService->sendToParent($parent, $title, $message, $data, $priority);
        }

        return $notification;
    }

    /**
     * Create SOS alert notification
     *
     * @param Guardian $parent
     * @param User $child
     * @param array $alertData
     * @return Notification
     */
    public function createSOSNotification(Guardian $parent, User $child, array $alertData): Notification
    {
        $title = '🚨 SOS ALERT - ' . $child->full_name;
        $message = $child->full_name . ' has triggered an SOS alert. Location: ' .
            ($alertData['address'] ?? $alertData['latitude'] . ', ' . $alertData['longitude']);

        $data = [
            'type' => 'sos',
            'alert_id' => $alertData['alert_id'] ?? null,
            'latitude' => $alertData['latitude'] ?? null,
            'longitude' => $alertData['longitude'] ?? null,
            'address' => $alertData['address'] ?? null,
        ];

        $notification = $this->createNotification($parent, $child, 'sos', $title, $message, $data, true);

        // Also send via push service with SOS-specific method
        $this->pushService->sendSOSAlert($parent, array_merge($data, [
            'child_name' => $child->full_name,
            'child_id' => $child->id,
        ]));

        return $notification;
    }

    /**
     * Create geofence event notification
     *
     * @param Guardian $parent
     * @param User $child
     * @param array $eventData
     * @return Notification
     */
    public function createGeofenceNotification(Guardian $parent, User $child, array $eventData): Notification
    {
        $title = $eventData['event_type'] === 'enter'
            ? '📍 Entered Safe Zone'
            : '⚠️ Left Safe Zone';

        $message = $child->full_name .
            ($eventData['event_type'] === 'enter' ? ' has entered' : ' has left') .
            ' the ' . ($eventData['geofence_name'] ?? 'zone') . '.';

        $data = [
            'type' => 'geofence',
            'event_type' => $eventData['event_type'] ?? null,
            'geofence_id' => $eventData['geofence_id'] ?? null,
            'latitude' => $eventData['latitude'] ?? null,
            'longitude' => $eventData['longitude'] ?? null,
        ];

        $notification = $this->createNotification($parent, $child, 'geofence', $title, $message, $data, true);

        // Also send via push service
        $this->pushService->sendGeofenceEvent($parent, array_merge($data, [
            'child_name' => $child->full_name,
            'child_id' => $child->id,
        ]));

        return $notification;
    }

    /**
     * Create low battery warning notification
     *
     * @param Guardian $parent
     * @param User $child
     * @param int $batteryLevel
     * @return Notification
     */
    public function createLowBatteryNotification(Guardian $parent, User $child, int $batteryLevel): Notification
    {
        $title = '🔋 Low Battery Warning';
        $message = $child->full_name . '\'s device battery is low (' . $batteryLevel . '%).';

        $data = [
            'type' => 'battery',
            'battery_level' => $batteryLevel,
        ];

        $notification = $this->createNotification($parent, $child, 'battery', $title, $message, $data, true);

        // Also send via push service
        $this->pushService->sendLowBatteryWarning($parent, [
            'child_name' => $child->full_name,
            'child_id' => $child->id,
            'battery_level' => $batteryLevel,
        ]);

        return $notification;
    }

    /**
     * Create link request notification (bidirectional)
     *
     * @param string $recipientType 'parent' or 'child'
     * @param int $recipientId
     * @param string $senderType 'parent' or 'child'
     * @param int $senderId
     * @param int $linkRequestId
     * @param string $message
     * @param string|null $customMessage
     * @return Notification
     */
    public function createLinkRequestNotification(
        string $recipientType,
        int $recipientId,
        string $senderType,
        int $senderId,
        int $linkRequestId,
        string $message,
        ?string $customMessage = null
    ): Notification {
        $title = 'Link Request';
        $notificationData = [
            'type' => 'link_request',
            'link_request_id' => $linkRequestId,
            'sender_type' => $senderType,
            'sender_id' => $senderId,
        ];

        $notification = Notification::create([
            'recipient_type' => $recipientType,
            'recipient_id' => $recipientId,
            'parent_id' => $recipientType === 'parent' ? $recipientId : ($senderType === 'parent' ? $senderId : null),
            'child_id' => $recipientType === 'child' ? $recipientId : ($senderType === 'child' ? $senderId : null),
            'type' => 'link_request',
            'title' => $title,
            'message' => $message,
            'data' => $notificationData,
            'is_read' => false,
        ]);

        // Send push notification
        if ($recipientType === 'parent') {
            $parent = Guardian::find($recipientId);
            if ($parent) {
                $this->pushService->sendToParent($parent, $title, $message, $notificationData, 'normal');
            }
        } else {
            // TODO: Implement child push notification service
            // For now, we'll just create the notification record
        }

        return $notification;
    }

    /**
     * Create link accepted notification (bidirectional)
     *
     * @param string $recipientType 'parent' or 'child'
     * @param int $recipientId
     * @param string $senderType 'parent' or 'child'
     * @param int $senderId
     * @param int|null $linkRequestId Null for direct links (e.g., via QR code)
     * @param string $message
     * @return Notification
     */
    public function createLinkAcceptedNotification(
        string $recipientType,
        int $recipientId,
        string $senderType,
        int $senderId,
        ?int $linkRequestId,
        string $message
    ): Notification {
        $title = 'Link Request Accepted';
        $notificationData = [
            'type' => 'link_accepted',
            'link_request_id' => $linkRequestId,
            'sender_type' => $senderType,
            'sender_id' => $senderId,
        ];

        $notification = Notification::create([
            'recipient_type' => $recipientType,
            'recipient_id' => $recipientId,
            'parent_id' => $recipientType === 'parent' ? $recipientId : ($senderType === 'parent' ? $senderId : null),
            'child_id' => $recipientType === 'child' ? $recipientId : ($senderType === 'child' ? $senderId : null),
            'type' => 'link_accepted',
            'title' => $title,
            'message' => $message,
            'data' => $notificationData,
            'is_read' => false,
        ]);

        // Send push notification
        if ($recipientType === 'parent') {
            $parent = Guardian::find($recipientId);
            if ($parent) {
                $this->pushService->sendToParent($parent, $title, $message, $notificationData, 'normal');
            }
        } else {
            // TODO: Implement child push notification service
        }

        return $notification;
    }

    /**
     * Create link rejected notification (bidirectional)
     *
     * @param string $recipientType 'parent' or 'child'
     * @param int $recipientId
     * @param string $senderType 'parent' or 'child'
     * @param int $senderId
     * @param int $linkRequestId
     * @param string $message
     * @return Notification
     */
    public function createLinkRejectedNotification(
        string $recipientType,
        int $recipientId,
        string $senderType,
        int $senderId,
        int $linkRequestId,
        string $message
    ): Notification {
        $title = 'Link Request Rejected';
        $notificationData = [
            'type' => 'link_rejected',
            'link_request_id' => $linkRequestId,
            'sender_type' => $senderType,
            'sender_id' => $senderId,
        ];

        $notification = Notification::create([
            'recipient_type' => $recipientType,
            'recipient_id' => $recipientId,
            'parent_id' => $recipientType === 'parent' ? $recipientId : ($senderType === 'parent' ? $senderId : null),
            'child_id' => $recipientType === 'child' ? $recipientId : ($senderType === 'child' ? $senderId : null),
            'type' => 'link_rejected',
            'title' => $title,
            'message' => $message,
            'data' => $notificationData,
            'is_read' => false,
        ]);

        // Send push notification
        if ($recipientType === 'parent') {
            $parent = Guardian::find($recipientId);
            if ($parent) {
                $this->pushService->sendToParent($parent, $title, $message, $notificationData, 'normal');
            }
        } else {
            // TODO: Implement child push notification service
        }

        return $notification;
    }

    /**
     * Create link revoked notification (bidirectional)
     *
     * @param string $recipientType 'parent' or 'child'
     * @param int $recipientId
     * @param string $senderType 'parent' or 'child'
     * @param int $senderId
     * @param string $message
     * @return Notification
     */
    public function createLinkRevokedNotification(
        string $recipientType,
        int $recipientId,
        string $senderType,
        int $senderId,
        string $message
    ): Notification {
        $title = 'Link Removed';
        $notificationData = [
            'type' => 'link_revoked',
            'sender_type' => $senderType,
            'sender_id' => $senderId,
        ];

        $notification = Notification::create([
            'recipient_type' => $recipientType,
            'recipient_id' => $recipientId,
            'parent_id' => $recipientType === 'parent' ? $recipientId : ($senderType === 'parent' ? $senderId : null),
            'child_id' => $recipientType === 'child' ? $recipientId : ($senderType === 'child' ? $senderId : null),
            'type' => 'link_rejected', // Using link_rejected type for revoked
            'title' => $title,
            'message' => $message,
            'data' => $notificationData,
            'is_read' => false,
        ]);

        // Send push notification
        if ($recipientType === 'parent') {
            $parent = Guardian::find($recipientId);
            if ($parent) {
                $this->pushService->sendToParent($parent, $title, $message, $notificationData, 'normal');
            }
        } else {
            // TODO: Implement child push notification service
        }

        return $notification;
    }

    /**
     * Create message notification (bidirectional)
     * When child sends message to parent, parent gets notification
     * When parent sends message to child, child gets notification
     *
     * @param int $parentId
     * @param int $childId
     * @param string $senderType 'parent' or 'child'
     * @param int $messageId
     * @param string $messageText
     * @param string $messageType 'text', 'image', 'video', 'audio'
     * @return Notification
     */
    public function createMessageNotification(
        int $parentId,
        int $childId,
        string $senderType,
        int $messageId,
        string $messageText,
        string $messageType = 'text'
    ): Notification {
        // Determine recipient
        $recipientType = $senderType === 'parent' ? 'child' : 'parent';
        $recipientId = $senderType === 'parent' ? $childId : $parentId;
        
        // Get sender name
        if ($senderType === 'parent') {
            $parent = Guardian::find($parentId);
            $senderName = $parent ? ($parent->full_name ?? $parent->name ?? 'Parent') : 'Parent';
            $child = User::find($childId);
            $recipientName = $child ? ($child->full_name ?? $child->name ?? 'Child') : 'Child';
        } else {
            $child = User::find($childId);
            $senderName = $child ? ($child->full_name ?? $child->name ?? 'Child') : 'Child';
            $parent = Guardian::find($parentId);
            $recipientName = $parent ? ($parent->full_name ?? $parent->name ?? 'Parent') : 'Parent';
        }

        // Create notification title and message
        $title = '💬 New Message from ' . $senderName;
        
        // Truncate message for notification
        $previewMessage = strlen($messageText) > 100 
            ? substr($messageText, 0, 100) . '...' 
            : $messageText;
        
        $notificationMessage = $senderName . ': ' . $previewMessage;
        
        // Adjust message for media types
        if ($messageType !== 'text') {
            $mediaTypeLabels = [
                'image' => '📷 sent an image',
                'video' => '🎥 sent a video',
                'audio' => '🎤 sent an audio',
            ];
            $notificationMessage = $senderName . ' ' . ($mediaTypeLabels[$messageType] ?? 'sent a ' . $messageType);
        }

        $notificationData = [
            'type' => 'message',
            'message_id' => $messageId,
            'parent_id' => $parentId,
            'child_id' => $childId,
            'sender_type' => $senderType,
            'message_type' => $messageType,
        ];

        // Create notification record
        $notification = Notification::create([
            'recipient_type' => $recipientType,
            'recipient_id' => $recipientId,
            'parent_id' => $parentId,
            'child_id' => $childId,
            'type' => 'message',
            'title' => $title,
            'message' => $notificationMessage,
            'data' => $notificationData,
            'is_read' => false,
        ]);

        // Send push notification
        if ($recipientType === 'parent') {
            $parent = Guardian::find($parentId);
            if ($parent) {
                \Illuminate\Support\Facades\Log::info('Attempting to send push notification to parent', [
                    'parent_id' => $parentId,
                    'parent_name' => $parent->name ?? $parent->full_name ?? 'Unknown',
                    'title' => $title,
                    'message' => $notificationMessage,
                ]);
                
                $pushSent = $this->pushService->sendToParent($parent, $title, $notificationMessage, $notificationData, 'normal');
                
                \Illuminate\Support\Facades\Log::info('Push notification result', [
                    'parent_id' => $parentId,
                    'push_sent' => $pushSent,
                ]);
            } else {
                \Illuminate\Support\Facades\Log::warning('Parent not found for push notification', [
                    'parent_id' => $parentId,
                ]);
            }
        } else {
            // Send push notification to child
            $child = User::find($childId);
            if ($child) {
                \Illuminate\Support\Facades\Log::info('Attempting to send push notification to child', [
                    'child_id' => $childId,
                    'child_name' => $child->full_name ?? $child->name ?? 'Unknown',
                    'title' => $title,
                    'message' => $notificationMessage,
                ]);
                
                $pushSent = $this->pushService->sendToChild($child, $title, $notificationMessage, $notificationData, 'normal');
                
                \Illuminate\Support\Facades\Log::info('Push notification result for child', [
                    'child_id' => $childId,
                    'push_sent' => $pushSent,
                ]);
            } else {
                \Illuminate\Support\Facades\Log::warning('Child not found for push notification', [
                    'child_id' => $childId,
                ]);
            }
            
            \Illuminate\Support\Facades\Log::info('Message notification created for child', [
                'child_id' => $childId,
                'message_id' => $messageId,
                'title' => $title,
                'note' => 'Push notification not sent - ChildDeviceToken model not implemented',
            ]);
            
            // TODO: Implement child push notification if ChildDeviceToken model exists
            // $this->pushService->sendToChild($child, $title, $notificationMessage, $notificationData, 'normal');
        }

        \Illuminate\Support\Facades\Log::info('Message notification created successfully', [
            'notification_id' => $notification->id,
            'recipient_type' => $recipientType,
            'recipient_id' => $recipientId,
            'message_id' => $messageId,
        ]);

        return $notification;
    }

    /**
     * Get priority for notification type
     *
     * @param string $type
     * @return string
     */
    private function getPriorityForType(string $type): string
    {
        return match ($type) {
            'sos' => 'high',
            'battery' => 'normal',
            'geofence' => 'normal',
            'checkin' => 'normal',
            'message' => 'normal',
            'link_request', 'link_accepted', 'link_rejected' => 'normal',
            default => 'normal',
        };
    }
}



<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\User;
use App\Models\ParentDeviceToken;
use App\Models\ChildDeviceToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    /**
     * Send push notification to parent
     *
     * @param Guardian $parent
     * @param string $title
     * @param string $message
     * @param array $data
     * @param string $priority
     * @return bool
     */
    public function sendToParent(Guardian $parent, string $title, string $message, array $data = [], string $priority = 'high'): bool
    {
        $tokens = ParentDeviceToken::where('parent_id', $parent->id)
            ->where('is_active', true)
            ->get();

        if ($tokens->isEmpty()) {
            Log::warning('No active device tokens found for parent', [
                'parent_id' => $parent->id,
                'parent_name' => $parent->name ?? $parent->full_name ?? 'Unknown',
            ]);
            return false;
        }

        Log::info('Sending push notifications to parent', [
            'parent_id' => $parent->id,
            'total_tokens' => $tokens->count(),
            'title' => $title,
            'message' => $message,
        ]);

        $successCount = 0;
        foreach ($tokens as $deviceToken) {
            $sent = $this->sendToDevice($deviceToken, $title, $message, $data, $priority);
            if ($sent) {
                $successCount++;
                // Update last used timestamp
                $deviceToken->update(['last_used_at' => now()]);
            }
        }

        Log::info('Push notifications sent', [
            'parent_id' => $parent->id,
            'total_tokens' => $tokens->count(),
            'success_count' => $successCount,
            'failed_count' => $tokens->count() - $successCount,
        ]);

        return $successCount > 0;
    }

    /**
     * Send push notification to specific device
     *
     * @param ParentDeviceToken|ChildDeviceToken $deviceToken
     * @param string $title
     * @param string $message
     * @param array $data
     * @param string $priority
     * @return bool
     */
    private function sendToDevice($deviceToken, string $title, string $message, array $data = [], string $priority = 'high'): bool
    {
        try {
            // Check if token is an Expo push token
            if ($this->isExpoToken($deviceToken->token)) {
                return $this->sendExpoPush($deviceToken->token, $title, $message, $data, $priority);
            }

            // Otherwise, use native push services
            switch ($deviceToken->platform) {
                case 'android':
                    return $this->sendFCM($deviceToken->token, $title, $message, $data, $priority);
                
                case 'ios':
                    return $this->sendAPNS($deviceToken->token, $title, $message, $data, $priority);
                
                case 'web':
                    return $this->sendWebPush($deviceToken->token, $title, $message, $data, $priority);
                
                default:
                    Log::warning('Unknown platform for push notification', ['platform' => $deviceToken->platform]);
                    return false;
            }
        } catch (\Exception $e) {
            Log::error('Failed to send push notification', [
                'device_token_id' => $deviceToken->id,
                'platform' => $deviceToken->platform,
                'token_preview' => substr($deviceToken->token, 0, 20) . '...',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Check if token is an Expo push token
     *
     * @param string $token
     * @return bool
     */
    private function isExpoToken(string $token): bool
    {
        return strpos($token, 'ExponentPushToken[') === 0 || strpos($token, 'ExpoPushToken[') === 0;
    }

    /**
     * Send push notification via Expo Push Notification Service
     *
     * @param string $token Expo push token
     * @param string $title
     * @param string $message
     * @param array $data
     * @param string $priority
     * @return bool
     */
    private function sendExpoPush(string $token, string $title, string $message, array $data = [], string $priority = 'high'): bool
    {
        try {
            $expoApiUrl = 'https://exp.host/--/api/v2/push/send';
            
            $payload = [
                'to' => $token,
                'title' => $title,
                'body' => $message,
                'sound' => 'default',
                'priority' => $priority === 'high' ? 'high' : 'default',
                'badge' => 1,
                'data' => array_merge([
                    'type' => $data['type'] ?? 'message',
                ], $data),
            ];

            Log::info('Sending Expo push notification', [
                'token_preview' => substr($token, 0, 30) . '...',
                'title' => $title,
                'message' => $message,
            ]);

            $response = Http::timeout(10)->withHeaders([
                'Accept' => 'application/json',
                'Accept-Encoding' => 'gzip, deflate',
                'Content-Type' => 'application/json',
            ])->post($expoApiUrl, [$payload]);
            
            Log::info('Expo push API response received', [
                'status_code' => $response->status(),
                'successful' => $response->successful(),
            ]);

            if ($response->successful()) {
                $result = $response->json();
                
                // Expo returns an array with status for each message
                if (isset($result['data']) && is_array($result['data']) && count($result['data']) > 0) {
                    $status = $result['data'][0]['status'] ?? null;
                    
                    if ($status === 'ok') {
                        Log::info('Expo push notification sent successfully', [
                            'token_preview' => substr($token, 0, 30) . '...',
                            'receipt_id' => $result['data'][0]['id'] ?? null,
                        ]);
                        return true;
                    } else {
                        $error = $result['data'][0]['message'] ?? 'Unknown error';
                        Log::warning('Expo push notification failed', [
                            'token_preview' => substr($token, 0, 30) . '...',
                            'status' => $status,
                            'error' => $error,
                        ]);
                        
                        // Handle invalid token - check both parent and child tokens
                        if (in_array($status, ['DeviceNotRegistered', 'InvalidCredentials'])) {
                            ParentDeviceToken::where('token', $token)->update(['is_active' => false]);
                            ChildDeviceToken::where('token', $token)->update(['is_active' => false]);
                        }
                    }
                }
            } else {
                Log::error('Expo push API request failed', [
                    'status_code' => $response->status(),
                    'response' => $response->body(),
                ]);
            }

            return false;
        } catch (\Exception $e) {
            Log::error('Expo push send error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Send Firebase Cloud Messaging (FCM) notification
     *
     * @param string $token
     * @param string $title
     * @param string $message
     * @param array $data
     * @param string $priority
     * @return bool
     */
    private function sendFCM(string $token, string $title, string $message, array $data = [], string $priority = 'high'): bool
    {
        $serverKey = config('services.fcm.server_key');
        
        if (!$serverKey) {
            Log::warning('FCM server key not configured');
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'key=' . $serverKey,
                'Content-Type' => 'application/json',
            ])->post('https://fcm.googleapis.com/fcm/send', [
                'to' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $message,
                    'sound' => 'default',
                    'priority' => $priority,
                    'badge' => 1,
                ],
                'data' => array_merge([
                    'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                    'sound' => 'default',
                ], $data),
                'priority' => $priority === 'high' ? 'high' : 'normal',
            ]);

            if ($response->successful()) {
                $result = $response->json();
                
                Log::info('FCM API response', [
                    'response' => $result,
                    'token_preview' => substr($token, 0, 20) . '...',
                ]);
                
                if (isset($result['success']) && $result['success'] > 0) {
                    Log::info('FCM push notification sent successfully');
                    return true;
                }
                
                // Handle invalid token
                if (isset($result['results'][0]['error'])) {
                    $error = $result['results'][0]['error'];
                    Log::warning('FCM push notification failed', [
                        'error' => $error,
                        'token_preview' => substr($token, 0, 20) . '...',
                    ]);
                    
                    if (in_array($error, ['InvalidRegistration', 'NotRegistered'])) {
                        // Deactivate invalid token
                        ParentDeviceToken::where('token', $token)->update(['is_active' => false]);
                    }
                } else {
                    Log::warning('FCM push notification failed - unknown error', [
                        'response' => $result,
                    ]);
                }
            } else {
                Log::error('FCM API request failed', [
                    'status_code' => $response->status(),
                    'response' => $response->body(),
                ]);
            }

            return false;
        } catch (\Exception $e) {
            Log::error('FCM send error', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Send Apple Push Notification Service (APNS) notification
     *
     * @param string $token
     * @param string $title
     * @param string $message
     * @param array $data
     * @param string $priority
     * @return bool
     */
    private function sendAPNS(string $token, string $title, string $message, array $data = [], string $priority = 'high'): bool
    {
        // TODO: Implement APNS
        // For now, you can use libraries like:
        // - pushok/pushok (PHP APNS library)
        // - Laravel Notification channels
        
        Log::info('APNS notification (not implemented)', [
            'token' => substr($token, 0, 20) . '...',
            'title' => $title,
            'message' => $message,
        ]);

        return false;
    }

    /**
     * Send Web Push notification
     *
     * @param string $token
     * @param string $title
     * @param string $message
     * @param array $data
     * @param string $priority
     * @return bool
     */
    private function sendWebPush(string $token, string $title, string $message, array $data = [], string $priority = 'high'): bool
    {
        // TODO: Implement Web Push (using VAPID keys)
        Log::info('Web Push notification (not implemented)', [
            'token' => substr($token, 0, 20) . '...',
            'title' => $title,
            'message' => $message,
        ]);

        return false;
    }

    /**
     * Send notification for SOS alert (highest priority)
     *
     * @param Guardian $parent
     * @param array $alertData
     * @return bool
     */
    public function sendSOSAlert(Guardian $parent, array $alertData): bool
    {
        $title = '🚨 SOS ALERT - ' . ($alertData['child_name'] ?? 'Emergency');
        $message = ($alertData['child_name'] ?? 'Your child') . ' has triggered an SOS alert!';
        
        $data = [
            'type' => 'sos',
            'alert_id' => $alertData['alert_id'] ?? null,
            'child_id' => $alertData['child_id'] ?? null,
            'latitude' => $alertData['latitude'] ?? null,
            'longitude' => $alertData['longitude'] ?? null,
            'address' => $alertData['address'] ?? null,
        ];

        return $this->sendToParent($parent, $title, $message, $data, 'high');
    }

    /**
     * Send notification for geofence event
     *
     * @param Guardian $parent
     * @param array $eventData
     * @return bool
     */
    public function sendGeofenceEvent(Guardian $parent, array $eventData): bool
    {
        $title = $eventData['event_type'] === 'enter' 
            ? '📍 Entered Safe Zone' 
            : '⚠️ Left Safe Zone';
        
        $message = ($eventData['child_name'] ?? 'Your child') . 
            ($eventData['event_type'] === 'enter' ? ' has entered' : ' has left') . 
            ' the ' . ($eventData['geofence_name'] ?? 'zone') . '.';

        $data = [
            'type' => 'geofence',
            'event_type' => $eventData['event_type'] ?? null,
            'geofence_id' => $eventData['geofence_id'] ?? null,
            'child_id' => $eventData['child_id'] ?? null,
            'latitude' => $eventData['latitude'] ?? null,
            'longitude' => $eventData['longitude'] ?? null,
        ];

        return $this->sendToParent($parent, $title, $message, $data, 'normal');
    }

    /**
     * Send notification for low battery warning
     *
     * @param Guardian $parent
     * @param array $batteryData
     * @return bool
     */
    public function sendLowBatteryWarning(Guardian $parent, array $batteryData): bool
    {
        $title = '🔋 Low Battery Warning';
        $message = ($batteryData['child_name'] ?? 'Your child') . 
            '\'s device battery is low (' . ($batteryData['battery_level'] ?? 'unknown') . '%).';

        $data = [
            'type' => 'battery',
            'child_id' => $batteryData['child_id'] ?? null,
            'battery_level' => $batteryData['battery_level'] ?? null,
        ];

        return $this->sendToParent($parent, $title, $message, $data, 'normal');
    }

    /**
     * Send push notification to child
     *
     * @param User $child
     * @param string $title
     * @param string $message
     * @param array $data
     * @param string $priority
     * @return bool
     */
    public function sendToChild(User $child, string $title, string $message, array $data = [], string $priority = 'high'): bool
    {
        $tokens = ChildDeviceToken::where('child_id', $child->id)
            ->where('is_active', true)
            ->get();

        if ($tokens->isEmpty()) {
            Log::warning('No active device tokens found for child', [
                'child_id' => $child->id,
                'child_name' => $child->full_name ?? $child->name ?? 'Unknown',
            ]);
            return false;
        }

        Log::info('Sending push notifications to child', [
            'child_id' => $child->id,
            'total_tokens' => $tokens->count(),
            'title' => $title,
            'message' => $message,
        ]);

        $successCount = 0;
        foreach ($tokens as $deviceToken) {
            $sent = $this->sendToDevice($deviceToken, $title, $message, $data, $priority);
            if ($sent) {
                $successCount++;
                // Update last used timestamp
                $deviceToken->update(['last_used_at' => now()]);
            }
        }

        Log::info('Push notifications sent to child', [
            'child_id' => $child->id,
            'total_tokens' => $tokens->count(),
            'success_count' => $successCount,
            'failed_count' => $tokens->count() - $successCount,
        ]);

        return $successCount > 0;
    }
}


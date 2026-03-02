<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SosAlert;
use App\Models\ParentChildLink;
use App\Models\Notification;
use App\Models\LocationHistory;
use App\Services\NotificationService;
use App\Events\SosAlertTriggered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class ChildSosController extends Controller
{
    /**
     * Trigger SOS alert
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function triggerSos(Request $request)
    {
        try {
            $validator = \Validator::make($request->all(), [
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
                'message' => 'nullable|string|max:500',
            ], [
                'latitude.required' => 'Latitude is required.',
                'latitude.numeric' => 'Latitude must be a number.',
                'longitude.required' => 'Longitude is required.',
                'longitude.numeric' => 'Longitude must be a number.',
                'message.max' => 'Message must not exceed 500 characters.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $child = $request->user();
            $latitude = $request->latitude;
            $longitude = $request->longitude;
            $message = $request->message;

            // Reverse geocode to get address
            $address = $this->reverseGeocode($latitude, $longitude);

            // Get all active linked parents
            $activeLinks = ParentChildLink::where('child_id', $child->id)
                ->where('status', 'active')
                ->with('parent:id,name,email,phone')
                ->get();

            if ($activeLinks->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active parent links found. Please link with a parent first.',
                ], 400);
            }

            // Save location to history immediately
            LocationHistory::create([
                'child_id' => $child->id,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'address' => $address,
                'battery_level' => $request->battery_level ?? null,
                'recorded_at' => now(),
            ]);

            // Create SOS alert for each parent
            $alerts = [];
            $notifications = [];

            DB::beginTransaction();
            try {
                foreach ($activeLinks as $link) {
                    // Create SOS alert
                    $alert = SosAlert::create([
                        'child_id' => $child->id,
                        'parent_id' => $link->parent_id,
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                        'address' => $address,
                        'message' => $message,
                        'status' => 'active',
                        'triggered_at' => now(),
                    ]);

                    $alerts[] = $alert;

                    // Create notification record without sending push notifications
                    // (Message sending system removed per requirements)
                    $notificationService = app(NotificationService::class);
                    $parent = $link->parent;
                    
                    // Create notification but disable push notification sending
                    $notification = $notificationService->createNotification(
                        $parent,
                        $child,
                        'sos',
                        '🚨 SOS ALERT - ' . $child->full_name,
                        $child->full_name . ' has triggered an SOS alert. Location: ' .
                            ($address ?? $latitude . ', ' . $longitude),
                        [
                            'type' => 'sos',
                            'alert_id' => $alert->id,
                            'latitude' => $latitude,
                            'longitude' => $longitude,
                            'address' => $address,
                        ],
                        false // Disable push notification sending
                    );

                    $notifications[] = $notification;

                    // Broadcast SOS alert event for real-time updates
                    broadcast(new SosAlertTriggered($alert))->toOthers();
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            return response()->json([
                'success' => true,
                'message' => 'SOS alert triggered successfully. Alert records created.',
                'data' => [
                    'alert_id' => $alerts[0]->id ?? null,
                    'alerts_created' => count($alerts),
                    'notifications_created' => count($notifications),
                    'location' => [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                        'address' => $address,
                    ],
                    'message' => $message,
                    'triggered_at' => now(),
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to trigger SOS alert.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Cancel/Resolve SOS alert
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function cancelSos(Request $request)
    {
        try {
            $child = $request->user();
            $alertId = $request->alert_id;

            // If alert_id is provided, validate it exists and belongs to this child
            if ($alertId) {
                $validator = \Validator::make($request->all(), [
                    'alert_id' => 'nullable|integer|exists:sos_alerts,id',
                ]);

                if ($validator->fails()) {
                    // If alert_id is invalid, just resolve all active alerts for this child
                    \Log::warning('Invalid alert_id provided for cancelSos, resolving all active alerts', [
                        'child_id' => $child->id,
                        'alert_id' => $alertId,
                    ]);
                }
            }

            // Get all active alerts for this child
            // If alert_id is provided and valid, use it; otherwise resolve all active alerts
            $query = SosAlert::where('child_id', $child->id)
                ->where('status', '!=', 'resolved');
            
            if ($alertId) {
                $query->where('id', $alertId);
            }
            
            $alerts = $query->get();

            if ($alerts->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'No active alerts to cancel.',
                    'data' => [
                        'alerts_resolved' => 0,
                        'cancelled_at' => now(),
                    ]
                ], 200);
            }

            // Resolve all alerts for this SOS (same trigger)
            $resolvedCount = 0;
            foreach ($alerts as $alert) {
                $alert->resolve();
                $resolvedCount++;

                // Notify parent that child cancelled SOS
                Notification::create([
                    'parent_id' => $alert->parent_id,
                    'child_id' => $child->id,
                    'type' => 'sos',
                    'title' => 'SOS Alert Cancelled',
                    'message' => $child->full_name . ' has cancelled the SOS alert.',
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'SOS alert cancelled successfully.',
                'data' => [
                    'alerts_resolved' => $resolvedCount,
                    'cancelled_at' => now(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel SOS alert.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Reverse geocode coordinates to address
     *
     * @param float $latitude
     * @param float $longitude
     * @return string|null
     */
    private function reverseGeocode($latitude, $longitude)
    {
        try {
            $response = Http::timeout(2)->get('https://nominatim.openstreetmap.org/reverse', [
                'format' => 'json',
                'lat' => $latitude,
                'lon' => $longitude,
                'zoom' => 18,
                'addressdetails' => 1,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['display_name'])) {
                    return $data['display_name'];
                }
            }
        } catch (\Exception $e) {
            \Log::debug('Geocoding failed: ' . $e->getMessage());
        }

        return null;
    }

}


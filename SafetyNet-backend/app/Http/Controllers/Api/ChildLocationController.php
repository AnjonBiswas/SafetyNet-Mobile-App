<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\LocationHistory;
use App\Models\ParentChildLink;
use App\Models\Notification;
use App\Models\Geofence;
use App\Models\GeofenceEvent;
use App\Services\NotificationService;
use App\Events\LocationUpdated;
use App\Events\GeofenceEventOccurred;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class ChildLocationController extends Controller
{
    /**
     * Update child location
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateLocation(Request $request)
    {
        try {
            // Rate limiting: max 60 requests per minute
            $key = 'location_update:' . $request->user()->id;
            if (RateLimiter::tooManyAttempts($key, 60)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many location updates. Please wait a moment.',
                ], 429);
            }
            RateLimiter::hit($key, 60); // 60 seconds

            $validator = \Validator::make($request->all(), [
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
                'battery_level' => 'nullable|integer|min:0|max:100',
            ], [
                'latitude.required' => 'Latitude is required.',
                'latitude.numeric' => 'Latitude must be a number.',
                'latitude.between' => 'Latitude must be between -90 and 90.',
                'longitude.required' => 'Longitude is required.',
                'longitude.numeric' => 'Longitude must be a number.',
                'longitude.between' => 'Longitude must be between -180 and 180.',
                'battery_level.integer' => 'Battery level must be an integer.',
                'battery_level.min' => 'Battery level must be at least 0.',
                'battery_level.max' => 'Battery level must be at most 100.',
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
            $batteryLevel = $request->battery_level;

            // Reverse geocode to get address (optional, non-blocking)
            $address = $this->reverseGeocode($latitude, $longitude);

            // Save location to history
            $locationHistory = LocationHistory::create([
                'child_id' => $child->id,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'address' => $address,
                'battery_level' => $batteryLevel,
                'recorded_at' => now(),
            ]);

            // Get active parents with location sharing enabled
            $activeParents = ParentChildLink::where('child_id', $child->id)
                ->where('status', 'active')
                ->where('location_sharing_enabled', true)
                ->with('parent:id,name,email')
                ->get();

            // Check geofences automatically (background processing)
            $geofenceEvents = $this->checkGeofences($child->id, $latitude, $longitude, $address);

            // Check for low battery warning (if battery level provided)
            if ($batteryLevel !== null && $batteryLevel <= 20) {
                $this->checkLowBattery($child->id, $batteryLevel);
            }

            // Broadcast location update for real-time tracking
            $parentIds = $activeParents->pluck('parent_id')->toArray();
            broadcast(new LocationUpdated($locationHistory, $parentIds))->toOthers();

            // Clean old location history (keep last 30 days by default)
            $this->cleanOldLocationHistory($child->id);

            return response()->json([
                'success' => true,
                'message' => 'Location updated successfully.',
                'data' => [
                    'location' => [
                        'id' => $locationHistory->id,
                        'latitude' => $locationHistory->latitude,
                        'longitude' => $locationHistory->longitude,
                        'address' => $locationHistory->address,
                        'battery_level' => $locationHistory->battery_level,
                        'recorded_at' => $locationHistory->recorded_at,
                    ],
                    'shared_with' => $activeParents->count() . ' parent(s)',
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update location.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get location sharing status for all parents
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSharingStatus(Request $request)
    {
        try {
            $child = $request->user();

            $links = ParentChildLink::where('child_id', $child->id)
                ->where('status', 'active')
                ->with('parent:id,name,email')
                ->get();

            $sharingStatus = $links->map(function ($link) {
                return [
                    'parent_id' => $link->parent_id,
                    'parent_name' => $link->parent->name,
                    'parent_email' => $link->parent->email,
                    'location_sharing_enabled' => $link->location_sharing_enabled,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'sharing_status' => $sharingStatus,
                    'total_parents' => $sharingStatus->count(),
                    'sharing_enabled_count' => $sharingStatus->where('location_sharing_enabled', true)->count(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve sharing status.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Update location sharing for a specific parent
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateSharing(Request $request)
    {
        try {
            $validator = \Validator::make($request->all(), [
                'parent_id' => 'required|integer|exists:parents,id',
                'enabled' => 'required|boolean',
            ], [
                'parent_id.required' => 'Parent ID is required.',
                'parent_id.exists' => 'Parent not found.',
                'enabled.required' => 'Enabled status is required.',
                'enabled.boolean' => 'Enabled must be true or false.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $child = $request->user();

            $link = ParentChildLink::where('child_id', $child->id)
                ->where('parent_id', $request->parent_id)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'Active link with this parent not found.',
                ], 404);
            }

            $link->update([
                'location_sharing_enabled' => $request->enabled,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Location sharing updated successfully.',
                'data' => [
                    'parent_id' => $link->parent_id,
                    'location_sharing_enabled' => $link->location_sharing_enabled,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update location sharing.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Reverse geocode coordinates to address (optional)
     *
     * @param float $latitude
     * @param float $longitude
     * @return string|null
     */
    private function reverseGeocode($latitude, $longitude)
    {
        try {
            // Using Nominatim (OpenStreetMap) - free, no API key required
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
            // Silently fail - geocoding is optional
            \Log::debug('Geocoding failed: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Check geofences for location update (background processing)
     *
     * @param int $childId
     * @param float $latitude
     * @param float $longitude
     * @param string|null $address
     * @return array
     */
    private function checkGeofences($childId, $latitude, $longitude, $address = null)
    {
        $events = [];
        
        try {
            // Get all active geofences for this child
            $geofences = Geofence::where('child_id', $childId)
                ->where('is_active', true)
                ->with('parent:id,name,email')
                ->get();

            foreach ($geofences as $geofence) {
                $isInside = $geofence->containsLocation($latitude, $longitude);
                $distance = $geofence->calculateDistance(
                    $geofence->latitude,
                    $geofence->longitude,
                    $latitude,
                    $longitude
                );

                // Get the last event for this geofence
                $lastEvent = GeofenceEvent::where('geofence_id', $geofence->id)
                    ->where('child_id', $childId)
                    ->latest('occurred_at')
                    ->first();

                // Determine if we need to create a new event
                $shouldCreateEvent = false;
                $eventType = null;

                if ($isInside && (!$lastEvent || $lastEvent->event_type === 'exit')) {
                    // Child entered the geofence
                    $shouldCreateEvent = true;
                    $eventType = 'enter';
                } elseif (!$isInside && $lastEvent && $lastEvent->event_type === 'enter') {
                    // Child exited the geofence
                    $shouldCreateEvent = true;
                    $eventType = 'exit';
                }

                if ($shouldCreateEvent) {
                    DB::beginTransaction();
                    try {
                        // Create geofence event
                        $event = GeofenceEvent::create([
                            'geofence_id' => $geofence->id,
                            'child_id' => $childId,
                            'parent_id' => $geofence->parent_id,
                            'event_type' => $eventType,
                            'latitude' => $latitude,
                            'longitude' => $longitude,
                            'address' => $address,
                            'distance_from_center' => (int) $distance,
                            'occurred_at' => now(),
                        ]);

                        $events[] = $event;

                        // Get child info for notification
                        $child = User::find($childId);
                        if ($child) {
                            // Create notification using NotificationService
                            $notificationService = app(NotificationService::class);
                            $parent = $geofence->parent;
                            
                            $notificationService->createGeofenceNotification($parent, $child, [
                                'event_type' => $eventType,
                                'geofence_id' => $geofence->id,
                                'geofence_name' => $geofence->name,
                                'latitude' => $latitude,
                                'longitude' => $longitude,
                                'address' => $address,
                            ]);

                            // Broadcast geofence event for real-time updates
                            broadcast(new GeofenceEventOccurred($event))->toOthers();
                        }

                        DB::commit();
                    } catch (\Exception $e) {
                        DB::rollBack();
                        \Log::error('Failed to create geofence event: ' . $e->getMessage());
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to check geofences: ' . $e->getMessage());
        }

        return $events;
    }

    /**
     * Check for low battery and notify parents
     *
     * @param int $childId
     * @param int $batteryLevel
     * @return void
     */
    private function checkLowBattery($childId, $batteryLevel)
    {
        try {
            // Only notify if battery is 20% or below
            if ($batteryLevel > 20) {
                return;
            }

            // Get active linked parents
            $activeLinks = ParentChildLink::where('child_id', $childId)
                ->where('status', 'active')
                ->with('parent:id,name,email')
                ->get();

            if ($activeLinks->isEmpty()) {
                return;
            }

            $child = User::find($childId);
            if (!$child) {
                return;
            }

            // Check if we've already notified recently (within last hour)
            $recentNotification = Notification::where('child_id', $childId)
                ->where('type', 'battery')
                ->where('created_at', '>=', now()->subHour())
                ->exists();

            if ($recentNotification) {
                return; // Already notified recently
            }

            // Notify all parents
            $notificationService = app(NotificationService::class);
            foreach ($activeLinks as $link) {
                $notificationService->createLowBatteryNotification($link->parent, $child, $batteryLevel);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to check low battery: ' . $e->getMessage());
        }
    }

    /**
     * Clean old location history (keep last 30 days)
     *
     * @param int $childId
     * @return void
     */
    private function cleanOldLocationHistory($childId)
    {
        try {
            $retentionDays = config('app.location_history_retention_days', 30);
            $cutoffDate = now()->subDays($retentionDays);

            LocationHistory::where('child_id', $childId)
                ->where('recorded_at', '<', $cutoffDate)
                ->delete();
        } catch (\Exception $e) {
            \Log::error('Failed to clean old location history: ' . $e->getMessage());
        }
    }
}


<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Geofence;
use App\Models\GeofenceEvent;
use App\Models\Notification;
use App\Services\NotificationService;
use App\Events\GeofenceEventOccurred;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChildGeofenceController extends Controller
{
    /**
     * Check geofences for current location
     * This is called when child location is updated
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function checkGeofences(Request $request)
    {
        try {
            $validator = \Validator::make($request->all(), [
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
            ], [
                'latitude.required' => 'Latitude is required.',
                'longitude.required' => 'Longitude is required.',
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

            // Get all active geofences for this child
            $geofences = Geofence::where('child_id', $child->id)
                ->where('is_active', true)
                ->with('parent:id,name,email')
                ->get();

            $events = [];
            $notifications = [];

            DB::beginTransaction();
            try {
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
                        ->where('child_id', $child->id)
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
                        // Create geofence event
                        $event = GeofenceEvent::create([
                            'geofence_id' => $geofence->id,
                            'child_id' => $child->id,
                            'parent_id' => $geofence->parent_id,
                            'event_type' => $eventType,
                            'latitude' => $latitude,
                            'longitude' => $longitude,
                            'address' => $request->address ?? null,
                            'distance_from_center' => (int) $distance,
                            'occurred_at' => now(),
                        ]);

                        $events[] = $event;

                        // Create notification using NotificationService
                        $notificationService = app(NotificationService::class);
                        $parent = $geofence->parent;
                        
                        $notification = $notificationService->createGeofenceNotification($parent, $child, [
                            'event_type' => $eventType,
                            'geofence_id' => $geofence->id,
                            'geofence_name' => $geofence->name,
                            'latitude' => $latitude,
                            'longitude' => $longitude,
                            'address' => $request->address ?? null,
                        ]);

                        $notifications[] = $notification;

                        // Broadcast geofence event for real-time updates
                        broadcast(new GeofenceEventOccurred($event))->toOthers();
                    }

                    // Add current status to response (for all geofences, not just events)
                    // This will be added outside the loop
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            // Build status array for all geofences
            $geofenceStatus = [];
            foreach ($geofences as $geofence) {
                $isInside = $geofence->containsLocation($latitude, $longitude);
                $distance = $geofence->calculateDistance(
                    $geofence->latitude,
                    $geofence->longitude,
                    $latitude,
                    $longitude
                );

                $geofenceStatus[] = [
                    'geofence_id' => $geofence->id,
                    'geofence_name' => $geofence->name,
                    'is_inside' => $isInside,
                    'distance_from_center' => (int) $distance,
                    'status' => $isInside ? 'inside' : 'outside',
                ];
            }

            return response()->json([
                'success' => true,
                'message' => 'Geofences checked successfully.',
                'data' => [
                    'geofences_checked' => $geofences->count(),
                    'events_created' => count($events),
                    'notifications_sent' => count($notifications),
                    'geofence_status' => $geofenceStatus,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check geofences.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

}


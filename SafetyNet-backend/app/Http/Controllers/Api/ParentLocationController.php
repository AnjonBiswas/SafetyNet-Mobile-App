<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\User;
use App\Models\LocationHistory;
use App\Models\ParentChildLink;
use Illuminate\Http\Request;

class ParentLocationController extends Controller
{
    /**
     * Get current location of a child
     *
     * @param Request $request
     * @param int $childId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getChildLocation(Request $request, $childId)
    {
        try {
            $parent = $request->user();

            // Verify parent has active link with child and location sharing is enabled
            $link = ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $childId)
                ->where('status', 'active')
                ->where('location_sharing_enabled', true)
                ->with('child:id,full_name,email')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have access to this child\'s location.',
                ], 403);
            }

            // Get latest location
            $latestLocation = LocationHistory::where('child_id', $childId)
                ->latest('recorded_at')
                ->first();

            // Load child info
            $child = User::find($childId);

            if (!$latestLocation) {
                return response()->json([
                    'success' => true,
                    'message' => 'No location data available yet.',
                    'data' => [
                        'location' => null,
                        'child' => [
                            'id' => $childId,
                            'name' => $child->full_name ?? 'Unknown',
                            'email' => $child->email ?? null,
                        ],
                    ]
                ], 200);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'location' => [
                        'id' => $latestLocation->id,
                        'latitude' => $latestLocation->latitude,
                        'longitude' => $latestLocation->longitude,
                        'address' => $latestLocation->address,
                        'battery_level' => $latestLocation->battery_level,
                        'recorded_at' => $latestLocation->recorded_at,
                        'age' => $latestLocation->recorded_at->diffForHumans(),
                    ],
                    'child' => [
                        'id' => $child->id,
                        'name' => $child->full_name,
                        'email' => $child->email,
                    ],
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve child location.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get location history of a child
     *
     * @param Request $request
     * @param int $childId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getChildLocationHistory(Request $request, $childId)
    {
        try {
            $parent = $request->user();

            // Verify parent has active link with child and location sharing is enabled
            $link = ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $childId)
                ->where('status', 'active')
                ->where('location_sharing_enabled', true)
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have access to this child\'s location.',
                ], 403);
            }

            // Get date range from query params
            $fromDate = $request->query('from_date', now()->subDays(7)->format('Y-m-d'));
            $toDate = $request->query('to_date', now()->format('Y-m-d'));

            $validator = \Validator::make([
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ], [
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid date range.',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get location history
            $history = LocationHistory::where('child_id', $childId)
                ->whereBetween('recorded_at', [
                    $fromDate . ' 00:00:00',
                    $toDate . ' 23:59:59'
                ])
                ->orderBy('recorded_at', 'desc')
                ->get();

            $locations = $history->map(function ($location) {
                return [
                    'id' => $location->id,
                    'latitude' => $location->latitude,
                    'longitude' => $location->longitude,
                    'address' => $location->address,
                    'battery_level' => $location->battery_level,
                    'recorded_at' => $location->recorded_at,
                    'timestamp' => $location->recorded_at->timestamp,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'locations' => $locations,
                    'count' => $locations->count(),
                    'date_range' => [
                        'from' => $fromDate,
                        'to' => $toDate,
                    ],
                    'child' => [
                        'id' => $childId,
                        'name' => $link->child ? $link->child->full_name : 'Unknown',
                    ],
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve location history.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get live location info (for WebSocket/SSE setup)
     *
     * @param Request $request
     * @param int $childId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLiveLocationInfo(Request $request, $childId)
    {
        try {
            $parent = $request->user();

            // Verify parent has active link with child and location sharing is enabled
            $link = ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $childId)
                ->where('status', 'active')
                ->where('location_sharing_enabled', true)
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have access to this child\'s location.',
                ], 403);
            }

            // Get latest location
            $latestLocation = LocationHistory::where('child_id', $childId)
                ->latest('recorded_at')
                ->first();

            // Calculate time since last update
            $lastUpdate = $latestLocation ? $latestLocation->recorded_at : null;
            $secondsSinceUpdate = $lastUpdate ? now()->diffInSeconds($lastUpdate) : null;
            $isLive = $secondsSinceUpdate !== null && $secondsSinceUpdate < 300; // Consider live if updated within 5 minutes

            return response()->json([
                'success' => true,
                'data' => [
                    'child_id' => $childId,
                    'is_live' => $isLive,
                    'last_update' => $lastUpdate,
                    'seconds_since_update' => $secondsSinceUpdate,
                    'latest_location' => $latestLocation ? [
                        'latitude' => $latestLocation->latitude,
                        'longitude' => $latestLocation->longitude,
                        'address' => $latestLocation->address,
                        'battery_level' => $latestLocation->battery_level,
                        'recorded_at' => $latestLocation->recorded_at,
                    ] : null,
                    'websocket_info' => [
                        'endpoint' => config('app.websocket_url', 'ws://localhost:6001'),
                        'channel' => 'child-location.' . $childId,
                        'event' => 'location-updated',
                    ],
                    'sse_info' => [
                        'endpoint' => url('/api/parent/children/' . $childId . '/location/stream'),
                        'note' => 'Use Server-Sent Events for real-time updates',
                    ],
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve live location info.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}


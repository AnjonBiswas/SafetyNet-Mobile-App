<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Geofence;
use App\Models\ParentChildLink;
use Illuminate\Http\Request;

class ParentGeofenceController extends Controller
{
    /**
     * Create a new geofence
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            $validator = \Validator::make($request->all(), [
                'child_id' => 'required|integer|exists:login,id',
                'name' => 'required|string|max:100',
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
                'radius' => 'required|integer|min:50|max:5000', // 50m to 5km
            ], [
                'child_id.required' => 'Child ID is required.',
                'child_id.exists' => 'Child not found.',
                'name.required' => 'Geofence name is required.',
                'name.max' => 'Name must not exceed 100 characters.',
                'latitude.required' => 'Latitude is required.',
                'longitude.required' => 'Longitude is required.',
                'radius.required' => 'Radius is required.',
                'radius.min' => 'Radius must be at least 50 meters.',
                'radius.max' => 'Radius must not exceed 5000 meters.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $parent = $request->user();

            // Verify parent has active link with child
            $link = ParentChildLink::where('parent_id', $parent->id)
                ->where('child_id', $request->child_id)
                ->where('status', 'active')
                ->first();

            if (!$link) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have an active link with this child.',
                ], 403);
            }

            // Create geofence
            $geofence = Geofence::create([
                'parent_id' => $parent->id,
                'child_id' => $request->child_id,
                'name' => $request->name,
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'radius' => $request->radius,
                'is_active' => true,
            ]);

            // Load relationships
            $geofence->load(['child:id,full_name,email']);

            return response()->json([
                'success' => true,
                'message' => 'Geofence created successfully.',
                'data' => [
                    'geofence' => [
                        'id' => $geofence->id,
                        'name' => $geofence->name,
                        'child' => [
                            'id' => $geofence->child->id,
                            'name' => $geofence->child->full_name,
                            'email' => $geofence->child->email,
                        ],
                        'location' => [
                            'latitude' => $geofence->latitude,
                            'longitude' => $geofence->longitude,
                            'radius' => $geofence->radius,
                            'map_url' => 'https://maps.google.com/?q=' . $geofence->latitude . ',' . $geofence->longitude,
                        ],
                        'is_active' => $geofence->is_active,
                        'created_at' => $geofence->created_at,
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create geofence.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get all geofences
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $parent = $request->user();
            $childId = $request->query('child_id');

            $query = Geofence::where('parent_id', $parent->id)
                ->with(['child:id,full_name,email']);

            // Filter by child if provided
            if ($childId) {
                $query->where('child_id', $childId);
            }

            $geofences = $query->orderBy('created_at', 'desc')->get();

            $geofencesData = $geofences->map(function ($geofence) {
                return [
                    'id' => $geofence->id,
                    'name' => $geofence->name,
                    'child' => [
                        'id' => $geofence->child->id,
                        'name' => $geofence->child->full_name,
                        'email' => $geofence->child->email,
                    ],
                    'location' => [
                        'latitude' => $geofence->latitude,
                        'longitude' => $geofence->longitude,
                        'radius' => $geofence->radius,
                        'map_url' => 'https://maps.google.com/?q=' . $geofence->latitude . ',' . $geofence->longitude,
                    ],
                    'is_active' => $geofence->is_active,
                    'created_at' => $geofence->created_at,
                    'updated_at' => $geofence->updated_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'geofences' => $geofencesData,
                    'count' => $geofencesData->count(),
                    'active_count' => $geofences->where('is_active', true)->count(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve geofences.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get geofence details
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request, $id)
    {
        try {
            $parent = $request->user();

            $geofence = Geofence::where('id', $id)
                ->where('parent_id', $parent->id)
                ->with(['child:id,full_name,email'])
                ->first();

            if (!$geofence) {
                return response()->json([
                    'success' => false,
                    'message' => 'Geofence not found.',
                ], 404);
            }

            // Get recent events for this geofence
            $recentEvents = $geofence->events()
                ->orderBy('occurred_at', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'geofence' => [
                        'id' => $geofence->id,
                        'name' => $geofence->name,
                        'child' => [
                            'id' => $geofence->child->id,
                            'name' => $geofence->child->full_name,
                            'email' => $geofence->child->email,
                        ],
                        'location' => [
                            'latitude' => $geofence->latitude,
                            'longitude' => $geofence->longitude,
                            'radius' => $geofence->radius,
                            'map_url' => 'https://maps.google.com/?q=' . $geofence->latitude . ',' . $geofence->longitude,
                        ],
                        'is_active' => $geofence->is_active,
                        'created_at' => $geofence->created_at,
                        'updated_at' => $geofence->updated_at,
                    ],
                    'recent_events' => $recentEvents->map(function ($event) {
                        return [
                            'id' => $event->id,
                            'event_type' => $event->event_type,
                            'occurred_at' => $event->occurred_at,
                            'location' => [
                                'latitude' => $event->latitude,
                                'longitude' => $event->longitude,
                                'address' => $event->address,
                            ],
                        ];
                    }),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve geofence details.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Update geofence
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        try {
            $validator = \Validator::make($request->all(), [
                'name' => 'sometimes|string|max:100',
                'latitude' => 'sometimes|numeric|between:-90,90',
                'longitude' => 'sometimes|numeric|between:-180,180',
                'radius' => 'sometimes|integer|min:50|max:5000',
                'is_active' => 'sometimes|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $parent = $request->user();

            $geofence = Geofence::where('id', $id)
                ->where('parent_id', $parent->id)
                ->first();

            if (!$geofence) {
                return response()->json([
                    'success' => false,
                    'message' => 'Geofence not found.',
                ], 404);
            }

            // Update geofence
            $geofence->update($validator->validated());

            // Load relationships
            $geofence->load(['child:id,full_name,email']);

            return response()->json([
                'success' => true,
                'message' => 'Geofence updated successfully.',
                'data' => [
                    'geofence' => [
                        'id' => $geofence->id,
                        'name' => $geofence->name,
                        'child' => [
                            'id' => $geofence->child->id,
                            'name' => $geofence->child->full_name,
                            'email' => $geofence->child->email,
                        ],
                        'location' => [
                            'latitude' => $geofence->latitude,
                            'longitude' => $geofence->longitude,
                            'radius' => $geofence->radius,
                            'map_url' => 'https://maps.google.com/?q=' . $geofence->latitude . ',' . $geofence->longitude,
                        ],
                        'is_active' => $geofence->is_active,
                        'updated_at' => $geofence->updated_at,
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update geofence.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Delete geofence
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request, $id)
    {
        try {
            $parent = $request->user();

            $geofence = Geofence::where('id', $id)
                ->where('parent_id', $parent->id)
                ->first();

            if (!$geofence) {
                return response()->json([
                    'success' => false,
                    'message' => 'Geofence not found.',
                ], 404);
            }

            $geofence->delete();

            return response()->json([
                'success' => true,
                'message' => 'Geofence deleted successfully.',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete geofence.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}


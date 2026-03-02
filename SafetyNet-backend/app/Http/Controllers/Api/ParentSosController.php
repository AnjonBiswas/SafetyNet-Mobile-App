<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\SosAlert;
use App\Models\Notification;
use App\Models\LocationHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ParentSosController extends Controller
{
    /**
     * Get all SOS alerts from all children
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAlerts(Request $request)
    {
        try {
            $parent = $request->user();
            $status = $request->query('status', 'all'); // all, active, acknowledged, resolved
            $childId = $request->query('child_id'); // Optional: filter by child ID

            $query = SosAlert::where('parent_id', $parent->id)
                ->with(['child:id,full_name,email'])
                ->orderBy('triggered_at', 'desc');

            // Filter by status
            if ($status !== 'all') {
                $query->where('status', $status);
            }

            // Filter by child ID if provided
            if ($childId) {
                $query->where('child_id', $childId);
            }

            $alerts = $query->get();

            $alertsData = $alerts->map(function ($alert) {
                return [
                    'id' => $alert->id,
                    'child' => [
                        'id' => $alert->child->id,
                        'name' => $alert->child->full_name,
                        'email' => $alert->child->email,
                    ],
                    'location' => [
                        'latitude' => $alert->latitude,
                        'longitude' => $alert->longitude,
                        'address' => $alert->address,
                    ],
                    'message' => $alert->message,
                    'status' => $alert->status,
                    'triggered_at' => $alert->triggered_at,
                    'acknowledged_at' => $alert->acknowledged_at,
                    'resolved_at' => $alert->resolved_at,
                    'duration' => $alert->triggered_at->diffForHumans(),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'alerts' => $alertsData,
                    'count' => $alertsData->count(),
                    'active_count' => $alerts->where('status', 'active')->count(),
                    'acknowledged_count' => $alerts->where('status', 'acknowledged')->count(),
                    'resolved_count' => $alerts->where('status', 'resolved')->count(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve SOS alerts.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get detailed SOS alert
     *
     * @param Request $request
     * @param int $alertId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAlertDetails(Request $request, $alertId)
    {
        try {
            $parent = $request->user();

            $alert = SosAlert::where('id', $alertId)
                ->where('parent_id', $parent->id)
                ->with(['child:id,full_name,email,phone'])
                ->first();

            if (!$alert) {
                return response()->json([
                    'success' => false,
                    'message' => 'SOS alert not found.',
                ], 404);
            }

            // Get location history during SOS period (if still active)
            $locationHistory = [];
            if ($alert->status === 'active' || $alert->status === 'acknowledged') {
                $locationHistory = LocationHistory::where('child_id', $alert->child_id)
                    ->where('recorded_at', '>=', $alert->triggered_at)
                    ->orderBy('recorded_at', 'asc')
                    ->get()
                    ->map(function ($location) {
                        return [
                            'latitude' => $location->latitude,
                            'longitude' => $location->longitude,
                            'address' => $location->address,
                            'battery_level' => $location->battery_level,
                            'recorded_at' => $location->recorded_at,
                            'timestamp' => $location->recorded_at->timestamp,
                        ];
                    });
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'alert' => [
                        'id' => $alert->id,
                        'child' => [
                            'id' => $alert->child->id,
                            'name' => $alert->child->full_name,
                            'email' => $alert->child->email,
                            'phone' => $alert->child->phone ?? null,
                        ],
                        'location' => [
                            'latitude' => $alert->latitude,
                            'longitude' => $alert->longitude,
                            'address' => $alert->address,
                            'map_url' => 'https://maps.google.com/?q=' . $alert->latitude . ',' . $alert->longitude,
                        ],
                        'message' => $alert->message,
                        'status' => $alert->status,
                        'triggered_at' => $alert->triggered_at,
                        'acknowledged_at' => $alert->acknowledged_at,
                        'resolved_at' => $alert->resolved_at,
                        'duration' => $alert->triggered_at->diffForHumans(),
                        'is_active' => $alert->status === 'active',
                    ],
                    'location_history' => $locationHistory,
                    'location_history_count' => count($locationHistory),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve alert details.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Acknowledge SOS alert
     *
     * @param Request $request
     * @param int $alertId
     * @return \Illuminate\Http\JsonResponse
     */
    public function acknowledgeAlert(Request $request, $alertId)
    {
        try {
            $parent = $request->user();

            $alert = SosAlert::where('id', $alertId)
                ->where('parent_id', $parent->id)
                ->where('status', 'active')
                ->with('child:id,full_name')
                ->first();

            if (!$alert) {
                return response()->json([
                    'success' => false,
                    'message' => 'Active SOS alert not found.',
                ], 404);
            }

            // Acknowledge the alert
            $alert->acknowledge();

            // Notify child that parent acknowledged
            Notification::create([
                'parent_id' => $parent->id,
                'child_id' => $alert->child_id,
                'type' => 'sos',
                'title' => 'SOS Alert Acknowledged',
                'message' => $parent->name . ' has acknowledged your SOS alert and is aware of the situation.',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'SOS alert acknowledged successfully.',
                'data' => [
                    'alert' => [
                        'id' => $alert->id,
                        'status' => $alert->status,
                        'acknowledged_at' => $alert->acknowledged_at,
                    ],
                    'child_notified' => true,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to acknowledge alert.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Resolve SOS alert
     *
     * @param Request $request
     * @param int $alertId
     * @return \Illuminate\Http\JsonResponse
     */
    public function resolveAlert(Request $request, $alertId)
    {
        try {
            $parent = $request->user();

            $alert = SosAlert::where('id', $alertId)
                ->where('parent_id', $parent->id)
                ->whereIn('status', ['active', 'acknowledged'])
                ->with('child:id,full_name')
                ->first();

            if (!$alert) {
                return response()->json([
                    'success' => false,
                    'message' => 'SOS alert not found or already resolved.',
                ], 404);
            }

            // Resolve the alert
            $alert->resolve();

            // Notify child that parent resolved the alert
            Notification::create([
                'parent_id' => $parent->id,
                'child_id' => $alert->child_id,
                'type' => 'sos',
                'title' => 'SOS Alert Resolved',
                'message' => $parent->name . ' has marked your SOS alert as resolved.',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'SOS alert resolved successfully.',
                'data' => [
                    'alert' => [
                        'id' => $alert->id,
                        'status' => $alert->status,
                        'resolved_at' => $alert->resolved_at,
                        'duration' => $alert->triggered_at->diffForHumans($alert->resolved_at),
                    ],
                    'child_notified' => true,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to resolve alert.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get live location during active SOS
     *
     * @param Request $request
     * @param int $alertId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLiveLocation(Request $request, $alertId)
    {
        try {
            $parent = $request->user();

            $alert = SosAlert::where('id', $alertId)
                ->where('parent_id', $parent->id)
                ->whereIn('status', ['active', 'acknowledged'])
                ->with('child:id,full_name')
                ->first();

            if (!$alert) {
                return response()->json([
                    'success' => false,
                    'message' => 'Active SOS alert not found.',
                ], 404);
            }

            // Get latest location
            $latestLocation = LocationHistory::where('child_id', $alert->child_id)
                ->where('recorded_at', '>=', $alert->triggered_at)
                ->latest('recorded_at')
                ->first();

            // Get all locations since SOS was triggered
            $locationHistory = LocationHistory::where('child_id', $alert->child_id)
                ->where('recorded_at', '>=', $alert->triggered_at)
                ->orderBy('recorded_at', 'asc')
                ->get()
                ->map(function ($location) {
                    return [
                        'latitude' => $location->latitude,
                        'longitude' => $location->longitude,
                        'address' => $location->address,
                        'battery_level' => $location->battery_level,
                        'recorded_at' => $location->recorded_at,
                        'timestamp' => $location->recorded_at->timestamp,
                        'age_seconds' => now()->diffInSeconds($location->recorded_at),
                    ];
                });

            $isLive = $latestLocation && now()->diffInSeconds($latestLocation->recorded_at) < 60; // Updated within last minute

            return response()->json([
                'success' => true,
                'data' => [
                    'alert_id' => $alert->id,
                    'is_live' => $isLive,
                    'latest_location' => $latestLocation ? [
                        'latitude' => $latestLocation->latitude,
                        'longitude' => $latestLocation->longitude,
                        'address' => $latestLocation->address,
                        'battery_level' => $latestLocation->battery_level,
                        'recorded_at' => $latestLocation->recorded_at,
                        'age_seconds' => now()->diffInSeconds($latestLocation->recorded_at),
                        'map_url' => 'https://maps.google.com/?q=' . $latestLocation->latitude . ',' . $latestLocation->longitude,
                    ] : null,
                    'location_history' => $locationHistory,
                    'location_count' => $locationHistory->count(),
                    'sos_triggered_at' => $alert->triggered_at,
                    'duration_seconds' => now()->diffInSeconds($alert->triggered_at),
                    'websocket_info' => [
                        'endpoint' => config('app.websocket_url', 'ws://localhost:6001'),
                        'channel' => 'sos-alert.' . $alertId,
                        'event' => 'location-updated',
                    ],
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve live location.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get SOS videos for a specific child
     *
     * @param Request $request
     * @param int $childId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getChildVideos(Request $request, $childId)
    {
        try {
            $parent = $request->user();

            // Verify parent has access to this child
            $alert = SosAlert::where('parent_id', $parent->id)
                ->where('child_id', $childId)
                ->first();

            if (!$alert) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have access to this child\'s videos.',
                ], 403);
            }

            // Get all SOS alerts for this child
            $alerts = SosAlert::where('parent_id', $parent->id)
                ->where('child_id', $childId)
                ->orderBy('triggered_at', 'desc')
                ->get();

            // Get all video files from storage
            $videoFiles = Storage::disk('local')->files('sos-videos');
            
            \Log::info('Fetching videos for child', [
                'child_id' => $childId,
                'alerts_count' => $alerts->count(),
                'video_files_count' => count($videoFiles),
                'video_files' => array_map('basename', $videoFiles),
            ]);
            
            // ULTRA-LENIENT MATCHING: Match ALL videos to alerts
            // Strategy: Match each alert to the closest video, or assign unmatched videos to most recent alerts
            $videos = [];
            $usedVideos = []; // Track which videos have been matched
            
            // Sort alerts by triggered_at (newest first)
            $sortedAlerts = $alerts->sortByDesc('triggered_at')->values();
            
            // First pass: Try to match videos to alerts by timestamp
            foreach ($sortedAlerts as $alert) {
                $alertTimestamp = strtotime($alert->triggered_at);
                
                $bestMatch = null;
                $bestTimeDiff = PHP_INT_MAX;
                
                // Find the closest video (within 7 days)
                foreach ($videoFiles as $videoFile) {
                    $fileName = basename($videoFile);
                    
                    // Skip if already matched
                    if (in_array($fileName, $usedVideos)) {
                        continue;
                    }
                    
                    // Extract timestamp from filename
                    if (preg_match('/sos-video-(\d{4}-\d{2}-\d{2}_\d{6})/', $fileName, $matches)) {
                        try {
                            $videoTimeStr = str_replace('_', ' ', $matches[1]);
                            $videoTime = \Carbon\Carbon::createFromFormat('Y-m-d His', $videoTimeStr);
                            $videoTimestamp = $videoTime->timestamp;
                            $timeDiff = abs($videoTimestamp - $alertTimestamp); // Use absolute difference
                            
                            // Very lenient: within 7 days
                            if ($timeDiff <= 604800) { // 7 days in seconds
                                if ($timeDiff < $bestTimeDiff) {
                                    $bestMatch = [
                                        'file' => $videoFile,
                                        'name' => $fileName,
                                        'time_diff' => $videoTimestamp - $alertTimestamp, // Keep signed for logging
                                    ];
                                    $bestTimeDiff = $timeDiff;
                                }
                            }
                        } catch (\Exception $e) {
                            \Log::warning('Failed to parse video timestamp', [
                                'file' => $fileName,
                                'error' => $e->getMessage(),
                            ]);
                            continue;
                        }
                    }
                }
                
                // Add video if match found
                if ($bestMatch !== null) {
                    \Log::info('Video matched to alert', [
                        'alert_id' => $alert->id,
                        'video_file' => $bestMatch['name'],
                        'time_diff_minutes' => round($bestMatch['time_diff'] / 60, 2),
                    ]);
                    
                    $videos[] = [
                        'id' => $alert->id,
                        'alert_id' => $alert->id,
                        'file_name' => $bestMatch['name'],
                        'file_path' => $bestMatch['file'],
                        'url' => url('/api/parent/sos/videos/' . $childId . '/download/' . urlencode(basename($bestMatch['name']))),
                        'download_path' => '/api/parent/sos/videos/' . $childId . '/download/' . urlencode(basename($bestMatch['name'])),
                        'triggered_at' => $alert->triggered_at,
                        'status' => $alert->status,
                        'message' => $alert->message,
                        'location' => [
                            'latitude' => $alert->latitude,
                            'longitude' => $alert->longitude,
                            'address' => $alert->address,
                        ],
                    ];
                    $usedVideos[] = $bestMatch['name'];
                }
            }
            
            // Second pass: Assign any remaining unmatched videos to the most recent alert
            // This ensures ALL videos are shown, even if timestamp matching fails
            $unmatchedVideos = [];
            foreach ($videoFiles as $videoFile) {
                $fileName = basename($videoFile);
                if (!in_array($fileName, $usedVideos)) {
                    $unmatchedVideos[] = [
                        'file' => $videoFile,
                        'name' => $fileName,
                    ];
                }
            }
            
            // Assign unmatched videos to most recent alert (or create entries for them)
            if (count($unmatchedVideos) > 0 && $sortedAlerts->count() > 0) {
                $mostRecentAlert = $sortedAlerts->first();
                
                foreach ($unmatchedVideos as $unmatched) {
                    \Log::info('Assigning unmatched video to most recent alert', [
                        'alert_id' => $mostRecentAlert->id,
                        'video_file' => $unmatched['name'],
                    ]);
                    
                    $videos[] = [
                        'id' => $mostRecentAlert->id,
                        'alert_id' => $mostRecentAlert->id,
                        'file_name' => $unmatched['name'],
                        'file_path' => $unmatched['file'],
                        'url' => url('/api/parent/sos/videos/' . $childId . '/download/' . urlencode(basename($unmatched['name']))),
                        'download_path' => '/api/parent/sos/videos/' . $childId . '/download/' . urlencode(basename($unmatched['name'])),
                        'triggered_at' => $mostRecentAlert->triggered_at,
                        'status' => $mostRecentAlert->status,
                        'message' => $mostRecentAlert->message . ' (Video)',
                        'location' => [
                            'latitude' => $mostRecentAlert->latitude,
                            'longitude' => $mostRecentAlert->longitude,
                            'address' => $mostRecentAlert->address,
                        ],
                    ];
                }
            }
            
            \Log::info('Video matching complete', [
                'child_id' => $childId,
                'videos_found' => count($videos),
                'used_videos' => $usedVideos,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'videos' => $videos,
                    'count' => count($videos),
                ]
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Error fetching child videos: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve videos.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Download/Serve SOS video file
     *
     * @param Request $request
     * @param int $childId
     * @param string $fileName
     * @return \Illuminate\Http\Response
     */
    public function downloadVideo(Request $request, $childId, $fileName)
    {
        try {
            $parent = $request->user();

            // Verify parent has access to this child
            $alert = SosAlert::where('parent_id', $parent->id)
                ->where('child_id', $childId)
                ->first();

            if (!$alert) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have access to this video.',
                ], 403);
            }

            // Sanitize filename to prevent directory traversal
            $fileName = basename($fileName);
            $filePath = 'sos-videos/' . $fileName;

            if (!Storage::disk('local')->exists($filePath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Video file not found.',
                ], 404);
            }

            $fullPath = Storage::disk('local')->path($filePath);
            
            \Log::info('Serving video file', [
                'child_id' => $childId,
                'file_name' => $fileName,
                'file_path' => $filePath,
                'full_path' => $fullPath,
                'exists' => file_exists($fullPath),
                'size' => file_exists($fullPath) ? filesize($fullPath) : 0,
            ]);
            
            if (!file_exists($fullPath)) {
                \Log::error('Video file not found on disk', [
                    'file_path' => $filePath,
                    'full_path' => $fullPath,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Video file not found on server.',
                ], 404);
            }
            
            $mimeType = Storage::disk('local')->mimeType($filePath) ?: 'video/mp4';

            return response()->file($fullPath, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="' . $fileName . '"',
                'Accept-Ranges' => 'bytes',
                'Cache-Control' => 'public, max-age=3600',
            ]);

        } catch (\Exception $e) {
            \Log::error('Error downloading video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to download video.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}


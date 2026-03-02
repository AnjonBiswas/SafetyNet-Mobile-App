<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SosEmergency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SosEmergencyController extends Controller
{
    /**
     * List SOS emergencies.
     */
    public function index()
    {
        try {
            $emergencies = SosEmergency::latest('created_at')->get();

            return response()->json([
                'success' => true,
                'data' => $emergencies,
                'count' => $emergencies->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch emergencies.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Show one SOS emergency.
     */
    public function show(int $id)
    {
        $emergency = SosEmergency::find($id);

        if (!$emergency) {
            return response()->json([
                'success' => false,
                'message' => 'Emergency not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $emergency,
        ]);
    }

    /**
     * Store a new SOS emergency.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'nullable|exists:login,id',
            'user_name' => 'required|string|max:255',
            'user_email' => 'required|email|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'location_address' => 'nullable|string',
            'emergency_status' => 'nullable|in:active,resolved,false_alarm',
            'emergency_type' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'alert_sent_to' => 'nullable|array',
            'priority' => 'nullable|in:low,medium,high,critical',
            'resolved_at' => 'nullable|date',
            'resolved_by' => 'nullable|exists:login,id',
            'admin_notes' => 'nullable|string',
            'is_verified' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $payload = $validator->validated();

            $emergency = SosEmergency::create($payload);

            return response()->json([
                'success' => true,
                'message' => 'Emergency created successfully.',
                'data' => $emergency,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create emergency.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update an existing SOS emergency.
     */
    public function update(Request $request, int $id)
    {
        $emergency = SosEmergency::find($id);

        if (!$emergency) {
            return response()->json([
                'success' => false,
                'message' => 'Emergency not found.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'nullable|exists:login,id',
            'user_name' => 'sometimes|required|string|max:255',
            'user_email' => 'sometimes|required|email|max:255',
            'latitude' => 'sometimes|required|numeric',
            'longitude' => 'sometimes|required|numeric',
            'location_address' => 'nullable|string',
            'emergency_status' => 'nullable|in:active,resolved,false_alarm',
            'emergency_type' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'alert_sent_to' => 'nullable|array',
            'priority' => 'nullable|in:low,medium,high,critical',
            'resolved_at' => 'nullable|date',
            'resolved_by' => 'nullable|exists:login,id',
            'admin_notes' => 'nullable|string',
            'is_verified' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $emergency->fill($validator->validated());
            $emergency->save();

            return response()->json([
                'success' => true,
                'message' => 'Emergency updated successfully.',
                'data' => $emergency,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update emergency.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Delete an SOS emergency.
     */
    public function destroy(int $id)
    {
        $emergency = SosEmergency::find($id);

        if (!$emergency) {
            return response()->json([
                'success' => false,
                'message' => 'Emergency not found.',
            ], 404);
        }

        try {
            $emergency->delete();

            return response()->json([
                'success' => true,
                'message' => 'Emergency deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete emergency.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Upload video for SOS emergency.
     * Saves video to PC storage: storage/app/sos-videos/
     */
    public function uploadVideo(Request $request)
    {
        // Log request for debugging - this should appear in logs
        \Log::info('=== VIDEO UPLOAD REQUEST RECEIVED ===');
        \Log::info('Request method:', ['method' => $request->method()]);
        \Log::info('Request headers:', $request->headers->all());
        \Log::info('Has file video:', ['has_file' => $request->hasFile('video')]);
        \Log::info('All files:', $request->allFiles());
        \Log::info('All input keys:', array_keys($request->all()));
        \Log::info('Request content type:', ['content_type' => $request->header('Content-Type')]);

        $validator = Validator::make($request->all(), [
            'video' => 'required|file|mimes:mp4,mov,avi|max:102400', // Max 100MB
            'sos_emergency_id' => 'nullable|exists:sos_emergency,id',
            'alert_id' => 'nullable|integer|exists:sos_alerts,id', // New: Link to sos_alerts table
        ]);

        if ($validator->fails()) {
            \Log::error('Video upload validation failed', ['errors' => $validator->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $video = $request->file('video');

            if (!$video) {
                \Log::error('Video file not found in request');
                return response()->json([
                    'success' => false,
                    'message' => 'Video file not found in request.',
                ], 400);
            }

            \Log::info('Video file received', [
                'original_name' => $video->getClientOriginalName(),
                'mime_type' => $video->getMimeType(),
                'size' => $video->getSize(),
            ]);

            // Generate unique filename
            $timestamp = now()->format('Y-m-d_His');
            $originalName = pathinfo($video->getClientOriginalName(), PATHINFO_FILENAME);
            $extension = $video->getClientOriginalExtension();
            $fileName = 'sos-video-' . $timestamp . '-' . Str::random(8) . '.' . $extension;

            // Save to storage/app/sos-videos/ directory (on PC)
            $path = $video->storeAs('sos-videos', $fileName, 'local');

            // Get full path for response
            $fullPath = storage_path('app/' . $path);

            \Log::info('Video saved successfully', [
                'file_name' => $fileName,
                'path' => $path,
                'full_path' => $fullPath,
                'file_exists' => file_exists($fullPath),
            ]);

            // Optionally update SOS emergency record with video path (legacy)
            if ($request->has('sos_emergency_id')) {
                $emergency = SosEmergency::find($request->sos_emergency_id);
                if ($emergency) {
                    // Store video path in description or create a new field
                    $emergency->description = ($emergency->description ?? '') . "\n[Video: " . $fileName . "]";
                    $emergency->save();
                }
            }

            // Link video to SOS alert if alert_id is provided
            if ($request->has('alert_id') && $request->alert_id) {
                $alert = \App\Models\SosAlert::find($request->alert_id);
                if ($alert) {
                    // Store video filename in alert message or we can add a video_url field later
                    // For now, we'll match videos by timestamp in getChildVideos
                    \Log::info('Video linked to SOS alert', [
                        'alert_id' => $alert->id,
                        'video_file' => $fileName,
                        'child_id' => $alert->child_id,
                    ]);
                } else {
                    \Log::warning('Video upload: alert_id provided but alert not found', [
                        'alert_id' => $request->alert_id,
                        'video_file' => $fileName,
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Video uploaded successfully.',
                'data' => [
                    'file_name' => $fileName,
                    'file_path' => $path,
                    'full_path' => $fullPath,
                    'file_size' => $video->getSize(),
                    'mime_type' => $video->getMimeType(),
                ],
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload video.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

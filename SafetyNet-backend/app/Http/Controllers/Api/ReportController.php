<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    /**
     * List all reports.
     */
    public function index()
    {
        try {
            $reports = Report::latest('created_at')->get();

            return response()->json([
                'success' => true,
                'data' => $reports,
                'count' => $reports->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reports.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Show a single report.
     */
    public function show(int $id)
    {
        $report = Report::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Create a new report.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'incident_type' => 'required|string|max:50',
            'incident_date' => 'required|date',
            'description' => 'required|string',
            'victim_name' => 'nullable|string|max:255',
            'victim_contact' => 'nullable|string|max:50',
            'location_street' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'location_details' => 'nullable|string',
            'evidence_files' => 'nullable|array',
            'perpetrator_description' => 'nullable|string',
            'witnesses' => 'nullable|string',
            'status' => 'nullable|in:pending,processing,completed,rejected',
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
            $data = $validator->validated();

            // Always associate the report with the authenticated user
            $data['user_id'] = $request->user()->id;

            $report = Report::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Report created successfully.',
                'data' => $report,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create report.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update an existing report.
     */
    public function update(Request $request, int $id)
    {
        $report = Report::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'nullable|exists:login,id',
            'incident_type' => 'sometimes|required|string|max:50',
            'incident_date' => 'sometimes|required|date',
            'description' => 'sometimes|required|string',
            'victim_name' => 'sometimes|required|string|max:255',
            'victim_contact' => 'sometimes|required|string|max:50',
            'location_street' => 'sometimes|required|string|max:255',
            'city' => 'sometimes|required|string|max:100',
            'location_details' => 'nullable|string',
            'evidence_files' => 'nullable|array',
            'perpetrator_description' => 'nullable|string',
            'witnesses' => 'nullable|string',
            'status' => 'nullable|in:pending,processing,completed,rejected',
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
            $report->fill($validator->validated());
            $report->save();

            return response()->json([
                'success' => true,
                'message' => 'Report updated successfully.',
                'data' => $report,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update report.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Delete a report.
     */
    public function destroy(int $id)
    {
        $report = Report::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found.',
            ], 404);
        }

        try {
            $report->delete();

            return response()->json([
                'success' => true,
                'message' => 'Report deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete report.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Upload evidence file (photo or video) for a report.
     */
    public function uploadEvidence(Request $request)
    {
        \Log::info('=== EVIDENCE UPLOAD REQUEST RECEIVED ===');
        \Log::info('Request method:', ['method' => $request->method()]);
        \Log::info('Has file:', ['has_file' => $request->hasFile('file')]);
        \Log::info('All files:', $request->allFiles());
        \Log::info('All input keys:', array_keys($request->all()));

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:jpeg,jpg,png,mp4,mov,avi|max:102400', // Max 100MB
            'type' => 'nullable|string|in:image,video',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $file = $request->file('file');
            $fileType = $request->input('type', 'image');

            // Determine storage directory based on file type
            $directory = $fileType === 'video' ? 'report-evidence/videos' : 'report-evidence/images';

            // Generate unique filename
            $extension = $file->getClientOriginalExtension();
            $fileName = Str::uuid() . '.' . $extension;

            // Store file
            $path = $file->storeAs($directory, $fileName, 'local');

            // Get full path for response
            $fullPath = storage_path('app/' . $path);

            \Log::info('File uploaded successfully:', [
                'path' => $path,
                'full_path' => $fullPath,
                'file_name' => $fileName,
                'file_size' => $file->getSize(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Evidence file uploaded successfully.',
                'data' => [
                    'file_path' => $path,
                    'file_name' => $fileName,
                    'file_size' => $file->getSize(),
                    'file_type' => $fileType,
                    'full_path' => $fullPath,
                ],
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Error uploading evidence:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload evidence file.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

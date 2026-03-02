<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PublicReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PublicReportController extends Controller
{
    /**
     * List public reports.
     */
    public function index()
    {
        try {
            $reports = PublicReport::latest('created_at')->get();

            return response()->json([
                'success' => true,
                'data' => $reports,
                'count' => $reports->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch public reports.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Show a public report.
     */
    public function show(int $id)
    {
        $report = PublicReport::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Public report not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Store a new public report.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'reporter_name' => 'required|string|max:255',
            'contact_info' => 'required|string|max:255',
            'area_name' => 'required|string|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'incident_type' => 'required|in:harassment,theft,assault,stalking,other',
            'incident_description' => 'required|string',
            'incident_date' => 'required|date',
            'incident_time' => 'nullable|date_format:H:i:s',
            'risk_level' => 'nullable|in:low,medium,high',
            'is_verified' => 'nullable|boolean',
            'admin_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $report = PublicReport::create($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Public report submitted successfully.',
                'data' => $report,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create public report.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update a public report.
     */
    public function update(Request $request, int $id)
    {
        $report = PublicReport::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Public report not found.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'reporter_name' => 'sometimes|required|string|max:255',
            'contact_info' => 'sometimes|required|string|max:255',
            'area_name' => 'sometimes|required|string|max:255',
            'latitude' => 'sometimes|required|numeric',
            'longitude' => 'sometimes|required|numeric',
            'incident_type' => 'sometimes|required|in:harassment,theft,assault,stalking,other',
            'incident_description' => 'sometimes|required|string',
            'incident_date' => 'sometimes|required|date',
            'incident_time' => 'nullable|date_format:H:i:s',
            'risk_level' => 'nullable|in:low,medium,high',
            'is_verified' => 'nullable|boolean',
            'admin_notes' => 'nullable|string',
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
                'message' => 'Public report updated successfully.',
                'data' => $report,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update public report.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Delete a public report.
     */
    public function destroy(int $id)
    {
        $report = PublicReport::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Public report not found.',
            ], 404);
        }

        try {
            $report->delete();

            return response()->json([
                'success' => true,
                'message' => 'Public report deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete public report.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

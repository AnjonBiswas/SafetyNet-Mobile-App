<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SafeZone;
use Illuminate\Http\Request;

class SafeZoneController extends Controller
{
    /**
     * List all safe zones.
     * This is a public endpoint - no authentication required.
     */
    public function index()
    {
        try {
            $zones = SafeZone::orderBy('risk_level', 'asc')
                ->orderBy('incident_count', 'desc')
                ->get();

            return response()->json($zones);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch safe zones.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

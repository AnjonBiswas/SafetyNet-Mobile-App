<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyContact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmergencyContactController extends Controller
{
    /**
     * List emergency contacts for the authenticated user.
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $contacts = EmergencyContact::where('user_id', $user->id)
                ->latest('created_at')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $contacts,
                'count' => $contacts->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch contacts.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Show an emergency contact.
     */
    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $contact = EmergencyContact::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$contact) {
            return response()->json([
                'success' => false,
                'message' => 'Emergency contact not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $contact,
        ]);
    }

    /**
     * Store a new emergency contact.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        // Check if user already has 3 contacts
        $existingCount = EmergencyContact::where('user_id', $user->id)->count();
        if ($existingCount >= 3) {
            return response()->json([
                'success' => false,
                'message' => 'You can only add up to 3 trusted contacts.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:120',
            'phone' => 'required|string|max:40|regex:/^\+880[0-9]{10}$/',
            'relation' => 'nullable|string|max:80',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $contact = EmergencyContact::create([
                'user_id' => $user->id,
                'name' => $request->name,
                'phone' => $request->phone,
                'relation' => $request->relation,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Emergency contact created successfully.',
                'data' => $contact,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create emergency contact.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update an emergency contact.
     */
    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $contact = EmergencyContact::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$contact) {
            return response()->json([
                'success' => false,
                'message' => 'Emergency contact not found.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:120',
            'phone' => 'sometimes|required|string|max:40|regex:/^\+880[0-9]{10}$/',
            'relation' => 'nullable|string|max:80',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $contact->fill($validator->validated());
            $contact->user_id = $user->id; // Ensure user_id matches authenticated user
            $contact->save();

            return response()->json([
                'success' => true,
                'message' => 'Emergency contact updated successfully.',
                'data' => $contact,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update emergency contact.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Delete an emergency contact.
     */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $contact = EmergencyContact::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$contact) {
            return response()->json([
                'success' => false,
                'message' => 'Emergency contact not found.',
            ], 404);
        }

        try {
            $contact->delete();

            return response()->json([
                'success' => true,
                'message' => 'Emergency contact deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete emergency contact.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

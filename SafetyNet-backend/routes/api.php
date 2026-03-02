<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SosEmergencyController;
use App\Http\Controllers\Api\PublicReportController;
use App\Http\Controllers\Api\EmergencyContactController;
use App\Http\Controllers\Api\ChatUserController;
use App\Http\Controllers\Api\ChatMessageController;
use App\Http\Controllers\Api\ChatSessionController;
use App\Http\Controllers\Api\ParentAuthController;
use App\Http\Controllers\Api\ParentLinkController;
use App\Http\Controllers\Api\ChildLinkController;
use App\Http\Controllers\Api\ChildLocationController;
use App\Http\Controllers\Api\ParentLocationController;
use App\Http\Controllers\Api\ChildSosController;
use App\Http\Controllers\Api\ParentSosController;
use App\Http\Controllers\Api\ParentGeofenceController;
use App\Http\Controllers\Api\ChildGeofenceController;
use App\Http\Controllers\Api\ParentNotificationController;
use App\Http\Controllers\Api\ParentChatController;
use App\Http\Controllers\Api\ChildChatController;
use App\Http\Controllers\Api\BroadcastingAuthController;
use App\Http\Controllers\Api\SafeZoneController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// --------------------------------------------------------------------------
// Public authentication (Child App)
// --------------------------------------------------------------------------
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// --------------------------------------------------------------------------
// Public authentication (Parent App)
// --------------------------------------------------------------------------
Route::post('/parent/register', [ParentAuthController::class, 'register']);
Route::post('/parent/login', [ParentAuthController::class, 'login']);

// --------------------------------------------------------------------------
// Public feature routes (open submission + read-only)
// --------------------------------------------------------------------------
Route::apiResource('public-reports', PublicReportController::class)->only(['index', 'show', 'store']);

// --------------------------------------------------------------------------
// Safe Zones (public read-only)
// --------------------------------------------------------------------------
Route::get('/safe-zones', [SafeZoneController::class, 'index']);

// --------------------------------------------------------------------------
// Broadcasting authentication (handles auth manually, no middleware)
// --------------------------------------------------------------------------
Route::post('/broadcasting/auth', [BroadcastingAuthController::class, 'authenticate']);
Route::post('/parent/broadcasting/auth', [BroadcastingAuthController::class, 'authenticateParent']);

// --------------------------------------------------------------------------
// Protected routes (authentication required)
// --------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {
    // Authenticated session management
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Reports (user + admin)
    Route::apiResource('reports', ReportController::class);
    Route::post('/reports/upload-evidence', [ReportController::class, 'uploadEvidence']);

    // SOS emergencies
    Route::apiResource('sos-emergencies', SosEmergencyController::class);
    Route::post('/sos-emergencies/upload-video', [SosEmergencyController::class, 'uploadVideo']);

    // Test upload endpoint (for debugging)
    Route::post('/test-upload', function (Request $request) {
        \Log::info('Test upload endpoint called', [
            'has_file' => $request->hasFile('video'),
            'all_files' => $request->allFiles(),
            'all_input' => $request->all(),
        ]);

        if ($request->hasFile('video')) {
            $file = $request->file('video');
            $path = $file->storeAs('sos-videos', 'test-' . time() . '.mp4', 'local');
            return response()->json([
                'success' => true,
                'message' => 'Test upload successful',
                'path' => storage_path('app/' . $path),
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'No file received',
            'request_data' => $request->all(),
        ], 400);
    });

    // Public reports (admin moderation)
    Route::apiResource('public-reports', PublicReportController::class)->only(['update', 'destroy']);

    // Emergency contacts
    Route::apiResource('emergency-contacts', EmergencyContactController::class);

    // Chat resources
    Route::apiResource('chat-users', ChatUserController::class);
    Route::apiResource('chat-messages', ChatMessageController::class);
    Route::apiResource('chat-sessions', ChatSessionController::class);

    // Child linking (for SafetyNet app users) - Bidirectional
    // Send link request to parent
    Route::post('/child/link-request/send', [ChildLinkController::class, 'sendLinkRequest']);
    // Get sent link requests
    Route::get('/child/link-requests/sent', [ChildLinkController::class, 'getSentRequests']);
    // Cancel sent link request
    Route::delete('/child/link-requests/{id}/cancel', [ChildLinkController::class, 'cancelRequest']);
    // Get received link requests (from parents)
    Route::get('/child/link-requests/received', [ChildLinkController::class, 'getReceivedRequests']);
    // Get count of received requests
    Route::get('/child/link-requests/received/count', [ChildLinkController::class, 'getReceivedCount']);
    // Accept link request from parent
    Route::post('/child/link-requests/{id}/accept', [ChildLinkController::class, 'acceptRequest']);
    // Reject link request from parent
    Route::post('/child/link-requests/{id}/reject', [ChildLinkController::class, 'rejectRequest']);
    // Get all linked parents
    Route::get('/child/parents', [ChildLinkController::class, 'getParents']);
    // Create direct link with parent (via QR code scan)
    Route::post('/child/parents/link-direct', [ChildLinkController::class, 'linkDirect']);
    // Remove/unlink parent
    Route::delete('/child/parents/{id}', [ChildLinkController::class, 'removeParent']);

    // Child location tracking
    Route::post('/child/location/update', [ChildLocationController::class, 'updateLocation']);
    Route::get('/child/location/sharing-status', [ChildLocationController::class, 'getSharingStatus']);
    Route::put('/child/location/sharing', [ChildLocationController::class, 'updateSharing']);

    // Child SOS alerts
    Route::post('/child/sos/trigger', [ChildSosController::class, 'triggerSos']);
    Route::post('/child/sos/cancel', [ChildSosController::class, 'cancelSos']);

    // Child geofence checking
    Route::post('/child/geofence/check', [ChildGeofenceController::class, 'checkGeofences']);


    // Child-parent chat
    Route::get('/child/chat/{parentId}/messages', [ChildChatController::class, 'getMessages']);
    Route::post('/child/chat/{parentId}/send', [ChildChatController::class, 'sendMessage']);
    Route::post('/child/chat/{parentId}/send-media', [ChildChatController::class, 'sendMedia']);
    Route::put('/child/chat/{parentId}/read', [ChildChatController::class, 'markAsRead']);
    Route::get('/child/chat/unread-count', [ChildChatController::class, 'getUnreadCount']);
    
    // Child device token registration for push notifications
    Route::post('/child/device-token', [ChildChatController::class, 'registerDeviceToken']);
});

// --------------------------------------------------------------------------
// Protected routes (Parent App - authentication required)
// --------------------------------------------------------------------------
Route::middleware('auth:sanctum')->prefix('parent')->group(function () {
    // Parent authentication & profile
    Route::post('/logout', [ParentAuthController::class, 'logout']);
    Route::get('/profile', [ParentAuthController::class, 'profile']);
    Route::put('/profile', [ParentAuthController::class, 'updateProfile']);

    // Parent linking with children - Bidirectional
    // Send link request to child
    Route::post('/link-request/send', [ParentLinkController::class, 'sendLinkRequest']);
    // Get sent link requests
    Route::get('/link-requests/sent', [ParentLinkController::class, 'getSentRequests']);
    // Cancel sent link request
    Route::delete('/link-requests/{id}/cancel', [ParentLinkController::class, 'cancelRequest']);
    // Get received link requests (from children)
    Route::get('/link-requests/received', [ParentLinkController::class, 'getReceivedRequests']);
    // Get count of received requests
    Route::get('/link-requests/received/count', [ParentLinkController::class, 'getReceivedCount']);
    // Accept link request from child
    Route::post('/link-requests/{id}/accept', [ParentLinkController::class, 'acceptRequest']);
    // Reject link request from child
    Route::post('/link-requests/{id}/reject', [ParentLinkController::class, 'rejectRequest']);
    // Get all linked children
    Route::get('/children', [ParentLinkController::class, 'getChildren']);
    // Remove/unlink child
    Route::delete('/children/{id}', [ParentLinkController::class, 'unlinkChild']);

    // Parent location tracking
    Route::get('/children/{childId}/location', [ParentLocationController::class, 'getChildLocation']);
    Route::get('/children/{childId}/location/history', [ParentLocationController::class, 'getChildLocationHistory']);
    Route::get('/children/{childId}/location/live', [ParentLocationController::class, 'getLiveLocationInfo']);

    // Parent SOS alerts
    Route::get('/sos/alerts', [ParentSosController::class, 'getAlerts']);
    Route::get('/sos/alerts/{alertId}', [ParentSosController::class, 'getAlertDetails']);
    Route::post('/sos/alerts/{alertId}/acknowledge', [ParentSosController::class, 'acknowledgeAlert']);
    Route::post('/sos/alerts/{alertId}/resolve', [ParentSosController::class, 'resolveAlert']);
    Route::get('/sos/alerts/{alertId}/location/live', [ParentSosController::class, 'getLiveLocation']);
    // Parent SOS videos
    Route::get('/sos/videos/{childId}', [ParentSosController::class, 'getChildVideos']);
    Route::get('/sos/videos/{childId}/download/{fileName}', [ParentSosController::class, 'downloadVideo']);

    // Parent geofences
    Route::apiResource('geofences', ParentGeofenceController::class);

    // Parent notifications
    Route::get('/notifications', [ParentNotificationController::class, 'index']);
    Route::put('/notifications/{id}/read', [ParentNotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [ParentNotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [ParentNotificationController::class, 'destroy']);
    Route::get('/notifications/unread-count', [ParentNotificationController::class, 'getUnreadCount']);
    Route::post('/device-token', [ParentNotificationController::class, 'registerDeviceToken']);

    // Parent-child chat
    Route::get('/chat/{childId}/messages', [ParentChatController::class, 'getMessages']);
    Route::post('/chat/{childId}/send', [ParentChatController::class, 'sendMessage']);
    Route::post('/chat/{childId}/send-media', [ParentChatController::class, 'sendMedia']);
    Route::put('/chat/{childId}/read', [ParentChatController::class, 'markAsRead']);
    Route::get('/chat/unread-count', [ParentChatController::class, 'getUnreadCount']);
    
    // Test push notification (for debugging)
    Route::post('/test-push-notification', [ParentNotificationController::class, 'testPushNotification']);
});

// Example: Test route to verify API is working
Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'API is working!',
        'timestamp' => now()->toDateTimeString(),
    ]);
});

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

class BroadcastingAuthController extends Controller
{
    /**
     * Authenticate broadcasting channel for child app
     * POST /api/broadcasting/auth
     */
    public function authenticate(Request $request)
    {
        try {
            $request->headers->set('Accept', 'application/json');
            
            $authHeader = $request->header('Authorization');
            $hasAuthHeader = !empty($authHeader);
            $tokenPresent = $hasAuthHeader && strpos($authHeader, 'Bearer ') === 0;

            Log::info('=== Broadcasting auth request (child) ===', [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'channel_name' => $request->input('channel_name'),
                'socket_id' => $request->input('socket_id'),
                'has_auth_header' => $hasAuthHeader,
                'token_present' => $tokenPresent,
                'auth_header_preview' => $hasAuthHeader ? substr($authHeader, 0, 50) . '...' : 'missing',
                'all_headers' => $request->headers->all(),
            ]);

            $user = null;
            if ($hasAuthHeader && $tokenPresent) {
                $token = trim(str_replace('Bearer ', '', $authHeader));
                
                if (!empty($token)) {
                    try {
                        // Try to find token using Sanctum
                        $personalAccessToken = PersonalAccessToken::findToken($token);
                        
                        if (!$personalAccessToken && strlen($token) > 0) {
                            // Fallback: try hash lookup
                            $tokenHash = hash('sha256', $token);
                            $personalAccessToken = PersonalAccessToken::where('token', $tokenHash)->first();
                        }
                        
                        if ($personalAccessToken && $personalAccessToken->tokenable) {
                            $user = $personalAccessToken->tokenable;
                            Log::info('User authenticated via Sanctum token', [
                                'user_id' => $user->id,
                                'user_type' => get_class($user),
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Error finding Sanctum token:', [
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

            if (!$user) {
                Log::warning('Broadcasting auth: Unauthenticated user');
                return response()->json([
                    'error' => 'Unauthenticated',
                    'message' => 'User must be authenticated to subscribe to private channels',
                ], 401);
            }

            // CRITICAL: Set Sanctum as the default guard BEFORE setting user
            Auth::shouldUse('sanctum');
            
            // Set user on Sanctum guard FIRST - this is what Broadcast::auth() uses
            Auth::guard('sanctum')->setUser($user);
            
            // Then set on default guard
            Auth::setUser($user);
            
            // Set the authenticated user on the request for Broadcast::auth()
            $request->setUserResolver(function () use ($user) {
                Log::info('Request user resolver called:', [
                    'user_id' => $user->id,
                    'user_type' => get_class($user),
                ]);
                return $user;
            });

            Log::info('Before Broadcast::auth() call:', [
                'user_id' => $user->id,
                'user_type' => get_class($user),
                'channel_name' => $request->input('channel_name'),
                'request_user' => $request->user() ? $request->user()->id : 'null',
                'auth_user' => Auth::user() ? Auth::user()->id : 'null',
                'auth_guard_user' => Auth::guard('sanctum')->user() ? Auth::guard('sanctum')->user()->id : 'null',
                'default_guard' => Auth::getDefaultDriver(),
            ]);

            // Manually authorize and generate Pusher auth signature
            try {
                $channelName = $request->input('channel_name');
                $socketId = $request->input('socket_id');
                
                Log::info('Manual channel authorization:', [
                    'channel_name' => $channelName,
                    'socket_id' => $socketId,
                    'user_id' => $user->id,
                ]);
                
                // Extract channel name without prefix
                $channelNameWithoutPrefix = str_replace(['private-', 'presence-'], '', $channelName);
                
                // Check authorization
                $authorized = false;
                if (preg_match('/^child\.(\d+)$/', $channelNameWithoutPrefix, $matches)) {
                    $childId = (int) $matches[1];
                    if ($user instanceof \App\Models\User && $user->id === $childId) {
                        $authorized = true;
                        Log::info('Channel authorized (child)', ['user_id' => $user->id, 'childId' => $childId]);
                    }
                }
                
                if (!$authorized) {
                    Log::warning('Channel authorization denied', ['channel' => $channelName, 'user_id' => $user->id]);
                    return response()->json(['error' => 'Forbidden'], 403);
                }
                
                // Get Pusher config
                $appId = config('broadcasting.connections.pusher.app_id');
                $appKey = config('broadcasting.connections.pusher.key');
                $appSecret = config('broadcasting.connections.pusher.secret');
                
                // Generate auth signature
                $stringToSign = $socketId . ':' . $channelName;
                $signature = hash_hmac('sha256', $stringToSign, $appSecret, false);
                
                $auth = [
                    'auth' => $appKey . ':' . $signature,
                ];
                
                Log::info('Pusher auth signature generated', ['channel' => $channelName]);
                return response()->json($auth);
            } catch (\Exception $e) {
                Log::error('Manual auth failed:', [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
                throw $e;
            }
            
        } catch (\Throwable $e) {
            Log::error('Broadcasting auth error:', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'channel_name' => $request->input('channel_name'),
                'socket_id' => $request->input('socket_id'),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => 'Failed to authenticate broadcasting channel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Authenticate broadcasting channel for parent app
     * POST /api/parent/broadcasting/auth
     */
    public function authenticateParent(Request $request)
    {
        try {
            $request->headers->set('Accept', 'application/json');
            
            $authHeader = $request->header('Authorization');
            $hasAuthHeader = !empty($authHeader);
            $tokenPresent = $hasAuthHeader && strpos($authHeader, 'Bearer ') === 0;

            Log::info('=== Broadcasting auth request (parent) ===', [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'channel_name' => $request->input('channel_name'),
                'socket_id' => $request->input('socket_id'),
                'has_auth_header' => $hasAuthHeader,
                'token_present' => $tokenPresent,
            ]);

            $user = null;
            if ($hasAuthHeader && $tokenPresent) {
                $token = trim(str_replace('Bearer ', '', $authHeader));
                $token = trim($token); // Double trim to be sure
                
                Log::info('Token extracted (parent):', [
                    'token_length' => strlen($token),
                    'token_preview' => substr($token, 0, 20) . '...',
                    'token_empty' => empty($token),
                ]);
                
                if (!empty($token)) {
                    try {
                        // Try to find token using Sanctum
                        $personalAccessToken = PersonalAccessToken::findToken($token);
                        
                        if (!$personalAccessToken && strlen($token) > 0) {
                            // Fallback: try hash lookup
                            $tokenHash = hash('sha256', $token);
                            $personalAccessToken = PersonalAccessToken::where('token', $tokenHash)->first();
                        }
                        
                        if ($personalAccessToken && $personalAccessToken->tokenable) {
                            $user = $personalAccessToken->tokenable;
                            Log::info('User authenticated via Sanctum token (parent)', [
                                'user_id' => $user->id,
                                'user_type' => get_class($user),
                                'token_id' => $personalAccessToken->id,
                            ]);
                        } else {
                            Log::warning('Token not found in database (parent)', [
                                'token_preview' => substr($token, 0, 20) . '...',
                                'token_length' => strlen($token),
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Error finding Sanctum token (parent):', [
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                    }
                } else {
                    Log::warning('Token is empty after extraction (parent)');
                }
            } else {
                Log::warning('No Authorization header or Bearer token (parent)', [
                    'has_auth_header' => $hasAuthHeader,
                    'token_present' => $tokenPresent,
                    'auth_header_preview' => $authHeader ? substr($authHeader, 0, 50) : 'missing',
                ]);
            }

            if (!$user) {
                Log::warning('Broadcasting auth: Unauthenticated user (parent)');
                return response()->json([
                    'error' => 'Unauthenticated',
                    'message' => 'User must be authenticated to subscribe to private channels',
                ], 401);
            }

            // Set Sanctum as the default guard for this request
            Auth::shouldUse('sanctum');
            
            // Set the authenticated user on the request for Broadcast::auth()
            $request->setUserResolver(function () use ($user) {
                return $user;
            });

            // Set user on Auth facade with Sanctum guard - this is what Broadcast::auth() uses
            Auth::guard('sanctum')->setUser($user);
            
            // Also set on default guard
            Auth::setUser($user);

            // Manually authorize and generate Pusher auth signature
            try {
                $channelName = $request->input('channel_name');
                $socketId = $request->input('socket_id');
                
                Log::info('Manual channel authorization (parent):', [
                    'channel_name' => $channelName,
                    'socket_id' => $socketId,
                    'user_id' => $user->id,
                ]);
                
                // Extract channel name without prefix
                $channelNameWithoutPrefix = str_replace(['private-', 'presence-'], '', $channelName);
                
                // Check authorization
                $authorized = false;
                if (preg_match('/^parent\.(\d+)$/', $channelNameWithoutPrefix, $matches)) {
                    $parentId = (int) $matches[1];
                    if ($user instanceof \App\Models\Guardian && $user->id === $parentId) {
                        $authorized = true;
                        Log::info('Channel authorized (parent)', ['user_id' => $user->id, 'parentId' => $parentId]);
                    }
                }
                
                if (!$authorized) {
                    Log::warning('Channel authorization denied (parent)', ['channel' => $channelName, 'user_id' => $user->id]);
                    return response()->json(['error' => 'Forbidden'], 403);
                }
                
                // Get Pusher config
                $appId = config('broadcasting.connections.pusher.app_id');
                $appKey = config('broadcasting.connections.pusher.key');
                $appSecret = config('broadcasting.connections.pusher.secret');
                
                // Generate auth signature
                $stringToSign = $socketId . ':' . $channelName;
                $signature = hash_hmac('sha256', $stringToSign, $appSecret, false);
                
                $auth = [
                    'auth' => $appKey . ':' . $signature,
                ];
                
                Log::info('Pusher auth signature generated (parent)', ['channel' => $channelName]);
                return response()->json($auth);
            } catch (\Exception $e) {
                Log::error('Manual auth failed (parent):', [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
                throw $e;
            }
            
        } catch (\Throwable $e) {
            Log::error('Broadcasting auth error (parent):', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'channel_name' => $request->input('channel_name'),
                'socket_id' => $request->input('socket_id'),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => 'Failed to authenticate broadcasting channel: ' . $e->getMessage(),
            ], 500);
        }
    }
}

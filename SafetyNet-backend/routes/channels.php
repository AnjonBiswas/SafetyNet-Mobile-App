<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Parent private channel - only the parent can access
Broadcast::channel('parent.{parentId}', function ($user, $parentId) {
    // For parent app - user is Guardian model
    if ($user instanceof \App\Models\Guardian) {
        return $user->id === (int) $parentId;
    }
    return false;
}, ['guards' => ['sanctum']]);

// Child private channel - only the child can access
// Note: Laravel strips 'private-' prefix when checking authorization
// So 'private-child.2' becomes 'child.2'
Broadcast::channel('child.{childId}', function ($user, $childId) {
    try {
        Log::info('=== Channel authorization check (child) ===', [
            'user' => $user ? 'exists' : 'null',
            'user_id' => $user?->id ?? 'null',
            'user_type' => $user ? get_class($user) : 'null',
            'childId' => $childId,
            'childId_type' => gettype($childId),
            'user_is_user' => $user instanceof \App\Models\User,
        ]);
        
        if (!$user) {
            Log::error('Channel authorization: User is NULL!');
            return false;
        }
        
        if ($user instanceof \App\Models\User) {
            $authorized = $user->id === (int) $childId;
            Log::info('Channel authorization result (child):', [
                'authorized' => $authorized,
                'user_id' => $user->id,
                'childId' => $childId,
                'childId_int' => (int) $childId,
                'match' => $user->id === (int) $childId,
            ]);
            return $authorized;
        }
        
        Log::warning('Channel authorization denied (child): User is not User model', [
            'user_type' => get_class($user),
        ]);
        return false;
    } catch (\Throwable $e) {
        Log::error('Channel authorization exception (child):', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
        return false;
    }
}, ['guards' => ['sanctum']]);

// Private parent channel for chat (used by parent app)
Broadcast::channel('private-parent.{parentId}', function ($user, $parentId) {
    // For parent app - user is Guardian model
    if ($user instanceof \App\Models\Guardian) {
        return $user->id === (int) $parentId;
    }
    return false;
}, ['guards' => ['sanctum']]);

// Private child channel for chat (used by child app)
Broadcast::channel('private-child.{childId}', function ($user, $childId) {
    // For child app - user is User model
    if ($user instanceof \App\Models\User) {
        return $user->id === (int) $childId;
    }
    return false;
}, ['guards' => ['sanctum']]);

// SOS alert channel - only the parent who received the alert can access
Broadcast::channel('sos.{alertId}', function ($user, $alertId) {
    if ($user instanceof \App\Models\Guardian) {
        $alert = \App\Models\SosAlert::find($alertId);
        return $alert && $alert->parent_id === $user->id;
    }
    return false;
}, ['guards' => ['sanctum']]);


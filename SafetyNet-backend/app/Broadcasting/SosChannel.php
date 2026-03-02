<?php

namespace App\Broadcasting;

use App\Models\Guardian;
use App\Models\SosAlert;

class SosChannel
{
    /**
     * Authenticate the user's access to the channel.
     */
    public function join(Guardian $user, int $alertId): bool
    {
        $alert = SosAlert::find($alertId);
        
        if (!$alert) {
            return false;
        }

        // Only the parent who received this alert can access
        return $alert->parent_id === $user->id;
    }
}


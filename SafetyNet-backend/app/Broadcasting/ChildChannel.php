<?php

namespace App\Broadcasting;

use App\Models\User;

class ChildChannel
{
    /**
     * Authenticate the user's access to the channel.
     */
    public function join(User $user, int $childId): bool
    {
        return $user->id === $childId;
    }
}


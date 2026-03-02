<?php

namespace App\Broadcasting;

use App\Models\Guardian;

class ParentChannel
{
    /**
     * Authenticate the user's access to the channel.
     */
    public function join(Guardian $user, int $parentId): bool
    {
        return $user->id === $parentId;
    }
}


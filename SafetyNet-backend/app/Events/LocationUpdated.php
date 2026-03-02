<?php

namespace App\Events;

use App\Models\LocationHistory;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $location;
    public $parentIds;

    /**
     * Create a new event instance.
     */
    public function __construct(LocationHistory $location, array $parentIds = [])
    {
        $this->location = $location;
        $this->parentIds = $parentIds;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('child.' . $this->location->child_id),
        ];

        // Broadcast to all linked parents
        foreach ($this->parentIds as $parentId) {
            $channels[] = new PrivateChannel('parent.' . $parentId);
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'location.updated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'location' => [
                'id' => $this->location->id,
                'child_id' => $this->location->child_id,
                'latitude' => $this->location->latitude,
                'longitude' => $this->location->longitude,
                'address' => $this->location->address,
                'battery_level' => $this->location->battery_level,
                'recorded_at' => $this->location->recorded_at,
            ],
        ];
    }
}


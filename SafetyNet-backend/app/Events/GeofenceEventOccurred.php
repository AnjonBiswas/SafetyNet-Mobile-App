<?php

namespace App\Events;

use App\Models\GeofenceEvent;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GeofenceEventOccurred implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $geofenceEvent;

    /**
     * Create a new event instance.
     */
    public function __construct(GeofenceEvent $geofenceEvent)
    {
        // Load relationships
        $geofenceEvent->load(['geofence:id,name', 'child:id,full_name']);
        $this->geofenceEvent = $geofenceEvent;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('parent.' . $this->geofenceEvent->parent_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'geofence.event';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'event' => [
                'id' => $this->geofenceEvent->id,
                'geofence_id' => $this->geofenceEvent->geofence_id,
                'geofence_name' => $this->geofenceEvent->geofence->name ?? 'Unknown',
                'child_id' => $this->geofenceEvent->child_id,
                'child_name' => $this->geofenceEvent->child->full_name ?? 'Unknown',
                'event_type' => $this->geofenceEvent->event_type,
                'latitude' => $this->geofenceEvent->latitude,
                'longitude' => $this->geofenceEvent->longitude,
                'address' => $this->geofenceEvent->address,
                'distance_from_center' => $this->geofenceEvent->distance_from_center,
                'occurred_at' => $this->geofenceEvent->occurred_at,
            ],
        ];
    }
}


<?php

namespace App\Events;

use App\Models\SosAlert;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SosAlertTriggered implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $alert;

    /**
     * Create a new event instance.
     */
    public function __construct(SosAlert $alert)
    {
        // Load relationships
        $alert->load(['child:id,full_name,email']);
        $this->alert = $alert;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('parent.' . $this->alert->parent_id),
            new Channel('sos.' . $this->alert->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'sos.alert.triggered';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'alert' => [
                'id' => $this->alert->id,
                'child_id' => $this->alert->child_id,
                'child_name' => $this->alert->child->full_name ?? 'Unknown',
                'latitude' => $this->alert->latitude,
                'longitude' => $this->alert->longitude,
                'address' => $this->alert->address,
                'message' => $this->alert->message,
                'status' => $this->alert->status,
                'triggered_at' => $this->alert->triggered_at,
            ],
        ];
    }
}


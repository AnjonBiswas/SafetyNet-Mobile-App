<?php

namespace App\Events;

use App\Models\ParentChildLink;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LinkRequestCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $link;

    /**
     * Create a new event instance.
     */
    public function __construct(ParentChildLink $link)
    {
        // Load relationships
        $link->load(['parent:id,name,email']);
        $this->link = $link;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('child.' . $this->link->child_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'link.request.created';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'link' => [
                'id' => $this->link->id,
                'parent_id' => $this->link->parent_id,
                'parent_name' => $this->link->parent->name ?? 'Unknown',
                'link_code' => $this->link->link_code,
                'status' => $this->link->status,
                'created_at' => $this->link->created_at,
            ],
        ];
    }
}


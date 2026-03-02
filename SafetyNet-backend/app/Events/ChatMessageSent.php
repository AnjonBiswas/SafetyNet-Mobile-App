<?php

namespace App\Events;

use App\Models\ParentChildMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    /**
     * Create a new event instance.
     */
    public function __construct(ParentChildMessage $message)
    {
        $this->message = $message;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Broadcast to both parent and child channels
        return [
            new Channel('private-parent.' . $this->message->parent_id),
            new Channel('private-child.' . $this->message->child_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'chat.message.sent';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'parent_id' => $this->message->parent_id,
                'child_id' => $this->message->child_id,
                'sender_type' => $this->message->sender_type,
                'message' => $this->message->message,
                'message_type' => $this->message->message_type,
                'media_url' => $this->message->media_url,
                'media_thumbnail' => $this->message->media_thumbnail,
                'media_duration' => $this->message->media_duration,
                'is_read' => $this->message->is_read,
                'created_at' => $this->message->created_at->toISOString(),
                'updated_at' => $this->message->updated_at->toISOString(),
            ],
        ];
    }
}

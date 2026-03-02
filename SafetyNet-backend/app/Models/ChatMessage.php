<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'chat_messages';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'sender_id',
        'receiver_id',
        'message',
        'message_type',
        'is_read',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        // No sensitive fields to hide
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }

    /**
     * Get the sender of the message.
     */
    public function sender()
    {
        return $this->belongsTo(ChatUser::class, 'sender_id', 'user_id');
    }

    /**
     * Get the receiver of the message.
     */
    public function receiver()
    {
        return $this->belongsTo(ChatUser::class, 'receiver_id', 'user_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatUser extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'chat_users';

    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'user_id';

    /**
     * The "type" of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'email',
        'user_type',
        'is_online',
        'last_seen',
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
            'is_online' => 'boolean',
            'last_seen' => 'datetime',
        ];
    }

    /**
     * Get the messages sent by this user.
     */
    public function sentMessages()
    {
        return $this->hasMany(ChatMessage::class, 'sender_id', 'user_id');
    }

    /**
     * Get the messages received by this user.
     */
    public function receivedMessages()
    {
        return $this->hasMany(ChatMessage::class, 'receiver_id', 'user_id');
    }

    /**
     * Get the chat sessions for this user.
     */
    public function chatSessions()
    {
        return $this->hasMany(ChatSession::class, 'user_id', 'user_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatSession extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'chat_sessions';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'session_id',
        'is_active',
        'started_at',
        'ended_at',
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
            'is_active' => 'boolean',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /**
     * Get the chat user for this session.
     */
    public function chatUser()
    {
        return $this->belongsTo(ChatUser::class, 'user_id', 'user_id');
    }
}

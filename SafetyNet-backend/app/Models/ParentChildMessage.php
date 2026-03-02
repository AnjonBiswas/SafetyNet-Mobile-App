<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParentChildMessage extends Model
{
    use HasFactory;

    protected $table = 'parent_child_messages';

    protected $fillable = [
        'parent_id',
        'child_id',
        'sender_type',
        'message',
        'message_type',
        'media_url',
        'media_thumbnail',
        'media_duration',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'media_duration' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the parent (guardian) who sent/received this message
     */
    public function parent()
    {
        return $this->belongsTo(Guardian::class, 'parent_id');
    }

    /**
     * Get the child (user) who sent/received this message
     */
    public function child()
    {
        return $this->belongsTo(User::class, 'child_id');
    }

    /**
     * Scope to get messages between a parent and child
     */
    public function scopeBetween($query, $parentId, $childId)
    {
        return $query->where(function ($q) use ($parentId, $childId) {
            $q->where('parent_id', $parentId)
              ->where('child_id', $childId);
        });
    }

    /**
     * Scope to get unread messages
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Mark message as read
     */
    public function markAsRead()
    {
        $this->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'notifications';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'parent_id',
        'child_id',
        'recipient_type',
        'recipient_id',
        'type',
        'title',
        'message',
        'data',
        'is_read',
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
            'data' => 'array',
        ];
    }

    /**
     * Get the parent who owns this notification.
     */
    public function parent()
    {
        return $this->belongsTo(Guardian::class, 'parent_id');
    }

    /**
     * Get the child (user) related to this notification.
     */
    public function child()
    {
        return $this->belongsTo(User::class, 'child_id');
    }

    /**
     * Get the recipient (parent or child).
     */
    public function recipient()
    {
        if ($this->recipient_type === 'parent') {
            return $this->belongsTo(Guardian::class, 'recipient_id');
        }
        return $this->belongsTo(User::class, 'recipient_id');
    }

    /**
     * Scope to get only unread notifications.
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope to get only read notifications.
     */
    public function scopeRead($query)
    {
        return $query->where('is_read', true);
    }

    /**
     * Scope to filter by type.
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead()
    {
        $this->update(['is_read' => true]);
    }

    /**
     * Mark notification as unread.
     */
    public function markAsUnread()
    {
        $this->update(['is_read' => false]);
    }
}


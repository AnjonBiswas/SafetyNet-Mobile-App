<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LinkRequest extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'requester_type',
        'requester_id',
        'target_type',
        'target_id',
        'target_email',
        'status',
        'message',
        'requested_at',
        'responded_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    /**
     * Get the requester (parent or child).
     */
    public function requester()
    {
        if ($this->requester_type === 'parent') {
            return $this->belongsTo(Guardian::class, 'requester_id');
        }
        return $this->belongsTo(User::class, 'requester_id');
    }

    /**
     * Get the target (parent or child).
     */
    public function target()
    {
        if ($this->target_type === 'parent') {
            return $this->belongsTo(Guardian::class, 'target_id');
        }
        return $this->belongsTo(User::class, 'target_id');
    }

    /**
     * Get the parent-child link created from this request.
     */
    public function parentChildLink()
    {
        return $this->hasOne(ParentChildLink::class, 'link_request_id');
    }

    /**
     * Scope to get only pending requests.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to get only accepted requests.
     */
    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    /**
     * Scope to get requests by requester.
     */
    public function scopeByRequester($query, $type, $id)
    {
        return $query->where('requester_type', $type)
            ->where('requester_id', $id);
    }

    /**
     * Scope to get requests by target.
     */
    public function scopeByTarget($query, $type, $id)
    {
        return $query->where('target_type', $type)
            ->where('target_id', $id);
    }

    /**
     * Mark request as accepted.
     */
    public function accept()
    {
        $this->update([
            'status' => 'accepted',
            'responded_at' => now(),
        ]);
    }

    /**
     * Mark request as rejected.
     */
    public function reject()
    {
        $this->update([
            'status' => 'rejected',
            'responded_at' => now(),
        ]);
    }

    /**
     * Mark request as cancelled.
     */
    public function cancel()
    {
        $this->update([
            'status' => 'cancelled',
            'responded_at' => now(),
        ]);
    }

    /**
     * Check if request is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if request is accepted.
     */
    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }
}


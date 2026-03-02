<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParentChildLink extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'parent_child_links';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'parent_id',
        'child_id',
        'link_code',
        'status',
        'linked_at',
        'location_sharing_enabled',
        'linked_via',
        'link_request_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'linked_at' => 'datetime',
            'location_sharing_enabled' => 'boolean',
        ];
    }

    /**
     * Get the parent for this link.
     */
    public function parent()
    {
        return $this->belongsTo(Guardian::class, 'parent_id');
    }

    /**
     * Get the child (user) for this link.
     */
    public function child()
    {
        return $this->belongsTo(User::class, 'child_id');
    }

    /**
     * Get the link request that created this link.
     */
    public function linkRequest()
    {
        return $this->belongsTo(LinkRequest::class, 'link_request_id');
    }

    /**
     * Scope to get only active links.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get only pending links.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Mark link as active.
     */
    public function activate()
    {
        $this->update([
            'status' => 'active',
            'linked_at' => now(),
        ]);
    }

    /**
     * Revoke the link.
     */
    public function revoke()
    {
        $this->update([
            'status' => 'revoked',
        ]);
    }
}


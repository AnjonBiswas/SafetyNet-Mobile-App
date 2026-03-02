<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SosAlert extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'sos_alerts';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'child_id',
        'parent_id',
        'latitude',
        'longitude',
        'address',
        'message',
        'status',
        'triggered_at',
        'acknowledged_at',
        'resolved_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'triggered_at' => 'datetime',
            'acknowledged_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    /**
     * Get the child (user) who triggered this alert.
     */
    public function child()
    {
        return $this->belongsTo(User::class, 'child_id');
    }

    /**
     * Get the parent who received this alert.
     */
    public function parent()
    {
        return $this->belongsTo(Guardian::class, 'parent_id');
    }

    /**
     * Scope to get only active alerts.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get only acknowledged alerts.
     */
    public function scopeAcknowledged($query)
    {
        return $query->where('status', 'acknowledged');
    }

    /**
     * Scope to get only resolved alerts.
     */
    public function scopeResolved($query)
    {
        return $query->where('status', 'resolved');
    }

    /**
     * Acknowledge the alert.
     */
    public function acknowledge()
    {
        $this->update([
            'status' => 'acknowledged',
            'acknowledged_at' => now(),
        ]);
    }

    /**
     * Resolve the alert.
     */
    public function resolve()
    {
        $this->update([
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);
    }
}


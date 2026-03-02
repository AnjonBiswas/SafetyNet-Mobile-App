<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GeofenceEvent extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'geofence_events';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'geofence_id',
        'child_id',
        'parent_id',
        'event_type',
        'latitude',
        'longitude',
        'address',
        'distance_from_center',
        'occurred_at',
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
            'distance_from_center' => 'integer',
            'occurred_at' => 'datetime',
        ];
    }

    /**
     * Get the geofence for this event.
     */
    public function geofence()
    {
        return $this->belongsTo(Geofence::class, 'geofence_id');
    }

    /**
     * Get the child (user) for this event.
     */
    public function child()
    {
        return $this->belongsTo(User::class, 'child_id');
    }

    /**
     * Get the parent for this event.
     */
    public function parent()
    {
        return $this->belongsTo(Guardian::class, 'parent_id');
    }

    /**
     * Scope to get only enter events.
     */
    public function scopeEnter($query)
    {
        return $query->where('event_type', 'enter');
    }

    /**
     * Scope to get only exit events.
     */
    public function scopeExit($query)
    {
        return $query->where('event_type', 'exit');
    }
}


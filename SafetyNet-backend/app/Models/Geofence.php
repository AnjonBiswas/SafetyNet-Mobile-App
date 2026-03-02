<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Geofence extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'geofences';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'parent_id',
        'child_id',
        'name',
        'latitude',
        'longitude',
        'radius',
        'is_active',
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
            'radius' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the parent who created this geofence.
     */
    public function parent()
    {
        return $this->belongsTo(Guardian::class, 'parent_id');
    }

    /**
     * Get the child (user) this geofence is for.
     */
    public function child()
    {
        return $this->belongsTo(User::class, 'child_id');
    }

    /**
     * Scope to get only active geofences.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Check if a location is within this geofence.
     */
    public function containsLocation($latitude, $longitude)
    {
        $distance = $this->calculateDistance(
            $this->latitude,
            $this->longitude,
            $latitude,
            $longitude
        );

        return $distance <= $this->radius;
    }

    /**
     * Get geofence events.
     */
    public function events()
    {
        return $this->hasMany(GeofenceEvent::class, 'geofence_id');
    }

    /**
     * Calculate distance between two coordinates in meters (Haversine formula).
     */
    public function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // Earth radius in meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Activate the geofence.
     */
    public function activate()
    {
        $this->update(['is_active' => true]);
    }

    /**
     * Deactivate the geofence.
     */
    public function deactivate()
    {
        $this->update(['is_active' => false]);
    }
}


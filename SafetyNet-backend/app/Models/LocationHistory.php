<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LocationHistory extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'location_history';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'child_id',
        'latitude',
        'longitude',
        'address',
        'battery_level',
        'recorded_at',
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
            'battery_level' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }

    /**
     * Get the child (user) for this location record.
     */
    public function child()
    {
        return $this->belongsTo(User::class, 'child_id');
    }

    /**
     * Scope to get recent locations.
     */
    public function scopeRecent($query, $hours = 24)
    {
        return $query->where('recorded_at', '>=', now()->subHours($hours));
    }

    /**
     * Scope to get locations within a date range.
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('recorded_at', [$startDate, $endDate]);
    }

    /**
     * Get the latest location for a child.
     */
    public static function getLatestForChild($childId)
    {
        return static::where('child_id', $childId)
            ->latest('recorded_at')
            ->first();
    }
}


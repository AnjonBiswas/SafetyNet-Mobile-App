<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SafeZone extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'area_name',
        'latitude',
        'longitude',
        'radius',
        'risk_level',
        'incident_count',
        'incident_details',
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
            'incident_count' => 'integer',
            'incident_details' => 'array', // JSON stored as text, cast to array
        ];
    }
}

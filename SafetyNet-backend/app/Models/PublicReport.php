<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PublicReport extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'public_report';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'reporter_name',
        'contact_info',
        'area_name',
        'latitude',
        'longitude',
        'incident_type',
        'incident_description',
        'incident_date',
        'incident_time',
        'risk_level',
        'is_verified',
        'admin_notes',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'contact_info',
        'admin_notes',
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
            'incident_date' => 'date',
            'incident_time' => 'datetime',
            'is_verified' => 'boolean',
        ];
    }
}

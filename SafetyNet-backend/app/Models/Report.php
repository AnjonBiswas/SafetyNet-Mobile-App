<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'incident_type',
        'incident_date',
        'description',
        'victim_name',
        'victim_contact',
        'location_street',
        'city',
        'location_details',
        'evidence_files',
        'perpetrator_description',
        'witnesses',
        'status',
        'admin_notes',
        'is_verified',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'admin_notes', // Hide admin notes from public API
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'incident_date' => 'datetime',
            'is_verified' => 'boolean',
            'evidence_files' => 'array', // JSON stored as text, cast to array
        ];
    }

    /**
     * Get the user that owns the report.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

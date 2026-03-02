<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SosEmergency extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'sos_emergency';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'user_name',
        'user_email',
        'latitude',
        'longitude',
        'location_address',
        'emergency_status',
        'emergency_type',
        'description',
        'alert_sent_to',
        'priority',
        'resolved_at',
        'resolved_by',
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
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'is_verified' => 'boolean',
            'resolved_at' => 'datetime',
            'alert_sent_to' => 'array', // JSON to array
        ];
    }

    /**
     * Get the user that triggered the emergency.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the admin who resolved the emergency.
     */
    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}

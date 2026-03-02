<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'login';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'full_name',
        'email',
        'password',
        'last_login',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login' => 'datetime',
        ];
    }

    /**
     * Get the reports for the user.
     */
    public function reports()
    {
        return $this->hasMany(Report::class, 'user_id');
    }

    /**
     * Get the SOS emergencies for the user.
     */
    public function sosEmergencies()
    {
        return $this->hasMany(SosEmergency::class, 'user_id');
    }

    /**
     * Get the emergency contacts for the user.
     */
    public function emergencyContacts()
    {
        return $this->hasMany(EmergencyContact::class, 'user_id');
    }

    /**
     * Get emergencies resolved by this user (admin).
     */
    public function resolvedEmergencies()
    {
        return $this->hasMany(SosEmergency::class, 'resolved_by');
    }

    /**
     * Get parent-child links for this user (as a child).
     */
    public function parentChildLinks()
    {
        return $this->hasMany(ParentChildLink::class, 'child_id');
    }

    /**
     * Get all parents (guardians) linked to this user (through links).
     */
    public function parents()
    {
        return $this->belongsToMany(Guardian::class, 'parent_child_links', 'child_id', 'parent_id')
            ->withPivot('link_code', 'status', 'linked_at')
            ->withTimestamps();
    }

    /**
     * Get active parents only.
     */
    public function activeParents()
    {
        return $this->parents()->wherePivot('status', 'active');
    }

    /**
     * Get location history for this user.
     */
    public function locationHistory()
    {
        return $this->hasMany(LocationHistory::class, 'child_id');
    }

    /**
     * Get latest location.
     */
    public function latestLocation()
    {
        return $this->hasOne(LocationHistory::class, 'child_id')
            ->latestOfMany('recorded_at');
    }

    /**
     * Get SOS alerts for this user (as a child).
     */
    public function sosAlerts()
    {
        return $this->hasMany(SosAlert::class, 'child_id');
    }

    /**
     * Get active SOS alerts.
     */
    public function activeSosAlerts()
    {
        return $this->sosAlerts()->where('status', 'active');
    }

    /**
     * Get geofences for this user (as a child).
     */
    public function geofences()
    {
        return $this->hasMany(Geofence::class, 'child_id');
    }

    /**
     * Get active geofences.
     */
    public function activeGeofences()
    {
        return $this->geofences()->where('is_active', true);
    }

    /**
     * Get notifications related to this user (as a child).
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'child_id');
    }
}

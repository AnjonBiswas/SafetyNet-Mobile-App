<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Guardian extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'parents';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'profile_image',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
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
            'email_verified_at' => 'datetime',
        ];
    }

    /**
     * Get the parent-child links for this parent.
     */
    public function parentChildLinks()
    {
        return $this->hasMany(ParentChildLink::class, 'parent_id');
    }

    /**
     * Get all children linked to this parent (through links).
     */
    public function children()
    {
        return $this->belongsToMany(User::class, 'parent_child_links', 'parent_id', 'child_id')
            ->withPivot('link_code', 'status', 'linked_at')
            ->withTimestamps();
    }

    /**
     * Get active children only.
     */
    public function activeChildren()
    {
        return $this->children()->wherePivot('status', 'active');
    }

    /**
     * Get SOS alerts for this parent.
     */
    public function sosAlerts()
    {
        return $this->hasMany(SosAlert::class, 'parent_id');
    }

    /**
     * Get active SOS alerts.
     */
    public function activeSosAlerts()
    {
        return $this->sosAlerts()->where('status', 'active');
    }

    /**
     * Get geofences created by this parent.
     */
    public function geofences()
    {
        return $this->hasMany(Geofence::class, 'parent_id');
    }

    /**
     * Get active geofences.
     */
    public function activeGeofences()
    {
        return $this->geofences()->where('is_active', true);
    }

    /**
     * Get notifications for this parent.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'parent_id');
    }

    /**
     * Get unread notifications.
     */
    public function unreadNotifications()
    {
        return $this->notifications()->where('is_read', false);
    }

    /**
     * Get device tokens for push notifications.
     */
    public function deviceTokens()
    {
        return $this->hasMany(ParentDeviceToken::class, 'parent_id');
    }

    /**
     * Get active device tokens.
     */
    public function activeDeviceTokens()
    {
        return $this->deviceTokens()->where('is_active', true);
    }
}


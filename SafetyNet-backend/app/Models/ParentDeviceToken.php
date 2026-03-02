<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParentDeviceToken extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'parent_device_tokens';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'parent_id',
        'token',
        'platform',
        'device_id',
        'device_name',
        'is_active',
        'last_used_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_used_at' => 'datetime',
        ];
    }

    /**
     * Get the parent who owns this device token.
     */
    public function parent()
    {
        return $this->belongsTo(Guardian::class, 'parent_id');
    }

    /**
     * Scope to get only active tokens.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by platform.
     */
    public function scopePlatform($query, $platform)
    {
        return $query->where('platform', $platform);
    }

    /**
     * Mark token as active.
     */
    public function activate()
    {
        $this->update([
            'is_active' => true,
            'last_used_at' => now(),
        ]);
    }

    /**
     * Deactivate token.
     */
    public function deactivate()
    {
        $this->update(['is_active' => false]);
    }
}


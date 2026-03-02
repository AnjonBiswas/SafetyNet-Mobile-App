<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\DB;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Extend database manager to use custom SQLite connector
        // Note: The extend closure receives the full config, so we can safely use it
        DB::extend('sqlite', function ($config, $name) {
            // The config should already have 'driver' from the connections array
            // But ensure it's set just in case
            if (empty($config) || !isset($config['driver'])) {
                // If config is empty, get it from the connections array
                $connectionName = $name ?: 'sqlite';
                $fullConfig = config("database.connections.{$connectionName}", []);
                $config = array_merge($fullConfig, $config);
            }
            
            // Ensure driver is set
            $config['driver'] = $config['driver'] ?? 'sqlite';
            $config['database'] = $config['database'] ?? database_path('database.sqlite');
            $config['prefix'] = $config['prefix'] ?? '';
            
            try {
                $connector = new \App\Database\Connectors\SqliteConnector();
                $connection = $connector->connect($config);

                return new \Illuminate\Database\SQLiteConnection(
                    $connection,
                    $config['database'],
                    $config['prefix'],
                    $config
                );
            } catch (\Exception $e) {
                // Fallback to default SQLite connection if custom connector fails
                $connector = new \Illuminate\Database\Connectors\SQLiteConnector();
                $connection = $connector->connect($config);

                return new \Illuminate\Database\SQLiteConnection(
                    $connection,
                    $config['database'],
                    $config['prefix'],
                    $config
                );
            }
        });
    }
}

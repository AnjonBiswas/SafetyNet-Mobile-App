<?php

namespace App\Database\Connectors;

use Illuminate\Database\Connectors\SQLiteConnector as BaseSQLiteConnector;
use PDO;

class SqliteConnector extends BaseSQLiteConnector
{
    /**
     * Establish a database connection.
     *
     * @param  array  $config
     * @return \PDO
     */
    public function connect(array $config)
    {
        $options = $this->getOptions($config);
        $path = $this->parseDatabasePath($config['database']);
        
        // Create PDO connection
        $connection = $this->createConnection("sqlite:{$path}", $config, $options);
        
        // CRITICAL: Set busy_timeout FIRST before any other operations
        // Reduced to 5 seconds to fail faster if database is truly locked
        try {
            $connection->exec('PRAGMA busy_timeout=5000;');
        } catch (\Exception $e) {
            // Ignore if it fails
        }
        
        // Now configure other pragmas (Laravel's methods)
        $this->configurePragmas($connection, $config);
        $this->configureForeignKeyConstraints($connection, $config);
        
        // Busy timeout already set above, but Laravel might override it
        // So set it again to ensure our value is used
        try {
            $this->configureBusyTimeout($connection, $config);
        } catch (\Exception $e) {
            // Ignore if it fails
        }
        
        // Configure journal mode and synchronous - wrap in try-catch to prevent fatal errors
        try {
            $this->configureJournalMode($connection, $config);
        } catch (\PDOException $e) {
            // If database is locked, try to set WAL mode directly with retry
            if (str_contains($e->getMessage(), 'database is locked')) {
                // Retry with busy timeout
                try {
                    $connection->exec('PRAGMA journal_mode=WAL;');
                } catch (\Exception $retryException) {
                    // If still fails, continue without WAL mode
                }
            }
        }
        
        try {
            $this->configureSynchronous($connection, $config);
        } catch (\Exception $e) {
            // Ignore if it fails
        }
        
        return $connection;
    }
}


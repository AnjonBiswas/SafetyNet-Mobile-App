# SQLite Setup Script for SafetyNet Backend
# Run this script from the Laravel project root directory

Write-Host "Setting up SQLite for SafetyNet Backend..." -ForegroundColor Green

# Check if we're in Laravel project
if (-not (Test-Path "artisan")) {
    Write-Host "Error: This script must be run from Laravel project root directory!" -ForegroundColor Red
    Write-Host "Expected to find 'artisan' file in current directory." -ForegroundColor Yellow
    exit 1
}

# Create database directory if it doesn't exist
if (-not (Test-Path "database")) {
    New-Item -ItemType Directory -Path "database" | Out-Null
    Write-Host "Created 'database' directory" -ForegroundColor Green
}

# Create SQLite database file if it doesn't exist
$dbPath = "database\database.sqlite"
if (-not (Test-Path $dbPath)) {
    New-Item -ItemType File -Path $dbPath | Out-Null
    Write-Host "Created SQLite database file: $dbPath" -ForegroundColor Green
}
else {
    Write-Host "SQLite database file already exists: $dbPath" -ForegroundColor Yellow
}

# Check .env file
$envPath = ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    # Check if SQLite is configured
    if ($envContent -match "DB_CONNECTION=sqlite") {
        Write-Host ".env file already configured for SQLite" -ForegroundColor Green
    }
    else {
        Write-Host "Warning: .env file may not be configured for SQLite" -ForegroundColor Yellow
        Write-Host "Please ensure .env contains:" -ForegroundColor Yellow
        Write-Host "  DB_CONNECTION=sqlite" -ForegroundColor Cyan
        Write-Host "  # DB_DATABASE can be empty or set to: database/database.sqlite" -ForegroundColor Cyan
    }
}
else {
    Write-Host "Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Please create .env file from .env.example" -ForegroundColor Yellow
}

Write-Host "`nSetup complete! Next steps:" -ForegroundColor Green
Write-Host "1. Ensure .env has: DB_CONNECTION=sqlite" -ForegroundColor Cyan
Write-Host "2. Run: php artisan migrate" -ForegroundColor Cyan
Write-Host "3. Verify: php artisan migrate:status" -ForegroundColor Cyan

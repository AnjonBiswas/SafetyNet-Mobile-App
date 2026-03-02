# SafetyNet API Test Script for PowerShell
# Run this script to test all API endpoints

$baseUrl = "http://127.0.0.1:8000/api"
$token = $null

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SafetyNet API Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Register User
Write-Host "1. Testing Registration..." -ForegroundColor Yellow
$registerBody = @{
    full_name             = "Test User"
    email                 = "test@example.com"
    password              = "password123"
    password_confirmation = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "   ✓ Registration successful!" -ForegroundColor Green
    Write-Host "   User ID: $($response.data.user.id)" -ForegroundColor Gray
    Write-Host "   Email: $($response.data.user.email)" -ForegroundColor Gray
    $token = $response.data.token
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
}
catch {
    Write-Host "   ✗ Registration failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit
}

Write-Host ""

# Test 2: Login
Write-Host "2. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email    = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "   ✓ Login successful!" -ForegroundColor Green
    $token = $response.data.token
    Write-Host "   Token received: $($token.Substring(0, 20))..." -ForegroundColor Gray
}
catch {
    Write-Host "   ✗ Login failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Get User (Protected Route)
if ($token) {
    Write-Host "3. Testing Get User (Protected Route)..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/user" -Method GET -Headers $headers
        Write-Host "   ✓ User data retrieved!" -ForegroundColor Green
        Write-Host "   Name: $($response.data.user.full_name)" -ForegroundColor Gray
        Write-Host "   Email: $($response.data.user.email)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ✗ Failed to get user data!" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
else {
    Write-Host "3. Skipping Get User test (no token)" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Create Public Report (Public Route)
Write-Host "4. Testing Create Public Report..." -ForegroundColor Yellow
$publicReportBody = @{
    reporter_name        = "Alice"
    contact_info         = "alice@example.com"
    area_name            = "Downtown"
    latitude             = 23.78
    longitude            = 90.41
    incident_type        = "harassment"
    incident_description = "Test incident description"
    incident_date        = "2025-12-08"
    incident_time        = "12:30:00"
    risk_level           = "high"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/public-reports" -Method POST -Body $publicReportBody -ContentType "application/json"
    Write-Host "   ✓ Public report created!" -ForegroundColor Green
    Write-Host "   Report ID: $($response.data.id)" -ForegroundColor Gray
}
catch {
    Write-Host "   ✗ Failed to create public report!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 5: List Public Reports
Write-Host "5. Testing List Public Reports..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/public-reports" -Method GET
    Write-Host "   ✓ Public reports retrieved!" -ForegroundColor Green
    Write-Host "   Count: $($response.count)" -ForegroundColor Gray
}
catch {
    Write-Host "   ✗ Failed to list public reports!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Create Report (Protected Route)
if ($token) {
    Write-Host "6. Testing Create Report (Protected Route)..." -ForegroundColor Yellow
    $reportBody = @{
        incident_type   = "assault"
        incident_date   = "2025-12-08T12:00:00"
        description     = "Test report description"
        victim_name     = "Test User"
        victim_contact  = "test@example.com"
        location_street = "123 Main Street"
        city            = "Dhaka"
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/reports" -Method POST -Body $reportBody -ContentType "application/json" -Headers $headers
        Write-Host "   ✓ Report created!" -ForegroundColor Green
        Write-Host "   Report ID: $($response.data.id)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ✗ Failed to create report!" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "6. Skipping Create Report test (no token)" -ForegroundColor Yellow
}

Write-Host ""

# Test 7: Test Route
Write-Host "7. Testing Test Route..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/test" -Method GET
    Write-Host "   ✓ Test route working!" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor Gray
}
catch {
    Write-Host "   ✗ Test route failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Make sure Laravel server is running:" -ForegroundColor Yellow
Write-Host "  cd c:\xampp\htdocs\SafetyNet-backend" -ForegroundColor Gray
Write-Host "  php artisan serve" -ForegroundColor Gray
Write-Host ""

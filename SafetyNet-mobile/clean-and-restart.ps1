# SafetyNet Mobile - Clean and Restart Script
# Run this script to fix all module resolution issues

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SafetyNet Mobile - Clean & Restart" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop any running processes
Write-Host "1. Stopping any running Expo processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*expo*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Step 2: Remove node_modules
Write-Host "2. Removing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "   ✓ node_modules removed" -ForegroundColor Green
}

# Step 3: Remove .expo folder
Write-Host "3. Removing .expo cache..." -ForegroundColor Yellow
if (Test-Path ".expo") {
    Remove-Item -Recurse -Force ".expo"
    Write-Host "   ✓ .expo cache removed" -ForegroundColor Green
}

# Step 4: Clear npm cache
Write-Host "4. Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "   ✓ npm cache cleared" -ForegroundColor Green

# Step 5: Remove package-lock.json (optional, for fresh install)
Write-Host "5. Removing package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
    Write-Host "   ✓ package-lock.json removed" -ForegroundColor Green
}

# Step 6: Reinstall dependencies
Write-Host "6. Installing dependencies..." -ForegroundColor Yellow
npm install
Write-Host "   ✓ Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now run: npx expo start -c" -ForegroundColor Yellow
Write-Host ""


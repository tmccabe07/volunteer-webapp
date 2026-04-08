#!/usr/bin/env pwsh
# Test Database Setup Script
# This script creates and initializes the test database for running tests

$ErrorActionPreference = "Stop"

Write-Host "Setting up test database..." -ForegroundColor Cyan

# Set test database environment variable
$env:DATABASE_URL = "file:./test.db"

# Remove old test database if it exists
if (Test-Path "test.db") {
    Write-Host "Removing old test database..." -ForegroundColor Yellow
    Remove-Item "test.db" -Force
}

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm exec prisma generate

# Run migrations on test database
Write-Host "Running migrations on test database..." -ForegroundColor Yellow
npm exec prisma migrate deploy

Write-Host "Test database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run tests with:" -ForegroundColor Cyan
Write-Host "  npm test" -ForegroundColor White
Write-Host "  npm run test:cov" -ForegroundColor White
Write-Host "  npm run test:e2e" -ForegroundColor White

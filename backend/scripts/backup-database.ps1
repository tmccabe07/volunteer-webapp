#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Database backup script for SQLite database
.DESCRIPTION
    Creates a backup of the SQLite database with timestamp
    Supports compression and automatic cleanup of old backups
.PARAMETER DatabasePath
    Path to the database file (default: ./dev.db)
.PARAMETER BackupDir
    Directory to store backups (default: ./backups)
.PARAMETER KeepDays
    Number of days to keep backups (default: 30)
.PARAMETER Compress
    Whether to compress the backup (default: true)
.EXAMPLE
    .\backup-database.ps1
.EXAMPLE
    .\backup-database.ps1 -DatabasePath "./production.db" -KeepDays 90
#>

param(
    [string]$DatabasePath = "dev.db",
    [string]$BackupDir = "backups",
    [int]$KeepDays = 30,
    [switch]$Compress = $true
)

# Set error action
$ErrorActionPreference = "Stop"

Write-Host "=== Database Backup Script ===" -ForegroundColor Cyan
Write-Host ""

# Resolve paths
$dbPath = Resolve-Path $DatabasePath -ErrorAction SilentlyContinue
if (-not $dbPath) {
    Write-Host "❌ Database file not found: $DatabasePath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Database: $dbPath" -ForegroundColor Green

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "📂 Created backup directory: $BackupDir" -ForegroundColor Green
}

# Generate backup filename with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "backup_$timestamp.db"
$backupPath = Join-Path $BackupDir $backupFileName

try {
    # Copy database file
    Write-Host "🔄 Creating backup..." -ForegroundColor Yellow
    Copy-Item -Path $dbPath -Destination $backupPath -Force
    
    $backupSize = (Get-Item $backupPath).Length / 1MB
    Write-Host "✅ Backup created: $backupPath ($([math]::Round($backupSize, 2)) MB)" -ForegroundColor Green
    
    # Compress if requested
    if ($Compress) {
        Write-Host "🗜️  Compressing backup..." -ForegroundColor Yellow
        $compressedPath = "$backupPath.zip"
        Compress-Archive -Path $backupPath -DestinationPath $compressedPath -Force
        Remove-Item $backupPath -Force
        
        $compressedSize = (Get-Item $compressedPath).Length / 1MB
        $ratio = [math]::Round(($compressedSize / $backupSize) * 100, 1)
        Write-Host "✅ Compressed: $compressedPath ($([math]::Round($compressedSize, 2)) MB, $ratio% of original)" -ForegroundColor Green
    }
    
    # Cleanup old backups
    Write-Host "🧹 Cleaning up old backups (older than $KeepDays days)..." -ForegroundColor Yellow
    $cutoffDate = (Get-Date).AddDays(-$KeepDays)
    $oldBackups = Get-ChildItem -Path $BackupDir -Filter "backup_*.db*" | 
                  Where-Object { $_.LastWriteTime -lt $cutoffDate }
    
    $removedCount = 0
    foreach ($oldBackup in $oldBackups) {
        Remove-Item $oldBackup.FullName -Force
        $removedCount++
        Write-Host "  🗑️  Removed: $($oldBackup.Name)" -ForegroundColor Gray
    }
    
    if ($removedCount -eq 0) {
        Write-Host "  ✅ No old backups to remove" -ForegroundColor Green
    } else {
        Write-Host "  ✅ Removed $removedCount old backup(s)" -ForegroundColor Green
    }
    
    # Show backup summary
    Write-Host "" -ForegroundColor White
    Write-Host "=== Backup Summary ===" -ForegroundColor Cyan
    $allBackups = Get-ChildItem -Path $BackupDir -Filter "backup_*.db*"
    $totalSize = ($allBackups | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "Total backups: $($allBackups.Count)" -ForegroundColor White
    Write-Host "Total size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor White
    Write-Host "Backup directory: $(Resolve-Path $BackupDir)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Backup failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor White
Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
exit 0

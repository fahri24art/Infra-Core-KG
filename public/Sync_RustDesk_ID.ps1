<#
.SYNOPSIS
    RustDesk ID Sync Agent for Power Asset
.DESCRIPTION
    This script extracts the local RustDesk ID and synchronizes it with the Power Asset server.
    It should be deployed to client laptops via GPO or run manually.
#>

# ==========================================
# CONFIGURATION
# ==========================================
# Ganti dengan IP Address server Power Asset Anda
$ServerIP = "192.168.1.66" 
$ServerPort = "5000"
$ApiEndpoint = "http://${ServerIP}:${ServerPort}/api/rustdesk/register"

# ==========================================
# LOGIC
# ==========================================
Write-Host "Starting RustDesk ID Sync Agent..." -ForegroundColor Cyan

# 1. Get System Information
$Hostname = $env:COMPUTERNAME
$UUID = (Get-CimInstance Win32_ComputerSystemProduct).UUID

if (-not $UUID) {
    Write-Host "Failed to retrieve System UUID. Falling back to MAC address..." -ForegroundColor Yellow
    $UUID = (Get-NetAdapter | Where-Object Status -eq 'Up' | Select-Object -First 1).MacAddress
}

Write-Host "Hostname: $Hostname"
Write-Host "UUID: $UUID"

# 2. Locate RustDesk Configuration
$RustDeskID = $null
$ConfigPaths = @(
    "$env:APPDATA\RustDesk\config\RustDesk2.toml",
    "$env:APPDATA\RustDesk\config\RustDesk.toml",
    "$env:LOCALAPPDATA\RustDesk\config\RustDesk2.toml",
    "$env:LOCALAPPDATA\RustDesk\config\RustDesk.toml",
    "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml",
    "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml"
)

foreach ($Path in $ConfigPaths) {
    if (Test-Path $Path) {
        Write-Host "Found RustDesk config at: $Path" -ForegroundColor Green
        $Content = Get-Content $Path -Raw
        
        # Regex to find id = 'xxx'
        if ($Content -match "id\s*=\s*'([^']+)'") {
            $RustDeskID = $matches[1]
            break
        }
    }
}

if (-not $RustDeskID) {
    Write-Host "ERROR: Could not find RustDesk ID! Is RustDesk installed and opened at least once?" -ForegroundColor Red
    Exit 1
}

Write-Host "Extracted RustDesk ID: $RustDeskID" -ForegroundColor Cyan

# 3. Send Data to Power Asset Server
$Payload = @{
    uuid = $UUID
    rustdesk_id = $RustDeskID
    hostname = $Hostname
} | ConvertTo-Json

Write-Host "Sending registration payload to $ApiEndpoint ..."
try {
    $Response = Invoke-RestMethod -Uri $ApiEndpoint -Method Post -Body $Payload -ContentType "application/json" -TimeoutSec 10
    
    if ($Response.success) {
        Write-Host "SUCCESS: RustDesk ID synchronized to Power Asset!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Server responded but success flag was false." -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Failed to connect to server. Is the server IP correct? ($($_.Exception.Message))" -ForegroundColor Red
}

Write-Host "Agent finished."

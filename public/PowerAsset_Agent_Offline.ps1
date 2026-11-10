# ==============================================================================
# Power Asset - Complete Offline Agent & Hardware Gatherer V28.0
# Description: Gathers complete hardware, software, peripheral, network & security
#              telemetry for air-gapped / offline computers (Identical to Online Agent).
# Output: Data_Asset_OFFLINE_<HOSTNAME>.json in the script directory (Flashdisk).
# ==============================================================================

$ErrorActionPreference = "SilentlyContinue"

# Configure console output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "     TCF POWER ASSET - ADVANCED OFFLINE TELEMETRY GATHERER        " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Memulai penarikan data perangkat secara mendalam dan menyeluruh...`n" -ForegroundColor White

# ------------------------------------------------------------------------------
# 1. HOSTNAME & UUID GENERATION
# ------------------------------------------------------------------------------
Write-Host "[1/8] Mendeteksi Identitas PC & Motherboard/BIOS..." -ForegroundColor Green

$global:Hostname = $env:COMPUTERNAME
$macForName = (Get-NetAdapter | Where-Object { $_.MacAddress -ne $null -and $_.Virtual -eq $false } | Select-Object -First 1).MacAddress
if (-not $macForName) {
    $macForName = (Get-NetAdapter | Where-Object MacAddress -ne $null | Select-Object -First 1).MacAddress
}

# Normalize default Windows desktop names to avoid collisions
if ($global:Hostname -eq "DESKTOP-3L56DM4") {
    if ($macForName) {
        $shortMac = $macForName.Replace("-", "").Substring(8, 4)
        $global:Hostname = "CUBI-" + $shortMac
    }
} elseif ($global:Hostname -match "^DESKTOP-[A-Z0-9]{7}$") {
    if ($macForName) {
        $shortMac = $macForName.Replace("-", "").Substring(8, 4)
        $global:Hostname = $global:Hostname + "-" + $shortMac
    }
}

function Get-AgentUUID {
    $uuidObj = (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue).UUID
    $macObj = (Get-NetAdapter | Where-Object { $_.MacAddress -ne $null -and $_.Virtual -eq $false } | Select-Object -First 1).MacAddress
    if (-not $macObj) {
        $macObj = (Get-NetAdapter | Where-Object MacAddress -ne $null | Select-Object -First 1).MacAddress
    }
    
    $fakeUUIDs = @(
        "03000200-0400-0500-0006-000700080009",
        "00000000-0000-0000-0000-000000000000",
        "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
        "Default string"
    )
    
    if (-not $uuidObj -or $fakeUUIDs -contains $uuidObj) {
        if ($macObj) {
            $uuidObj = "MAC-" + $macObj.Replace("-", "")
        } else {
            $uuidObj = [guid]::NewGuid().ToString()
        }
    } else {
        if ($macObj) {
            $uuidObj = $uuidObj + "-" + $macObj.Replace("-", "").Substring(8, 4)
        }
    }
    return $uuidObj
}

$global:UUID = Get-AgentUUID

# Motherboard, BIOS & System Info
$SysInfo = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
$Bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -First 1
$BaseBoard = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue | Select-Object -First 1

$SerialNumber = "Unknown"
if ($Bios -and $Bios.SerialNumber -and $Bios.SerialNumber -notmatch "To be filled|Default|System Serial|None|0000") {
    $SerialNumber = $Bios.SerialNumber.Trim()
}

$Manufacturer = if ($SysInfo.Manufacturer) { $SysInfo.Manufacturer.Trim() } else { "Generic" }
$Model = if ($SysInfo.Model) { $SysInfo.Model.Trim() } else { "Generic PC" }
$Motherboard = if ($BaseBoard) { "$($BaseBoard.Manufacturer) $($BaseBoard.Product)".Trim() } else { "" }

# ------------------------------------------------------------------------------
# 2. PROCESSOR (CPU) & GRAPHICS (GPU)
# ------------------------------------------------------------------------------
Write-Host "[2/8] Mendeteksi Processor (CPU) & Kartu Grafis (GPU)..." -ForegroundColor Green

$CPUInfo = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
$CPU = @{
    name = if ($CPUInfo.Name) { $CPUInfo.Name.Trim() } else { "Unknown Processor" }
    cores = $CPUInfo.NumberOfCores
    logical_processors = $CPUInfo.NumberOfLogicalProcessors
    max_clock_speed = $CPUInfo.MaxClockSpeed
}

# GPU / Video Controller
$GpuList = @()
$PrimaryGpu = ""
try {
    $VideoControllers = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue
    foreach ($vc in $VideoControllers) {
        if ($vc.Name -and $vc.Name -notmatch "Remote|Virtual|Basic Render") {
            $vramGB = [math]::Round(($vc.AdapterRAM / 1GB), 2)
            $GpuList += @{
                name = $vc.Name.Trim()
                driver_version = $vc.DriverVersion
                vram_gb = $vramGB
            }
            if (-not $PrimaryGpu) {
                $PrimaryGpu = $vc.Name.Trim()
            }
        }
    }
    if (-not $PrimaryGpu -and $VideoControllers.Count -gt 0) {
        $PrimaryGpu = $VideoControllers[0].Name
    }
} catch {}

# ------------------------------------------------------------------------------
# 3. MEMORY (RAM) & DETAILED STICKS
# ------------------------------------------------------------------------------
Write-Host "[3/8] Mendata Kapasitas Memory (RAM) & Keping Slot..." -ForegroundColor Green

$MemTotal = 0
$MemSticksArray = @()
try {
    $MemSticks = Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue
    foreach ($Stick in $MemSticks) {
        $stickCapGB = [math]::Round($Stick.Capacity / 1GB, 2)
        $MemTotal += $stickCapGB
        $MemSticksArray += @{
            slot = $Stick.DeviceLocator
            capacity_gb = $stickCapGB
            speed_mhz = $Stick.Speed
            manufacturer = $Stick.Manufacturer
            part_number = if ($Stick.PartNumber) { $Stick.PartNumber.Trim() } else { "" }
        }
    }
} catch {}

if ($MemTotal -eq 0 -and $SysInfo.TotalPhysicalMemory) {
    $MemTotal = [math]::Round($SysInfo.TotalPhysicalMemory / 1GB, 2)
}
$RAM = "$MemTotal GB"

# ------------------------------------------------------------------------------
# 4. STORAGE & PARTITIONS
# ------------------------------------------------------------------------------
Write-Host "[4/8] Mendata Storage Disk (Physical Disks & Logical Partitions)..." -ForegroundColor Green

$StorageArray = @()
$StorageSummary = @()
$PhysicalDisksArray = @()

# Physical Disks
try {
    $PhysicalDisks = Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue
    foreach ($pd in $PhysicalDisks) {
        $pdSizeGB = [math]::Round($pd.Size / 1GB, 2)
        $PhysicalDisksArray += @{
            model = $pd.Model
            size_gb = $pdSizeGB
            interface = $pd.InterfaceType
            media_type = $pd.MediaType
            serial_number = if ($pd.SerialNumber) { $pd.SerialNumber.Trim() } else { "" }
        }
    }
} catch {}

# Logical Fixed Drives (C:, D:, etc.)
try {
    $LogicalDisks = Get-CimInstance Win32_LogicalDisk -ErrorAction SilentlyContinue | Where-Object DriveType -eq 3
    foreach ($LD in $LogicalDisks) {
        $FreeGB = [math]::Round($LD.FreeSpace / 1GB, 2)
        $TotalGB = [math]::Round($LD.Size / 1GB, 2)
        $StorageSummary += "$($LD.DeviceID) ($FreeGB GB Free of $TotalGB GB)"
        
        $StorageArray += @{
            model = $LD.DeviceID
            drive = $LD.DeviceID
            name = $LD.DeviceID
            size = $TotalGB
            size_gb = $TotalGB
            capacity_gb = $TotalGB
            free_gb = $FreeGB
            filesystem = $LD.FileSystem
        }
    }
} catch {}

$StorageSummaryStr = if ($StorageSummary.Count -gt 0) { $StorageSummary -join ", " } else { "No Fixed Disks Detected" }

# ------------------------------------------------------------------------------
# 5. MONITORS (EDID) & PERIPHERALS
# ------------------------------------------------------------------------------
Write-Host "[5/8] Mendeteksi Monitor (EDID), Keyboard, Mouse & Printer..." -ForegroundColor Green

$MonitorsArray = @()
$MonitorsFriendly = @()
try {
    $wmiMonitors = Get-WmiObject WmiMonitorID -Namespace root\wmi -ErrorAction SilentlyContinue
    if (-not $wmiMonitors) {
        $wmiMonitors = Get-CimInstance WmiMonitorID -Namespace root\wmi -ErrorAction SilentlyContinue
    }
    foreach ($m in $wmiMonitors) {
        $manuf = ($m.ManufacturerName | Where-Object { $_ -ne 0 -and $_ -ne $null } | ForEach-Object { [char]$_ }) -join ""
        $name = ($m.UserFriendlyName | Where-Object { $_ -ne 0 -and $_ -ne $null } | ForEach-Object { [char]$_ }) -join ""
        $serial = ($m.SerialNumberID | Where-Object { $_ -ne 0 -and $_ -ne $null } | ForEach-Object { [char]$_ }) -join ""
        
        $fullName = "$manuf $name ($serial)".Trim()
        if (-not $fullName -or $fullName -eq "()") { $fullName = "Generic Monitor" }
        $MonitorsArray += $fullName
        $MonitorsFriendly += if ($name) { $name.Trim() } else { $fullName }
    }
} catch {}

if ($MonitorsFriendly.Count -eq 0) {
    # Fallback to Win32_DesktopMonitor if WmiMonitorID is unavailable
    try {
        $stdMonitors = Get-CimInstance Win32_DesktopMonitor -ErrorAction SilentlyContinue
        foreach ($sm in $stdMonitors) {
            if ($sm.Name) {
                $MonitorsFriendly += $sm.Name
                $MonitorsArray += $sm.Name
            }
        }
    } catch {}
}

$Keyboards = @()
try {
    $Kbs = Get-CimInstance Win32_Keyboard -ErrorAction SilentlyContinue
    foreach ($Kb in $Kbs) {
        if ($Kb.Name -and $Kb.Name -notmatch "RDP|Virtual|Terminal") {
            $Keyboards += $Kb.Name
        }
    }
} catch {}

$Mice = @()
try {
    $Ms = Get-CimInstance Win32_PointingDevice -ErrorAction SilentlyContinue
    foreach ($M in $Ms) {
        if ($M.Name -and $M.Name -notmatch "RDP|Virtual|Terminal") {
            $Mice += $M.Name
        }
    }
} catch {}

$Printers = @()
try {
    $Prts = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue
    foreach ($P in $Prts) {
        if ($P.Name -notmatch "Microsoft|PDF|WebEx|OneNote|Fax|Root Print Queue") {
            $Printers += $P.Name
        }
    }
} catch {}

$Peripherals = @{
    monitors = $MonitorsFriendly
    keyboards = $Keyboards
    mice = $Mice
    printers = $Printers
}

# ------------------------------------------------------------------------------
# 6. INSTALLED SOFTWARE (FULL 64-BIT, 32-BIT & USER REGISTRY)
# ------------------------------------------------------------------------------
Write-Host "[6/8] Memindai Seluruh Software Terpasang di Sistem..." -ForegroundColor Green

$SoftwareList = @()
try {
    $regPaths = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    $allRaw = foreach ($p in $regPaths) {
        Get-ItemProperty $p -ErrorAction SilentlyContinue | Where-Object { 
            $_.DisplayName -and $_.DisplayName.Trim() -ne "" -and $_.SystemComponent -ne 1 -and $_.ParentKeyName -eq $null
        }
    }
    
    $allSoftware = $allRaw | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate | Sort-Object DisplayName -Unique
    foreach ($sw in $allSoftware) {
        $SoftwareList += @{
            name = "$($sw.DisplayName)".Trim()
            version = if ($sw.DisplayVersion) { "$($sw.DisplayVersion)".Trim() } else { "" }
            publisher = if ($sw.Publisher) { "$($sw.Publisher)".Trim() } else { "" }
            install_date = if ($sw.InstallDate) { "$($sw.InstallDate)".Trim() } else { "" }
        }
    }
} catch {
    Write-Host "Peringatan: Gagal membaca software registri: $($_.Exception.Message)" -ForegroundColor DarkYellow
}

Write-Host "   -> Ditemukan $($SoftwareList.Count) aplikasi terinstall." -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 7. NETWORK, RUSTDESK, O365 & SECURITY STATUS
# ------------------------------------------------------------------------------
Write-Host "[7/8] Mendata Jaringan, Akun O365, RustDesk & Security..." -ForegroundColor Green

# Operating System
$OSInfo = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$OS = if ($OSInfo.Caption) { $OSInfo.Caption.Trim() } else { "Microsoft Windows" }
$OSVersion = if ($OSInfo.Version) { $OSInfo.Version.Trim() } else { "" }

# Network Info & MAC Addresses
$IPAddress = ""
$MacAddresses = @()
$NetworkType = "Offline"
$NetworkName = "Air-Gapped / Disconnected"
$InternetAccess = $false

try {
    $NetworkAdapters = Get-CimInstance Win32_NetworkAdapterConfiguration -ErrorAction SilentlyContinue | Where-Object IPEnabled -eq $true
    foreach ($Adapter in $NetworkAdapters) {
        if ($Adapter.IPAddress) {
            if (-not $IPAddress) { $IPAddress = $Adapter.IPAddress[0] }
            if ($Adapter.MACAddress) { $MacAddresses += $Adapter.MACAddress }
        }
    }
} catch {}

try {
    $netAdapter = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" -and $_.Virtual -eq $false } | Select-Object -First 1
    if ($netAdapter) {
        if ($netAdapter.MediaType -eq "802.3") {
            $NetworkType = "LAN"
            $NetworkName = $netAdapter.InterfaceDescription
        } elseif ($netAdapter.MediaType -eq "Native 802.11") {
            $NetworkType = "WIFI"
            $wifiInfo = netsh wlan show interfaces | Select-String "\s+SSID\s+:\s+(.+)"
            if ($wifiInfo) {
                $NetworkName = $wifiInfo.Matches.Groups[1].Value.Trim()
            } else {
                $NetworkName = $netAdapter.InterfaceDescription
            }
        } else {
            $NetworkType = $netAdapter.MediaType
            $NetworkName = $netAdapter.InterfaceDescription
        }
    }
} catch {}

# Fallback MAC if none found
if ($MacAddresses.Count -eq 0) {
    $allAdapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object MacAddress -ne $null
    foreach ($ad in $allAdapters) {
        $MacAddresses += $ad.MacAddress
    }
}
if (-not $IPAddress) { $IPAddress = "127.0.0.1" }

# RustDesk ID (Check all 8 standard paths)
$RustDeskID = $null
$RustDeskPaths = @(
    "$env:APPDATA\RustDesk\config\RustDesk2.toml",
    "$env:APPDATA\RustDesk\config\RustDesk.toml",
    "$env:LOCALAPPDATA\RustDesk\config\RustDesk2.toml",
    "$env:LOCALAPPDATA\RustDesk\config\RustDesk.toml",
    "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml",
    "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml",
    "$env:ProgramData\RustDesk\config\RustDesk2.toml",
    "$env:ProgramData\RustDesk\config\RustDesk.toml"
)
foreach ($Path in $RustDeskPaths) {
    if (Test-Path $Path) {
        $Content = Get-Content $Path -Raw -ErrorAction SilentlyContinue
        if ($Content -match "id\s*=\s*'([^']+)'") {
            $RustDeskID = $matches[1]
            break
        }
    }
}

# Office 365 Account
$O365Account = ""
try {
    $identityPaths = @(
        "HKCU:\Software\Microsoft\Office\16.0\Common\Identity\Identities",
        "HKCU:\Software\Microsoft\Office\15.0\Common\Identity\Identities"
    )
    foreach ($iPath in $identityPaths) {
        if (Test-Path $iPath) {
            $identities = Get-ChildItem -Path $iPath -ErrorAction SilentlyContinue
            foreach ($id in $identities) {
                $email = (Get-ItemProperty -Path $id.PSPath -Name "EmailAddress" -ErrorAction SilentlyContinue).EmailAddress
                if ($email) {
                    $O365Account = $email
                    break
                }
            }
        }
        if ($O365Account) { break }
    }
} catch {}

# Active Logged-in User
$ActiveUser = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).UserName
if (-not $ActiveUser) {
    try {
        $explorer = Get-CimInstance Win32_Process -Filter "Name='explorer.exe'" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($explorer) {
            $owner = Invoke-CimMethod -InputObject $explorer -MethodName GetOwner -ErrorAction SilentlyContinue
            if ($owner.User) {
                $ActiveUser = "$($owner.Domain)\$($owner.User)"
            }
        }
    } catch {}
}
if (-not $ActiveUser) {
    $ActiveUser = "$env:USERDOMAIN\$env:USERNAME"
}

# Antivirus & Wazuh
$avName = "Unknown"
$avStatus = "Unknown"
try {
    $av = Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntivirusProduct -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($av) {
        $avName = $av.displayName
        $avStatus = "Protected"
    } else {
        $defender = Get-Service -Name "WinDefend" -ErrorAction SilentlyContinue
        if ($defender -and $defender.Status -eq "Running") {
            $avName = "Windows Defender"
            $avStatus = "Protected"
        }
    }
} catch {}

$wazuhService = Get-Service | Where-Object { $_.Name -like "*wazuh*" -or $_.DisplayName -like "*wazuh*" -or $_.Name -like "*ossec*" } | Select-Object -First 1
$wazuhStatus = if ($wazuhService) { $wazuhService.Status.ToString() } else { "Not Installed" }

# Live Metrics Snapshot
$cpuUsage = 0
$ramUsage = 0
$diskUsage = 0
try {
    $cpuUsage = [math]::Round((Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Measure-Object -Property LoadPercentage -Average).Average)
    if ($OSInfo) {
        $usedRam = $OSInfo.TotalVisibleMemorySize - $OSInfo.FreePhysicalMemory
        $ramUsage = [math]::Round(($usedRam / $OSInfo.TotalVisibleMemorySize) * 100)
    }
    $cDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue
    if ($cDrive -and $cDrive.Size -gt 0) {
        $usedDisk = $cDrive.Size - $cDrive.FreeSpace
        $diskUsage = [math]::Round(($usedDisk / $cDrive.Size) * 100)
    }
} catch {}

# ------------------------------------------------------------------------------
# 8. COMPILE PAYLOAD & EXPORT JSON
# ------------------------------------------------------------------------------
Write-Host "[8/8] Mengemas Payload & Menyimpan ke Flashdisk..." -ForegroundColor Green

$Specs = @{
    cpu = $CPU.name
    cpu_details = $CPU
    ram = $RAM
    ram_gb = $MemTotal
    ram_sticks = $MemSticksArray
    storage = $StorageArray
    storage_summary = $StorageSummaryStr
    storage_info = $StorageSummaryStr
    physical_disks = $PhysicalDisksArray
    os = $OS
    os_version = $OSVersion
    manufacturer = $Manufacturer
    model = $Model
    motherboard = $Motherboard
    serial_number = $SerialNumber
    gpu = $PrimaryGpu
    gpu_details = $GpuList
    peripherals = $Peripherals
    software = $SoftwareList
    wazuh_status = $wazuhStatus
    monitors = $MonitorsArray
    mac_addresses = $MacAddresses
}

$Security = @{
    av_name = $avName
    av_status = $avStatus
    threats_count = 0
    last_scan = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

$Metrics = @{
    cpu_usage = $cpuUsage
    ram_usage = $ramUsage
    disk_usage = $diskUsage
}

$Payload = @{
    uuid = $global:UUID
    hostname = $global:Hostname
    ip_address = $IPAddress
    mac_address = $MacAddresses
    rustdesk_id = $RustDeskID
    username = $ActiveUser
    os = $OS
    specs = $Specs
    security = $Security
    metrics = $Metrics
    network_type = $NetworkType
    network_name = $NetworkName
    internet_access = $InternetAccess
    o365_account = $O365Account
    offline_collected_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

$JsonStr = $Payload | ConvertTo-Json -Depth 10

# Write to current script directory (Flashdisk)
$OutputDir = $PSScriptRoot
if (-not $OutputDir) { $OutputDir = "." }

$FilePath = Join-Path $OutputDir "Data_Asset_OFFLINE_$global:Hostname.json"
[System.IO.File]::WriteAllText($FilePath, $JsonStr, (New-Object System.Text.UTF8Encoding $false))

Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "                PENARIKAN DATA SELESAI & BERHASIL                 " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "Detail Perangkat Terdata:" -ForegroundColor White
Write-Host " - Hostname      : $global:Hostname" -ForegroundColor Cyan
Write-Host " - Serial Number : $SerialNumber" -ForegroundColor Cyan
Write-Host " - Brand / Model : $Manufacturer - $Model" -ForegroundColor Cyan
Write-Host " - Processor     : $($CPU.name)" -ForegroundColor Cyan
Write-Host " - Memory (RAM)  : $RAM" -ForegroundColor Cyan
Write-Host " - Storage       : $StorageSummaryStr" -ForegroundColor Cyan
Write-Host " - GPU           : $(if ($PrimaryGpu) { $PrimaryGpu } else { 'Integrated / None' })" -ForegroundColor Cyan
Write-Host " - Monitor Terdeteksi : $($MonitorsFriendly.Count) Unit" -ForegroundColor Cyan
Write-Host " - Software Terdata   : $($SoftwareList.Count) Aplikasi" -ForegroundColor Cyan
Write-Host " - RustDesk ID   : $(if ($RustDeskID) { $RustDeskID } else { 'Tidak Terinstall' })" -ForegroundColor Cyan
Write-Host " - Office 365    : $(if ($O365Account) { $O365Account } else { 'Tidak Ditemukan' })" -ForegroundColor Cyan
Write-Host "`nLokasi File Hasil Penarikan:" -ForegroundColor Yellow
Write-Host " -> $FilePath" -ForegroundColor Yellow
Write-Host "`nLangkah Selanjutnya:" -ForegroundColor White
Write-Host " 1. Bawa Flashdisk ini kembali ke komputer/laptop yang terhubung server Power Asset."
Write-Host " 2. Buka menu Assets -> Klik tombol 'IMPORT OFFLINE DATA'."
Write-Host " 3. Pilih file JSON di atas, pilih Lokasi (Sunter/Karanggan), dan data akan langsung tersimpan!"
Write-Host "==================================================================`n" -ForegroundColor Green

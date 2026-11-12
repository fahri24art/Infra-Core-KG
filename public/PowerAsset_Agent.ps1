<#
.SYNOPSIS
    Power Asset Native Agent
.DESCRIPTION
    This script extracts full hardware, network, and RustDesk specifications
    and synchronizes it with the Power Asset server.
    It should be deployed to client laptops via GPO or run manually using the VBS wrapper.
#>

# ==========================================
# CONFIGURATION
# Multi-Endpoint Failover: Try Local LAN IP first (fast & instant for office PCs), then Public Domain for remote PCs
# ==========================================
$ServerCandidates = @(
    "http://192.168.27.48:5000",
    "http://36.89.210.210:2425"
)
$Organization = "TCF-KG"
$global:ActiveServerURL = $null
$global:AgentVersion = "30.0"

# Force TLS 1.2 and bypass SSL cert checks
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
[Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

# ==========================================
# GLOBAL VARIABLES
# ==========================================
$ErrorActionPreference = "SilentlyContinue"
$global:UUID = $null
$global:Hostname = $env:COMPUTERNAME
$macForName = (Get-NetAdapter | Where-Object MacAddress -ne $null | Select-Object -First 1).MacAddress
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

# ==========================================
# FUNCTIONS
# ==========================================

function Get-AgentUUID {
    $uuidObj = (Get-CimInstance Win32_ComputerSystemProduct).UUID
    $macObj = (Get-NetAdapter | Where-Object MacAddress -ne $null | Select-Object -First 1).MacAddress
    
    # Check if UUID is a known generic/cloned string or empty
    $fakeUUIDs = @("03000200-0400-0500-0006-000700080009", "00000000-0000-0000-0000-000000000000", "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF", "Default string")
    
    if (-not $uuidObj -or $fakeUUIDs -contains $uuidObj) {
        if ($macObj) {
            $uuidObj = "MAC-" + $macObj.Replace("-", "")
        } else {
            $uuidObj = [guid]::NewGuid().ToString()
        }
    } else {
        # Make UUID absolutely unique by appending MAC if available
        if ($macObj) {
            $uuidObj = $uuidObj + "-" + $macObj.Replace("-", "").Substring(8, 4)
        }
    }
    return $uuidObj
}

$LogFile = "C:\ProgramData\PowerAsset\agent.log"
function Write-Log($Message) {
    $Time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Time - $Message" | Out-File -FilePath $LogFile -Append
}

function Send-Telemetry {
    # 1. Base System Information
    $SysInfo = Get-CimInstance Win32_ComputerSystem
    $Bios = Get-CimInstance Win32_BIOS
    $global:UUID = Get-AgentUUID

    # 2. Processor
    $CPUInfo = Get-CimInstance Win32_Processor | Select-Object -First 1
    $CPU = @{
        name = $CPUInfo.Name
        cores = $CPUInfo.NumberOfCores
        logical_processors = $CPUInfo.NumberOfLogicalProcessors
    }

    # 3. Memory
    $MemTotal = 0
    $MemSticks = Get-CimInstance Win32_PhysicalMemory
    foreach ($Stick in $MemSticks) {
        $MemTotal += [math]::Round($Stick.Capacity / 1GB, 2)
    }
    $RAM = "$MemTotal GB"

    # 4. Storage (Filter out Empty / 0 GB & Identify Removable USB Storage)
    $Disks = Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue
    $LogicalDisks = Get-CimInstance Win32_LogicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.DriveType -eq 3 -and $_.Size -gt 1073741824 }
    $StorageArray = @()
    $StorageSummary = @()

    foreach ($LD in $LogicalDisks) {
        $FreeGB = [math]::Round($LD.FreeSpace / 1GB, 2)
        $TotalGB = [math]::Round($LD.Size / 1GB, 2)
        if ($TotalGB -le 1) { continue }

        # Check if logical drive is on a USB interface (external HDD / flashdrive)
        $isUsb = $false
        try {
            $part = Get-CimAssociatedInstance -InputObject $LD -ResultClassName Win32_DiskPartition -ErrorAction SilentlyContinue
            if ($part) {
                $pd = Get-CimAssociatedInstance -InputObject $part[0] -ResultClassName Win32_DiskDrive -ErrorAction SilentlyContinue
                if ($pd -and ($pd.InterfaceType -match "USB" -or $pd.PNPDeviceID -match "USBSTOR")) {
                    $isUsb = $true
                }
            }
        } catch {}

        if (-not $isUsb) {
            $StorageSummary += "$($LD.DeviceID) ($FreeGB GB Free of $TotalGB GB)"
        }
        
        $StorageArray += @{
            model = $LD.DeviceID
            name = $LD.DeviceID
            drive = $LD.DeviceID
            size = $TotalGB
            size_gb = $TotalGB
            capacity_gb = $TotalGB
            free_gb = $FreeGB
            is_removable = $isUsb
            interface = if ($isUsb) { "USB" } else { "INTERNAL" }
        }
    }
    $StorageSummaryStr = if ($StorageSummary.Count -gt 0) { $StorageSummary -join ", " } else { "Internal Fixed Storage" }

    # 4b. GPU / Video Controller
    $PrimaryGpu = ""
    try {
        $vc = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Where-Object { $_.Name -and $_.Name -notmatch "Remote|Virtual|Basic Render" } | Select-Object -First 1
        if ($vc) { $PrimaryGpu = $vc.Name.Trim() }
    } catch {}

    # 5. OS
    $OSInfo = Get-CimInstance Win32_OperatingSystem
    $OS = $OSInfo.Caption
    $OSVersion = $OSInfo.Version

    # 6. Network
    $IPAddress = ""
    $MacAddress = @()

    $NetworkAdapters = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object IPEnabled -eq $true
    foreach ($Adapter in $NetworkAdapters) {
        if ($Adapter.IPAddress) {
            $IPAddress = $Adapter.IPAddress[0] # Pick primary
            $MacAddress += $Adapter.MACAddress
            break
        }
    }

    # 4c. Physical Disk Detection (SSD vs NVMe vs HDD & SMART Health)
    $PhysicalDisksList = @()
    $PrimaryStorageType = "SSD"
    $DiskHealthStatus = "Healthy"
    try {
        $pDisks = Get-PhysicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.BusType -ne "USB" }
        foreach ($pd in $pDisks) {
            $mType = "$($pd.MediaType)"
            $bType = "$($pd.BusType)"
            $hStatus = "$($pd.HealthStatus)"
            $sizeGb = [math]::Round($pd.Size / 1GB, 0)
            $PhysicalDisksList += @{
                model = "$($pd.FriendlyName)"
                media_type = $mType
                bus_type = $bType
                health = $hStatus
                size_gb = $sizeGb
            }
            if ($bType -match "NVMe") { $PrimaryStorageType = "NVMe SSD" }
            elseif ($mType -match "HDD" -and $PrimaryStorageType -ne "NVMe SSD") { $PrimaryStorageType = "HDD" }
            if ($hStatus -and $hStatus -ne "Healthy") { $DiskHealthStatus = $hStatus }
        }
    } catch {}

    # 7. RustDesk (With Auto-Heal Server 66 Config, Public Key & Direct LAN IP Mode)
    $RustDeskID = $null
    $RDKey = "goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4="
    $RDServer = "server.tricentrumfortuna.com"
    $ConfigPaths = @(
        "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml",
        "$env:APPDATA\RustDesk\config\RustDesk2.toml",
        "$env:LOCALAPPDATA\RustDesk\config\RustDesk2.toml",
        "$env:ProgramData\RustDesk\config\RustDesk2.toml"
    )

    foreach ($Path in $ConfigPaths) {
        if (Test-Path $Path) {
            $Content = Get-Content $Path -Raw
            if ($Content -match "(?<!enc_)\bid\s*=\s*'([0-9]{6,12})'") {
                $RustDeskID = $matches[1]
            }
            # Ensure RustDesk2.toml points to local Server 66 & enables Direct LAN IP access
            if ($Content -notmatch "goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4=" -or $Content -notmatch "direct-server\s*=\s*'Y'") {
                try {
                    if ($Content -match "\[options\]") {
                        $Content = $Content -replace "custom-rendezvous-server\s*=\s*'[^']*'", "custom-rendezvous-server = '$RDServer'"
                        $Content = $Content -replace "key\s*=\s*'[^']*'", "key = '$RDKey'"
                        if ($Content -notmatch "direct-server") {
                            $Content = $Content + "`ndirect-server = 'Y'`n"
                        }
                    } else {
                        $Content = $Content + "`n[options]`ncustom-rendezvous-server = '$RDServer'`nrelay-server = '$RDServer'`nkey = '$RDKey'`ndirect-server = 'Y'`n"
                    }
                    [System.IO.File]::WriteAllText($Path, $Content, (New-Object System.Text.UTF8Encoding $false))
                } catch {}
            }
            if ($RustDeskID) { break }
        }
    }

    if (-not $RustDeskID) {
        try {
            $rdExePaths = @("C:\Program Files\RustDesk\rustdesk.exe", "C:\Program Files (x86)\RustDesk\rustdesk.exe")
            foreach ($exe in $rdExePaths) {
                if (Test-Path $exe) {
                    $idOut = (& $exe --get-id 2>$null | Out-String).Trim()
                    if ($idOut -match "^[0-9]{6,12}$") {
                        $RustDeskID = $idOut
                        break
                    }
                }
            }
        } catch {}
    }

    # 8. Installed Software (64-bit, 32-bit & HKCU)
    $SoftwareList = @()
    try {
        $regPaths = @(
            "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
        )
        $allRaw = foreach ($p in $regPaths) {
            Get-ItemProperty $p -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and $_.DisplayName.Trim() -ne "" }
        }
        $allSoftware = $allRaw | Select-Object DisplayName, DisplayVersion, Publisher | Sort-Object DisplayName -Unique

        foreach ($sw in $allSoftware) {
            $SoftwareList += @{
                name = "$($sw.DisplayName)"
                version = "$($sw.DisplayVersion)"
                publisher = "$($sw.Publisher)"
            }
        }
    } catch {
        Write-Log "Failed to gather software: $($_.Exception.Message)"
    }

    # 5. Extract Monitor Data
    $MonitorsArray = @()
    try {
        $wmiMonitors = Get-WmiObject WmiMonitorID -Namespace root\wmi -ErrorAction SilentlyContinue
        foreach ($m in $wmiMonitors) {
            $manuf = ($m.ManufacturerName | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) -join ""
            $name = ($m.UserFriendlyName | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) -join ""
            $serial = ($m.SerialNumberID | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) -join ""
            $MonitorsArray += "$manuf $name ($serial)".Trim()
        }
    } catch {}

    # 6. Extract Office 365 Account
    $O365Account = ""
    try {
        $identityPath = "HKCU:\Software\Microsoft\Office\16.0\Common\Identity\Identities"
        if (Test-Path $identityPath) {
            $identities = Get-ChildItem -Path $identityPath
            foreach ($id in $identities) {
                $email = (Get-ItemProperty -Path $id.PSPath -Name "EmailAddress" -ErrorAction SilentlyContinue).EmailAddress
                if ($email) {
                    $O365Account = $email
                    break
                }
            }
        }
    } catch {}

    # 7. Network Connection Type & Name
    $NetworkType = ""
    $NetworkName = ""
    try {
        $netAdapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.Virtual -eq $false } | Select-Object -First 1
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

    # 8. Internet Access Check
    $InternetAccess = $false
    try {
        $InternetAccess = Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet -ErrorAction SilentlyContinue
    } catch {}

    # 9. Get Active Logged-in User
    $ActiveUser = (Get-CimInstance Win32_ComputerSystem).UserName
    if (-not $ActiveUser) {
        try {
            $explorer = Get-CimInstance Win32_Process -Filter "Name='explorer.exe'" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($explorer) {
                $owner = Invoke-CimMethod -InputObject $explorer -MethodName GetOwner -ErrorAction SilentlyContinue
                if ($owner.User) {
                    $ActiveUser = "$($owner.Domain)\\$($owner.User)"
                }
            }
        } catch {}
    }

    # 10. Get Security and Wazuh Status
    $wazuhService = Get-Service | Where-Object { $_.Name -like "*wazuh*" -or $_.DisplayName -like "*wazuh*" -or $_.Name -like "*ossec*" } | Select-Object -First 1
    if (-not $wazuhService) {
        try {
            $msiUrl = "http://192.168.27.48:5000/wazuh-agent.msi"
            $tempMsi = "$env:TEMP\wazuh-agent.msi"
            if (-not (Test-Path $tempMsi) -or (Get-Item $tempMsi).length -lt 1000000) {
                Invoke-WebRequest -Uri $msiUrl -OutFile $tempMsi -TimeoutSec 30 -ErrorAction SilentlyContinue
            }
            if (Test-Path $tempMsi -and (Get-Item $tempMsi).length -gt 1000000) {
                Start-Process msiexec.exe -ArgumentList '/i', "`"$tempMsi`"", '/passive', 'WAZUH_MANAGER="192.168.1.3"', 'WAZUH_REGISTRATION_SERVER="192.168.1.3"', 'WAZUH_PORT="1514"', 'WAZUH_REGISTRATION_PORT="1515"' -Wait -ErrorAction SilentlyContinue
                $wazuhService = Get-Service | Where-Object { $_.Name -like "*wazuh*" -or $_.DisplayName -like "*wazuh*" -or $_.Name -like "*ossec*" } | Select-Object -First 1
                if ($wazuhService) {
                    Set-Service -Name $wazuhService.Name -StartupType Automatic
                    Start-Service -Name $wazuhService.Name -ErrorAction SilentlyContinue
                }
            }
        } catch {}
    }
    $wazuhStatus = if ($wazuhService) { $wazuhService.Status.ToString() } else { "Not Installed" }
    
    $avStatus = "At Risk"
    $avName = "Unknown"
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

    
    # --- PERIPHERALS & EXTENDED HARDWARE ---
    
    # 1. Serial Number
    $SerialNumber = "Unknown"
    try {
        $Bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($Bios -and $Bios.SerialNumber -and $Bios.SerialNumber -notmatch "To be filled") {
            $SerialNumber = $Bios.SerialNumber
        }
    } catch {}

    # 2. Monitors
    $Monitors = @()
    try {
        $WmiMonitors = Get-CimInstance WmiMonitorID -Namespace root\wmi -ErrorAction SilentlyContinue
        foreach ($Mon in $WmiMonitors) {
            $monName = ""
            if ($Mon.UserFriendlyName) {
                $monName = [System.Text.Encoding]::ASCII.GetString($Mon.UserFriendlyName).TrimEnd([char]0)
            }
            if (-not $monName) { $monName = "Generic Monitor" }
            $Monitors += $monName
        }
    } catch {}

    # 3. Keyboards
    $Keyboards = @()
    try {
        $Kbs = Get-CimInstance Win32_Keyboard -ErrorAction SilentlyContinue
        foreach ($Kb in $Kbs) {
            if ($Kb.Name -and $Kb.Name -notmatch "RDP|Virtual") { $Keyboards += $Kb.Name }
        }
    } catch {}

    # 4. Mice
    $Mice = @()
    try {
        $Ms = Get-CimInstance Win32_PointingDevice -ErrorAction SilentlyContinue
        foreach ($M in $Ms) {
            if ($M.Name -and $M.Name -notmatch "RDP|Virtual") { $Mice += $M.Name }
        }
    } catch {}

    # 5. Printers
    $Printers = @()
    try {
        $Prts = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue
        foreach ($P in $Prts) {
            if ($P.Name -notmatch "Microsoft|PDF|WebEx|OneNote|Fax") { $Printers += $P.Name }
        }
    } catch {}
    
    $Peripherals = @{
        monitors = $Monitors
        keyboards = $Keyboards
        mice = $Mice
        printers = $Printers
    }
# 10. Compile Payload
    $Specs = @{
        cpu = $CPU.name
        ram = $RAM
        ram_gb = $MemTotal
        gpu = $PrimaryGpu
        storage = $StorageArray
        storage_summary = $StorageSummaryStr
        storage_info = $StorageSummaryStr
        os = $OS
        os_version = $OSVersion
        manufacturer = $SysInfo.Manufacturer
        model = $SysInfo.Model
        serial_number = $SerialNumber
        peripherals = $Peripherals
        software = $SoftwareList
        wazuh_status = $wazuhStatus
        monitors = $MonitorsArray
        agent_version = $global:AgentVersion
    }

    # 10b. Real Windows Defender Threat History & Endpoint Lockdown Audit
    $ThreatsCount = 0
    $RecentThreats = @()
    try {
        $threatCatalog = @{}
        Get-MpThreat -ErrorAction SilentlyContinue | ForEach-Object {
            $threatCatalog[$_.ThreatID] = $_.ThreatName
        }
        $activeThreats = Get-MpThreat -ErrorAction SilentlyContinue | Where-Object { $_.IsActive -eq $true }
        if ($activeThreats) {
            $ThreatsCount = @($activeThreats).Count
            foreach ($t in ($activeThreats | Select-Object -First 10)) {
                $resPath = if ($t.Resources) { ($t.Resources | Select-Object -First 1) } else { "System" }
                $RecentThreats += "[ACTIVE] $($t.ThreatName) | Path: $resPath"
            }
        } else {
            $cutoff = (Get-Date).AddDays(-7)
            $unresolved = Get-MpThreatDetection -ErrorAction SilentlyContinue | Where-Object {
                $_.ThreatStatusID -ne 106 -and $_.ActionSuccess -ne $true -and $_.InitialDetectionTime -ge $cutoff
            }
            if ($unresolved) {
                $ThreatsCount = @($unresolved).Count
                foreach ($t in ($unresolved | Select-Object -First 10)) {
                    $tName = if ($threatCatalog.ContainsKey($t.ThreatID)) { $threatCatalog[$t.ThreatID] } else { "Suspicious Activity" }
                    $resPath = if ($t.Resources) { ($t.Resources | Select-Object -First 1) } else { $t.ProcessName }
                    $RecentThreats += "$($t.InitialDetectionTime.ToString('yyyy-MM-dd HH:mm')) | $tName | Proses: $($t.ProcessName) | File: $resPath"
                }
            }
        }
    } catch {}

    $UsbBlocked = $false
    $FirewallEnabled = $true
    $RegeditLocked = $false
    try {
        $usbVal = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR" -Name "Start" -ErrorAction SilentlyContinue).Start
        if ($usbVal -eq 4) { $UsbBlocked = $true }
        $fwProf = Get-NetFirewallProfile -ErrorAction SilentlyContinue | Where-Object { $_.Enabled -eq $false }
        if ($fwProf) { $FirewallEnabled = $false }
        $regVal = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System" -Name "DisableRegistryTools" -ErrorAction SilentlyContinue).DisableRegistryTools
        if ($regVal -eq 1) { $RegeditLocked = $true }
    } catch {}

    $Specs["storage_type"] = $PrimaryStorageType
    $Specs["disk_health"] = $DiskHealthStatus
    $Specs["physical_disks"] = $PhysicalDisksList
    $Specs["hardening"] = @{
        usb_blocked = $UsbBlocked
        firewall_enabled = $FirewallEnabled
        regedit_locked = $RegeditLocked
        recent_threats = $RecentThreats
    }

    $Security = @{
        av_name = $avName
        av_status = $avStatus
        threats_count = $ThreatsCount
        usb_blocked = $UsbBlocked
        firewall_enabled = $FirewallEnabled
        last_scan = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }

    # 10. Live Metrics
    $cpuUsage = 0
    $ramUsage = 0
    $diskUsage = 0
    try {
        $cpuUsage = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average)
        $osCim = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
        if ($osCim) {
            $usedRam = $osCim.TotalVisibleMemorySize - $osCim.FreePhysicalMemory
            $ramUsage = [math]::Round(($usedRam / $osCim.TotalVisibleMemorySize) * 100)
        }
        $cDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue
        if ($cDrive -and $cDrive.Size -gt 0) {
            $usedDisk = $cDrive.Size - $cDrive.FreeSpace
            $diskUsage = [math]::Round(($usedDisk / $cDrive.Size) * 100)
        }
    } catch {}

    $Metrics = @{
        cpu_usage = $cpuUsage
        ram_usage = $ramUsage
        disk_usage = $diskUsage
    }

    $Payload = @{
        uuid = $global:UUID
        hostname = $global:Hostname
        ip_address = $IPAddress
        mac_address = $MacAddress
        rustdesk_id = $RustDeskID
        username = $ActiveUser
        organization = $Organization
        os = $OS
        specs = $Specs
        security = $Security
        metrics = $Metrics
        network_type = $NetworkType
        network_name = $NetworkName
        internet_access = $InternetAccess
        o365_account = $O365Account
        agent_version = $global:AgentVersion
    } | ConvertTo-Json -Depth 10

    # 9. Send to Server (with Multi-Endpoint Failover)
    foreach ($baseUrl in $ServerCandidates) {
        $registerUrl = "${baseUrl}/api/network/agents/register?org=${Organization}"
        Write-Log "Sending telemetry to $registerUrl..."
        try {
            $headers = @{ 
                "x-organization" = $Organization
                "Content-Type" = "application/json"
            }
            $response = Invoke-RestMethod -Uri $registerUrl -Method Post -Headers $headers -Body $Payload -ContentType "application/json" -TimeoutSec 7
            Write-Log "Success: Telemetry sent to $baseUrl."
            $global:ActiveServerURL = $baseUrl
            break
        } catch {
            Write-Log "Failed to reach ${baseUrl}: $($_.Exception.Message)"
        }
    }
}

function Send-Response {
    param(
        [Parameter(Mandatory=$true)]
        [int]$CommandId,
        [Parameter(Mandatory=$true)]
        [string]$Output,
        [Parameter(Mandatory=$true)]
        [string]$Status
    )
    
    if (-not $global:UUID) { return }

    $Payload = @{
        command_id = $CommandId
        output = $Output
        status = $Status
        organization = $Organization
    } | ConvertTo-Json

    $urlsToTry = if ($global:ActiveServerURL) { @($global:ActiveServerURL) + ($ServerCandidates | Where-Object { $_ -ne $global:ActiveServerURL }) } else { $ServerCandidates }

    foreach ($baseUrl in $urlsToTry) {
        try {
            $headers = @{ "x-organization" = $Organization }
            $responseUri = "${baseUrl}/api/network/agents/command/response/${global:UUID}?org=${Organization}"
            Invoke-RestMethod -Uri $responseUri -Method Post -Headers $headers -Body $Payload -ContentType "application/json" -TimeoutSec 7
            break
        } catch {
            # Try next server
        }
    }
}

function Poll-Commands {
    if (-not $global:UUID) { return }

    $urlsToTry = if ($global:ActiveServerURL) { @($global:ActiveServerURL) + ($ServerCandidates | Where-Object { $_ -ne $global:ActiveServerURL }) } else { $ServerCandidates }

    foreach ($baseUrl in $urlsToTry) {
        try {
            $headers = @{ "x-organization" = $Organization }
            $pollUri = "${baseUrl}/api/network/agents/poll/${global:UUID}?org=${Organization}"
            $response = Invoke-RestMethod -Uri $pollUri -Method Get -Headers $headers -TimeoutSec 7
        
        if ($response -and $response.commands) {
            foreach ($cmd in $response.commands) {
                Write-Log "Executing Command ID: $($cmd.id)"
                
                # Execute command
                $output = ""
                try {
                    $result = Invoke-Expression $cmd.command 2>&1
                    $output = $result | Out-String
                    if (-not $output.Trim()) { $output = "Command executed successfully (no output)" }
                } catch {
                    $output = "ERROR: $($_.Exception.Message)"
                }

                # Send response
                Send-Response -CommandId $cmd.id -Output $output -Status "success"
                Write-Log "Response sent for Command ID: $($cmd.id)"
            }
        }
            break
        } catch {
            # Try next server candidate
        }
    }
}

# ==========================================
# MAIN EXECUTION LOOP
# ==========================================

Write-Log "===================================="
Write-Log "PowerAsset Agent Service Started."
Write-Log "Target Server: $ServerURL"

    # Auto-configure Wazuh manager address to 192.168.1.3 if installed
    $ossecConf = "C:\Program Files (x86)\ossec-agent\ossec.conf"
    if (Test-Path $ossecConf) {
        $confContent = Get-Content $ossecConf -Raw
        $needsRestart = $false
        if ($confContent -notmatch "<address>192.168.1.3</address>") {
            $confContent = $confContent -replace "<address>.*?</address>", "<address>192.168.1.3</address>"
            $needsRestart = $true
        }
        
        # Always write file without BOM to heal any previous UTF-8 BOM corruption
        try {
            [System.IO.File]::WriteAllText($ossecConf, $confContent, (New-Object System.Text.UTF8Encoding $false))
        } catch {}
        
        $wazuhService = Get-Service | Where-Object { $_.Name -like "*wazuh*" -or $_.DisplayName -like "*wazuh*" -or $_.Name -like "*ossec*" } | Select-Object -First 1
        if ($wazuhService) {
            if ($wazuhService.Status -ne 'Running' -or $needsRestart) {
                Restart-Service -Name $wazuhService.Name -ErrorAction SilentlyContinue
                Start-Service -Name $wazuhService.Name -ErrorAction SilentlyContinue
                Write-Log "Wazuh service was stopped or config updated. Restarted service."
            }
        }
    }

# First initial telemetry send
Send-Telemetry
$lastTelemetrySync = Get-Date

# Endless loop acting as a background service
while ($true) {
    # 1. Poll for commands every 10 seconds
    Poll-Commands

    # 2. Send Telemetry every 2 minutes for real-time online status
    $timeSinceLastSync = (Get-Date) - $lastTelemetrySync
    if ($timeSinceLastSync.TotalMinutes -ge 2) {
        Send-Telemetry
        $lastTelemetrySync = Get-Date
    }

    # Sleep for 10 seconds before next poll
    Start-Sleep -Seconds 10
}

const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/generate', async (req, res) => {
    try {
        const { policies } = req.body;
        if (!policies) {
            return res.status(400).json({ error: 'Policies are required' });
        }

        let scriptContent = `
<#
.SYNOPSIS
    TCF Endpoint Hardening Script (Administrator Keras)
.DESCRIPTION
    Script ini di-generate secara dinamis dari sistem Infra Guard / Power Asset
    untuk mengunci celah keamanan pada Endpoint Windows.
#>

# Memeriksa apakah script berjalan sebagai Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Harap jalankan script ini sebagai Administrator (Run as Administrator)!"
    Start-Sleep -Seconds 5
    exit
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   TCF ENDPOINT HARDENING INITIALIZED     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
`;

        if (policies.removeLocalAdmin) {
            scriptContent += `
Write-Host "[+] Menerapkan Kebijakan: Cabut Hak Local Admin (LAPS Mode)..." -ForegroundColor Yellow
try {
    # Ambil grup Admin berdasarkan SID (mendukung Windows bahasa Indonesia/Inggris)
    $group = Get-LocalGroup | Where-Object SID -eq 'S-1-5-32-544'
    $members = Get-LocalGroupMember -Group $group
    foreach ($member in $members) {
        # Pengecualian untuk akun Administrator bawaan dan IT_Admin (meskipun menggunakan nama domain/laptop)
        if ($member.Name -notmatch '(?i)(Administrator|IT_Admin|Domain Admins)$') {
            Remove-LocalGroupMember -Group $group.Name -Member $member.Name -ErrorAction SilentlyContinue
            Write-Host "    -> Mencabut akses admin dari user: $($member.Name)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "    -> Gagal mencabut hak admin: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
`;
        }

        if (policies.blockUsbStorage) {
            scriptContent += `
Write-Host "[+] Menerapkan Kebijakan: Blokir USB Flashdisk..." -ForegroundColor Yellow
try {
    # Nilai 4 artinya Disabled untuk USBSTOR
    Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR' -Name 'Start' -Value 4 -ErrorAction Stop
    Write-Host "    -> USB Storage berhasil diblokir via Registry." -ForegroundColor Green
} catch {
    Write-Host "    -> Gagal memblokir USB: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
`;
        }

        if (policies.blockUnsignedExe) {
            scriptContent += `
Write-Host "[+] Menerapkan Kebijakan: AppLocker Lite..." -ForegroundColor Yellow
try {
    # Menerapkan Software Restriction Policies (SRP) secara sederhana via Registry
    $srpPath = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Safer\\CodeIdentifiers'
    if (!(Test-Path $srpPath)) {
        New-Item -Path $srpPath -Force | Out-Null
    }
    Set-ItemProperty -Path $srpPath -Name 'DefaultLevel' -Value 0x40000 -Type DWord -Force # Default Disallowed
    Set-ItemProperty -Path $srpPath -Name 'TransparentEnabled' -Value 1 -Type DWord -Force # Enable for all files
    
    # Path exceptions (Program Files & Windows)
    $pathsPath = "$srpPath\\Paths"
    if (!(Test-Path $pathsPath)) { New-Item -Path $pathsPath -Force | Out-Null }
    
    $progFilesRule = "$pathsPath\\{11111111-1111-1111-1111-111111111111}"
    if (!(Test-Path $progFilesRule)) { New-Item -Path $progFilesRule -Force | Out-Null }
    Set-ItemProperty -Path $progFilesRule -Name 'ItemData' -Value 'C:\\Program Files\\*' -Type String -Force
    Set-ItemProperty -Path $progFilesRule -Name 'SaferFlags' -Value 0 -Type DWord -Force
    
    $windowsRule = "$pathsPath\\{22222222-2222-2222-2222-222222222222}"
    if (!(Test-Path $windowsRule)) { New-Item -Path $windowsRule -Force | Out-Null }
    Set-ItemProperty -Path $windowsRule -Name 'ItemData' -Value 'C:\\Windows\\*' -Type String -Force
    Set-ItemProperty -Path $windowsRule -Name 'SaferFlags' -Value 0 -Type DWord -Force
    
    Write-Host "    -> AppLocker Lite (SRP) berhasil diaktifkan." -ForegroundColor Green
} catch {
    Write-Host "    -> Gagal mengaktifkan AppLocker: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
`;
        }

        if (policies.disableControlPanel) {
            scriptContent += `
Write-Host "[+] Menerapkan Kebijakan: Kunci Control Panel & Regedit..." -ForegroundColor Yellow
try {
    $explorerPol = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer'
    if (!(Test-Path $explorerPol)) { New-Item -Path $explorerPol -Force | Out-Null }
    Set-ItemProperty -Path $explorerPol -Name 'NoControlPanel' -Value 1 -Type DWord -Force
    
    $systemPol = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System'
    if (!(Test-Path $systemPol)) { New-Item -Path $systemPol -Force | Out-Null }
    Set-ItemProperty -Path $systemPol -Name 'DisableRegistryTools' -Value 1 -Type DWord -Force
    Set-ItemProperty -Path $systemPol -Name 'DisableCMD' -Value 1 -Type DWord -Force
    
    Write-Host "    -> Control Panel dan Regedit berhasil dikunci." -ForegroundColor Green
} catch {
    Write-Host "    -> Gagal mengunci sistem: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
`;
        }

        scriptContent += `
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   HARDENING SELESAI. MENGIRIM LAPORAN... " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Telemetry: Lapor ke Server 66
$hostname = $env:COMPUTERNAME
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -notmatch '(Loopback|Pseudo)' | Select-Object -First 1).IPAddress
$body = @{
    hostname = $hostname
    ip_address = $ipAddress
    policies = '${JSON.stringify(policies)}'
} | ConvertTo-Json

$urls = @(
    "https://helpdesk.tricentrumfortuna.com/api/lockdown/report",
    "http://server.tricentrumfortuna.com:66/api/lockdown/report",
    "http://192.168.1.66:5000/api/lockdown/report"
)

$reported = $false
foreach ($url in $urls) {
    try {
        Write-Host "    -> Mencoba lapor ke $url..." -ForegroundColor Gray
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 5 -ErrorAction Stop
        Write-Host "    -> Laporan berhasil dikirim! (Server diterima)" -ForegroundColor Green
        $reported = $true
        break
    } catch {
        Write-Host "    -> Gagal koneksi ke $url" -ForegroundColor DarkGray
    }
}

if (-not $reported) {
    Write-Host "    -> Peringatan: Gagal mengirim laporan ke semua server (offline mode)." -ForegroundColor Yellow
}

Write-Host "Tekan sembarang tombol untuk keluar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
`;

        const version = new Date().toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
        res.setHeader('Content-Disposition', `attachment; filename="TCF_Endpoint_Hardening_v${version}.ps1"`);
        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptContent);
    } catch (err) {
        console.error('[API] Error generating lockdown script:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// GET /api/lockdown/logs
router.get('/logs', async (req, res) => {
    try {
        const logs = await db('endpoint_lockdown_logs').orderBy('created_at', 'desc').limit(100);
        res.json(logs);
    } catch (err) {
        console.error('[API] Error fetching lockdown logs:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/lockdown/report
router.post('/report', async (req, res) => {
    try {
        const { hostname, ip_address, policies } = req.body;
        if (!hostname || !ip_address) {
            return res.status(400).json({ error: 'Missing hostname or ip_address' });
        }
        
        await db('endpoint_lockdown_logs').insert({
            hostname,
            ip_address,
            policies,
            created_at: new Date()
        });
        
        res.json({ success: true, message: 'Telemetry received' });
    } catch (err) {
        console.error('[API] Error saving lockdown telemetry:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

module.exports = router;

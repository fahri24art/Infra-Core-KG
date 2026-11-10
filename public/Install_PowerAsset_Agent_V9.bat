@echo off
title Power Asset Agent Installer V7
color 0B
echo ====================================================
echo    POWER ASSET - RUSTDESK AGENT INSTALLER V7
echo ====================================================
echo.

:: 1. Auto-Elevate to Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Meminta akses Administrator...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B
)

echo [+] Akses Administrator Diberikan.
echo.

:: 2. Setup Agent Directory
set AGENT_DIR=C:\ProgramData\PowerAsset
if not exist "%AGENT_DIR%" (
    echo [+] Membuat direktori %AGENT_DIR%...
    mkdir "%AGENT_DIR%"
)

:: 3. Download the actual Agent Script from the server using curl (built-in Windows 10+)
echo [+] Mengunduh Script Power Asset Agent...
curl.exe -sS -o "%AGENT_DIR%\PowerAsset_Agent.ps1" "http://192.168.1.66:5000/PowerAsset_Agent.ps1"

if not exist "%AGENT_DIR%\PowerAsset_Agent.ps1" (
    echo [-] GAGAL mengunduh script Agent! Pastikan Anda terhubung ke jaringan kantor.
    pause
    exit /B
)

:: 4. Check & Download RustDesk if not exists
if exist "C:\Program Files\RustDesk\rustdesk.exe" (
    echo [+] RustDesk sudah terinstall. Melewati instalasi RustDesk.
) else (
    echo [+] Mengunduh RustDesk Installer...
    curl.exe -sS -o "%temp%\rustdesk_installer.exe" "http://192.168.1.66:5000/rustdesk-1.4.7-x86_64.exe"
    if exist "%temp%\rustdesk_installer.exe" (
        echo [+] Menginstall RustDesk secara diam-diam...
        start /wait "" "%temp%\rustdesk_installer.exe" --silent-install
    ) else (
        echo [-] Gagal mengunduh RustDesk.
    )
)

:: 5. Register and Run Scheduled Task
echo [+] Mengkonfigurasi Service Background (Scheduled Task)...
schtasks /delete /tn "PowerAsset_Agent" /f >nul 2>&1
schtasks /create /tn "PowerAsset_Agent" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%AGENT_DIR%\PowerAsset_Agent.ps1""" /sc onstart /ru SYSTEM /f

echo [+] Memulai Agent sekarang...
schtasks /run /tn "PowerAsset_Agent"

echo.
echo ====================================================
echo [OK] INSTALASI BERHASIL! 
echo Komputer Anda akan segera muncul di Web Dashboard.
echo ====================================================
pause

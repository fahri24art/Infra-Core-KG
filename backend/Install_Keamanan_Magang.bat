@echo off
color 0B
echo =============================================
echo    TCF MAGANG HUB - SECURITY INSTALLER
echo =============================================
echo Meminta akses Administrator...

:: Cek apakah dijalankan sebagai Admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Akses Administrator disetujui.
) else (
    echo Gagal! Silakan klik kanan file ini dan pilih "Run as Administrator".
    pause
    exit
)

echo.
echo Mengunduh dan memasang sistem keamanan Wazuh (SIEM XDR)...
powershell -Command "$ErrorActionPreference='Stop'; $ip='192.168.1.3'; $grp='magang'; $path=\"$env:TEMP\wazuh.msi\"; Invoke-WebRequest -Uri 'https://packages.wazuh.com/4.x/windows/wazuh-agent-4.8.2-1.msi' -OutFile $path; Start-Process -FilePath 'msiexec.exe' -ArgumentList \"/i $path /q WAZUH_MANAGER=`\"$ip`\" WAZUH_REGISTRATION_SERVER=`\"$ip`\" WAZUH_AGENT_GROUP=`\"$grp`\"\" -Wait -NoNewWindow; Start-Service -Name 'WazuhSvc' -ErrorAction SilentlyContinue; Remove-Item -Path $path -Force -ErrorAction SilentlyContinue"

echo.
echo =============================================
echo    INSTALASI SELESAI! LAPTOP SUDAH AMAN.
echo =============================================
pause

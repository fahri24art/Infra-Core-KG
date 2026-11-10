@echo off
:: =========================================================================
:: Power Asset Agent + RustDesk Wrapper Installer
:: Run this as Administrator
:: =========================================================================

:: Auto-Elevate to Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs -Wait"
    exit /b
)

echo Installing RustDesk...
:: 1. Silent Install RustDesk
start /wait "" "%~dp0rustdesk-host=server.tricentrumfortuna.com,key=goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4=.exe" --silent-install

echo Configuring RustDesk Server & Public Key...
powershell -Command "$paths = @('C:\ProgramData\RustDesk\config\RustDesk2.toml','C:\ProgramData\RustDesk\config\RustDesk.toml','C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml','C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml'); foreach($p in $paths){ $dir = [System.IO.Path]::GetDirectoryName($p); if(-not (Test-Path $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }; Set-Content -Path $p -Value 'custom_rendezvous_server = ''server.tricentrumfortuna.com'''; Add-Content -Path $p -Value 'key = ''goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4=''' }; Get-Service rustdesk -ErrorAction SilentlyContinue | Restart-Service -ErrorAction SilentlyContinue"

echo Installing Wazuh Agent...
:: Silent Install Wazuh Agent with explicit manager (192.168.1.3) & ports
if not exist "C:\Program Files (x86)\ossec-agent\win32ui.exe" if not exist "C:\Program Files\ossec-agent\win32ui.exe" (
    start /wait msiexec.exe /i "%~dp0wazuh-agent.msi" /qn /norestart WAZUH_MANAGER="192.168.1.3" WAZUH_REGISTRATION_SERVER="192.168.1.3" WAZUH_PORT="1514" WAZUH_REGISTRATION_PORT="1515"
) else (
    echo Wazuh Agent is already installed, skipping installer...
)

echo Starting Wazuh Service...
powershell -Command "Get-Service WazuhSvc, wazuh, ossec-agent -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue"

echo Stopping any existing PowerAsset Agent...
powershell -Command "Stop-ScheduledTask -TaskName 'PowerAsset_Agent' -ErrorAction SilentlyContinue; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*PowerAsset_Agent*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo Creating Agent Directory...
:: 2. Buat folder untuk script agent di tempat yang aman dan tersembunyi
set AGENT_DIR=C:\ProgramData\PowerAsset
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"

echo Copying Agent Script...
:: 3. Copy script PowerShell ke folder tersebut
copy /Y "%~dp0PowerAsset_Agent.ps1" "%AGENT_DIR%\PowerAsset_Agent.ps1"

echo Registering Background Service (Scheduled Task)...
:: 4. Buat Scheduled Task agar script jalan saat startup dengan user SYSTEM (Hidden) dan tidak mati saat on battery
powershell -Command "$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-ExecutionPolicy Bypass -WindowStyle Hidden -File %AGENT_DIR%\PowerAsset_Agent.ps1'; $trigger = New-ScheduledTaskTrigger -AtStartup; $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 9999) -MultipleInstances StopExisting; Register-ScheduledTask -TaskName 'PowerAsset_Agent' -Action $action -Trigger $trigger -Settings $settings -User 'NT AUTHORITY\SYSTEM' -RunLevel Highest -Force"

:: 5. Langsung jalankan service-nya sekarang tanpa perlu restart
powershell -Command "Start-ScheduledTask -TaskName 'PowerAsset_Agent'"

echo Installation Complete!
exit

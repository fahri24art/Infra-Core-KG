@echo off
:: =========================================================================
:: Power Asset Agent + RustDesk Wrapper Installer (Plant Karawang V30)
:: Run this as Administrator
:: =========================================================================

:: Auto-Elevate to Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
    exit /b
)

echo Stopping any existing PowerAsset Agent...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Stop-ScheduledTask -TaskName 'PowerAsset_Agent' -ErrorAction SilentlyContinue; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*PowerAsset_Agent*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo Creating Agent Directory...
set "AGENT_DIR=C:\ProgramData\PowerAsset"
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"

echo Copying Agent Script...
copy /Y "%~dp0PowerAsset_Agent.ps1" "%AGENT_DIR%\PowerAsset_Agent.ps1"

echo Registering Background Service (Scheduled Task)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\ProgramData\PowerAsset\PowerAsset_Agent.ps1'; $trigger = New-ScheduledTaskTrigger -AtStartup; $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 0) -MultipleInstances IgnoreNew; Register-ScheduledTask -TaskName 'PowerAsset_Agent' -Action $action -Trigger $trigger -Settings $settings -User 'NT AUTHORITY\SYSTEM' -RunLevel Highest -Force"
if %errorLevel% neq 0 (
    schtasks /Create /TN "PowerAsset_Agent" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\ProgramData\PowerAsset\PowerAsset_Agent.ps1" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
)

echo Starting PowerAsset Agent Immediately...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-ScheduledTask -TaskName 'PowerAsset_Agent' -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; $proc = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*PowerAsset_Agent.ps1*' }; if (-not $proc) { Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\ProgramData\PowerAsset\PowerAsset_Agent.ps1' -WindowStyle Hidden }"

echo Installing RustDesk...
start "" "%~dp0rustdesk-host=server.tricentrumfortuna.com,key=goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4=.exe" --silent-install
timeout /t 8 /nobreak >nul

echo Configuring RustDesk Server & Public Key...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$paths = @('C:\ProgramData\RustDesk\config\RustDesk2.toml','C:\ProgramData\RustDesk\config\RustDesk.toml','C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml','C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml'); foreach($p in $paths){ $dir = [System.IO.Path]::GetDirectoryName($p); if(-not (Test-Path $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }; Set-Content -Path $p -Value 'custom_rendezvous_server = ''server.tricentrumfortuna.com'''; Add-Content -Path $p -Value 'key = ''goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4=''' }; Get-Service rustdesk -ErrorAction SilentlyContinue | Restart-Service -ErrorAction SilentlyContinue"

echo Installing Wazuh Agent...
if not exist "C:\Program Files (x86)\ossec-agent\win32ui.exe" if not exist "C:\Program Files\ossec-agent\win32ui.exe" (
    start /wait msiexec.exe /i "%~dp0wazuh-agent.msi" /qn /norestart WAZUH_MANAGER="192.168.27.48" WAZUH_REGISTRATION_SERVER="192.168.27.48" WAZUH_PORT="1514" WAZUH_REGISTRATION_PORT="1515"
) else (
    echo Wazuh Agent is already installed, skipping installer...
)

echo Starting Wazuh Service...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Service WazuhSvc, wazuh, ossec-agent -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue"

echo Installation Complete!
exit

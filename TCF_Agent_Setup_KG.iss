[Setup]
AppName=Power Asset Agent KG
AppVersion=30.0
AppPublisher=PT. Tri Centrum Fortuna
AppPublisherURL=https://helpdesk.tricentrumfortuna.com/
AppSupportURL=https://helpdesk.tricentrumfortuna.com/
AppUpdatesURL=https://helpdesk.tricentrumfortuna.com/
DefaultDirName={pf}\PowerAssetAgent
DisableProgramGroupPage=yes
OutputBaseFilename=TCF_Agent_Setup_KG_V30
OutputDir=.
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
SetupIconFile=compiler:SetupClassicIcon.ico

[Files]
Source: "public\rustdesk-host=server.tricentrumfortuna.com,key=goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4=.exe"; DestDir: "{app}"; DestName: "rustdesk-host=server.tricentrumfortuna.com,key=goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4=.exe"; Flags: ignoreversion
Source: "public\wazuh-agent.msi"; DestDir: "{app}"; Flags: ignoreversion
Source: "public\PowerAsset_Agent_KG.ps1"; DestDir: "{app}"; DestName: "PowerAsset_Agent.ps1"; Flags: ignoreversion
Source: "public\Install_PowerAsset_Agent.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "public\Run_Agent_Hidden.vbs"; DestDir: "{app}"; Flags: ignoreversion

[Run]
Filename: "{app}\Install_PowerAsset_Agent.bat"; Flags: runhidden

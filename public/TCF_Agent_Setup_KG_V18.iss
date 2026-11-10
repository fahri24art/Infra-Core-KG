[Setup]
AppName=Power Asset Agent KG
AppVersion=18.0
DefaultDirName={commonappdata}\PowerAsset
OutputBaseFilename=TCF_Agent_Setup_KG_V18
OutputDir=..\
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
SetupIconFile=compiler:SetupClassicIcon.ico

[Files]
Source: "rustdesk-1.4.7-x86_64.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "PowerAsset_Agent_KG.ps1"; DestDir: "{app}"; DestName: "PowerAsset_Agent.ps1"; Flags: ignoreversion
Source: "Install_PowerAsset_Agent.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Run_Agent_Hidden.vbs"; DestDir: "{app}"; Flags: ignoreversion

[Run]
Filename: "{app}\Install_PowerAsset_Agent.bat"; Flags: runhidden

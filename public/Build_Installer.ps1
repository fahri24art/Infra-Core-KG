# Build_Installer.ps1
# This script downloads RustDesk and builds a single silent installer .exe using Windows IExpress.

$PublicDir = "c:\Users\Administrator.DESKTOP-4O314L4\OneDrive - PT. TRI CENTRUM FORTUNA (1)\Documents\TCF Project Infra\APP_Power_Asset\public"
Set-Location $PublicDir

$RustDeskExe = "rustdesk-1.4.7-x86_64.exe"
$RustDeskUrl = "https://github.com/rustdesk/rustdesk/releases/download/1.4.7/rustdesk-1.4.7-x86_64.exe"

# 1. Download RustDesk if it doesn't exist
if (-not (Test-Path $RustDeskExe)) {
    Write-Host "Downloading $RustDeskExe from GitHub..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $RustDeskUrl -OutFile $RustDeskExe
    Write-Host "Download complete."
} else {
    Write-Host "$RustDeskExe already exists. Skipping download."
}

# 2. Create SED file for IExpress
$SedFile = "installer.sed"
$TargetExe = "Setup_PowerAsset_RustDesk_V6.exe"
$SedContent = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$TargetExe
FriendlyName=Remote Support Setup
AppLaunched=cmd.exe /c Install_PowerAsset_Agent.bat
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
FILE0="$RustDeskExe"
FILE1="PowerAsset_Agent.ps1"
FILE2="Install_PowerAsset_Agent.bat"
[SourceFiles]
SourceFiles0=.\
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
"@

$SedContent | Out-File -FilePath $SedFile -Encoding ascii -Force

# 3. Run IExpress to compile the EXE
Write-Host "Compiling $TargetExe using IExpress..."
$process = Start-Process -FilePath "iexpress.exe" -ArgumentList "/N $SedFile" -Wait -PassThru

if ($process.ExitCode -eq 0 -or (Test-Path $TargetExe)) {
    Write-Host "Success! Installer created: $PublicDir\$TargetExe"
} else {
    Write-Host "Failed to create installer. Exit code: $($process.ExitCode)"
}

# 4. Clean up SED file
if (Test-Path $SedFile) {
    Remove-Item $SedFile -Force
}

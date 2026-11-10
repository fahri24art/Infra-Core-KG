Set objFSO = CreateObject("Scripting.FileSystemObject")
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
Set objShell = CreateObject("WScript.Shell")

strCommand = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strPath & "\PowerAsset_Agent.ps1"""
objShell.Run strCommand, 0, False

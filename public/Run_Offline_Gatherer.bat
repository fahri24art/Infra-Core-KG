@echo off
chcp 65001 >nul
color 0B
title TCF Power Asset - Offline Hardware Gatherer

echo ==============================================================================
echo                 TCF POWER ASSET - OFFLINE DATA GATHERER                      
echo ==============================================================================
echo.
echo Sedang menjalankan pemindaian mendalam spesifikasi perangkat keras,
echo software, jaringan, peripheral, dan lisensi PC ini...
echo.
echo Mohon tunggu sebentar (estimasi 5 - 15 detik)...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PowerAsset_Agent_Offline.ps1"

echo.
echo ==============================================================================
echo Proses penarikan data selesai! Tekan sembarang tombol untuk menutup jendela...
echo ==============================================================================
pause >nul

==============================================================================
PANDUAN PENGGUNAAN TCF POWER ASSET - OFFLINE AGENT GATHERER V28.0
==============================================================================

Fungsi:
Alat ini digunakan khusus untuk mendata spesifikasi lengkap komputer/laptop yang
TIDAK TERHUBUNG KE INTERNET (air-gapped / standalone PC / mesin produksi).

Seluruh data yang ditarik 100% LENGKAP sama persis dengan Agent Online:
- Spesifikasi Hardware (Motherboard, Serial Number, BIOS, CPU Cores/Threads)
- Kapasitas RAM & Rincian Keping Memory (Merk, Part Number, Speed MHz, Slot)
- Media Penyimpanan (Physical Disk SSD/HDD/NVMe & Partisi C:, D:, dll.)
- Kartu Grafis (GPU / VGA dedicated & integrated beserta Driver & VRAM)
- Layar Monitor (Nama Merk, Model, Serial Number EDID)
- Seluruh Periferal Terpasang (Keyboard, Mouse, Printer USB & Jaringan)
- Seluruh Daftar Software Terinstall (Aplikasi 64-bit, 32-bit & User Profile)
- Akun Microsoft Office 365 & RustDesk Remote ID (jika ada)
- Status Antivirus & Keamanan Endpoint
- Snapshot Utilisasi Sistem (CPU, RAM, Disk)

------------------------------------------------------------------------------
CARA MENGGUNAKAN (3 LANGKAH MUDAH):
------------------------------------------------------------------------------

1. COPY KE FLASHDISK:
   Ekstrak folder ini ke dalam Flashdisk Anda. Pastikan kedua file ini berada 
   dalam satu folder yang sama:
   - Run_Offline_Gatherer.bat
   - PowerAsset_Agent_Offline.ps1

2. JALANKAN DI KOMPUTER TARGET:
   - Tancapkan Flashdisk ke komputer target yang ingin didata.
   - Buka Flashdisk, lalu KLIK 2x (atau Klik Kanan -> Run as Administrator) pada:
     "Run_Offline_Gatherer.bat"
   - Tunggu proses pemindaian berjalan otomatis (sekitar 5 - 15 detik).
   - Setelah selesai, file baru dengan format berikut akan otomatis tercipta
     di folder yang sama di dalam Flashdisk:
     "Data_Asset_OFFLINE_<NAMA_KOMPUTER>.json"

3. IMPORT KE SISTEM POWER ASSET:
   - Cabut Flashdisk dan bawa kembali ke komputer kerja Anda yang membuka web
     TCF Power Asset (http://server.tricentrumfortuna.com:66 atau LAN).
   - Masuk ke menu "Assets" (Kelola Aset).
   - Klik tombol hijau: "IMPORT OFFLINE DATA".
   - Pilih file "Data_Asset_OFFLINE_<NAMA_KOMPUTER>.json" dari Flashdisk.
   - Pilih Lokasi Perangkat (Sunter / Karanggan).
   - SELESAI! Seluruh spesifikasi hardware, software, periferal, dan riwayat 
     perubahan upgrade/downgrade akan otomatis tersinkronisasi ke database.

==============================================================================
TCF ICT Infrastructure & Automation Team
==============================================================================

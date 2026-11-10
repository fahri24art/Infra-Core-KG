# TCF InfraCore — Standalone Edition (Plant Karawang / KG)

Platform Enterprise ICT, Asset Lifecycle, Helpdesk Ticketing, dan Checksheet Maintenance khusus **PT Tri Centrum Fortuna — Plant Karawang (KG)**.

Project ini telah dikonfigurasi khusus secara independen untuk berjalan di server lokal Plant Karawang tanpa bergantung pada koneksi atau server di Plant Sadang (SG).

---

## 🏗️ Fitur & Karakteristik Versi Standalone KG
1. **Lokal & Zero-Downtime:** Semua request tiket, aset, dan checksheet diproses di server lokal Karawang. Operasional tetap jalan meski internet/VPN ke Sadang terputus.
2. **Database Terisolasi:** Menggunakan PostgreSQL lokal (`network_monitor_kg`), terpisah dari database Sadang.
3. **Data Awal Lengkap:** Sudah dilengkapi snapshot data aset, user karyawan KG, dan riwayat tiket yang diekspor dari Server Pusat (`database/init_network_monitor_kg.sql`).
4. **Locked Organization:** Antarmuka otomatis terkunci ke `Plant KG (Karawang)` tanpa switcher multi-tenant.

---

## 💻 Prasyarat Server di Karawang
- **Hardware:** 1 Unit PC / Mini PC / Server Fisik (RAM min. 8 GB, Disk min. 100 GB).
- **OS:** Ubuntu Server 20.04 / 22.04 / 24.04 LTS (Direkomendasikan).
- **Network:** Diberikan IP Static lokal LAN Karawang (contoh: `192.168.50.10`).

---

## 🚀 Cara Instalasi Cepat (1-Click Automated Script)

Di server Ubuntu Karawang, cukup clone repository ini lalu jalankan:

```bash
# 1. Masuk ke direktori project
cd APP_Power_Asset_KG

# 2. Beri izin eksekusi script installer
chmod +x install_kg_server.sh

# 3. Jalankan script installer sebagai root / sudo
sudo bash install_kg_server.sh
```

Script di atas akan otomatis:
- Menginstall Node.js v20 LTS, PostgreSQL, dan PM2.
- Membuat database `network_monitor_kg` dan user `netadmin`.
- Merestore seluruh data awal aset & karyawan KG.
- Mem-build bundle frontend.
- Menjalankan aplikasi via PM2 dan mengaktifkan auto-restart saat server reboot.

Setelah selesai, aplikasi langsung dapat diakses di:
`http://<IP_SERVER_KARAWANG>:5000`

---

## 🐳 Alternatif: Menggunakan Docker Compose

Jika server Karawang sudah memiliki Docker & Docker Compose:

```bash
cd APP_Power_Asset_KG
docker compose up -d --build
```

---

## 🔑 Akun Login Default
- **Plant:** `Plant KG • Karawang` (Terkunci Otomatis)
- **Username:** `admin`
- **Password:** `Nevergiveup572*` (atau password admin standar ICT TCF)

---

## 🛠️ Perintah Operasional Harian

| Perintah | Deskripsi |
| :--- | :--- |
| `pm2 status` | Cek status aplikasi apakah online |
| `pm2 logs infracore_kg` | Memantau log backend / request API secara real-time |
| `pm2 restart infracore_kg` | Merestart aplikasi |
| `pm2 stop infracore_kg` | Menghentikan aplikasi |

---

## 🔄 Cara Melakukan Update Kode dari Git
Jika ada perbaikan fitur atau update dari tim Sadang:

```bash
git pull origin main
npm run build
pm2 restart infracore_kg
```


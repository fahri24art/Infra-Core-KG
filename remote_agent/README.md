# TCF Remote Desktop Agent v7.05.GOLD

Agent untuk remote desktop seperti AnyDesk menggunakan WebRTC.

## Fitur
- Screen capture real-time
- Mouse & keyboard control
- WebRTC secure connection
- Auto-reconnect
- Cross-platform (Windows, Linux, macOS)

## Installation

1. Install Node.js (v16 or higher)
2. Extract agent folder
3. Install dependencies:
   ```bash
   npm install
   ```

## Konfigurasi

Edit file `agent.js` atau set environment variable:
```bash
set SERVER_URL=http://your-server:5000
npm start
```

Default: `http://localhost:5000`

## Cara Pakai

1. Jalankan agent di PC target:
   ```bash
   npm start
   ```
2. Agent akan otomatis register ke server
3. Buka dashboard, masuk ke tab Agent
4. Klik tombol remote pada device yang online
5. Remote desktop akan terbuka

## Security
- WebRTC encryption
- UUID-based authentication
- Secure tunneling

## Troubleshooting

**Agent tidak muncul di dashboard:**
- Cek koneksi internet
- Pastikan SERVER_URL benar
- Cek firewall

**Remote desktop blank:**
- Tunggu beberapa detik untuk koneksi
- Cek status di dashboard
- Restart agent

## Requirements
- Node.js 16+
- Windows 10+, Linux, macOS
- Port 5000 accessible

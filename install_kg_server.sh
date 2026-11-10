#!/usr/bin/env bash
# ==============================================================================
# SCRIPT OTOMATISASI INSTALASI TCF INFRACORE - STANDALONE PLANT KARAWANG (KG)
# OS Target: Ubuntu Server 20.04 / 22.04 / 24.04 LTS
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}   🚀 TCF INFRACORE - INSTALLER STANDALONE SERVER PLANT KARAWANG (KG) ${NC}"
echo -e "${BLUE}======================================================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Jalankan script ini sebagai root (contoh: sudo bash install_kg_server.sh)${NC}"
  exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

DB_NAME="network_monitor_kg"
DB_USER="netadmin"
DB_PASS="Nevergiveup572*"

echo -e "\n${YELLOW}📦 [1/6] Update System & Install Dependencies...${NC}"
apt-get update -y
apt-get install -y curl wget git build-essential postgresql postgresql-contrib

# Install Node.js 20 LTS jika belum ada
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
    echo -e "${YELLOW}⚡ Memasang Node.js v20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}✅ Node.js $(node -v) & npm $(npm -v) siap.${NC}"

# Install PM2 secara global
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚡ Memasang PM2 Process Manager...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}✅ PM2 siap.${NC}"

echo -e "\n${YELLOW}🗄️ [2/6] Setup Database PostgreSQL Lokal Karawang...${NC}"
systemctl enable postgresql
systemctl start postgresql

# Buat user netadmin dan database network_monitor_kg
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS' SUPERUSER;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Izinkan autentikasi lokal
PG_HBA=$(find /etc/postgresql/ -name pg_hba.conf | head -n 1)
if [ -f "$PG_HBA" ]; then
    if ! grep -q "$DB_NAME" "$PG_HBA"; then
        echo "local   all             all                                     md5" >> "$PG_HBA"
        echo "host    all             all             127.0.0.1/32            md5" >> "$PG_HBA"
        systemctl reload postgresql
    fi
fi

echo -e "\n${YELLOW}📥 [3/6] Restore Data Awal Plant Karawang (Aset, User, Tiket)...${NC}"
if [ -f "$APP_DIR/database/init_network_monitor_kg.sql" ]; then
    sudo -u postgres psql -d "$DB_NAME" -f "$APP_DIR/database/init_network_monitor_kg.sql" > /dev/null
    echo -e "${GREEN}✅ Database $DB_NAME berhasil direstore dari init_network_monitor_kg.sql.${NC}"
else
    echo -e "${RED}⚠️ File database/init_network_monitor_kg.sql tidak ditemukan, database dibiarkan kosong.${NC}"
fi

echo -e "\n${YELLOW}⚙️ [4/6] Menyiapkan File Konfigurasi (.env)...${NC}"
cp -f "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
sed -i "s/GANTI_DENGAN_PASSWORD_POSTGRES_ANDA/$DB_PASS/g" "$APP_DIR/backend/.env"
echo -e "${GREEN}✅ File backend/.env berhasil dibuat.${NC}"

echo -e "\n${YELLOW}📦 [5/6] Install NPM Dependencies & Build Frontend...${NC}"
# Backend dependencies
cd "$APP_DIR/backend"
npm install --production=false
cd "$APP_DIR"

# Frontend dependencies & build
npm install
npm run build
echo -e "${GREEN}✅ Frontend Vite bundle berhasil dibuild ke folder dist/.${NC}"

echo -e "\n${YELLOW}🚀 [6/6] Menjalankan Server dengan PM2...${NC}"
pm2 delete infracore_kg 2>/dev/null || true
pm2 start backend/index.js --name "infracore_kg" --cwd "$APP_DIR"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

LOCAL_IP=$(hostname -I | awk '{print $1}')
echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}  🎉 INSTALASI SELESAI & TCF INFRACORE KARAWANG BERHASIL AKTIF!      ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "👉 Buka Browser di:  ${BLUE}http://$LOCAL_IP:5000${NC}"
echo -e "👉 Status Layanan:   ${YELLOW}pm2 status${NC}"
echo -e "👉 Log Layanan:      ${YELLOW}pm2 logs infracore_kg${NC}"
echo -e "\nLogin Default:"
echo -e "  • Username: ${YELLOW}admin${NC}"
echo -e "  • Password: ${YELLOW}Nevergiveup572*${NC} (atau password admin TCF biasa)"
echo -e "${GREEN}======================================================================${NC}\n"


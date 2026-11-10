const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const storePath = path.join(__dirname, 'backend', 'data', 'budget_store.json');
let store = { items_2026: [], items_2027: [], departments: [], coa_dict: {}, form_meta: {}, software_licenses: [], department_requests: [], activity_plans: [] };

if (fs.existsSync(storePath)) {
    store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
}
if (!store.activity_plans) store.activity_plans = [];

const defaultList = [
    {
        id: 'ACT-2027-KG-NET-001',
        year: 2027,
        plant: 'KG',
        category: 'NETWORK_INFRA',
        title: 'Implementasi Sistem Kamera CCTV IP Gedung Baru Karawang',
        description: 'Instalasi 16 unit IP Camera 4MP, NVR 32 Channel 16TB, Switch PoE Gigabit, dan penarikan kabel UTP Cat6 outdoor untuk area perimeter, workshop, loading dock, dan panel kelistrikan gedung baru.',
        quarter: 'Q2',
        target_month: 'apr',
        budget_type: 'CAPEX_I1',
        capex_amount: 42700000,
        opex_amount: 12300000,
        total_amount: 55000000,
        pic: 'Hery (ICT Specialist)',
        priority: 'HIGH',
        status: 'PLANNED',
        progress_pct: 25,
        kpi_deliverable: '16 Titik CCTV online 24/7 di PowerAsset & Pos Security, Retensi rekaman 30 hari, VLAN CCTV terisolasi.',
        milestones: [
            { id: 1, text: 'Site survey denah & penentuan 16 titik blindspot gedung baru', done: true },
            { id: 2, text: 'Pengajuan & approval form Capex I-1 dan Opex F2 ke Finance/FAT', done: false },
            { id: 3, text: 'Bidding vendor & penerbitan PO pengadaan unit kamera & NVR', done: false },
            { id: 4, text: 'Penarikan kabel UTP Cat6 & konfigurasi VLAN 50 di MikroTik', done: false },
            { id: 5, text: 'Pemasangan unit kamera, NVR & uji rekam IR night vision', done: false },
            { id: 6, text: 'Integrasi SADP PowerAsset & serah terima BAST resmi', done: false }
        ],
        is_budget_synced: false,
        budget_item_ids: []
    },
    {
        id: 'ACT-2027-SG-SEC-002',
        year: 2027,
        plant: 'SG',
        category: 'CYBERSECURITY',
        title: 'Rollout Wazuh XDR Endpoint Agent ke Seluruh PC Kantor & Shopfloor',
        description: 'Pemasangan agent Wazuh v4.x terpusat ke server 192.168.1.3 untuk deteksi malware, file integrity monitoring (FIM), audit vulnerability, dan compliance ISO 27001.',
        quarter: 'Q1',
        target_month: 'jan',
        budget_type: 'ZERO_BUDGET',
        capex_amount: 0,
        opex_amount: 0,
        total_amount: 0,
        pic: 'Security Admin / NetAdmin',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        progress_pct: 60,
        kpi_deliverable: 'Coverage 100% PC aktif (Sadang & Karawang) terdaftar di dashboard.tricentrumfortuna.com.',
        milestones: [
            { id: 1, text: 'Setup Wazuh Server & Dashboard di 192.168.1.3', done: true },
            { id: 2, text: 'Batch install agent PC Engineering & Finance', done: true },
            { id: 3, text: 'Rollout agent ke PC Shopfloor & QC', done: false },
            { id: 4, text: 'Konfigurasi alert notifikasi Telegram / WA Bot TCF', done: false }
        ],
        is_budget_synced: false,
        budget_item_ids: []
    },
    {
        id: 'ACT-2027-ALL-NET-003',
        year: 2027,
        plant: 'ALL',
        category: 'NETWORK_INFRA',
        title: 'Disaster Recovery & Offsite Backup Replication Proxmox VE (SG ⇄ KG)',
        description: 'Sinkronisasi backup VM kritis (iDempiere ERP, HRIS, Database MySQL/Postgres) lintas plant via VPN IPsec Tunnel MikroTik CCR.',
        quarter: 'Q3',
        target_month: 'jul',
        budget_type: 'OPEX_F2',
        capex_amount: 0,
        opex_amount: 18500000,
        total_amount: 18500000,
        pic: 'System Engineer',
        priority: 'CRITICAL',
        status: 'PLANNED',
        progress_pct: 10,
        kpi_deliverable: 'RPO < 24 jam, RTO < 2 jam saat terjadi downtime data center.',
        milestones: [
            { id: 1, text: 'Desain arsitektur Proxmox Backup Server (PBS)', done: true },
            { id: 2, text: 'Pengadaan HDD Enterprise 8TB untuk NAS Sadang & Karawang', done: false },
            { id: 3, text: 'Konfigurasi schedule backup otomatis malam hari (bandwidth optimization)', done: false },
            { id: 4, text: 'Simulasi disaster recovery restore data iDempiere', done: false }
        ],
        is_budget_synced: false,
        budget_item_ids: []
    },
    {
        id: 'ACT-2027-SG-HW-004',
        year: 2027,
        plant: 'SG',
        category: 'HARDWARE_REFRESH',
        title: 'Penggantian PC Afkir Usia > 5 Tahun Sesuai Standar IK-03-02 (Batch 1)',
        description: 'Penggantian 5 unit PC Production & PPC yang sudah berusia > 5 tahun dengan spesifikasi Core i5 Gen 13/14, RAM 16GB, SSD NVMe 512GB untuk mencegah bottleneck kerja.',
        quarter: 'Q1',
        target_month: 'feb',
        budget_type: 'CAPEX_I1',
        capex_amount: 47500000,
        opex_amount: 0,
        total_amount: 47500000,
        pic: 'Hardware Specialist',
        priority: 'HIGH',
        status: 'PLANNED',
        progress_pct: 15,
        kpi_deliverable: '5 Unit PC baru deploy, data lama migrasi 100%, PC lama masuk berita acara afkir/gudang cadangan.',
        milestones: [
            { id: 1, text: 'Audit fisik dan verifikasi umur PC di PowerAsset (> 5 tahun)', done: true },
            { id: 2, text: 'Pengajuan Form I-1 Capex Investasi Penggantian Unit', done: false },
            { id: 3, text: 'Setup OS Windows 11 Enterprise & Antivirus standar TCF', done: false },
            { id: 4, text: 'Serah terima ke user dan berita acara penarikan PC lama', done: false }
        ],
        is_budget_synced: false,
        budget_item_ids: []
    },
    {
        id: 'ACT-2027-SG-SF-005',
        year: 2027,
        plant: 'SG',
        category: 'SMART_FACTORY',
        title: 'Digitalisasi Shopfloor: Barcode Scanner Wireless Kanban & Tablet QC',
        description: 'Penyediaan 8 unit Barcode Scanner 2D Industrial & 4 unit Tablet Rugged Android untuk integrasi aplikasi Shopfloor/MES dan inspeksi Quality Control.',
        quarter: 'Q2',
        target_month: 'may',
        budget_type: 'CAPEX_I1',
        capex_amount: 28000000,
        opex_amount: 3500000,
        total_amount: 31500000,
        pic: 'Shopfloor / IoT Specialist',
        priority: 'MEDIUM',
        status: 'PLANNED',
        progress_pct: 0,
        kpi_deliverable: 'Input Kanban & QC real-time tanpa kertas, zero delay transfer data ke ERP.',
        milestones: [
            { id: 1, text: 'Uji coba scanner 2D barcode di lini perakitan', done: false },
            { id: 2, text: 'Pengadaan 8 unit scanner industrial & 4 tablet QC', done: false },
            { id: 3, text: 'Instalasi access point WiFi roaming di area shopfloor', done: false },
            { id: 4, text: 'Training operator produksi & briefing SOP scanning', done: false }
        ],
        is_budget_synced: false,
        budget_item_ids: []
    },
    {
        id: 'ACT-2027-SG-SW-006',
        year: 2027,
        plant: 'SG',
        category: 'SOFTWARE_ERP',
        title: 'Perpanjangan Lisensi AMC SolidWorks Engineering & Microsoft 365 2027',
        description: 'Perpanjangan maintenance tahunan SolidWorks CAD untuk Engineering & lisensi cloud Office 365 Business seluruh departemen.',
        quarter: 'Q4',
        target_month: 'oct',
        budget_type: 'OPEX_F1',
        capex_amount: 0,
        opex_amount: 68000000,
        total_amount: 68000000,
        pic: 'ICT Specialist / Admin',
        priority: 'CRITICAL',
        status: 'PLANNED',
        progress_pct: 0,
        kpi_deliverable: 'Lisensi aktif sampai Q4 2028, update patch version terbaru, dukungan teknis vendor resmi.',
        milestones: [
            { id: 1, text: 'Audit utilisasi seat lisensi SolidWorks & Microsoft 365 aktif', done: false },
            { id: 2, text: 'Request penawaran harga perpanjangan resmi dari AppliCAD / Vendor', done: false },
            { id: 3, text: 'Pengajuan Form F1 Opex Pemeliharaan ke Finance', done: false },
            { id: 4, text: 'Aktivasi kunci lisensi tahunan & perpanjangan subscription cloud', done: false }
        ],
        is_budget_synced: false,
        budget_item_ids: []
    }
];

defaultList.forEach(item => {
    const idx = store.activity_plans.findIndex(a => a.id === item.id);
    if (idx !== -1) {
        store.activity_plans[idx] = item;
    } else {
        store.activity_plans.push(item);
    }
});

fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
console.log('✅ budget_store.json updated!');

// Generate SQL statements
let sqlContent = '';
for (const act of defaultList) {
    const titleSafe = act.title.replace(/'/g, "''");
    const descSafe = act.description.replace(/'/g, "''");
    const picSafe = act.pic.replace(/'/g, "''");
    const kpiSafe = act.kpi_deliverable.replace(/'/g, "''");
    const msSafe = JSON.stringify(act.milestones).replace(/'/g, "''");
    sqlContent += `INSERT INTO budget_activity_plans (id, year, plant, category, title, description, quarter, target_month, budget_type, capex_amount, opex_amount, total_amount, pic, priority, status, progress_pct, kpi_deliverable, milestones, is_budget_synced, budget_item_ids, created_at, updated_at) VALUES ('${act.id}', ${act.year}, '${act.plant}', '${act.category}', '${titleSafe}', '${descSafe}', '${act.quarter}', '${act.target_month}', '${act.budget_type}', ${act.capex_amount}, ${act.opex_amount}, ${act.total_amount}, '${picSafe}', '${act.priority}', '${act.status}', ${act.progress_pct}, '${kpiSafe}', '${msSafe}', false, '[]', NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, capex_amount = EXCLUDED.capex_amount, opex_amount = EXCLUDED.opex_amount, total_amount = EXCLUDED.total_amount, milestones = EXCLUDED.milestones, updated_at = NOW();\n`;
}

const SFTPClient = require('ssh2-sftp-client');
async function uploadAndRun() {
    const sftp = new SFTPClient();
    await sftp.connect({
        host: '192.168.1.66',
        port: 22,
        username: 'root',
        password: 'Nevergiveup572*'
    });

    const remoteSqlPath = '/tmp/seed_activities.sql';
    await sftp.put(Buffer.from(sqlContent, 'utf8'), remoteSqlPath);
    console.log('✅ Uploaded seed SQL to', remoteSqlPath);
    await sftp.end();

    const conn = new Client();
    conn.on('ready', () => {
        conn.exec('su - postgres -c "psql -d network_monitor_db -f /tmp/seed_activities.sql && psql -d network_monitor_kg -f /tmp/seed_activities.sql"', (err, stream) => {
            if (err) throw err;
            stream.on('data', d => process.stdout.write(d.toString()));
            stream.stderr.on('data', d => process.stderr.write(d.toString()));
            stream.on('close', code => {
                console.log('PostgreSQL seed completed with code:', code);
                conn.end();
                process.exit(0);
            });
        });
    }).connect({
        host: '192.168.1.66',
        port: 22,
        username: 'root',
        password: 'Nevergiveup572*'
    });
}

uploadAndRun().catch(e => {
    console.error('Upload & Run error:', e.message);
    process.exit(1);
});

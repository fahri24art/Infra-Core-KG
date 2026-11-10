const { Client } = require('ssh2');

const sshConfig = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

const sampleReqs = [
    {
        id: 'REQ-SG-2026-001',
        req_no: 'TCFSG-REQ-202610-001',
        date: '2026-10-15',
        plant: 'SG',
        department: 'Engineering & New Project',
        requester_name: 'Budi Santoso',
        requester_title: 'SPV Tooling & CAD',
        category: 'NEW_DEVICE',
        item_name: 'Workstation CAD/CAM High-Performance Core i7 / 32GB RAM / RTX 4060',
        qty: 1,
        unit: 'Unit',
        estimated_unit_price: 32500000,
        estimated_total_cost: 32500000,
        target_year: 2027,
        target_month: 'jan',
        target_form: 'I-1',
        technical_specs: 'Intel Core i7 Gen 14, 32GB DDR5, SSD 1TB NVMe, Nvidia RTX 4060 8GB, PSU 650W Gold, Monitor 27 inch 2K IPS.',
        justification: 'Kebutuhan pemrosesan gambar cetakan mold 3D tooling yang semakin kompleks; unit lama sering crash saat render.',
        status: 'APPROVED_TO_BUDGET',
        reviewed_by: 'Heru Prasetyo (Dept Head ICT)',
        review_notes: 'Spesifikasi telah diverifikasi sesuai kebutuhan aplikasi SolidWorks 2026 dan Mastercam.'
    },
    {
        id: 'REQ-SG-2026-002',
        req_no: 'TCFSG-REQ-202610-002',
        date: '2026-10-16',
        plant: 'SG',
        department: 'Engineering & New Project',
        requester_name: 'Budi Santoso',
        requester_title: 'SPV Tooling & CAD',
        category: 'SOFTWARE_LICENSE',
        item_name: 'SolidWorks Standard 3D CAD Perpetual License + 1-Year Subscription Support',
        qty: 1,
        unit: 'Lisensi',
        estimated_unit_price: 95000000,
        estimated_total_cost: 95000000,
        target_year: 2027,
        target_month: 'feb',
        target_form: 'F1',
        technical_specs: 'SolidWorks Standard Network Floating License, termasuk pembaruan versi 2027 dan support resmi Dassault.',
        justification: 'Penambahan 1 engineer desainer baru untuk percepatan approval part customer Honda / Toyota.',
        status: 'VERIFIED_ICT',
        reviewed_by: 'Bambang Irawan (SPV ICT Infrastructure)',
        review_notes: 'Menunggu penawaran resmi dari distributor AppliCAD untuk kepastian diskon corporate.'
    },
    {
        id: 'REQ-KG-2026-003',
        req_no: 'TCFKG-REQ-202610-003',
        date: '2026-10-17',
        plant: 'KG',
        department: 'Quality',
        requester_name: 'Dewi Sartika',
        requester_title: 'Section Head QC Karawang',
        category: 'REPLACEMENT',
        item_name: 'Penggantian PC CMM & Lab QC Karawang (Unit Eksisting Usia 6 Tahun Sering Freeze)',
        qty: 1,
        unit: 'Unit',
        estimated_unit_price: 18500000,
        estimated_total_cost: 18500000,
        target_year: 2027,
        target_month: 'mar',
        target_form: 'I-1',
        technical_specs: 'Intel Core i5 Gen 14, 16GB RAM, SSD 512GB, Dedicated RS232 Serial Port PCIe untuk interface mesin CMM.',
        justification: 'PC operasional CMM sering mendadak restart saat pengukuran dimensi presisi part ekspor.',
        status: 'APPROVED_TO_BUDGET',
        reviewed_by: 'Heru Prasetyo (Dept Head ICT)',
        review_notes: 'Unit lama akan diafkir/disposed sesuai SOP FAT-06-03 setelah unit baru operasional.'
    },
    {
        id: 'REQ-SG-2026-004',
        req_no: 'TCFSG-REQ-202610-004',
        date: '2026-10-18',
        plant: 'SG',
        department: 'Manufacturing - Production',
        requester_name: 'Agus Suryana',
        requester_title: 'Section Head Line Stamping SG',
        category: 'UPGRADE_HARDWARE',
        item_name: 'Upgrade RAM & SSD High-Speed untuk 5 Unit PC Shopfloor Line Produksi Sadang',
        qty: 5,
        unit: 'Set',
        estimated_unit_price: 2150000,
        estimated_total_cost: 10750000,
        target_year: 2027,
        target_month: 'apr',
        target_form: 'F2',
        technical_specs: 'RAM DDR4 16GB (2x8GB) Kingston Fury + SSD SATA 500GB Samsung EVO per unit PC.',
        justification: 'Booting dan load aplikasi MES / barcode scanner barcode lambat (masih pakai HDD mekanik lama).',
        status: 'SUBMITTED',
        reviewed_by: null,
        review_notes: ''
    },
    {
        id: 'REQ-SG-2026-005',
        req_no: 'TCFSG-REQ-202610-005',
        date: '2026-10-19',
        plant: 'SG',
        department: 'HR / GA',
        requester_name: 'Rina Marlina',
        requester_title: 'Staff GA Sadang',
        category: 'NETWORK_INFRA',
        item_name: 'Penambahan 2 Unit Access Point WiFi Enterprise (Ruang Training GA & Hall Depan)',
        qty: 2,
        unit: 'Unit',
        estimated_unit_price: 3650000,
        estimated_total_cost: 7300000,
        target_year: 2027,
        target_month: 'may',
        target_form: 'I-1',
        technical_specs: 'Ubiquiti UniFi U6-Pro WiFi 6 Gigabit, PoE Adapter, Patch Cord Cat6 20m.',
        justification: 'Sinyal WiFi di ruang training tidak memadai saat diadakan pelatihan karyawan massal (sering drop).',
        status: 'SUBMITTED',
        reviewed_by: null,
        review_notes: ''
    },
    {
        id: 'REQ-KG-2026-006',
        req_no: 'TCFKG-REQ-202610-006',
        date: '2026-10-20',
        plant: 'KG',
        department: 'PPC & Delivery',
        requester_name: 'Fajar Nugraha',
        requester_title: 'Staff Gudang FG Karawang',
        category: 'NEW_DEVICE',
        item_name: 'Laptop Business Thin & Light untuk Stock Opname Gudang Finish Goods Karawang',
        qty: 1,
        unit: 'Unit',
        estimated_unit_price: 13000000,
        estimated_total_cost: 13000000,
        target_year: 2027,
        target_month: 'jun',
        target_form: 'I-1',
        technical_specs: 'Lenovo ThinkPad / Dell Latitude Core i5, 16GB RAM, SSD 512GB, Battery tahan > 8 jam, Anti-Glare Display.',
        justification: 'Mobilitas verifikasi stock opname fisik harian di area racking gudang Karawang.',
        status: 'VERIFIED_ICT',
        reviewed_by: 'Bambang Irawan (SPV ICT Infrastructure)',
        review_notes: 'Rekomendasi disetujui untuk meningkatkan akurasi data inventory real-time.'
    }
];

const conn = new Client();
conn.on('ready', () => {
    const nodeScript = `
    require('dotenv').config({ path: '/opt/power_asset/backend/.env' });
    const db = require('/opt/power_asset/backend/db');
    const fs = require('fs');
    async function reseed() {
        const reqs = ${JSON.stringify(sampleReqs)};
        for (const r of reqs) {
            await db('budget_department_requests').insert({
                ...r,
                created_at: new Date(),
                updated_at: new Date()
            }).onConflict('id').ignore();
        }
        const storePath = '/opt/power_asset/backend/data/budget_store.json';
        if (fs.existsSync(storePath)) {
            const store = JSON.parse(fs.readFileSync(storePath));
            store.department_requests = reqs;
            fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
        }
        console.log('Successfully reseeded sample requests!');
        process.exit(0);
    }
    reseed().catch(e => { console.error(e); process.exit(1); });
    `;
    conn.exec(`cd /opt/power_asset/backend && node -e "${nodeScript.replace(/"/g, '\\"')}"`, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => conn.end());
    });
}).connect(sshConfig);

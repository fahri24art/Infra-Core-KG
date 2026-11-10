const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

const UPLOADS_DIR = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Documents to register
const documentsToSync = [
    // === SOP 03 & TURUNANNYA (PRIORITAS UTAMA) ===
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\SOP\\TCFSG-SOP-ICT-03 Prosedur Permintaan Fasilitas ICT.xlsx',
        title: 'TCFSG-SOP-ICT-03: Prosedur Permintaan Fasilitas ICT',
        type: 'SOP',
        description: 'Prosedur resmi alur permohonan, evaluasi kebutuhan, pengadaan, dan serah terima perangkat/fasilitas ICT di PT. Tri Centrum Fortuna.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\IK-STD\\TCFSG-STD-ICT-03-02_Standard Spesifikasi Perangkat Komputer.xlsx',
        title: 'TCFSG-STD-ICT-03-02: Standard Spesifikasi Perangkat Komputer',
        type: 'IK',
        description: 'Standar minimum spesifikasi hardware (CPU, RAM, SSD, Display) per level jabatan (Level 1-4) dan siklus masa pakai (Lifecycle 4-5 tahun).'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\IK-STD\\TCFSG-IK-ICT-03-02_Instruksi Kerja Alokasi dan Peremajaan Perangkat.xlsx',
        title: 'TCFSG-IK-ICT-03-02: IK Alokasi & Peremajaan (Rolling) Perangkat',
        type: 'IK',
        description: 'Instruksi kerja penentuan kriteria Laptop vs Desktop PC dan tata cara rolling asset (waterfall unit baru ke manager & rekondisi unit lama).'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\IK-STD\\TCFSG-IK-ICT-03-03_Instruksi Kerja Standarisasi dan Pengendalian Software.xlsx',
        title: 'TCFSG-IK-ICT-03-03: IK Standarisasi & Pengendalian Software',
        type: 'IK',
        description: 'Instruksi kerja software standar perusahaan (OS, M365, Antivirus, Agent), mekanisme perizinan software khusus, dan Endpoint Lockdown.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\IK-STD\\TCFSG-IK-ICT-03-01-Permintaan Fasilitas ICT.xlsx',
        title: 'TCFSG-IK-ICT-03-01: IK Permintaan Fasilitas ICT & Jaringan',
        type: 'IK',
        description: 'Instruksi kerja teknis alur permintaan perangkat komputer, instalasi port LAN jaringan, dan alur helpdesk ticket.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\IK-STD\\TCFSG-STD-ICT-03-01_Standard Penomoran Kode Inventaris.xlsx',
        title: 'TCFSG-STD-ICT-03-01: Standard Penomoran Kode Inventaris Aset',
        type: 'IK',
        description: 'Standar format resmi penomoran barcode dan kode tagging aset ICT Plant Sadang (TCFSG) dan Plant Karawang (TCFKG).'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\Form\\TCFSG-FM-ICT-03-02_Serah Terima.xlsx',
        title: 'TCFSG-FM-ICT-03-02: Form Berita Acara Serah Terima (BAST)',
        type: 'Form',
        description: 'Formulir bukti serah terima perangkat komputer/laptop antara ICT dan pengguna beserta kelengkapan aksesoris.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\Form\\TCFSG-FM-ICT-03-04 IT Helpdesk Ticket.xlsx',
        title: 'TCFSG-FM-ICT-03-04: Form IT Helpdesk Ticket & Permintaan',
        type: 'Form',
        description: 'Formulir registrasi tiket keluhan operasional dan permintaan fasilitas ICT untuk pencatatan manual/offline.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\Form\\TCFSG-FM-ICT-03-03 ASSET LIST.xlsx',
        title: 'TCFSG-FM-ICT-03-03a: Form Asset List ICT',
        type: 'Form',
        description: 'Format master inventaris perangkat keras dan aset fasilitas ICT PT. Tri Centrum Fortuna.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\03. Permintaan Fasilitas ICT\\Form\\TCFSG-FM-ICT-03-03_History Perangkat.xlsx',
        title: 'TCFSG-FM-ICT-03-03b: Form Riwayat Pemeliharaan Perangkat',
        type: 'Form',
        description: 'Catatan log riwayat perbaikan, upgrade hardware, dan servis berkala masing-masing unit perangkat.'
    },

    // === SOP 01: PEMELIHARAAN PERANGKAT ICT ===
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\01. Pemeliharaan Perangkat ICT\\SOP\\1. TCFSG-SOP-ICT-01 Prosedur Pemeliharaan Perangkat.xlsx',
        title: 'TCFSG-SOP-ICT-01: Prosedur Pemeliharaan Perangkat ICT',
        type: 'SOP',
        description: 'Prosedur pemeliharaan berkala (preventive maintenance) komputer, printer, server, dan jaringan.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\01. Pemeliharaan Perangkat ICT\\New Format IK\\TCFSG-IK-ICT-01-01-Backup Data.xlsx',
        title: 'TCFSG-IK-ICT-01-01: IK Backup Data Komputer & Server',
        type: 'IK',
        description: 'Instruksi kerja pelaksanaan backup data operasional berkala dan penyimpanan cold storage.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\01. Pemeliharaan Perangkat ICT\\New Format IK\\TCFSG-IK-ICT-01-02-Pemeliharaan PC, Laptop.xlsx',
        title: 'TCFSG-IK-ICT-01-02: IK Pemeliharaan PC & Laptop',
        type: 'IK',
        description: 'Instruksi kerja langkah pembersihan fisik, update OS, cek antivirus, dan optimasi performa PC/Laptop.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\01. Pemeliharaan Perangkat ICT\\New Format IK\\TCFSG-IK-ICT-01-03-Pemeliharaan Printer.xlsx',
        title: 'TCFSG-IK-ICT-01-03: IK Pemeliharaan Printer & Scanner',
        type: 'IK',
        description: 'Instruksi kerja perawatan print head, roller, tinta/toner, dan konektivitas printer.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\01. Pemeliharaan Perangkat ICT\\New Format IK\\TCFSG-IK-ICT-01-04-Pemeliharaan Jaringan Komputer & CCTV.xlsx',
        title: 'TCFSG-IK-ICT-01-04: IK Pemeliharaan Jaringan & CCTV',
        type: 'IK',
        description: 'Instruksi kerja inspeksi switch, router, access point, NVR, dan kamera CCTV.'
    },

    // === SOP 02: PERBAIKAN PERANGKAT ICT ===
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\02. Perbaikan Perangkat ICT\\SOP\\2. TCFSG-SOP-ICT-02 Prosedur Perbaikan Perangkat.xlsx',
        title: 'TCFSG-SOP-ICT-02: Prosedur Perbaikan Perangkat ICT',
        type: 'SOP',
        description: 'Prosedur penanganan insiden kerusakan (corrective maintenance) dan eskalasi teknis perangkat ICT.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\02. Perbaikan Perangkat ICT\\New Format IK\\TCFSG-IK-ICT-02-01-Sistem Helpdesk Ticketing.xlsx',
        title: 'TCFSG-IK-ICT-02-01: IK Sistem Helpdesk Ticketing',
        type: 'IK',
        description: 'Instruksi kerja operasional alur tiket helpdesk, SLA respon time, dan penutupan tiket.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\02. Perbaikan Perangkat ICT\\New Format IK\\TCFSG-IK-ICT-02-02-Perbaikan-PC-atau-Laptop.xlsx',
        title: 'TCFSG-IK-ICT-02-02: IK Perbaikan PC & Laptop',
        type: 'IK',
        description: 'Instruksi kerja troubleshooting kerusakan hardware (RAM, SSD, PSU, LCD) dan software (OS boot failure).'
    },

    // === SOP 04: CYBER SECURITY ===
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\04. Penanganan Cyber Attack\\4. Prosedur cyber attack prevention.xlsx',
        title: 'TCFSG-SOP-ICT-04: Prosedur Cyber Attack Prevention',
        type: 'SOP',
        description: 'Prosedur standar keamanan informasi, pencegahan ransomware/malware, dan penanganan insiden siber.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\04. Penanganan Cyber Attack\\IK  STD\\TCFSG-IK-ICT-04-01-Cybersecurity.xlsx',
        title: 'TCFSG-IK-ICT-04-01: IK Cybersecurity & Endpoint Protection',
        type: 'IK',
        description: 'Instruksi kerja mitigasi serangan malware, pengamanan akun M365, dan filter spam/phishing.'
    },

    // === AUDIT & QMR ===
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\Daftar Master Dokumen Internal ( 28 Oct 2022 ).xlsx',
        title: 'QMR: Daftar Master Dokumen Internal Departemen IT',
        type: 'Audit',
        description: 'Daftar master dokumen resmi yang teregistrasi di QMR (Quality Management Representative) PT. TCF.'
    },
    {
        src: 'F:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG\\Daftar Analisis Risiko Atau Peluang & Rencana Tindakan ( 15 Jul 2022 ).xlsx',
        title: 'QMR: Analisis Risiko & Peluang Departemen ICT',
        type: 'Audit',
        description: 'Dokumen mitigasi risiko operasional ICT, kegagalan sistem, dan rencana kontinjensi ISO.'
    }
];

async function syncDocuments() {
    console.log('--- Starting Document Sync to Power Asset ---');
    let insertedCount = 0;
    let skippedCount = 0;

    for (const doc of documentsToSync) {
        if (!fs.existsSync(doc.src)) {
            console.warn(`[SKIP] File not found: ${doc.src}`);
            skippedCount++;
            continue;
        }

        const ext = path.extname(doc.src);
        const baseName = path.basename(doc.src);
        // create clean destination filename
        const safeBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const destFilename = `doc-${Date.now()}-${safeBaseName}`;
        const destPath = path.join(UPLOADS_DIR, destFilename);

        // Copy file to uploads dir
        fs.copyFileSync(doc.src, destPath);

        // Check if already in DB by title
        const existing = await db('audit_documents').where('title', doc.title).first();
        if (existing) {
            await db('audit_documents').where('id', existing.id).update({
                filename: destFilename,
                original_filename: baseName,
                description: doc.description,
                type: doc.type,
                updated_at: new Date()
            });
            console.log(`[UPDATED] ${doc.title}`);
        } else {
            await db('audit_documents').insert({
                title: doc.title,
                type: doc.type,
                description: doc.description,
                filename: destFilename,
                original_filename: baseName,
                uploaded_by: 'Admin ICT',
                created_at: new Date(),
                updated_at: new Date()
            });
            console.log(`[INSERTED] ${doc.title}`);
            insertedCount++;
        }
    }

    const total = await db('audit_documents').count('* as count');
    console.log(`--- Sync Finished! Total in audit_documents: ${total[0].count} ---`);
    process.exit(0);
}

syncDocuments().catch(err => {
    console.error('Fatal sync error:', err);
    process.exit(1);
});

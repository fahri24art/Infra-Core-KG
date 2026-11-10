const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'data', 'budget_store.json');

try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const d = JSON.parse(raw);

    if (!d.department_requests || d.department_requests.length === 0) {
        d.department_requests = [
            {
                id: 'REQ-SG-2026-001',
                req_no: 'TCFSG-REQ-202610-001',
                date: '2026-10-15',
                plant: 'SG',
                department: 'Engineering & New Project',
                requester_name: 'Bambang Hidayat',
                requester_title: 'Design Lead',
                category: 'NEW_DEVICE',
                item_name: 'Workstation CAD/CAM High-Performance Core i7 / 32GB RAM / RTX 4060',
                qty: 2,
                unit: 'Unit',
                estimated_unit_price: 26500000,
                estimated_total_cost: 53000000,
                target_year: 2027,
                target_month: 'feb',
                target_form: 'I-1',
                technical_specs: 'Intel Core i7-14700, 32GB DDR5 RAM, 1TB NVMe SSD Gen4, NVIDIA RTX 4060 8GB, PSU 650W Gold, Dual Monitor 24" IPS.',
                justification: 'Penambahan kapasitas tim rancang bangun dies stamping baru & komputasi simulasi SolidWorks 3D agar rendering tidak antre.',
                status: 'APPROVED_TO_BUDGET',
                reviewed_by: 'Hery (ICT Specialist)',
                review_notes: 'Kebutuhan valid untuk project baru. Sesuai standar TCFSG-STD-ICT-03-02 (PC Spek Desain/CAD).',
                created_at: '2026-10-15T08:30:00.000Z'
            },
            {
                id: 'REQ-SG-2026-002',
                req_no: 'TCFSG-REQ-202610-002',
                date: '2026-10-16',
                plant: 'SG',
                department: 'Engineering & New Project',
                requester_name: 'Hendra Wijaya',
                requester_title: 'Senior CAD Engineer',
                category: 'SOFTWARE_LICENSE',
                item_name: 'SolidWorks Standard 3D CAD Perpetual License + 1-Year Subscription Support',
                qty: 1,
                unit: 'Lisensi',
                estimated_unit_price: 98000000,
                estimated_total_cost: 98000000,
                target_year: 2027,
                target_month: 'mar',
                target_form: 'I-1',
                technical_specs: 'SolidWorks 2025 Standard Standalone/Network Serial License dengan maintenance support aktif 12 bulan.',
                justification: 'Staf engineering baru bertambah 1 orang untuk model tooling stamping, lisensi eksisting selalu terpakai 100%.',
                status: 'VERIFIED_ICT',
                reviewed_by: 'Hery (ICT Specialist)',
                review_notes: 'Concurrency lisensi SolidWorks di server terpantau selalu puncak. Direkomendasikan masuk Capex I-1 2027.',
                created_at: '2026-10-16T10:15:00.000Z'
            },
            {
                id: 'REQ-KG-2026-003',
                req_no: 'TCFKG-REQ-202610-003',
                date: '2026-10-18',
                plant: 'KG',
                department: 'Quality',
                requester_name: 'Siti Rahayu',
                requester_title: 'QC Supervisor Karawang',
                category: 'REPLACEMENT',
                item_name: 'Penggantian PC CMM & Lab QC Karawang (Unit Eksisting Usia 6 Tahun Sering Freeze)',
                qty: 1,
                unit: 'Unit',
                estimated_unit_price: 14500000,
                estimated_total_cost: 14500000,
                target_year: 2027,
                target_month: 'apr',
                target_form: 'I-1',
                technical_specs: 'Core i5-13400, 16GB DDR4, 512GB NVMe SSD, Windows 11 Pro 64-bit Original, UPS 1200VA ICA.',
                justification: 'PC QC Karawang tahun pengadaan 2018 (usia 6 tahun), sering hang saat input data dimensi CMM dan berisiko menghambat delivery.',
                status: 'APPROVED_TO_BUDGET',
                reviewed_by: 'Hery (ICT Specialist)',
                review_notes: 'Sesuai IK TCFSG-IK-ICT-03-02 usia unit > 5 tahun layak peremajaan / replacement ke Capex I-1.',
                created_at: '2026-10-18T14:20:00.000Z'
            },
            {
                id: 'REQ-SG-2026-004',
                req_no: 'TCFSG-REQ-202610-004',
                date: '2026-10-19',
                plant: 'SG',
                department: 'Manufacturing - Production',
                requester_name: 'Agus Supriyadi',
                requester_title: 'Production Foreman Line 2',
                category: 'UPGRADE_HARDWARE',
                item_name: 'Upgrade RAM & SSD High-Speed untuk 5 Unit PC Shopfloor Line Produksi Sadang',
                qty: 5,
                unit: 'Paket',
                estimated_unit_price: 1450000,
                estimated_total_cost: 7250000,
                target_year: 2027,
                target_month: 'jan',
                target_form: 'F2',
                technical_specs: 'SSD SATA 512GB 2.5" Crucial/Lexar + RAM DDR4 8GB 3200MHz LongDIMM per unit PC.',
                justification: 'PC line produksi Sadang lambat saat boot dan transfer data kanban barcode scanner iDempiere ERP.',
                status: 'SUBMITTED',
                reviewed_by: null,
                review_notes: '',
                created_at: '2026-10-19T09:00:00.000Z'
            },
            {
                id: 'REQ-SG-2026-005',
                req_no: 'TCFSG-REQ-202610-005',
                date: '2026-10-19',
                plant: 'SG',
                department: 'HR / GA',
                requester_name: 'Dewi Lestari',
                requester_title: 'GA Staff',
                category: 'NETWORK_INFRA',
                item_name: 'Penambahan 2 Unit Access Point WiFi Enterprise (Ruang Training GA & Hall Depan)',
                qty: 2,
                unit: 'Unit',
                estimated_unit_price: 2750000,
                estimated_total_cost: 5500000,
                target_year: 2027,
                target_month: 'may',
                target_form: 'I-1',
                technical_specs: 'Ubiquiti UniFi U6-Lite / Ruijie Reyee RG-RAP2260(G) WiFi 6 Gigabit Ceiling AP + Gigabit PoE Adapter.',
                justification: 'Sinyal WiFi di ruang training GA blank spot saat event onboarding karyawan dan training departemen.',
                status: 'SUBMITTED',
                reviewed_by: null,
                review_notes: '',
                created_at: '2026-10-19T11:40:00.000Z'
            },
            {
                id: 'REQ-KG-2026-006',
                req_no: 'TCFKG-REQ-202610-006',
                date: '2026-10-20',
                plant: 'KG',
                department: 'PPC & Delivery',
                requester_name: 'Rudi Hartono',
                requester_title: 'PPC Admin Karawang',
                category: 'NEW_DEVICE',
                item_name: 'Laptop Business Thin & Light untuk Stock Opname Gudang Finish Goods Karawang',
                qty: 1,
                unit: 'Unit',
                estimated_unit_price: 13800000,
                estimated_total_cost: 13800000,
                target_year: 2027,
                target_month: 'feb',
                target_form: 'I-1',
                technical_specs: 'Lenovo ThinkPad E14 / HP ProBook 440, Core i5-1335U, 16GB RAM, 512GB SSD, Anti-Glare Display, Win 11 Pro.',
                justification: 'Petugas PPC butuh mobilitas tinggi stock opname barang jadi di gudang Karawang yang terhubung barcode reader wireless.',
                status: 'VERIFIED_ICT',
                reviewed_by: 'Hery (ICT Specialist)',
                review_notes: 'Sesuai dengan SOP TCFSG-SOP-ICT-03 dan Standard Spesifikasi Laptop Bisnis TCFSG-STD-ICT-03-02.',
                created_at: '2026-10-20T08:15:00.000Z'
            }
        ];
        fs.writeFileSync(STORE_PATH, JSON.stringify(d, null, 2), 'utf-8');
        console.log('Successfully seeded department_requests into budget_store.json!');
    } else {
        console.log('department_requests already initialized with', d.department_requests.length, 'records.');
    }
} catch (e) {
    console.error('Error seeding data:', e);
}

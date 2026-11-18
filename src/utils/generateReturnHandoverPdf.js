import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';
import { addSopHeader } from './sopHeader';

const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatTitleCase = (str) => {
    if (!str) return '';
    return str
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

const parseAssetSpecs = (specs) => {
    try {
        if (typeof specs === 'string' && specs.trim().startsWith('{')) {
            return JSON.parse(specs);
        }
        if (typeof specs === 'object' && specs !== null) {
            return specs;
        }
    } catch {
        // ignore invalid JSON specs
    }
    return {};
};

const inferJenisPerangkat = (asset) => {
    const catStr = (asset?.category || '').toLowerCase();
    if (catStr.includes('pc') || catStr.includes('desktop')) return 'PC / Desktop';
    if (catStr.includes('laptop') || catStr.includes('notebook')) return 'Laptop / Notebook';
    if (catStr.includes('printer')) return 'Printer / Scanner';
    if (catStr.includes('phone') || catStr.includes('tablet')) return 'Smartphone / Tablet';
    return asset?.category || 'Perangkat ICT';
};

const inferDefaultKelengkapan = (asset) => {
    const catStr = (asset?.category || '').toLowerCase();
    if (catStr.includes('pc') || catStr.includes('desktop')) return 'Unit PC, Kabel Power, Keyboard, Mouse';
    if (catStr.includes('laptop') || catStr.includes('notebook')) return 'Unit Laptop, Charger/Adaptor, Tas, Mouse';
    if (catStr.includes('printer') || catStr.includes('scanner')) return 'Unit Printer, Kabel Power, Kabel USB / LAN';
    if (catStr.includes('phone') || catStr.includes('mobile') || catStr.includes('tablet')) return 'Unit HP / Tablet, Charger/Adaptor, Kabel Data';
    return 'Unit Utama, Kabel Power / Aksesoris';
};

/**
 * Generate PDF Berita Acara Pengembalian Perangkat ICT (User -> ICT) dengan 2 kolom tanda tangan.
 */
export const generateReturnHandoverPdf = async (userName, assetsInput, formDataObj = {}, action = 'download') => {
    const isString = typeof formDataObj === 'string';
    const formData = isString ? { divisi: formDataObj } : (formDataObj || {});
    const isBlank = Boolean(formData.isBlank);

    const {
        nik = '',
        jabatan = '',
        divisi = '',
        alasan = '',
        kondisi = '',
        kelengkapan = '',
        snCharger = '',
        catatanIct = '',
        penerimaIct = '',
        tanggalPengembalian = null,
    } = formData;

    try {
        const assets = isBlank
            ? []
            : (Array.isArray(assetsInput) ? assetsInput : [assetsInput]).filter(Boolean);

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const imgData = await loadImage(logoTCF);

        const returnDate = tanggalPengembalian ? new Date(tanggalPengembalian) : new Date();
        const validDate = Number.isNaN(returnDate.getTime()) ? new Date() : returnDate;
        const dateNum = String(validDate.getDate()).padStart(2, '0');
        const yearNum = validDate.getFullYear();
        const dayStr = DAYS_ID[validDate.getDay()];
        const monthStr = MONTHS_ID[validDate.getMonth()];

        const currentOrg = (typeof window !== 'undefined' && sessionStorage.getItem('organization')) || '';
        const firstInv = assets[0]?.inventory_number || '';
        const isKG = currentOrg.toUpperCase().includes('KG') || firstInv.toUpperCase().includes('TCFKG');
        const docCode = isKG ? 'TCFKG-FM-ICT-03-05' : 'TCFSG-FM-ICT-03-05';
        const plantCity = isKG ? 'Karawang' : 'Purwakarta';

        const displayName = isBlank
            ? '................................................................'
            : (formatTitleCase(userName) || '................................................................');

        const loggedUser = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('user') || '{}') : {};
        const penerimaDisplay = isBlank
            ? '................................................................'
            : (formatTitleCase(penerimaIct || loggedUser?.name || '') || 'Tim ICT Department');

        // Header SOP
        if (imgData) {
            addSopHeader(
                doc,
                pageWidth,
                'BERITA ACARA PENGEMBALIAN PERANGKAT ICT',
                docCode,
                '01',
                '01 Oktober 2021',
                '1 dari 1',
                imgData
            );
        }

        let currentY = 43;
        doc.setFont('times', 'normal');
        doc.setFontSize(9.5);

        const datePhrase = isBlank
            ? 'hari ........................., tanggal ...... bulan ........................ tahun ............'
            : `hari ${dayStr}, tanggal ${dateNum} ${monthStr} ${yearNum}`;

        const introText = `Pada ${datePhrase}, telah dilaksanakan serah terima pengembalian inventaris perangkat ICT milik PT. Tri Centrum Fortuna dari Pihak Pertama (Pengguna/Karyawan) kepada Pihak Kedua (Bagian ICT), dengan rincian sebagai berikut:`;
        const introLines = doc.splitTextToSize(introText, pageWidth - 20);
        doc.text(introLines, 10, currentY);
        currentY += introLines.length * 4.5 + 3;

        // Section I: Identitas Pihak Pertama (Yang Mengembalikan)
        doc.setFont('times', 'bold');
        doc.setFontSize(9.5);
        doc.text('I. DATA PIHAK YANG MENGEMBALIKAN (PIHAK PERTAMA)', 10, currentY);
        currentY += 4.5;

        const fallbackDots = '..............................................................................';
        const identitasRows = [
            ['Nama Lengkap', isBlank ? fallbackDots : displayName],
            ['N.I.K', isBlank ? fallbackDots : (nik || fallbackDots)],
            ['Department / Divisi', isBlank ? fallbackDots : (divisi || fallbackDots)],
            ['Jabatan', isBlank ? fallbackDots : (jabatan || fallbackDots)],
            [
                'Alasan Pengembalian',
                isBlank
                    ? '[  ] Resign / PHK     [  ] Mutasi / Rotasi     [  ] Penggantian Unit     [  ] Selesai Pakai'
                    : (alasan || 'Pengembalian Perangkat ICT')
            ],
        ];

        autoTable(doc, {
            startY: currentY,
            body: identitasRows,
            theme: 'plain',
            styles: { font: 'times', fontSize: 9, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 }, textColor: 20 },
            columnStyles: {
                0: { cellWidth: 42, fontStyle: 'bold' },
                1: { cellWidth: pageWidth - 62 },
            },
            didParseCell: (data) => {
                if (data.column.index === 1) {
                    data.cell.text = [`:  ${data.cell.raw}`];
                }
            },
            margin: { left: 10, right: 10 },
        });

        currentY = (doc.lastAutoTable?.finalY || currentY) + 5;

        // Section II: Data Perangkat Yang Dikembalikan
        doc.setFont('times', 'bold');
        doc.setFontSize(9.5);
        doc.text('II. RINCIAN PERANGKAT ICT YANG DIKEMBALIKAN', 10, currentY);
        currentY += 3;

        const assetRows = isBlank
            ? [
                ['1', '', '', '', ''],
                ['2', '', '', '', ''],
                ['3', '', '', '', ''],
            ]
            : assets.map((asset, idx) => {
                const parsedSpecs = parseAssetSpecs(asset.specs);
                const cpuInfo = parsedSpecs.cpu || parsedSpecs.processor || parsedSpecs.Processor || '';
                const ramInfo = asset.ram || parsedSpecs.ram || parsedSpecs.memory || parsedSpecs.Memory || '';
                const specSummary = [cpuInfo, ramInfo].filter(Boolean).join(', ');

                const merkType = `${asset.manufacturer || ''} ${asset.model || ''}`.trim() || asset.name || '-';
                const jenisDanTipe = `${inferJenisPerangkat(asset)}\n${merkType}${specSummary ? `\n(${specSummary})` : ''}`;
                const assetSn = `Asset: ${asset.inventory_number || '-'}\nSN: ${asset.serial_number || '-'}`;

                const itemKelengkapan = kelengkapan || inferDefaultKelengkapan(asset);
                const snChargerText = snCharger && !snCharger.startsWith('...') ? `\nSN Charger: ${snCharger}` : '';

                return [
                    String(idx + 1),
                    jenisDanTipe,
                    assetSn,
                    `${itemKelengkapan}${snChargerText}`,
                    kondisi || 'Baik & Berfungsi Normal',
                ];
            });

        autoTable(doc, {
            startY: currentY,
            head: [['No', 'Jenis & Merek / Tipe', 'No. Asset & Serial Number', 'Kelengkapan Dikembalikan', 'Kondisi']],
            body: assetRows,
            theme: 'grid',
            styles: {
                font: 'times',
                fontSize: 8.5,
                cellPadding: isBlank ? 4.5 : 2,
                textColor: 20,
                valign: 'top',
                lineColor: [140, 140, 140],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: [235, 238, 245],
                textColor: 15,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 48 },
                2: { cellWidth: 46 },
                3: { cellWidth: 50 },
                4: { cellWidth: 36 },
            },
            margin: { left: 10, right: 10 },
        });

        currentY = (doc.lastAutoTable?.finalY || currentY) + 5;

        // Check if remaining space is tight before Section III & signatures
        if (currentY > 210) {
            doc.addPage();
            currentY = 20;
        }

        // Section III: Hasil Pemeriksaan ICT
        doc.setFont('times', 'bold');
        doc.setFontSize(9.5);
        doc.text('III. HASIL PEMERIKSAAN KELENGKAPAN & KONDISI (DIISI OLEH ICT)', 10, currentY);
        currentY += 3;

        const defaultCheckRow = isBlank
            ? [
                ['Kelengkapan Fisik', '[  ] Lengkap sesuai serah terima awal     [  ] Tidak lengkap, kurang: ...............................'],
                ['Kondisi Fisik & Fungsi', '[  ] Baik / Normal     [  ] Lecet pemakaian     [  ] Rusak: ....................................................'],
                ['Backup & Keamanan Data', '[  ] Data user sudah di-backup / dipindah     [  ] Tidak perlu backup     [  ] Reset / Wipe OS'],
                ['Catatan Pemeriksaan ICT', '\n'],
            ]
            : [
                ['Kelengkapan Dikembalikan', kelengkapan || inferDefaultKelengkapan(assets[0])],
                ['Status Kondisi Perangkat', kondisi || 'Baik & Berfungsi Normal'],
                ['Status Backup & Akses', 'Pemeriksaan fisik, kelengkapan unit, serta verifikasi data/akses telah dilakukan oleh ICT'],
                ['Catatan Pemeriksaan ICT', catatanIct || '-'],
            ];

        autoTable(doc, {
            startY: currentY,
            body: defaultCheckRow,
            theme: 'grid',
            styles: {
                font: 'times',
                fontSize: 8.5,
                cellPadding: 2.2,
                textColor: 20,
                lineColor: [140, 140, 140],
                lineWidth: 0.2,
            },
            columnStyles: {
                0: { cellWidth: 45, fontStyle: 'bold', fillColor: [248, 250, 252] },
                1: { cellWidth: pageWidth - 65 },
            },
            margin: { left: 10, right: 10 },
        });

        currentY = (doc.lastAutoTable?.finalY || currentY) + 6;

        if (currentY > 225) {
            doc.addPage();
            currentY = 20;
        }

        // Closing Statement
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        const closingText = 'Demikian Berita Acara Pengembalian Perangkat ICT ini dibuat dengan sebenarnya sebagai bukti sah bahwa Pihak Pertama telah menyerahkan kembali perangkat inventaris perusahaan kepada Bagian ICT PT. Tri Centrum Fortuna untuk dikelola lebih lanjut.';
        const closingLines = doc.splitTextToSize(closingText, pageWidth - 20);
        doc.text(closingLines, 10, currentY);
        currentY += closingLines.length * 4.5 + 6;

        // Date & Location line
        doc.setFontSize(9);
        const signDateText = isBlank
            ? `Dicek dan diserahterimakan kembali di ${plantCity}, tanggal ................................. ${yearNum}`
            : `Dicek dan diserahterimakan kembali di ${plantCity}, ${dateNum} ${monthStr} ${yearNum}`;
        doc.text(signDateText, pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;

        // 2-Column Signatures (Yang Menyerahkan / User & Yang Menerima / ICT)
        const leftCenterX = 57.5;
        const rightCenterX = pageWidth - 57.5;

        doc.setFont('times', 'bold');
        doc.text('Yang Menyerahkan (User),', leftCenterX, currentY, { align: 'center' });
        doc.text('Yang Menerima & Memeriksa (ICT),', rightCenterX, currentY, { align: 'center' });

        currentY += 22;

        doc.setLineWidth(0.3);
        doc.line(leftCenterX - 32, currentY, leftCenterX + 32, currentY);
        doc.line(rightCenterX - 32, currentY, rightCenterX + 32, currentY);

        currentY += 4.5;
        doc.setFont('times', 'bold');
        doc.text(displayName, leftCenterX, currentY, { align: 'center' });
        doc.text(penerimaDisplay, rightCenterX, currentY, { align: 'center' });

        currentY += 4;
        doc.setFont('times', 'normal');
        doc.setFontSize(8.5);
        doc.text(isBlank ? 'NIK. ...................................' : (nik && !nik.startsWith('...') ? `NIK. ${nik}` : '(Karyawan / Pemegang Aset)'), leftCenterX, currentY, { align: 'center' });
        doc.text('(ICT Department)', rightCenterX, currentY, { align: 'center' });

        // Footer doc code on every page
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100);
            doc.text(`${docCode} | Hal ${p} dari ${totalPages}`, pageWidth - 10, pageHeight - 5, { align: 'right' });
        }

        const safeName = isBlank ? 'Blank_Form' : (userName || 'User').replace(/\s+/g, '_');
        if (action === 'download') {
            doc.save(`BAST_Pengembalian_${safeName}_${yearNum}.pdf`);
        } else {
            const pdfUrl = doc.output('bloburl');
            window.open(pdfUrl, '_blank');
        }
    } catch (error) {
        console.error('Failed to generate Return Handover PDF', error);
        alert('Gagal membuat PDF BAST Pengembalian.');
    }
};


import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';
import ttdTechnisi from '../assets/WhatsApp_Image_2026-06-30_at_13.35.24-removebg-preview.png';
import { getDocId } from './documents';
import { addSopHeader } from './sopHeader';

const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

export const generateCctvPdf = async (asset, form, mode = 'view') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    addSopHeader(doc, pageWidth, "CHECK SHEET PEMELIHARAAN CCTV & SURVEILLANCE", "TCFSG-FM-ICT-01-05", "01", "01 Oktober 2021", "1 dari 1", imgData);

    const defaultTechSig = await loadImage(ttdTechnisi);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    let currentY = 39;
    const col1X = 10;
    const col2X = 35;
    const col3X = 95;
    const col4X = 120;

    doc.text("Departemen", col1X, currentY);
    doc.text(": ICT / GA Surveillance (Non-KPI)", col2X, currentY);

    currentY += 5;
    doc.text("Lokasi Kamera", col1X, currentY);
    doc.text(`: ${asset.user_department || asset.location || 'Area Plant Sadang'}`, col2X, currentY);
    doc.text("Kode Asset", col3X, currentY);
    doc.text(`: ${asset.code || asset.inventory_number || asset.name || '-'}`, col4X, currentY);

    currentY += 5;
    doc.text("Frekuensi", col1X, currentY);
    doc.text(": 1x Per Enam Bulan", col2X, currentY);
    doc.text("Jenis Unit", col3X, currentY);
    doc.text(": [X] Kamera CCTV    [ ] NVR / DVR", col4X, currentY);

    currentY += 5;
    doc.text("Tahun", col1X, currentY);
    doc.text(`: ${form.year || new Date().getFullYear()}`, col2X, currentY);
    doc.text("PIC / Lokasi", col3X, currentY);
    doc.text(`: ${asset.location || asset.user_name || 'PT. Tri Centrum Fortuna'}`, col4X, currentY);

    const getMark = (val) => {
        if (!val || typeof val !== 'string') return 'v';
        if (val.includes('Perbaikan') || val.includes('Rusak') || val.includes('Mati') || val.includes('Adjust')) return 'X';
        if (val === 'N/A') return '-';
        return 'v';
    };

    const d = form.checksheet_data || {};

    const tableBody = [
        [{ content: '1. KAMERA, OPTIK & FISIK', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ['Fisik Body, Bracket & Housing', 'Kokoh, Bersih & Aman', getMark(d.housingBracket), d.housingBracket || ''],
        ['Kebersihan Lensa & Kaca Dome/Cover', 'Bersih, Jernih & Bebas Debu', getMark(d.lensGlass), d.lensGlass || ''],
        ['Sudut Pandang & Fokus Kamera', 'Presisi & Sesuai Area Pantau', getMark(d.angleFocus), d.angleFocus || ''],
        ['Infra Red (IR) / Night Vision', 'Menyala Normal Saat Gelap', getMark(d.irNightVision), d.irNightVision || ''],
        [{ content: '2. KABEL, POWER & KONEKTIVITAS', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ['Kabel UTP / Coaxial & Konektor RJ45/BNC', 'Terpasang Kencang & Bebas Korosi', getMark(d.cablingConnector), d.cablingConnector || ''],
        ['Adaptor / Power Supply / PoE Switch', 'Tegangan Stabil & Normal', getMark(d.powerSupplyPoe), d.powerSupplyPoe || ''],
        ['Junction Box & Pelindung Conduit', 'Tertutup Rapat & Rapi', getMark(d.junctionConduit), d.junctionConduit || ''],
        [{ content: '3. NVR / DVR & STATUS REKAMAN', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ['Live View & Kualitas Video', 'Jernih & Tanpa Noise/Flicker', getMark(d.liveViewQuality), d.liveViewQuality || ''],
        ['Status Rekaman & Playback Storage', 'Merekam Normal & HDD Sehat', getMark(d.recordingPlayback), d.recordingPlayback || ''],
        ['Sinkronisasi Tanggal & Jam Sistem', 'Sesuai Waktu Aktual (WIB)', getMark(d.ntpSystemTime), d.ntpSystemTime || '']
    ];

    const execDate = form.maintenance_date ? new Date(form.maintenance_date).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID');

    autoTable(doc, {
        startY: 58,
        theme: 'grid',
        head: [
            [
                { content: 'ITEMS PEMERIKSAAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'STANDARD', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: `Tanggal Cek : ${execDate}`, colSpan: 2, styles: { halign: 'center' } }
            ],
            [
                { content: 'Mark', styles: { halign: 'center' } },
                { content: 'Hasil / Catatan', styles: { halign: 'center' } }
            ]
        ],
        body: tableBody,
        styles: { fontSize: 8, cellPadding: 1.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 65 },
            1: { cellWidth: 50 },
            2: { cellWidth: 14, halign: 'center', font: 'helvetica' },
            3: { cellWidth: 'auto' }
        },
        margin: { top: 58, left: 10, right: 10, bottom: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(8);
    doc.text("Catatan / Temuan", 10, finalY);
    doc.text(`: ${d.notes || '-'}`, 45, finalY);
    doc.text("Kondisi Sebelum", 10, finalY + 5);
    doc.text(`: ${form.condition_before || 'Normal / Berfungsi'}`, 45, finalY + 5);
    doc.text("Kondisi Sesudah", 10, finalY + 10);
    doc.text(`: ${form.condition_after || 'Bersih & Normal'}`, 45, finalY + 10);

    const boxY = finalY + 15;
    doc.rect(10, boxY, 90, 20);
    doc.rect(100, boxY, 90, 20);
    doc.text("Nama / Paraf ICT Support", 12, boxY + 18);
    doc.text(`: ${form.pic_name || 'ICT Team'}`, 45, boxY + 18);

    if (d.sign_technician) {
        doc.addImage(d.sign_technician, 'PNG', 50, boxY + 2, 24, 13.5);
    } else if (defaultTechSig) {
        doc.addImage(defaultTechSig, 'PNG', 50, boxY + 2, 24, 13.5);
    }

    doc.text("Diketahui", 122.5, boxY + 4, { align: "center" });
    doc.text("Diperiksa", 167.5, boxY + 4, { align: "center" });
    doc.setFontSize(7);
    doc.text("Digital Verified", 122.5, boxY + 10, { align: "center" });
    doc.text("Digital Verified", 167.5, boxY + 10, { align: "center" });
    doc.line(100, boxY + 14, 190, boxY + 14);
    doc.line(145, boxY, 145, boxY + 20);

    const docId = await getDocId('doc_network', 'TCFSG-FM-ICT-01-05');
    doc.text(`${docId} (CCTV Surveillance Checksheet - Non-KPI)`, 10, 285);
    doc.text("Mark Legend:   Baik: v    Rusak/Adjust: X", 100, 285);

    if (mode === 'download') {
        doc.save(`CCTV_Maintenance_${asset.inventory_number || asset.code || asset.id}_${form.week_key || ''}.pdf`);
    } else {
        window.open(doc.output('bloburl'), '_blank');
    }
};


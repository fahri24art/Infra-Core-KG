import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';
import ttdTechnisi from '../assets/WhatsApp_Image_2026-06-30_at_13.35.24-removebg-preview.png';
import { getDocId } from './documents';

const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

export const generatePhonePdf = async (asset, form, mode) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setLineWidth(0.3);
    doc.rect(10, 10, pageWidth - 20, 25);
    doc.line(40, 17, pageWidth - 10, 17);
    doc.line(40, 10, 40, 35); 

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("PT. Tri Centrum Fortuna", pageWidth / 2, 14, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CHECK SHEET PEMELIHARAAN SMARTPHONE / TABLET", pageWidth / 2, 23, { align: "center" });

    const imgData = await loadImage(logoTCF);
    if (imgData) doc.addImage(imgData, 'PNG', 12, 11, 26, 23);
    
    const defaultTechSig = await loadImage(ttdTechnisi);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    let currentY = 39;
    const col1X = 10;
    const col2X = 35;
    const col3X = 95;
    const col4X = 120;
    
    // Row 1
    doc.text("Departemen", col1X, currentY);
    doc.text(": ICT", col2X, currentY);
    
    // Row 2
    currentY += 5;
    doc.text("Nama Pemakai", col1X, currentY);
    doc.text(`: ${asset.user_name || asset.user || 'END USER'}`, col2X, currentY);
    doc.text("Kode Asset", col3X, currentY);
    doc.text(`: ${asset.code || asset.inventory_number || '-'}`, col4X, currentY);
    
    // Row 3
    currentY += 5;
    doc.text("Frekuensi", col1X, currentY);
    doc.text(": 1x Per Enam Bulan", col2X, currentY);
    doc.text("Jenis", col3X, currentY);
    doc.text(`: [X] Smartphone / Tablet    [ ] Lainnya`, col4X, currentY);

    // Row 4
    currentY += 5;
    doc.text("Tahun", col1X, currentY);
    doc.text(`: ${mode === 'view' ? '' : (form.year || new Date().getFullYear())}`, col2X, currentY);
    doc.text("Lokasi", col3X, currentY);
    doc.text(`: ${asset.location || 'PT. Tri Centrum Fortuna Plant Sadang'}`, col4X, currentY);

    const getMark = (val) => {
        if (!val || typeof val !== 'string') return '';
        if (val.includes('Perbaikan') || val.includes('Rusak') || val.includes('Error') || val.includes('Buruk')) return 'X';
        if (val.includes('N/A')) return '-';
        return 'v';
    };

    let d = form.checksheet_data || {};
    if ((d.System === 'Auto Verified' || Object.keys(d).length < 3) && !d.fisik) {
        d = {
            fisik: 'Bersih & Normal',
            layar: 'Bening & Touch Responsif',
            baterai: 'Normal / Tidak Kembung',
            charger: 'Berfungsi Normal',
            jaringan: 'Wifi & Seluler Konek',
            kamera: 'Hasil Jelas / Fokus',
            suara: 'Speaker & Mic Jelas',
            aplikasi: 'Berjalan Normal'
        };
    }
    
    
    const tableBody = [
        [{ content: 'HARDWARE & FISIK', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ['Fisik Body & Casing', 'Bersih & Normal', getMark(d.fisik), ''],
        ['Layar / Touchscreen', 'Bening & Touch Responsif', getMark(d.layar), ''],
        ['Baterai (Health / Ketahanan)', 'Normal / Tidak Kembung', getMark(d.baterai), ''],
        ['Konektor & Charger', 'Berfungsi Normal', getMark(d.charger), ''],
        [{ content: 'SISTEM & KONEKTIVITAS', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ['Koneksi Jaringan (Wifi/Seluler)', 'Wifi & Seluler Konek', getMark(d.jaringan), ''],
        ['Kamera (Depan / Belakang)', 'Hasil Jelas / Fokus', getMark(d.kamera), ''],
        ['Speaker & Microphone', 'Speaker & Mic Jelas', getMark(d.suara), ''],
        ['Aplikasi Standar (WA, Email)', 'Berjalan Normal', getMark(d.aplikasi), '']
    ];

    autoTable(doc, {
        startY: 58,
        theme: 'grid',
        head: [
            [
                { content: 'ITEMS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'STANDARD', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: `Semester 1 Tgl : ${form.checked_at ? new Date(form.checked_at).toLocaleDateString() : new Date().toLocaleDateString('id-ID')}`, colSpan: 2, styles: { halign: 'center' } }
            ],
            [
                { content: 'Mark', styles: { halign: 'center' } },
                { content: 'Catatan', styles: { halign: 'center' } }
            ]
        ],
        body: tableBody,
        styles: { fontSize: 8, cellPadding: 1.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 50 },
            2: { cellWidth: 15, halign: 'center', font: 'helvetica' },
            3: { cellWidth: 'auto' }
        },
        margin: { top: 58, left: 10, right: 10, bottom: 10 }
    });

    let finalY = doc.lastAutoTable.finalY + 5;
    
    doc.setFontSize(8);
    doc.text("Lama Pemeriksaan ( Jam )", 10, finalY);
    doc.text(":", 45, finalY);
    
    doc.text("Kondisi Sebelum", 10, finalY + 5);
    doc.text(`: ${form.condition_before || ''}`, 45, finalY + 5);
    
    doc.text("Kondisi Sesudah", 10, finalY + 10);
    doc.text(`: ${form.condition_after || ''}`, 45, finalY + 10);

    const boxY = finalY + 15;
    doc.rect(10, boxY, 90, 20); // Left box
    doc.rect(100, boxY, 90, 20); // Right box

    doc.text("Nama / Paraf ICT Support", 12, boxY + 18);
    doc.text(":", 45, boxY + 18);
    
    if (d.sign_technician) {
        doc.addImage(d.sign_technician, 'PNG', 50, boxY + 2, 24, 13.5);
    } else if (defaultTechSig) {
        doc.addImage(defaultTechSig, 'PNG', 50, boxY + 2, 24, 13.5);
    }
    
    doc.setFontSize(8);
    doc.text("Diketahui", 122.5, boxY + 4, { align: "center" });
    doc.text("Diperiksa", 167.5, boxY + 4, { align: "center" });
    
    if (d.sign_manager) {
        doc.addImage(d.sign_manager, 'PNG', 112.5, boxY + 5, 20, 11.25);
    } else {
        doc.setFontSize(7);
        doc.text("Konfirmasi Digital", 122.5, boxY + 9, { align: "center" });
        doc.text("via WhatsApp", 122.5, boxY + 12, { align: "center" });
    }
    
    if (d.sign_user) {
        doc.addImage(d.sign_user, 'PNG', 157.5, boxY + 5, 20, 11.25);
    } else {
        doc.setFontSize(7);
        doc.text("Konfirmasi Digital", 167.5, boxY + 9, { align: "center" });
        doc.text("via WhatsApp", 167.5, boxY + 12, { align: "center" });
    }
    
    doc.line(100, boxY + 14, 190, boxY + 14);
    doc.line(145, boxY, 145, boxY + 20);
    
    doc.setFontSize(7);
    const docId = await getDocId('doc_phone', 'TCFSG-FM-ICT-01-07');
    doc.text(`${docId} (Rev. 01, 11 Maret 2025)`, 10, 285);
    doc.text("Mark Legend:   Baik: v    Rusak: X", 100, 285);

    if (mode === 'download') {
        doc.save(`Phone_Maintenance_${asset.code}_${form.week_key}.pdf`);
    } else {
        const pdfUrl = doc.output('bloburl');
        window.open(pdfUrl, '_blank');
    }
};

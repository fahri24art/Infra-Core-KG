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

export const generateAssetHistoryPdf = async (asset, historyLogs, action = 'download') => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
    
    // --- Header ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    addSopHeader(doc, pageWidth, "History Perangkat ICT", "TCFSG-FM-ICT-03-03", "01", "01 Oktober 2021", "1 dari 1", imgData);

    // --- Info Box ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    
    doc.text("Nama Perangkat", 10, 45);
    doc.text(`: ${asset.name || '-'}`, 50, 45);
    
    doc.text("Kategori", 10, 50);
    doc.text(`: ${asset.category || '-'}`, 50, 50);

    doc.text("User / PIC", pageWidth / 2, 45);
    doc.text(`: ${asset.user_name || '-'}`, (pageWidth / 2) + 30, 45);

    doc.text("Departemen", pageWidth / 2, 50);
    doc.text(`: ${asset.department || '-'}`, (pageWidth / 2) + 30, 50);

    // --- Table Data ---
    const logsArray = Array.isArray(historyLogs) ? historyLogs : [];
    // If it's a blank form, generate 15 empty rows
    const tableBody = logsArray.length > 0 ? logsArray.map((log, index) => [
        index + 1,
        new Date(log.date || log.created_at || new Date()).toLocaleDateString(),
        log.type || log.event_type || 'Activity',
        log.description || log.message || log.details || '-',
        log.user || log.user_name || log.performed_by || 'System'
    ]) : Array(15).fill(['', '', '', '', '']);

    autoTable(doc, {
        startY: 60,
        head: [['No', 'Tanggal', 'Jenis Aktivitas', 'Keterangan', 'Dilakukan Oleh']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8, cellPadding: 3, lineWidth: 0.1, lineColor: [150, 150, 150], minCellHeight: 8 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 25 },
            2: { cellWidth: 35 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 35 }
        }
    });

    if (action === 'download') {
        doc.save(`History_${asset.name || asset.id || 'Blank'}.pdf`);
    } else {
        const pdfUrl = doc.output('bloburl');
        window.open(pdfUrl, '_blank');
    }
};

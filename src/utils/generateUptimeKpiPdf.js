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

export const generateUptimeKpiPdf = async (serverData, ispData, year, action = 'download') => {
    const doc = new jsPDF('p', 'mm', 'a4'); 
    
    // --- Header ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    addSopHeader(doc, pageWidth, "Laporan Pencapaian KPI Jaringan & Server", "TCFSG-FM-ICT-06-02", "01", "01 Oktober 2021", "1 dari 1", imgData);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

    // --- Server Uptime Section ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`1. KPI Uptime Server & Sistem (Tahun ${year})`, 10, 45);
    
    const serverBody = serverData.map(m => [
        monthNames[m.month - 1],
        m.total_minutes ? `${m.total_minutes} Menit` : '-',
        m.uptime_minutes ? `${m.uptime_minutes} Menit` : '-',
        m.percentage ? `${m.percentage}%` : '0%'
    ]);

    autoTable(doc, {
        startY: 50,
        head: [['Bulan', 'Total Waktu (Menit)', 'Uptime Server (Menit)', 'Persentase']],
        body: serverBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 50, halign: 'center' },
            2: { cellWidth: 50, halign: 'center' },
            3: { cellWidth: 'auto', halign: 'center' }
        },
    });

    // --- ISP Bandwidth Section ---
    const nextY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`2. KPI Uptime Jaringan Internet (Tahun ${year})`, 10, nextY);

    const ispBody = ispData.map(m => [
        monthNames[m.month - 1],
        m.iforte_uptime ? `${m.iforte_uptime} Menit` : '0',
        m.comnet_uptime ? `${m.comnet_uptime} Menit` : '0',
        m.percentage ? `${m.percentage}%` : '0%'
    ]);

    autoTable(doc, {
        startY: nextY + 5,
        head: [['Bulan', 'Uptime ISP 1 (Menit)', 'Uptime ISP 2 (Menit)', 'Rata-rata Persentase']],
        body: ispBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 50, halign: 'center' },
            2: { cellWidth: 50, halign: 'center' },
            3: { cellWidth: 'auto', halign: 'center' }
        },
    });

    // --- Signatures ---
    const finalY = doc.lastAutoTable.finalY || 50;
    if (finalY + 40 < doc.internal.pageSize.getHeight()) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        doc.text("Dibuat Oleh,", 40, finalY + 15, { align: 'center' });
        doc.text("Diketahui Oleh,", pageWidth - 40, finalY + 15, { align: 'center' });
        
        doc.line(20, finalY + 35, 60, finalY + 35);
        doc.line(pageWidth - 60, finalY + 35, pageWidth - 20, finalY + 35);
        
        doc.text("Admin System", 40, finalY + 40, { align: 'center' });
        doc.text("Manager ICT", pageWidth - 40, finalY + 40, { align: 'center' });
    }

    if (action === 'preview') {
        window.open(doc.output('bloburl'), '_blank');
    } else {
        doc.save(`Laporan_KPI_Uptime_Jaringan_${year}.pdf`);
    }
};

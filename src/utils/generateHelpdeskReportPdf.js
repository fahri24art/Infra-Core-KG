import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';
import { addSopHeader } from './sopHeader';
import { getDocId } from './documents';

const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

export const generateHelpdeskReportPdf = async (tickets, month, year, action = 'download') => {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    
    // --- Header ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    const docNo = await getDocId('doc_ticket', 'TCFSG-FM-ICT-03-04');
    addSopHeader(doc, pageWidth, "Laporan Helpdesk IT", docNo, "01", "01 Oktober 2021", "1 dari 1", imgData);
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    // --- Summary Box ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    
    const resolved = tickets.filter(t => ['Closed', 'Resolved', 'Selesai'].includes(t.status)).length;
    doc.text(`Total Tiket Masuk: ${tickets.length}`, 10, 45);
    doc.text(`Tiket Diselesaikan: ${resolved}`, 60, 45);
    
    // --- Table Data ---
    const tableBody = tickets.map((t, index) => [
        index + 1,
        t.id || t.internal_id || '-',
        new Date(t.created_at).toLocaleDateString('id-ID'),
        t.user_name || '-',
        t.category || '-',
        t.subject || t.description || '-',
        t.status || '-',
        t.updated_at ? new Date(t.updated_at).toLocaleDateString('id-ID') : '-'
    ]);

    autoTable(doc, {
        startY: 50,
        head: [['No', 'ID Tiket', 'Tanggal', 'Pelapor', 'Kategori', 'Deskripsi/Subject', 'Status', 'Selesai']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 20 },
            2: { cellWidth: 25 },
            3: { cellWidth: 35 },
            4: { cellWidth: 30 },
            5: { cellWidth: 'auto' },
            6: { cellWidth: 20, halign: 'center' },
            7: { cellWidth: 25 }
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
        doc.save(`IT_Helpdesk_${monthNames[month - 1]}_${year}.pdf`);
    }
};

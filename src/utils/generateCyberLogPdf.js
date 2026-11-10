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

export const generateCyberLogPdf = async (logs, month, year, action = 'download') => {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    
    // --- Header ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    addSopHeader(doc, pageWidth, "Log Cyber Attack", "TCFSG-FM-ICT-04-01", "01", "01 Oktober 2021", "1 dari 1", imgData);
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    // --- Summary Box ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    
    doc.text(`Total Insiden Terdeteksi: ${logs.length}`, 10, 45);
    
    // --- Table Data ---
    const tableBody = logs.map((log, index) => [
        index + 1,
        new Date(log.timestamp).toLocaleString('id-ID'),
        log.rule_description || log.description || '-',
        log.rule_level || log.level || '-',
        log.agent_name || log.source_ip || '-',
        'Blocked / Monitored'
    ]);

    autoTable(doc, {
        startY: 50,
        head: [['No', 'Waktu Kejadian', 'Deskripsi Serangan/Alert', 'Level', 'Target/Sumber', 'Status Tindakan']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 35 },
            5: { cellWidth: 30 }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                const level = parseInt(data.cell.raw);
                if (level >= 10) doc.setTextColor(255, 0, 0); // High level red
                else if (level >= 5) doc.setTextColor(200, 100, 0); // Medium orange
                else doc.setTextColor(0, 0, 0);
            }
        }
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
        doc.save(`Log_Cyber_Attack_${monthNames[month - 1]}_${year}.pdf`);
    }
};

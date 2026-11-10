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

export const generateMaintenanceExecutionPdf = async (executions = [], month = new Date().getMonth() + 1, year = new Date().getFullYear(), action = 'download') => {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    
    // --- Header ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    addSopHeader(doc, pageWidth, "Pelaksanaan Pemeliharaan PC dan Notebook", "TCFSG-FM-ICT-01-02", "01", "01 Oktober 2021", "1 dari 1", imgData);

    // --- Summary Box ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    doc.text(`Periode Pelaksanaan: ${monthNames[month - 1]} ${year}`, 10, 45);
    
    // --- Table Data ---
    let tableBody = [];
    if (executions && executions.length > 0) {
        tableBody = executions.map((e, index) => [
            index + 1,
            e.date ? new Date(e.date).toLocaleDateString('id-ID') : '-',
            e.code || '-',
            e.department || '-',
            e.pic || '-',
            e.hardware_status || 'OK',
            e.software_status || 'OK',
            e.notes || '-'
        ]);
    } else {
        // Blank template
        for(let i = 1; i <= 10; i++) {
            tableBody.push([i, '', '', '', '', '', '', '']);
        }
    }

    autoTable(doc, {
        startY: 50,
        head: [['No', 'Tanggal', 'Kode Aset', 'Departemen', 'User/PIC', 'Status Hardware', 'Status Software', 'Keterangan / Tindakan']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 25 },
            2: { cellWidth: 35 },
            3: { cellWidth: 30 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30, halign: 'center' },
            6: { cellWidth: 30, halign: 'center' },
            7: { cellWidth: 'auto' }
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
        doc.save(`Pelaksanaan_Pemeliharaan_${monthNames[month - 1]}_${year}.pdf`);
    }
};

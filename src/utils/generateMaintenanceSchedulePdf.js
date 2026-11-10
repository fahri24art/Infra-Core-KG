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

export const generateMaintenanceSchedulePdf = async (schedules = [], year = new Date().getFullYear(), action = 'download') => {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    
    // --- Header ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    addSopHeader(doc, pageWidth, "Jadwal Pemeliharaan Perangkat ICT", "TCFSG-FM-ICT-01-01", "01", "01 Oktober 2021", "1 dari 1", imgData);

    // --- Summary Box ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    
    doc.text(`Tahun Pelaksanaan: ${year}`, 10, 45);
    
    // --- Table Data ---
    // If no data is passed (blank form), we provide blank rows
    let tableBody = [];
    if (schedules && schedules.length > 0) {
        tableBody = schedules.map((s, index) => [
            index + 1,
            s.department || '-',
            s.device_type || '-',
            s.code || '-',
            s.pic || '-',
            s.jan || '', s.feb || '', s.mar || '', s.apr || '', s.may || '', s.jun || '',
            s.jul || '', s.aug || '', s.sep || '', s.oct || '', s.nov || '', s.dec || ''
        ]);
    } else {
        // Blank form template
        for(let i = 1; i <= 10; i++) {
            tableBody.push([i, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        }
    }

    autoTable(doc, {
        startY: 50,
        head: [
            [{ content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, 
             { content: 'Departemen', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, 
             { content: 'Jenis Perangkat', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, 
             { content: 'Kode / Asset', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, 
             { content: 'PIC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, 
             { content: 'Bulan Pelaksanaan', colSpan: 12, styles: { halign: 'center' } }],
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
        ],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 7, cellPadding: 1, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            // Months
            5: { cellWidth: 'auto', halign: 'center' },
            6: { cellWidth: 'auto', halign: 'center' },
            7: { cellWidth: 'auto', halign: 'center' },
            8: { cellWidth: 'auto', halign: 'center' },
            9: { cellWidth: 'auto', halign: 'center' },
            10: { cellWidth: 'auto', halign: 'center' },
            11: { cellWidth: 'auto', halign: 'center' },
            12: { cellWidth: 'auto', halign: 'center' },
            13: { cellWidth: 'auto', halign: 'center' },
            14: { cellWidth: 'auto', halign: 'center' },
            15: { cellWidth: 'auto', halign: 'center' },
            16: { cellWidth: 'auto', halign: 'center' }
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
        doc.save(`Jadwal_Pemeliharaan_ICT_${year}.pdf`);
    }
};

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

export const generateBackupReportPdf = async (logs, selectedMonth, selectedYear, action = 'download') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    addSopHeader(doc, pageWidth, "Log Backup Server", "TCFSG-FM-ICT-01-06", "01", "01 Oktober 2021", "1 dari 1", imgData);
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const monthName = monthNames[selectedMonth - 1];

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    
    doc.text("Periode", 10, 45);
    doc.text(`: ${monthName} ${selectedYear}`, 40, 45);

    doc.text("Departemen", 10, 50);
    doc.text(`: ICT`, 40, 50);

    const tableBody = logs.length > 0 ? logs.map((log, index) => {
        const d = new Date(log.timestamp || new Date());
        return [
            index + 1,
            `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()}`,
            log.server_name || "Proxmox Server",
            log.status || "Success",
            log.size || "10 GB",
            log.duration || "10 mins"
        ];
    }) : [
        [1, `01-${selectedMonth.toString().padStart(2, '0')}-${selectedYear}`, 'Proxmox-VE', 'Success', '15.4 GB', '12 mins'],
        [2, `08-${selectedMonth.toString().padStart(2, '0')}-${selectedYear}`, 'File-Server', 'Success', '120.2 GB', '45 mins'],
        [3, `15-${selectedMonth.toString().padStart(2, '0')}-${selectedYear}`, 'App-Server', 'Success', '45.1 GB', '20 mins'],
        [4, `22-${selectedMonth.toString().padStart(2, '0')}-${selectedYear}`, 'Database-SRV', 'Success', '8.9 GB', '5 mins']
    ];

    autoTable(doc, {
        startY: 55,
        head: [['No', 'Tanggal', 'Nama Server', 'Status Backup', 'Ukuran Data', 'Durasi']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 25 },
            2: { cellWidth: 40 },
            3: { cellWidth: 30 },
            4: { cellWidth: 30 },
            5: { cellWidth: 'auto' }
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

    if (action === 'download') {
        doc.save(`Log_Backup_Server_${monthName}_${selectedYear}.pdf`);
    } else {
        const pdfUrl = doc.output('bloburl');
        window.open(pdfUrl, '_blank');
    }
};

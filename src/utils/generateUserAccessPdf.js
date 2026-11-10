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

export const generateUserAccessPdf = async (users, action = 'download') => {
    const doc = new jsPDF('p', 'mm', 'a4'); 
    
    // --- Header ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    // Standard SOP header for User Access List. Number might be generic if not assigned.
    addSopHeader(doc, pageWidth, "Laporan Daftar Hak Akses Pengguna", "TCFSG-FM-ICT-06-01", "01", "01 Oktober 2021", "1 dari 1", imgData);

    // --- Summary Box ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    
    doc.text(`Total Pengguna Terdaftar: ${users.length}`, 10, 45);
    
    // --- Table Data ---
    const tableBody = users.map((u, index) => [
        index + 1,
        u.name || '-',
        u.username || u.employee_id || '-',
        u.department || '-',
        u.role || 'user',
        'Aktif' // Assuming all fetched users are active
    ]);

    autoTable(doc, {
        startY: 50,
        head: [['No', 'Nama Lengkap', 'ID Pengguna', 'Departemen', 'Hak Akses (Role)', 'Status']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [150, 150, 150] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35 },
            3: { cellWidth: 40 },
            4: { cellWidth: 35, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' }
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
        doc.save(`Daftar_Hak_Akses_Pengguna_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.pdf`);
    }
};

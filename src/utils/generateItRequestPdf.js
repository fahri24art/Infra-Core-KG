import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateItRequestPdf = (action = 'preview') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    // HEADER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("FORMULIR PERMINTAAN PERANGKAT ICT", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const org = (typeof window !== 'undefined' && sessionStorage.getItem('organization')) || 'TCF-SG';
    const isKG = org.toUpperCase().includes('KG');
    const plantCode = isKG ? 'TCFKG' : 'TCFSG';
    doc.text(`No. Dokumen: ${plantCode}-FM-ICT-03-04  |  No. Registrasi: ${plantCode}-REQ-............`, 105, 26, { align: 'center' });

    doc.line(14, 30, 196, 30);
    doc.setLineWidth(0.5);
    doc.line(14, 31, 196, 31);

    // IDENTITAS PEMOHON
    doc.setFont("helvetica", "bold");
    doc.text("A. IDENTITAS PEMOHON", 14, 40);
    
    doc.setFont("helvetica", "normal");
    doc.autoTable({
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        body: [
            ['Nama Pemohon', ': .....................................................', 'Departemen', ': .....................................................'],
            ['Jabatan', ': .....................................................', 'Tanggal Permintaan', ': .....................................................']
        ],
        columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold' },
            1: { cellWidth: 60 },
            2: { cellWidth: 30, fontStyle: 'bold' },
            3: { cellWidth: 60 }
        }
    });

    // DETAIL PERMINTAAN
    let currentY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("B. DETAIL PERMINTAAN", 14, currentY);

    doc.autoTable({
        startY: currentY + 5,
        theme: 'grid',
        head: [['No', 'Nama Perangkat / Software / Consumable', 'Jumlah', 'Spesifikasi / Keterangan']],
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
        body: [
            ['1', '', '', ''],
            ['2', '', '', ''],
            ['3', '', '', ''],
            ['4', '', '', ''],
        ],
        styles: { minCellHeight: 15, valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 80 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 70 }
        }
    });

    // JUSTIFIKASI / ALASAN
    currentY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("C. JUSTIFIKASI / ALASAN KEBUTUHAN", 14, currentY);
    
    doc.autoTable({
        startY: currentY + 5,
        theme: 'plain',
        styles: { lineWidth: 0.1, lineColor: [0, 0, 0], minCellHeight: 40 },
        body: [['\n\n\n\n']]
    });

    // PERSETUJUAN
    currentY = doc.lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.text("D. PERSETUJUAN", 14, currentY);

    doc.autoTable({
        startY: currentY + 5,
        theme: 'grid',
        head: [['Pemohon', 'Mengetahui (Manager Dept)', 'Diperiksa (Manager IT)', 'Disetujui (Plant Manager)']],
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center' },
        body: [
            ['', '', '', '']
        ],
        styles: { minCellHeight: 35, valign: 'bottom', halign: 'center' },
        bodyStyles: { fontStyle: 'bold' }
    });

    // Add note for signatures
    currentY = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("*Dokumen ini harus ditandatangani basah atau digital sebelum diproses oleh Departemen IT.", 14, currentY);

    if (action === 'preview') {
        const pdfUrl = doc.output('bloburl');
        window.open(pdfUrl, '_blank');
    } else {
        doc.save('Form_Permintaan_Perangkat_ICT.pdf');
    }
};

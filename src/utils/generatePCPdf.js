import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';
import { addSopHeader } from './sopHeader';
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

export const generatePCPdf = async (asset, form, mode, docType = 'pemeliharaan', newWindow = null) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // --- Header Configuration ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgData = await loadImage(logoTCF);
    const titleText = docType === 'perbaikan' 
        ? "CHECK SHEET PERBAIKAN PC / LAPTOP" 
        : "CHECK SHEET PEMELIHARAAN PC / LAPTOP";
    addSopHeader(doc, pageWidth, titleText, "TCFSG-FM-ICT-01-03", "01", "01 Oktober 2021", "1 dari 1", imgData);
    
    const defaultTechSig = await loadImage(ttdTechnisi);

    // Meta Information
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    let currentY = 39;
    const col1X = 10;
    const col2X = 35;
    const col3X = 95;
    const col4X = 120;
    
    // Row 1
    doc.text("Departemen", col1X, currentY);
    doc.text(`: ${asset.user_department || asset.department || 'ICT'}`, col2X, currentY);
    
    // Row 2
    currentY += 5;
    doc.text("Nama Pemakai", col1X, currentY);
    doc.text(`: ${asset.user_name || 'END USER'}`, col2X, currentY);
    doc.text("Kode Asset", col3X, currentY);
    doc.text(`: ${asset.code || asset.inventory_number || '-'}`, col4X, currentY);
    
    // Row 3
    currentY += 5;
    doc.text("Frekuensi", col1X, currentY);
    doc.text(": 1x Per Enam Bulan", col2X, currentY);
    doc.text("Jenis", col3X, currentY);
    const catStr = (asset.category || '').toLowerCase();
    const isLaptop = catStr.includes('laptop') || catStr.includes('notebook') || catStr.includes('macbook');
    const isPC = !isLaptop;
    doc.text(`: [${isPC ? 'X' : ' '}] PC    [${isLaptop ? 'X' : ' '}] Laptop`, col4X, currentY);

    // Row 4
    currentY += 5;
    doc.text("Tahun", col1X, currentY);
    doc.text(`: ${form.year || new Date().getFullYear()}`, col2X, currentY);
    doc.text("Lokasi", col3X, currentY);
    doc.text(`: ${asset.user_department || asset.department || 'ICT'}`, col4X, currentY);


    let d = form.checksheet_data || {};
    const getMarkObj = (val) => {
        if (!val) return { date: '', note: '', mark: '' };
        if (typeof val === 'string') {
            if (val.includes('Perbaikan') || val.includes('Rusak') || val.includes('Missing')) return { date: '', note: val, mark: 'X' };
            if (val.includes('N/A')) return { date: '', note: val, mark: '-' };
            return { date: '', note: val, mark: 'v' };
        }
        return val; // It's already the object { date, note, mark }
    };

    const row = (name, std, key) => {
        const obj = getMarkObj(d[key]);
        // Default to OK ('v') if it's perbaikan mode but no issue reported for this specific part, or empty if pure view
        let finalMark = obj.mark;
        if (!finalMark && Object.keys(d).length > 0) finalMark = 'v';
        
        return [name, std, obj.date || '', finalMark, obj.note || ''];
    };

    const tableBody = [
        [{ content: 'HARDWARE', colSpan: 5, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        row('Kondisi fisik (body, keyboard, layar, port)', 'Bersih & Berfungsi Normal', 'conditionBody'),
        row('Motherboard & Slot', 'Bersih & Berfungsi Normal', 'motherboardSlot'),
        row('SDRAM / DDRAM', 'Bersih & Berfungsi Normal', 'sdram'),
        row('Hard Disk Drive ( HDD )', 'Defrag & No Bad Sector', 'hardDisk'),
        row('All Drive ( CDR / DVDR / Floppy )', 'Bersih & Berfungsi Normal', 'allDrive'),
        row('Onboard & Extension Card\\n( NIC, VGA, Sound, etc )', 'Bersih & Berfungsi Normal', 'expansionCard'),
        row('Onboard & Extension Port\\n( USB, LPT, COM, PS2 )', 'Bersih & Berfungsi Normal', 'expansionPort'),
        row('Fan\\n( Processor, Casing, VGA )', 'Bersih & Berfungsi Normal', 'fan'),
        row('Cabling Dalam PC\\n( Kabel Power, HDD )', 'Bersih & Rapi', 'cabling'),
        row('Keyboard & Mouse', 'Bersih & Berfungsi Normal', 'keyboardMouse'),
        row('Monitor / LCD', 'Bersih & Berfungsi Normal', 'monitor'),
        row('Mur Pengunci', 'Terpasang Kencang', 'murPengunci'),

        [{ content: 'SOFTWARE', colSpan: 5, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        [{ content: 'Bios', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }],
        row('- CPU Temperatur', '35 - 50 C', 'cpuTemp'),
        row('- MB Temperatur', '25 - 30 C', 'mbTemp'),
        row('- USB Konfigurasi', 'Enable', 'usbConfig'),
        row('- System Date Time', 'Waktu Sesuai', 'systemDate'),
        row('- Password', 'Set Password', 'biosPassword'),
        
        [{ content: 'Operating System (Windows)', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }],
        row('- Temp / Prefetch Folder', 'Bersih Dari File Sampah', 'tempPrefetch'),
        row('- LAN ( IP, Firewall, Workgroup )', 'Setting & Berfungsi Normal', 'lanConfig'),
        row('- Registry', 'Bersih Dari Registry', 'registry'),
        row('- User Account Control', 'Terpassword', 'userAccount'),
        
        [{ content: 'Backup & Recovery', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }],
        row('- Microsoft 365 OneDrive', 'Success', 'backupM365'),
        row('- Local / NAS Backup', 'Success', 'backupLocal'),
        
        [{ content: 'Antivirus', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }],
        row('- Antivirus', 'Antivirus Update', 'antivirus'),

        [{ content: 'General Application', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }],
        row('- Ms. Office', 'Berjalan Normal', 'msOffice'),
        row('- Acrobat Reader', 'Berjalan Normal', 'acrobatReader'),
        row('- Internet Browser ( IE / Firefox )', 'Berjalan Normal', 'internetBrowser'),
        row('- Mail Client', 'Berjalan Normal', 'mailClient'),

        [{ content: 'Design Application ( Optional )', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }],
        row('- Design Apps', 'Berjalan Normal', 'designApps'),

        [{ content: 'Finance Application ( Optional )', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }],
        row('- Finance Apps', 'Berjalan Normal', 'financeApps'),
    ];

    autoTable(doc, {
        startY: 58,
        theme: 'grid',
        head: [
            [
                { content: 'ITEMS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'STANDARD', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: `Semester 1 Tgl : ${form.maintenance_date ? new Date(form.maintenance_date).toLocaleDateString() : new Date().toLocaleDateString('id-ID')}`, colSpan: 3, styles: { halign: 'left' } }
            ],
            [
                { content: 'Tgl & Waktu', styles: { halign: 'center' } },
                { content: 'Mark', styles: { halign: 'center' } },
                { content: 'Catatan', styles: { halign: 'center' } }
            ]
        ],
        body: tableBody,
        styles: { fontSize: 6.5, cellPadding: 0.8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 40 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 10, halign: 'center', font: 'helvetica' },
            4: { cellWidth: 'auto' }
        },
        margin: { top: 58, left: 10, right: 10, bottom: 10 }
    });

    let finalY = doc.lastAutoTable.finalY + 3;
    if (finalY > 260) {
        doc.addPage();
        finalY = 15;
    }


    // --- Footer Section ---
    // Signature Boxes
    const boxY = finalY + 10;
    doc.rect(10, boxY, 90, 20); // Left box
    doc.rect(100, boxY, 90, 20); // Right box

    doc.text("Nama / Paraf ICT Support", 12, boxY + 18);
    doc.text(":", 45, boxY + 18);
    
    if (d.sign_technician) {
        doc.addImage(d.sign_technician, 'PNG', 50, boxY + 2, 24, 13.5);
    } else if (defaultTechSig) {
        doc.addImage(defaultTechSig, 'PNG', 50, boxY + 2, 24, 13.5);
    }
    
    // Left sub-box center = 122.5, Right sub-box center = 167.5
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
    
    doc.line(100, boxY + 14, 190, boxY + 14); // Header line for names
    doc.line(145, boxY, 145, boxY + 20); // Divider between Diketahui / Diperiksa

    // Document Code Bottom Left
    const actualPageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    const docId = await getDocId('doc_pc', 'TCFSG-FM-ICT-01-03');
    doc.text(`${docId}`, 10, actualPageHeight - 5);
    doc.text("Mark Legend:   Baik: v    Rusak: X", 100, actualPageHeight - 5);


    const pdfBlob = doc.output('blob');
    if (newWindow) {
        try {
            const blobUrl = newWindow.URL.createObjectURL(pdfBlob);
            newWindow.document.body.innerHTML = `<iframe src="${blobUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position:absolute;"></iframe>`;
            newWindow.document.title = "Form Perbaikan";
        } catch(e) {
            newWindow.document.body.innerHTML = "Gagal memuat PDF: " + e.message;
        }
    } else {
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
    }
};

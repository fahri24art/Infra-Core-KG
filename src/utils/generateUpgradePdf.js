import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';
import { addTicketHeader } from './ticketHeader';

const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

const getIndonesianDay = (date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
};

const getIndonesianMonth = (date) => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months[date.getMonth()];
};

const formatCurrency = (val) => {
    if (!val) return '................................................';
    const num = parseInt(String(val).replace(/\D/g, ''), 10);
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

export const generateUpgradePdf = async (asset, formData, overrideTicketNo) => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        
        const today = new Date();
        const dateNum = String(today.getDate()).padStart(2, '0');
        const monthNum = String(today.getMonth() + 1).padStart(2, '0');
        const yearNum = today.getFullYear();
        
        // Preload image
        const imgData = await loadImage(logoTCF);

        const yearNumStr = String(yearNum);
        const org = (typeof window !== 'undefined' && sessionStorage.getItem('organization')) || (asset?.organization || 'TCF-SG');
        const isKG = org.toUpperCase().includes('KG') || (asset?.inventory_number || '').toUpperCase().includes('TCFKG');
        const plantCode = isKG ? 'TCFKG' : 'TCFSG';
        const docCode = isKG ? 'TCFKG-FM-ICT-03-04' : 'TCFSG-FM-ICT-03-04';

        const defaultTicketNo = `ICT-${plantCode}-UPG-${yearNumStr}${monthNum}${dateNum}-001`;
        const ticketNo = (formData?.existingTicket && formData.existingTicket.trim())
            ? formData.existingTicket.trim()
            : (overrideTicketNo || defaultTicketNo);

        // Header Box: SOP Permintaan Fasilitas
        if (imgData) {
            addTicketHeader(doc, pageWidth, "FORM PERMINTAAN PERBAIKAN DAN UPGRADE PERANGKAT", docCode, ticketNo, imgData);
        }

        let currentY = 40;
        const dateStr = `${getIndonesianDay(today)}, ${dateNum} ${getIndonesianMonth(today)} ${yearNum}`;

        // Subheader SOP Reference
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text(`Referensi SOP: ${plantCode}-SOP-ICT-03 (Prosedur Pengadaan, Perbaikan & Peremajaan Fasilitas ICT)`, 10, currentY);
        currentY += 4;

        // =========================================================================
        // BAGIAN I: DATA PEMOHON
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("I. DATA PEMOHON & UNIT KERJA", 13, currentY + 3.8);
        currentY += 7;

        autoTable(doc, {
            startY: currentY,
            theme: 'plain',
            body: [
                ['Tanggal Pengajuan', `: ${dateStr}`, 'Departemen Pemohon', `: ${formData.department || '-'}`],
                ['Nama Pemegang Asset', `: ${formData.user_name || '-'}`, 'Jabatan Pemohon', `: ${formData.job_title || '-'}`],
                ['Atasan Langsung', `: ${formData.manager_name || '-'}`, 'Tingkat Prioritas', `: ${formData.priority || 'Normal'}`]
            ],
            styles: { fontSize: 8, cellPadding: 1.2, textColor: [30, 41, 59] },
            columnStyles: {
                0: { cellWidth: 32, fontStyle: 'bold' },
                1: { cellWidth: 63 },
                2: { cellWidth: 35, fontStyle: 'bold' },
                3: { cellWidth: 60 }
            },
            margin: { left: 10, right: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // =========================================================================
        // BAGIAN II: DATA PERANGKAT SAAT INI
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("II. DATA PERANGKAT SAAT INI", 13, currentY + 3.8);
        currentY += 7;

        let jenisStr = asset.category || 'Desktop';
        const brandModel = `${asset.manufacturer || ''} ${asset.model || ''}`.trim() || '-';
        const invAndSn = `${asset.inventory_number || '-'}  /  SN: ${asset.serial_number || '-'}`;

        autoTable(doc, {
            startY: currentY,
            theme: 'plain',
            body: [
                ['No. Asset / SN', `: ${invAndSn}`, 'Kategori / Jenis', `: ${jenisStr}`],
                ['Merk / Model', `: ${brandModel}`, 'Tahun Pembelian', `: ${formData.purchase_year || '-'}`],
                ['Spesifikasi Saat Ini', `: ${formData.current_specs ? formData.current_specs.replace(/\n/g, '  |  ') : '-'}`]
            ],
            styles: { fontSize: 8, cellPadding: 1.2, textColor: [30, 41, 59] },
            columnStyles: {
                0: { cellWidth: 32, fontStyle: 'bold' },
                1: { cellWidth: 63 },
                2: { cellWidth: 35, fontStyle: 'bold' },
                3: { cellWidth: 60 }
            },
            margin: { left: 10, right: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // =========================================================================
        // BAGIAN III: RINCIAN PERMINTAAN UPGRADE
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("III. RINCIAN PERMINTAAN PERBAIKAN / UPGRADE", 13, currentY + 3.8);
        currentY += 7;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold' },
            body: [
                [
                    { content: 'Kendala / Alasan Permintaan', styles: { fontStyle: 'bold', cellWidth: 45 } },
                    { content: formData.justification || '-' }
                ],
                [
                    { content: 'Target Spesifikasi yang Diminta', styles: { fontStyle: 'bold', cellWidth: 45 } },
                    { content: formData.requested_specs || 'Perbaikan / Upgrade Hardware' }
                ]
            ],
            styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59], lineColor: [203, 213, 225], lineWidth: 0.15 },
            margin: { left: 10, right: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // =========================================================================
        // BAGIAN IV: EVALUASI & REKOMENDASI ICT
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("IV. EVALUASI ICT (Diisi oleh Tim IT)", 13, currentY + 3.8);
        currentY += 7;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            body: [
                [
                    { content: 'Rekomendasi Teknisi', styles: { fontStyle: 'bold', cellWidth: 45 } },
                    { content: '[   ] Layak Upgrade           [   ] Rekomendasi Ganti Unit Baru           [   ] Cukup Maintenance Saja' }
                ],
                [
                    { content: 'Catatan Teknisi ICT', styles: { fontStyle: 'bold', cellWidth: 45 } },
                    { content: formData.technician_notes || 'SSD Rusak, Perlu di ganti SSD 256Gb' }
                ],
                [
                    { content: 'Estimasi Biaya', styles: { fontStyle: 'bold', cellWidth: 45 } },
                    { content: formatCurrency(formData.estimated_cost), styles: { fontStyle: 'bold' } }
                ]
            ],
            styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59], lineColor: [203, 213, 225], lineWidth: 0.15 },
            margin: { left: 10, right: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 4;

        // =========================================================================
        // BAGIAN V: OTORISASI & PERSETUJUAN
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("V. PERSETUJUAN & OTORISASI", 13, currentY + 3.8);
        currentY += 7;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            head: [['Pemohon', 'Mengetahui (Atasan)', 'Dievaluasi Oleh', 'Disetujui Oleh']],
            headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], halign: 'center', fontStyle: 'bold', fontSize: 8 },
            body: [
                [
                    `\n\n\n\n( ${formData.user_name || '................................'} )\nStaff Pemohon`,
                    `\n\n\n\n( ${formData.manager_name || '................................'} )\nSect / Dept Head`,
                    `\n\n\n\n( ................................ )\nTeknisi ICT`,
                    `\n\n\n\n( ................................ )\nICT Head`
                ]
            ],
            styles: { minCellHeight: 26, halign: 'center', valign: 'bottom', fontSize: 7.5, textColor: [30, 41, 59], lineColor: [203, 213, 225], lineWidth: 0.15 },
            columnStyles: {
                0: { cellWidth: 47.5 },
                1: { cellWidth: 47.5 },
                2: { cellWidth: 47.5 },
                3: { cellWidth: 47.5 }
            },
            margin: { left: 10, right: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 4;

        // Note section at the bottom
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text("Catatan: Formulir ini merupakan dokumen resmi ICT PT Tri Centrum Fortuna. Setelah ditandatangani,", 10, currentY);
        currentY += 3.5;
        doc.text("harap diserahkan kepada Tim ICT untuk eksekusi perbaikan atau pengajuan estimasi budget ke Finance.", 10, currentY);

        // Save PDF
        doc.save(`Form_Upgrade_${asset.inventory_number || 'Asset'}.pdf`);

    } catch (error) {
        console.error("Error generating Upgrade PDF", error);
    }
};

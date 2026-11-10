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

const formatIDR = (num) => {
    const val = Number(num) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(val);
};

const formatCleanDate = (dateVal) => {
    if (!dateVal) return '-';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal).split('T')[0];
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return String(dateVal).split('T')[0];
    }
};

const formatBreakableText = (str) => {
    if (!str) return '-';
    return String(str)
        .replace(/([^\s])\/([^\s])/g, '$1 / $2')
        .replace(/([^\s]),([^\s])/g, '$1, $2');
};

export const generateDeptBudgetRequestPdf = async ({
    request = null,
    plant = 'SG',
    isBlank = false,
    action = 'download' // 'download' | 'preview'
}) => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const activePlant = request ? (request.plant || plant) : plant;
        const isKG = activePlant === 'KG';
        const formDocNo = isKG ? 'TCFKG-FM-ICT-03-04' : 'TCFSG-FM-ICT-03-04';
        const plantCode = isKG ? 'TCFKG' : 'TCFSG';

        // 1. Header ISO SOP
        const imgData = await loadImage(logoTCF);
        addSopHeader(
            doc,
            pageWidth,
            "FORM PERMINTAAN FASILITAS & BUDGET ICT",
            formDocNo,
            "01",
            "11 Maret 2025",
            "1 dari 1",
            imgData
        );

        // Subheader: No. Registrasi Pengajuan di posisi kiri (menggantikan Referensi Prosedur)
        const reqNoText = isBlank ? `No. Registrasi Pengajuan: ICT-${plantCode}-REQ-............................` : `No. Registrasi Pengajuan: ${request?.req_no || '-'}`;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(reqNoText, 10, 39);

        let currentY = 43;

        // =========================================================================
        // BAGIAN I: DATA PEMOHON & UNIT KERJA
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("I. DATA PEMOHON & UNIT KERJA", 13, currentY + 3.8);

        currentY += 7;

        const reqTitleUpper = (request?.requester_title || request?.requester_role || '').toUpperCase();
        const defaultSuperiorTitle = (reqTitleUpper.includes('HEAD') || reqTitleUpper.includes('DEPT') || reqTitleUpper.includes('MANAGER')) 
            ? 'Direktur' 
            : 'Dept Head User';

        const superiorTitle = (request?.dept_head_title && String(request.dept_head_title).trim()) 
            ? String(request.dept_head_title).trim() 
            : defaultSuperiorTitle;

        const superiorName = (request?.dept_head_name && String(request.dept_head_name).trim()) 
            ? String(request.dept_head_name).trim() 
            : '';

        const dateVal = isBlank ? "..........................................................." : formatCleanDate(request?.date || request?.created_at || new Date());
        const deptVal = isBlank ? "..........................................................." : (request?.department || '-');
        const requesterVal = isBlank ? "..........................................................." : (request?.requester_name || '-');
        const roleVal = isBlank ? "..........................................................." : (request?.requester_title || request?.requester_role || '-');
        const plantLabel = isBlank 
            ? "[   ] Plant Sadang (SG)      [   ] Plant Karawang (KG)" 
            : (activePlant === 'KG' ? "[   ] Plant Sadang (SG)      [ X ] Plant Karawang (KG)" : "[ X ] Plant Sadang (SG)      [   ] Plant Karawang (KG)");
        const targetPeriod = isBlank 
            ? "Tahun: 202......     Bulan: ....................." 
            : `Tahun Anggaran ${request?.target_year || '2027'} - Bulan ${(request?.target_month || 'jan').toUpperCase()}`;

        autoTable(doc, {
            startY: currentY,
            theme: 'plain',
            body: [
                ['Tanggal Pengajuan', `: ${dateVal}`, 'Departemen Pemohon', `: ${deptVal}`],
                ['Nama Pemohon', `: ${requesterVal}`, 'Jabatan / NIK Pemohon', `: ${roleVal}`],
                ['Atasan Mengetahui', `: ${isBlank ? "..........................................................." : (superiorName ? `${superiorName} (${superiorTitle})` : `(Belum Diisi) - ${superiorTitle}`)}`, 'Target Anggaran', `: ${targetPeriod}`],
                ['Plant / Lokasi Kerja', `: ${plantLabel}`, '', '']
            ],
            styles: { fontSize: 7.5, cellPadding: 1.2, textColor: [30, 41, 59] },
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
        // BAGIAN II: KATEGORI KEBUTUHAN FASILITAS ICT (Ukuran huruf lebih kecil & proporsional)
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("II. KLASIFIKASI KEBUTUHAN FASILITAS ICT (Beri Tanda [X] Sesuai Kebutuhan)", 13, currentY + 3.8);

        currentY += 7;

        const categoryKey = request?.category || '';
        const isNew = categoryKey === 'NEW_DEVICE';
        const isReplace = categoryKey === 'REPLACEMENT';
        const isUpgrade = categoryKey === 'UPGRADE_HARDWARE';
        const isSoft = categoryKey === 'SOFTWARE_LICENSE';
        const isNet = categoryKey === 'NETWORK_INFRA';
        const isOther = categoryKey === 'OTHER';

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: [0, 0, 0] },
            body: [
                [
                    `${isNew ? '[ X ]' : '[   ]'} 1. Pembelian Perangkat Baru (PC/Laptop Baru - Capex I-1)`,
                    `${isReplace ? '[ X ]' : '[   ]'} 2. Penggantian Unit Lama/Afkir (Replacement - Capex I-1)`
                ],
                [
                    `${isUpgrade ? '[ X ]' : '[   ]'} 3. Upgrade Hardware (RAM, SSD, GPU, PSU - Opex F2)`,
                    `${isSoft ? '[ X ]' : '[   ]'} 4. Lisensi / Perpanjangan Software (SolidWorks, ZWCAD, O365, Antivirus - Opex F1)`
                ],
                [
                    `${isNet ? '[ X ]' : '[   ]'} 5. Infrastruktur Jaringan, WiFi & CCTV (Capex I-1 / F1)`,
                    `${isOther ? '[ X ]' : '[   ]'} 6. Kebutuhan Fasilitas ICT Lainnya (Printer, Scanner, UPS, dll)`
                ]
            ],
            styles: { fontSize: 6.5, cellPadding: 1.5, textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [203, 213, 225] },
            columnStyles: {
                0: { cellWidth: 95 },
                1: { cellWidth: 95 }
            },
            margin: { left: 10, right: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // =========================================================================
        // BAGIAN III: RINCIAN PERANGKAT / SOFTWARE / SPESIFIKASI YANG DIMINTA
        // Text wrapping rapi tanpa overlap / nabrak kolom
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(7.8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("III. RINCIAN PERANGKAT / SOFTWARE & ESTIMASI BIAYA", 13, currentY + 3.8);

        currentY += 7;

        let tableRows = [];
        if (!isBlank && request) {
            const unitPrice = Number(request.estimated_unit_price) || 0;
            const totalCost = Number(request.estimated_total_cost) || (Number(request.qty) * unitPrice);
            tableRows.push([
                '1',
                formatBreakableText(request.item_name),
                formatBreakableText(request.technical_specs || 'Sesuai Rekomendasi ICT'),
                request.qty || 1,
                request.unit || 'Unit',
                formatIDR(unitPrice),
                formatIDR(totalCost)
            ]);
            tableRows.push([
                '',
                'TOTAL ESTIMASI ANGGARAN (IDR)',
                '',
                '',
                '',
                '',
                formatIDR(totalCost)
            ]);
        } else {
            // Blank rows for manual pen fill
            tableRows = [
                ['1', '', '', '', '', '', ''],
                ['2', '', '', '', '', '', ''],
                ['3', '', '', '', '', '', ''],
                ['4', '', '', '', '', '', ''],
                ['', 'TOTAL ESTIMASI ANGGARAN (IDR)', '', '', '', '', 'Rp0']
            ];
        }

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            head: [['No', 'Nama Perangkat / Software / Komponen', 'Spesifikasi Teknis yang Diperlukan', 'Qty', 'Satuan', 'Estimasi Harga (Rp)', 'Estimasi Total (Rp)']],
            body: tableRows,
            headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 6.8, halign: 'center', valign: 'middle' },
            bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: isBlank ? 2.5 : 1.8, overflow: 'linebreak', valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 47 },
                2: { cellWidth: 58 },
                3: { cellWidth: 10, halign: 'center' },
                4: { cellWidth: 13, halign: 'center' },
                5: { cellWidth: 27, halign: 'right' },
                6: { cellWidth: 27, halign: 'right' }
            },
            margin: { left: 10, right: 10 },
            didParseCell: function (data) {
                if (data.row.index === tableRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // =========================================================================
        // BAGIAN IV: JUSTIFIKASI & ALASAN KEBUTUHAN KERJA
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(7.8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("IV. JUSTIFIKASI KEBUTUHAN & DAMPAK TERHADAP OPERASIONAL", 13, currentY + 3.8);

        currentY += 7;

        autoTable(doc, {
            startY: currentY,
            theme: 'plain',
            body: [[
                isBlank 
                    ? "Alasan / Kegunaan:\n................................................................................................................................................................................................................................\n\nDampak bila tidak dipenuhi:\n................................................................................................................................................................................................................................"
                    : `Alasan / Kegunaan:\n${request?.justification || 'Kebutuhan operasional untuk mendukung kelancaran pekerjaan dan fungsi departemen.'}\n\nDampak bila tidak dipenuhi:\n${request?.operational_impact || 'Proses kerja terhambat dan utilisasi sistem operasional tidak maksimal jika kebutuhan tidak dipenuhi.'}`
            ]],
            styles: { fontSize: 6.8, cellPadding: 1.8, textColor: [30, 41, 59], minCellHeight: isBlank ? 14 : 10, lineWidth: 0.15, lineColor: [203, 213, 225] },
            margin: { left: 10, right: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // =========================================================================
        // BAGIAN V: VERIFIKASI & REKOMENDASI ICT (Diisi oleh Tim ICT - Ukuran huruf lebih kecil)
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("V. VERIFIKASI TEKNIS & REKOMENDASI ICT (Diisi Oleh Tim ICT)", 13, currentY + 3.8);

        currentY += 7;

        const targetForm = request?.target_form || 'I-1';
        const isCapex = targetForm === 'I-1';
        const isF1 = targetForm === 'F1';
        const isF2 = targetForm === 'F2';

        const ictNotes = isBlank 
            ? "Catatan Evaluasi Teknis ICT: ...................................................................................................................................................................................." 
            : `Catatan Evaluasi Teknis ICT: ${request?.review_notes || `Telah diverifikasi sesuai Standard Spesifikasi ${isKG ? 'TCFKG' : 'TCFSG'}-STD-ICT-03-02 dan kelayakan anggaran.`}`;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            body: [
                [
                    `Kesesuaian Standar Spesifikasi (STD-ICT-03-02):\n${!isBlank ? '[ X ]' : '[   ]'} Sesuai Standar    [   ] Penyesuaian Alternatif`,
                    `Ketersediaan Stock Rolling (IK-ICT-03-02):\n[   ] Stock Ready    ${!isBlank ? '[ X ]' : '[   ]'} Pengadaan / Anggaran Baru`
                ],
                [
                    `Rekomendasi Alokasi Formulir Anggaran:\n${isCapex && !isBlank ? '[ X ]' : '[   ]'} Form I-1 (Capex)    ${isF1 && !isBlank ? '[ X ]' : '[   ]'} Form F1 (Mtc)    ${isF2 && !isBlank ? '[ X ]' : '[   ]'} Form F2 (Sparepart)`,
                    ictNotes
                ]
            ],
            styles: { fontSize: 6.2, cellPadding: 1.5, textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [203, 213, 225] },
            columnStyles: {
                0: { cellWidth: 95 },
                1: { cellWidth: 95 }
            },
            margin: { left: 10, right: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // =========================================================================
        // BAGIAN VI: OTORISASI & PERSETUJUAN
        // Kotak diperbesar (minCellHeight: 26), header dirapikan kecil (fontSize: 6.0),
        // tanggal bersih tanpa :00:00.000Z, dan dukungan gambar tanda tangan digital
        // =========================================================================
        doc.setFillColor(241, 245, 249);
        doc.rect(10, currentY, pageWidth - 20, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, currentY, pageWidth - 20, 5.5);

        doc.setFontSize(7.8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`VI. OTORISASI & PERSETUJUAN PLANNING BUDGET`, 13, currentY + 3.8);

        currentY += 7;

        const isApproved = request?.status === 'APPROVED_TO_BUDGET';
        const isVerified = request?.status === 'VERIFIED_ICT' || isApproved;
        const dateFormatted = formatCleanDate(request?.date || request?.created_at || new Date());

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            head: [
                [
                    'Pemohon\n(User)',
                    `Mengetahui\n(${superiorTitle})`,
                    'Diperiksa Teknis\n(Teknisi ICT)',
                    'Diverifikasi\n(Section Head / SPV)',
                    'Disetujui\n(Dept Head ICT)'
                ]
            ],
            headStyles: {
                fillColor: [248, 250, 252],
                textColor: [15, 23, 42],
                fontStyle: 'bold',
                fontSize: 5.6,
                halign: 'center',
                valign: 'middle',
                cellPadding: { top: 0.7, bottom: 0.7, left: 0.5, right: 0.5 },
                minCellHeight: 4.8,
                lineColor: [203, 213, 225],
                lineWidth: 0.15
            },
            bodyStyles: {
                fontSize: 6.2,
                cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
                halign: 'center',
                valign: 'bottom',
                minCellHeight: 34,
                lineColor: [203, 213, 225],
                lineWidth: 0.15
            },
            body: [
                [
                    !isBlank 
                        ? `( ${request?.requester_name || 'Pemohon'} )\nTgl: ${dateFormatted}` 
                        : '\n\n(....................................)\nStaff Pemohon\nTgl: ..../..../202...',
                    !isBlank 
                        ? `( ${superiorName ? superiorName : '....................................'} )\n${superiorTitle}\nTgl: ${dateFormatted}` 
                        : `\n\n(....................................)\n${superiorTitle}\nTgl: ..../..../202...`,
                    !isBlank && isVerified 
                        ? `[ TEKNIS OK ]\n( Teknisi ICT )\nTgl: ${dateFormatted}` 
                        : '\n\n(....................................)\nTeknisi ICT\nTgl: ..../..../202...',
                    !isBlank && isVerified 
                        ? `[ VERIFIED ]\n( ${request?.reviewed_by || 'Hery (SPV ICT)'} )\nTgl: ${dateFormatted}` 
                        : '\n\n(....................................)\nSection Head / SPV\nTgl: ..../..../202...',
                    !isBlank && isApproved 
                        ? `[ APPROVED ]\n( Dept Head ICT )\nTgl: ${dateFormatted}` 
                        : '\n\n(....................................)\nDept Head ICT\nTgl: ..../..../202...'
                ]
            ],
            styles: {
                lineWidth: 0.15,
                lineColor: [203, 213, 225]
            },
            columnStyles: {
                0: { cellWidth: 38 },
                1: { cellWidth: 38 },
                2: { cellWidth: 38 },
                3: { cellWidth: 38 },
                4: { cellWidth: 38 }
            },
            margin: { left: 10, right: 10 }
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // Note regarding Planning Budget vs Purchase Requisition
        doc.setFontSize(6.2);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(71, 85, 105);
        doc.text(
            "*) Catatan: Formulir ini merupakan Lampiran Usulan Planning Budgeting ICT. Otorisasi Direksi / Management berlaku pada form Purchase Requisition (PR) saat realisasi.",
            pageWidth / 2,
            currentY + 2,
            { align: 'center' }
        );

        // Referensi Prosedur (Dipindahkan ke bagian paling bawah form sesuai permintaan)
        doc.setFontSize(6.2);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(
            `Referensi Prosedur: ${isKG ? 'TCFKG' : 'TCFSG'}-SOP-ICT-03 (Permintaan Fasilitas ICT - IATF 16949:2016)`,
            pageWidth / 2,
            currentY + 5.5,
            { align: 'center' }
        );

        // Footer ISO Document Notice
        doc.setFontSize(5.8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(148, 163, 184);
        const footerY = pageHeight - 4;
        doc.text(
            `*Dokumen Resmi Terkontrol PT. TRI CENTRUM FORTUNA - SOP ${isKG ? 'TCFKG' : 'TCFSG'}-SOP-ICT-03 / Form ${formDocNo} Rev 01.`,
            pageWidth / 2,
            footerY,
            { align: 'center' }
        );

        // Output action
        const filename = isBlank 
            ? `Form_Kosong_Permintaan_Budget_ICT_${formDocNo}.pdf` 
            : `Form_Permintaan_Budget_${request?.req_no || 'ICT'}.pdf`;

        if (action === 'preview') {
            const pdfBlob = doc.output('bloburl');
            window.open(pdfBlob, '_blank');
        } else {
            doc.save(filename);
        }

        return true;
    } catch (err) {
        console.error('Error generating Department Budget Request PDF:', err);
        throw err;
    }
};

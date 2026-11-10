import ExcelJS from 'exceljs';

const saveWorkbook = async (workbook, filename) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

const formatIDR = (num) => {
    return Number(num) || 0;
};

// =========================================================================
// 1. EXPORT FORM KOSONG / TERISI EXCEL (TCFSG-FM-ICT-03-04)
// =========================================================================
export const exportDeptBudgetExcel = async ({
    request = null,
    plant = 'SG',
    isBlank = false
}) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT Tri Centrum Fortuna - ICT Department';
    workbook.created = new Date();

    const activePlant = request ? (request.plant || plant) : plant;
    const isKG = activePlant === 'KG';
    const formDocNo = isKG ? 'TCFKG-FM-ICT-03-04' : 'TCFSG-FM-ICT-03-04';
    const sheetTitle = isBlank ? 'Form Permintaan Budget ICT' : (request?.req_no || 'Permintaan Budget');

    const ws = workbook.addWorksheet(sheetTitle.slice(0, 31), {
        views: [{ showGridLines: true }],
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            margins: {
                left: 0.4, right: 0.4,
                top: 0.5, bottom: 0.5,
                header: 0.2, footer: 0.2
            }
        }
    });

    // 7 Columns (A to G) for clear form layout with 5 signature slots (A:B, C, D:E, F, G)
    ws.columns = [
        { width: 5 },   // A: No
        { width: 27 },  // B: Nama Perangkat / Software (A+B = 32 for Col 1 signature)
        { width: 30 },  // C: Spesifikasi Teknis (C = 30 for Col 2 signature)
        { width: 10 },  // D: Qty
        { width: 13 },  // E: Satuan (D+E = 23 for Col 3 signature)
        { width: 22 },  // F: Harga Satuan (F = 22 for Col 4 signature)
        { width: 23 }   // G: Total Biaya (G = 23 for Col 5 signature)
    ];

    const borderThin = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    const borderMedium = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'medium', color: { argb: 'FF000000' } }
    };

    const applyBoxBorder = (startRow, startCol, endRow, endCol) => {
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const cell = ws.getCell(r, c);
                cell.border = {
                    top: r === startRow ? { style: 'medium', color: { argb: 'FF000000' } } : (cell.border?.top || { style: 'thin', color: { argb: 'FFD1D5DB' } }),
                    bottom: r === endRow ? { style: 'medium', color: { argb: 'FF000000' } } : (cell.border?.bottom || { style: 'thin', color: { argb: 'FFD1D5DB' } }),
                    left: c === startCol ? { style: 'medium', color: { argb: 'FF000000' } } : (cell.border?.left || { style: 'thin', color: { argb: 'FFD1D5DB' } }),
                    right: c === endCol ? { style: 'medium', color: { argb: 'FF000000' } } : (cell.border?.right || { style: 'thin', color: { argb: 'FFD1D5DB' } })
                };
            }
        }
    };

    // =========================================================================
    // ROW 1 - 4: OFFICIAL DOCUMENT CONTROL HEADER
    // =========================================================================
    ws.mergeCells('A1:B3');
    const compCell = ws.getCell('A1');
    compCell.value = 'PT. TRI CENTRUM FORTUNA';
    compCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    compCell.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('C1:E3');
    const titleCell = ws.getCell('C1');
    titleCell.value = `FORM PERMINTAAN FASILITAS & BUDGET ICT\n(${isKG ? 'TCFKG' : 'TCFSG'}-SOP-ICT-03 / IATF 16949:2016)`;
    titleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // Doc Control Box on Right
    ws.getCell('F1').value = 'No. Dokumen';
    ws.getCell('F1').font = { name: 'Arial', size: 9, bold: true };
    ws.getCell('G1').value = `: ${formDocNo}`;
    ws.getCell('G1').font = { name: 'Arial', size: 9, bold: true };

    ws.getCell('F2').value = 'Revisi / Tanggal';
    ws.getCell('F2').font = { name: 'Arial', size: 9 };
    ws.getCell('G2').value = ': 01 / 11 Maret 2025';
    ws.getCell('G2').font = { name: 'Arial', size: 9 };

    ws.getCell('F3').value = 'Halaman';
    ws.getCell('F3').font = { name: 'Arial', size: 9 };
    ws.getCell('G3').value = ': 1 dari 1';
    ws.getCell('G3').font = { name: 'Arial', size: 9 };

    // Apply header border
    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 7; c++) {
            ws.getCell(r, c).border = borderThin;
        }
    }
    applyBoxBorder(1, 1, 3, 7);

    // Row 4: Registration Number Subheader
    ws.mergeCells('A4:D4');
    ws.getCell('A4').value = 'Standar Operasional Prosedur Permintaan Fasilitas ICT (Klausul 7.1.3)';
    ws.getCell('A4').font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF64748B' } };
    ws.getCell('A4').alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('E4:G4');
    const reqNoVal = isBlank ? `No. Registrasi: ICT-${plantCode}-REQ-............................` : `No. Registrasi: ${request?.req_no || '-'}`;
    ws.getCell('E4').value = reqNoVal;
    ws.getCell('E4').font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    ws.getCell('E4').alignment = { vertical: 'middle', horizontal: 'right' };

    // =========================================================================
    // SECTION I: DATA PEMOHON & UNIT KERJA (Row 5 - 8)
    // =========================================================================
    ws.mergeCells('A5:G5');
    const sec1 = ws.getCell('A5');
    sec1.value = 'I. DATA PEMOHON & UNIT KERJA';
    sec1.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    sec1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sec1.alignment = { vertical: 'middle', horizontal: 'left' };
    applyBoxBorder(5, 1, 5, 7);

    const dateStr = isBlank ? '..................................................' : (request?.date || new Date().toISOString().slice(0, 10));
    const deptStr = isBlank ? '..................................................' : (request?.department || '-');
    const nameStr = isBlank ? '..................................................' : (request?.requester_name || '-');
    const roleStr = isBlank ? '..................................................' : (request?.requester_title || request?.requester_role || '-');
    const plantStr = isBlank 
        ? '[   ] Plant Sadang (SG)        [   ] Plant Karawang (KG)'
        : (activePlant === 'KG' ? '[   ] Plant Sadang (SG)        [ X ] Plant Karawang (KG)' : '[ X ] Plant Sadang (SG)        [   ] Plant Karawang (KG)');
    const targetStr = isBlank 
        ? 'Tahun: 202......     Bulan: .....................' 
        : `Tahun Anggaran ${request?.target_year || '2027'} - Bulan ${(request?.target_month || 'jan').toUpperCase()}`;

    ws.getCell('A6').value = 'Tanggal Pengajuan';
    ws.getCell('A6').font = { name: 'Arial', size: 8.5, bold: true };
    ws.mergeCells('B6:C6');
    ws.getCell('B6').value = `: ${dateStr}`;

    ws.getCell('D6').value = 'Departemen Pemohon';
    ws.getCell('D6').font = { name: 'Arial', size: 8.5, bold: true };
    ws.mergeCells('E6:G6');
    ws.getCell('E6').value = `: ${deptStr}`;
    ws.getCell('E6').font = { name: 'Arial', size: 8.5, bold: !isBlank };

    ws.getCell('A7').value = 'Nama Pemohon';
    ws.getCell('A7').font = { name: 'Arial', size: 8.5, bold: true };
    ws.mergeCells('B7:C7');
    ws.getCell('B7').value = `: ${nameStr}`;

    ws.getCell('D7').value = 'Jabatan / NIK';
    ws.getCell('D7').font = { name: 'Arial', size: 8.5, bold: true };
    ws.mergeCells('E7:G7');
    ws.getCell('E7').value = `: ${roleStr}`;

    ws.getCell('A8').value = 'Plant / Lokasi Kerja';
    ws.getCell('A8').font = { name: 'Arial', size: 8.5, bold: true };
    ws.mergeCells('B8:C8');
    ws.getCell('B8').value = `: ${plantStr}`;

    ws.getCell('D8').value = 'Alokasi Target Budget';
    ws.getCell('D8').font = { name: 'Arial', size: 8.5, bold: true };
    ws.mergeCells('E8:G8');
    ws.getCell('E8').value = `: ${targetStr}`;

    for (let r = 6; r <= 8; r++) {
        for (let c = 1; c <= 7; c++) {
            ws.getCell(r, c).border = borderThin;
            ws.getCell(r, c).alignment = { vertical: 'middle' };
        }
    }
    applyBoxBorder(6, 1, 8, 7);

    // =========================================================================
    // SECTION II: KLASIFIKASI KEBUTUHAN ICT (Row 9 - 12)
    // =========================================================================
    ws.mergeCells('A9:G9');
    const sec2 = ws.getCell('A9');
    sec2.value = 'II. KLASIFIKASI KEBUTUHAN FASILITAS ICT (Beri Tanda [X] Sesuai Kebutuhan)';
    sec2.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    sec2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sec2.alignment = { vertical: 'middle', horizontal: 'left' };
    applyBoxBorder(9, 1, 9, 7);

    const catKey = request?.category || '';
    const isNew = catKey === 'NEW_DEVICE';
    const isReplace = catKey === 'REPLACEMENT';
    const isUpgrade = catKey === 'UPGRADE_HARDWARE';
    const isSoft = catKey === 'SOFTWARE_LICENSE';
    const isNet = catKey === 'NETWORK_INFRA';
    const isOther = catKey === 'OTHER';

    ws.mergeCells('A10:C10');
    ws.getCell('A10').value = `${isNew ? '[ X ]' : '[   ]'} 1. Pembelian Perangkat Baru (PC/Laptop Baru - Capex I-1)`;
    ws.mergeCells('D10:G10');
    ws.getCell('D10').value = `${isReplace ? '[ X ]' : '[   ]'} 2. Penggantian Unit Lama/Afkir (Replacement - Capex I-1)`;

    ws.mergeCells('A11:C11');
    ws.getCell('A11').value = `${isUpgrade ? '[ X ]' : '[   ]'} 3. Upgrade Hardware (RAM, SSD, GPU, PSU - Opex F2)`;
    ws.mergeCells('D11:G11');
    ws.getCell('D11').value = `${isSoft ? '[ X ]' : '[   ]'} 4. Lisensi / Perpanjangan Software (SolidWorks, ZWCAD, O365 - Opex F1)`;

    ws.mergeCells('A12:C12');
    ws.getCell('A12').value = `${isNet ? '[ X ]' : '[   ]'} 5. Infrastruktur Jaringan, WiFi & CCTV (Capex I-1 / F1)`;
    ws.mergeCells('D12:G12');
    ws.getCell('D12').value = `${isOther ? '[ X ]' : '[   ]'} 6. Kebutuhan Fasilitas ICT Lainnya (Printer, Scanner, UPS, dll)`;

    for (let r = 10; r <= 12; r++) {
        for (let c = 1; c <= 7; c++) {
            const cell = ws.getCell(r, c);
            cell.font = { name: 'Arial', size: 8 };
            cell.alignment = { vertical: 'middle' };
            cell.border = borderThin;
        }
    }
    applyBoxBorder(10, 1, 12, 7);

    // =========================================================================
    // SECTION III: RINCIAN PERANGKAT & ESTIMASI BIAYA (Row 13 - 19)
    // =========================================================================
    ws.mergeCells('A13:G13');
    const sec3 = ws.getCell('A13');
    sec3.value = 'III. RINCIAN PERANGKAT / SOFTWARE & ESTIMASI BIAYA';
    sec3.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    sec3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sec3.alignment = { vertical: 'middle', horizontal: 'left' };
    applyBoxBorder(13, 1, 13, 7);

    // Table Header (Row 14)
    const tableHeaders = [
        'No', 
        'Nama Perangkat / Software / Komponen', 
        'Spesifikasi Teknis yang Diperlukan', 
        'Qty', 
        'Satuan', 
        'Estimasi Harga (Rp)', 
        'Estimasi Total (Rp)'
    ];

    tableHeaders.forEach((h, idx) => {
        const col = idx + 1;
        const cell = ws.getCell(14, col);
        cell.value = h;
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.alignment = { vertical: 'middle', horizontal: (col === 1 || col === 4 || col === 5) ? 'center' : (col >= 6 ? 'right' : 'left'), wrapText: true };
        cell.border = borderThin;
    });

    // Rows 15 - 18: Items with native Excel formulas
    const startItemRow = 15;
    const endItemRow = 18;

    for (let r = startItemRow; r <= endItemRow; r++) {
        const itemIdx = r - startItemRow + 1;
        ws.getCell(r, 1).value = itemIdx;
        ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };

        if (!isBlank && request && itemIdx === 1) {
            ws.getCell(r, 2).value = request.item_name || '';
            ws.getCell(r, 3).value = request.technical_specs || 'Sesuai Rekomendasi ICT';
            ws.getCell(r, 4).value = Number(request.qty) || 1;
            ws.getCell(r, 5).value = request.unit || 'Unit';
            ws.getCell(r, 6).value = Number(request.estimated_unit_price) || 0;
            // Native Excel Formula for row calculation!
            ws.getCell(r, 7).value = { formula: `D${r}*F${r}`, result: Number(request.estimated_total_cost) || 0 };
        } else {
            // Blank row with preconfigured formula
            ws.getCell(r, 2).value = '';
            ws.getCell(r, 3).value = '';
            ws.getCell(r, 4).value = '';
            ws.getCell(r, 5).value = '';
            ws.getCell(r, 6).value = '';
            ws.getCell(r, 7).value = { formula: `IF(D${r}*F${r}>0, D${r}*F${r}, 0)` };
        }

        // Cell styles & number formatting
        ws.getCell(r, 4).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(r, 5).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(r, 6).numFmt = '"Rp"#,##0';
        ws.getCell(r, 7).numFmt = '"Rp"#,##0';
        ws.getCell(r, 7).font = { bold: true };

        for (let c = 1; c <= 7; c++) {
            ws.getCell(r, c).border = borderThin;
            ws.getCell(r, c).font = { ...ws.getCell(r, c).font, name: 'Arial', size: 8 };
        }
    }

    // Row 19: TOTAL ROW with formula SUM!
    ws.mergeCells('A19:F19');
    const totLabel = ws.getCell('A19');
    totLabel.value = 'TOTAL ESTIMASI ANGGARAN (IDR)';
    totLabel.font = { name: 'Arial', size: 9, bold: true };
    totLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    totLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    const totCell = ws.getCell('G19');
    totCell.value = { formula: `SUM(G${startItemRow}:G${endItemRow})` };
    totCell.numFmt = '"Rp"#,##0';
    totCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    totCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    totCell.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let c = 1; c <= 7; c++) {
        ws.getCell(19, c).border = borderThin;
    }
    applyBoxBorder(14, 1, 19, 7);

    // =========================================================================
    // SECTION IV: JUSTIFIKASI & ALASAN KEBUTUHAN (Row 20 - 22)
    // =========================================================================
    ws.mergeCells('A20:G20');
    const sec4 = ws.getCell('A20');
    sec4.value = 'IV. JUSTIFIKASI KEBUTUHAN & DAMPAK TERHADAP OPERASIONAL';
    sec4.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    sec4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sec4.alignment = { vertical: 'middle', horizontal: 'left' };
    applyBoxBorder(20, 1, 20, 7);

    ws.mergeCells('A21:G22');
    const justCell = ws.getCell('A21');
    const justVal = isBlank
        ? 'Alasan / Kegunaan:\n................................................................................................................................................................................................................................\nDampak bila tidak dipenuhi:\n................................................................................................................................................................................................................................'
        : `Tujuan Penggunaan & Dampak Operasional:\n${request?.justification || 'Kebutuhan operasional mendesak untuk menunjang produktivitas dan kelancaran proses kerja.'}`;
    justCell.value = justVal;
    justCell.font = { name: 'Arial', size: 8, italic: isBlank };
    justCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    applyBoxBorder(21, 1, 22, 7);

    // =========================================================================
    // SECTION V: VERIFIKASI TEKNIS & REKOMENDASI ICT (Row 23 - 26)
    // =========================================================================
    ws.mergeCells('A23:G23');
    const sec5 = ws.getCell('A23');
    sec5.value = 'V. VERIFIKASI TEKNIS & REKOMENDASI ICT (Diisi Oleh Tim ICT)';
    sec5.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    sec5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sec5.alignment = { vertical: 'middle', horizontal: 'left' };
    applyBoxBorder(23, 1, 23, 7);

    const isCapex = request?.target_form === 'I-1' || (!request && false);
    const isF1 = request?.target_form === 'F1';
    const isF2 = request?.target_form === 'F2';

    ws.mergeCells('A24:C24');
    ws.getCell('A24').value = `Kesesuaian Standar Spesifikasi (STD-ICT-03-02):\n${!isBlank ? '[ X ]' : '[   ]'} Sesuai Standar    [   ] Penyesuaian Alternatif`;
    ws.mergeCells('D24:G24');
    ws.getCell('D24').value = `Ketersediaan Stock Rolling (IK-ICT-03-02):\n[   ] Stock Ready    ${!isBlank ? '[ X ]' : '[   ]'} Pengadaan / Anggaran Baru`;

    ws.mergeCells('A25:C25');
    ws.getCell('A25').value = `Rekomendasi Alokasi Formulir Anggaran:\n${isCapex && !isBlank ? '[ X ]' : '[   ]'} Form I-1 (Capex)   ${isF1 && !isBlank ? '[ X ]' : '[   ]'} Form F1 (Mtc)   ${isF2 && !isBlank ? '[ X ]' : '[   ]'} Form F2 (Sparepart)`;

    ws.mergeCells('D25:G25');
    const reviewVal = isBlank
        ? 'Catatan Evaluasi Teknis ICT: .....................................................................................................................................................................'
        : `Catatan Evaluasi Teknis ICT: ${request?.review_notes || `Telah diverifikasi sesuai Standard Spesifikasi ${isKG ? 'TCFKG' : 'TCFSG'}-STD-ICT-03-02 dan kelayakan alokasi anggaran.`}`;
    ws.getCell('D25').value = reviewVal;

    for (let r = 24; r <= 25; r++) {
        for (let c = 1; c <= 7; c++) {
            const cell = ws.getCell(r, c);
            cell.font = { name: 'Arial', size: 7.5 };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = borderThin;
        }
    }
    applyBoxBorder(24, 1, 25, 7);

    // =========================================================================
    // SECTION VI: OTORISASI & PERSETUJUAN (Row 26 - 32)
    // 5 Tingkat Otorisasi Planning Budgeting:
    // 1. User | 2. Dept Head User | 3. Teknisi ICT | 4. Section Head / SPV ICT | 5. Dept Head ICT
    // Otorisasi Direksi / Management berlaku pada Purchase Requisition (PR) saat realisasi.
    // =========================================================================
    ws.mergeCells('A26:G26');
    const sec6 = ws.getCell('A26');
    sec6.value = `VI. OTORISASI & PERSETUJUAN PLANNING BUDGET (${isKG ? 'TCFKG' : 'TCFSG'}-SOP-ICT-03)`;
    sec6.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    sec6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sec6.alignment = { vertical: 'middle', horizontal: 'left' };
    applyBoxBorder(26, 1, 26, 7);

    // Headers for 5 Signatures across 7 columns (A:B, C, D:E, F, G) matching Gambar 1
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

    ws.mergeCells('A27:B27');
    ws.getCell('A27').value = 'Pemohon\n(User)';
    
    ws.getCell('C27').value = `Mengetahui\n(${superiorTitle})`;
    
    ws.mergeCells('D27:E27');
    ws.getCell('D27').value = 'Diperiksa Teknis\n(Teknisi ICT)';
    
    ws.getCell('F27').value = 'Diverifikasi\n(Section Head / SPV)';
    
    ws.getCell('G27').value = 'Disetujui\n(Dept Head ICT)';

    for (let c = 1; c <= 7; c++) {
        const cell = ws.getCell(27, c);
        cell.font = { name: 'Arial', size: 7.5, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = borderThin;
    }

    // Signature Area (Row 28-30) - Compact height matching Gambar 1
    ws.mergeCells('A28:B30');
    ws.mergeCells('C28:C30');
    ws.mergeCells('D28:E30');
    ws.mergeCells('F28:F30');
    ws.mergeCells('G28:G30');

    const isApproved = request?.status === 'APPROVED_TO_BUDGET';
    const isVerified = request?.status === 'VERIFIED_ICT' || isApproved;

    ws.getCell('A28').value = !isBlank 
        ? `\n( ${request?.requester_name || 'Bambang Hidayat'} )\nTgl: ${request?.date || '-'}` 
        : '\n\n(...........................................)\nTgl: ..../..../202...';

    ws.getCell('C28').value = !isBlank
        ? `\n( ${superiorName || '...........................................'} )\n${superiorTitle}\nTgl: ${request?.date || '-'}`
        : `\n\n(...........................................)\n${superiorTitle}\nTgl: ..../..../202...`;

    ws.getCell('D28').value = (!isBlank && isVerified) 
        ? `[ TEKNIS OK ]\n(...........................................)\nTeknisi ICT\nTgl: ${request?.date || '-'}` 
        : '\n\n(...........................................)\nTgl: ..../..../202...';

    ws.getCell('F28').value = (!isBlank && isVerified) 
        ? `[ VERIFIED ]\n( ${request?.reviewed_by || 'Hery (SPV ICT)'} )\nTgl: ${request?.date || '-'}` 
        : '\n\n(...........................................)\nTgl: ..../..../202...';

    ws.getCell('G28').value = (!isBlank && isApproved) 
        ? `[ APPROVED ]\n( Dept Head ICT )\nTgl: ${request?.date || '-'}` 
        : '\n\n(...........................................)\nTgl: ..../..../202...';

    for (let r = 28; r <= 30; r++) {
        for (let c = 1; c <= 7; c++) {
            const cell = ws.getCell(r, c);
            cell.font = { name: 'Arial', size: 7.5, bold: !isBlank };
            cell.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true };
            cell.border = borderThin;
        }
    }
    applyBoxBorder(27, 1, 30, 7);

    // Row 31: Info Note regarding Planning Budget vs Purchase Requisition
    ws.mergeCells('A31:G31');
    const noteCell = ws.getCell('A31');
    noteCell.value = '*) Catatan: Formulir ini merupakan Lampiran Usulan Planning Budgeting ICT. Otorisasi Direksi / Management berlaku pada form Purchase Requisition (PR) saat realisasi pengadaan.';
    noteCell.font = { name: 'Arial', size: 7, italic: true, bold: true, color: { argb: 'FF475569' } };
    noteCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Row 32: ISO Footer Notice
    ws.mergeCells('A32:G32');
    const footerCell = ws.getCell('A32');
    footerCell.value = `*Dokumen Resmi Terkontrol PT. TRI CENTRUM FORTUNA - SOP Permintaan Fasilitas ICT (${isKG ? 'TCFKG' : 'TCFSG'}-SOP-ICT-03 / IATF 16949:2016). Form ${formDocNo} Rev 01.`;
    footerCell.font = { name: 'Arial', size: 6.5, italic: true, color: { argb: 'FF64748B' } };
    footerCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Filename
    const filename = isBlank 
        ? `Form_Kosong_Permintaan_Budget_ICT_${formDocNo}.xlsx` 
        : `Form_Permintaan_Budget_${request?.req_no || 'ICT'}.xlsx`;

    await saveWorkbook(workbook, filename);
    return true;
};

// =========================================================================
// 2. EXPORT REKAPITULASI SELURUH PENGAJUAN BUDGET DEPARTEMEN KE EXCEL
// =========================================================================
export const exportDeptBudgetRekapExcel = async ({
    requests = [],
    summary = {},
    year = 2027,
    plant = 'ALL'
}) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT Tri Centrum Fortuna - ICT Department';
    workbook.created = new Date();

    const ws = workbook.addWorksheet(`Rekap Pengajuan ${year}`, {
        views: [{ showGridLines: true }],
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
        }
    });

    ws.columns = [
        { width: 5 },   // A: No
        { width: 22 },  // B: No. Registrasi
        { width: 12 },  // C: Tanggal
        { width: 8 },   // D: Plant
        { width: 25 },  // E: Departemen
        { width: 20 },  // F: Pemohon
        { width: 22 },  // G: Kategori SOP
        { width: 35 },  // H: Item Kebutuhan
        { width: 38 },  // I: Spesifikasi Teknis
        { width: 8 },   // J: Qty
        { width: 10 },  // K: Satuan
        { width: 18 },  // L: Estimasi Satuan
        { width: 20 },  // M: Estimasi Total
        { width: 10 },  // N: Target Thn
        { width: 10 },  // O: Bulan
        { width: 12 },  // P: Target Form
        { width: 18 },  // Q: Status SOP
        { width: 28 }   // R: Catatan Verifikasi ICT
    ];

    const borderThin = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };

    // Header Report
    ws.mergeCells('A1:R1');
    ws.getCell('A1').value = 'PT. TRI CENTRUM FORTUNA';
    ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };

    ws.mergeCells('A2:R2');
    ws.getCell('A2').value = `REKAPITULASI PENGAJUAN PERMINTAAN FASILITAS & BUDGET ICT TAHUN ANGGARAN ${year}`;
    ws.getCell('A2').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E293B' } };

    ws.mergeCells('A3:R3');
    ws.getCell('A3').value = `Standar Operasional Prosedur: TCFSG-SOP-ICT-03 | Form Control: TCFSG-FM-ICT-03-04 (Sadang) / TCFKG-FM-ICT-03-04 (Karawang) | Filter Plant: ${plant}`;
    ws.getCell('A3').font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };

    // KPI Summary Box
    ws.getCell('B5').value = 'Total Pengajuan';
    ws.getCell('B5').font = { bold: true, size: 8.5 };
    ws.getCell('C5').value = `${summary?.all_count || requests.length} Pengajuan`;
    ws.getCell('C5').font = { bold: true, size: 8.5 };

    ws.getCell('E5').value = 'Total Estimasi Biaya';
    ws.getCell('E5').font = { bold: true, size: 8.5 };
    ws.getCell('F5').value = Number(summary?.total_amount) || 0;
    ws.getCell('F5').numFmt = '"Rp"#,##0';
    ws.getCell('F5').font = { bold: true, size: 9, color: { argb: 'FF059669' } };

    ws.getCell('H5').value = 'Disetujui ke Anggaran';
    ws.getCell('H5').font = { bold: true, size: 8.5 };
    ws.getCell('I5').value = `${summary?.approved_count || 0} Item`;
    ws.getCell('I5').font = { bold: true, size: 8.5, color: { argb: 'FF059669' } };

    ws.getCell('K5').value = 'Menunggu Review';
    ws.getCell('K5').font = { bold: true, size: 8.5 };
    ws.getCell('L5').value = `${summary?.pending_count || 0} Item`;
    ws.getCell('L5').font = { bold: true, size: 8.5, color: { argb: 'FFD97706' } };

    // Table Column Headers (Row 7)
    const headers = [
        'No', 'No. Registrasi', 'Tanggal', 'Plant', 'Departemen', 'Pemohon',
        'Kategori Kebutuhan', 'Nama Perangkat / Software', 'Spesifikasi Teknis',
        'Qty', 'Satuan', 'Estimasi Satuan', 'Estimasi Total (Rp)',
        'Thn Anggaran', 'Bulan', 'Target Form', 'Status SOP', 'Catatan Evaluasi ICT'
    ];

    headers.forEach((h, idx) => {
        const col = idx + 1;
        const cell = ws.getCell(7, col);
        cell.value = h;
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Populate rows
    let startRow = 8;
    requests.forEach((r, idx) => {
        const row = startRow + idx;
        const isApproved = r.status === 'APPROVED_TO_BUDGET';

        ws.getCell(row, 1).value = idx + 1;
        ws.getCell(row, 1).alignment = { horizontal: 'center' };

        ws.getCell(row, 2).value = r.req_no;
        ws.getCell(row, 2).font = { bold: true };

        ws.getCell(row, 3).value = r.date;
        ws.getCell(row, 3).alignment = { horizontal: 'center' };

        ws.getCell(row, 4).value = r.plant;
        ws.getCell(row, 4).alignment = { horizontal: 'center' };

        ws.getCell(row, 5).value = r.department;
        ws.getCell(row, 6).value = `${r.requester_name} (${r.requester_title || 'Staff'})`;
        ws.getCell(row, 7).value = r.category;
        ws.getCell(row, 8).value = r.item_name;
        ws.getCell(row, 9).value = r.technical_specs || '-';

        ws.getCell(row, 10).value = Number(r.qty) || 1;
        ws.getCell(row, 10).alignment = { horizontal: 'center' };

        ws.getCell(row, 11).value = r.unit || 'Unit';
        ws.getCell(row, 11).alignment = { horizontal: 'center' };

        ws.getCell(row, 12).value = Number(r.estimated_unit_price) || 0;
        ws.getCell(row, 12).numFmt = '"Rp"#,##0';

        // Formula for Total
        ws.getCell(row, 13).value = { formula: `J${row}*L${row}`, result: Number(r.estimated_total_cost) || 0 };
        ws.getCell(row, 13).numFmt = '"Rp"#,##0';
        ws.getCell(row, 13).font = { bold: true };

        ws.getCell(row, 14).value = r.target_year;
        ws.getCell(row, 14).alignment = { horizontal: 'center' };

        ws.getCell(row, 15).value = (r.target_month || 'jan').toUpperCase();
        ws.getCell(row, 15).alignment = { horizontal: 'center' };

        ws.getCell(row, 16).value = r.target_form || 'I-1';
        ws.getCell(row, 16).alignment = { horizontal: 'center' };

        ws.getCell(row, 17).value = isApproved ? 'DISERAHKAN KE BUDGET' : (r.status === 'VERIFIED_ICT' ? 'DIVERIFIKASI ICT' : r.status);
        ws.getCell(row, 17).alignment = { horizontal: 'center' };
        ws.getCell(row, 17).font = { bold: true, color: { argb: isApproved ? 'FF059669' : (r.status === 'VERIFIED_ICT' ? 'FF4F46E5' : 'FFD97706') } };

        ws.getCell(row, 18).value = r.review_notes || '-';

        for (let c = 1; c <= 18; c++) {
            ws.getCell(row, c).border = borderThin;
            ws.getCell(row, c).font = { ...ws.getCell(row, c).font, name: 'Arial', size: 8 };
            if (idx % 2 === 1) {
                ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
        }
    });

    // Total Row
    const totalRow = startRow + requests.length;
    ws.mergeCells(`A${totalRow}:L${totalRow}`);
    ws.getCell(`A${totalRow}`).value = 'TOTAL KEBUTUHAN ANGGARAN (IDR)';
    ws.getCell(`A${totalRow}`).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(`A${totalRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(`A${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    ws.getCell(`M${totalRow}`).value = { formula: `SUM(M${startRow}:M${totalRow - 1})` };
    ws.getCell(`M${totalRow}`).numFmt = '"Rp"#,##0';
    ws.getCell(`M${totalRow}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    ws.getCell(`M${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    for (let c = 1; c <= 18; c++) {
        ws.getCell(totalRow, c).border = borderThin;
    }

    const filename = `REKAP_PERMINTAAN_BUDGET_ICT_TCF_Y${year}_${plant}.xlsx`;
    await saveWorkbook(workbook, filename);
    return true;
};

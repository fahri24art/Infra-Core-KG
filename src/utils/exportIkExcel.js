import ExcelJS from 'exceljs';

// Helper to fetch an image as base64
async function fetchImageBase64(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = reader.result;
                if (typeof res === 'string') {
                    resolve(res.split(',')[1]);
                } else {
                    resolve(null);
                }
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn(`Could not fetch image at ${url}:`, e);
        return null;
    }
}

export async function exportIkExcel(ikData) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TCF InfraCore - PT Tri Centrum Fortuna';
    workbook.created = new Date();

    const sheetName = (ikData.title || 'Instruksi Kerja').slice(0, 30);
    const ws = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: true }],
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            margins: {
                left: 0.3, right: 0.3,
                top: 0.4, bottom: 0.4,
                header: 0.2, footer: 0.2
            }
        }
    });

    // Landscape Columns A to V (22 columns for precise proportions)
    ws.columns = [
        { width: 4 },   // A: Left margin / No
        { width: 7 },   // B: Flowchart L
        { width: 8 },   // C: Flowchart L
        { width: 8 },   // D: Flowchart L
        { width: 8 },   // E: Flowchart R
        { width: 8 },   // F: Flowchart R
        { width: 8 },   // G: Flowchart R
        { width: 14 },  // H: Description start
        { width: 14 },  // I: Description
        { width: 16 },  // J: Description
        { width: 16 },  // K: Description
        { width: 16 },  // L: Description
        { width: 16 },  // M: Description end
        { width: 12 },  // N: PIC / APD start
        { width: 12 },  // O: PIC / APD
        { width: 12 },  // P: PIC / APD
        { width: 12 },  // Q: PIC / APD end
        { width: 10 },  // R: Meta right / approval
        { width: 10 },  // S: Meta right / approval
        { width: 12 },  // T: Meta right / approval
        { width: 12 },  // U: Meta right / approval
        { width: 4 },   // V: Right margin
    ];

    const thinBorder = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    const applyBorderToRange = (startRow, startCol, endRow, endCol, borderStyle = thinBorder) => {
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                ws.getCell(r, c).border = borderStyle;
            }
        }
    };

    // Preload Images
    const [logoB64, k3B64, sepatuB64, helmB64, sarungB64, esdB64] = await Promise.all([
        fetchImageBase64('/tcf_logo.png'),
        fetchImageBase64('/k3_gear.jpeg'),
        fetchImageBase64('/apd_sepatu.jpeg'),
        fetchImageBase64('/apd_helm.jpeg'),
        fetchImageBase64('/apd_sarung_tangan.png'),
        fetchImageBase64('/apd_esd.png')
    ]);

    // 1. TOP HEADER (Rows 1-5)
    // Logo Area A1:C5
    ws.mergeCells('A1:C5');
    applyBorderToRange(1, 1, 5, 3, thinBorder);
    if (logoB64) {
        const logoId = workbook.addImage({ base64: logoB64, extension: 'png' });
        ws.addImage(logoId, {
            tl: { col: 0.15, row: 0.15 },
            br: { col: 2.85, row: 4.85 }
        });
    } else {
        const logoCell = ws.getCell('A1');
        logoCell.value = 'TCF';
        logoCell.alignment = { vertical: 'middle', horizontal: 'center' };
        logoCell.font = { name: 'Tahoma', size: 14, bold: true };
    }

    // Center Title Block D1:Q5
    ws.mergeCells('D1:Q1');
    const compCell = ws.getCell('D1');
    compCell.value = 'PT. TRI CENTRUM FORTUNA';
    compCell.font = { name: 'Tahoma', size: 10, bold: false };
    compCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('D2:Q2');
    const typeCell = ws.getCell('D2');
    typeCell.value = 'INTRUKSI KERJA';
    typeCell.font = { name: 'Tahoma', size: 13, bold: true, underline: true, color: { argb: 'FF1D4ED8' } };
    typeCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('D3:Q3');
    const titleCell = ws.getCell('D3');
    titleCell.value = ikData.title || 'Perbaikan PC / Laptop';
    titleCell.font = { name: 'Tahoma', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFCE4D6' } // Authentic peach
    };
    applyBorderToRange(3, 4, 3, 17, thinBorder);

    ws.mergeCells('D4:Q4'); // spacing

    ws.getCell('D5').value = 'Pemilik Proses    :';
    ws.getCell('D5').font = { name: 'Tahoma', size: 10 };
    ws.mergeCells('E5:Q5');
    ws.getCell('E5').value = ikData.processOwner || 'ICT';
    ws.getCell('E5').font = { name: 'Tahoma', size: 10, bold: true };

    // Right Box (Metadata) R1:U4
    const isKG = (sessionStorage.getItem('organization') || '').toUpperCase().includes('KG');
    let effectiveDocNum = ikData.docNumber || (isKG ? 'TCFKG-IK-ICT-02-02' : 'TCFSG-IK-ICT-02-02');
    if (isKG && typeof effectiveDocNum === 'string') {
        effectiveDocNum = effectiveDocNum.replace(/TCFSG/g, 'TCFKG');
    }
    const metaItems = [
        ['No. Doc', `: ${effectiveDocNum}`],
        ['Issue Date', `: ${ikData.issueDate || '1 Oktober 2021'}`],
        ['Rev. No', `: ${ikData.revNo || '01'}`],
        ['Page', `: ${ikData.page || '1 / 1'}`]
    ];
    metaItems.forEach(([lbl, val], idx) => {
        const r = idx + 1;
        ws.mergeCells(r, 18, r, 19);
        ws.getCell(r, 18).value = lbl;
        ws.getCell(r, 18).font = { name: 'Tahoma', size: 9 };
        applyBorderToRange(r, 18, r, 19, thinBorder);

        ws.mergeCells(r, 20, r, 21);
        ws.getCell(r, 20).value = val;
        ws.getCell(r, 20).font = { name: 'Tahoma', size: 9, bold: true };
        applyBorderToRange(r, 20, r, 21, thinBorder);
    });
    applyBorderToRange(1, 1, 5, 21, thinBorder);

    // ROW 6: Spacing
    ws.getRow(6).height = 8;

    // ROW 7: MAIN TABLE HEADERS (Landscape)
    ws.mergeCells('A7:G7');
    const hFlow = ws.getCell('A7');
    hFlow.value = 'FLOW PROSES';
    hFlow.font = { name: 'Tahoma', size: 11, bold: true };
    hFlow.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorderToRange(7, 1, 7, 7, thinBorder);

    ws.mergeCells('H7:Q7');
    const hDesc = ws.getCell('H7');
    hDesc.value = 'GAMBAR / KETERANGAN';
    hDesc.font = { name: 'Tahoma', size: 11, bold: true };
    hDesc.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorderToRange(7, 8, 7, 17, thinBorder);

    ws.mergeCells('R7:U7');
    const hPic = ws.getCell('R7');
    hPic.value = 'PIC / REMARKS';
    hPic.font = { name: 'Tahoma', size: 11, bold: true };
    hPic.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorderToRange(7, 18, 7, 21, thinBorder);

    // 2. STEPS (Rows 8 onwards)
    let currentRow = 8;
    const steps = ikData.steps && ikData.steps.length > 0 ? ikData.steps : [
        { flowLeft: 'Start', flowRight: 'Diagnosa Awal', desc: '1. Identifikasi keluhan user', pic: 'USER' },
        { flowLeft: 'Pemeriksaan Komponen', flowRight: 'Pengujian Hardware', desc: '2. Cek adaptor, baterai, RAM, HDD/SSD', pic: 'ICT Support' }
    ];

    steps.forEach((step, sIdx) => {
        const stepRow = currentRow;

        // Flowchart node 1 (Col B..D)
        if (step.flowLeft) {
            ws.mergeCells(stepRow, 2, stepRow, 4);
            const fl = ws.getCell(stepRow, 2);
            fl.value = step.flowLeft;
            fl.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            fl.font = { name: 'Tahoma', size: 8.5, bold: true };
            fl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            applyBorderToRange(stepRow, 2, stepRow, 4, thinBorder);
        }

        // Flowchart node 2 (Col E..G)
        if (step.flowRight) {
            ws.mergeCells(stepRow, 5, stepRow, 7);
            const fr = ws.getCell(stepRow, 5);
            fr.value = step.flowRight;
            fr.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            fr.font = { name: 'Tahoma', size: 8.5, bold: true };
            fr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            applyBorderToRange(stepRow, 5, stepRow, 7, thinBorder);
        } else if (!step.flowLeft && step.flowText) {
            ws.mergeCells(stepRow, 2, stepRow, 6);
            const ft = ws.getCell(stepRow, 2);
            ft.value = step.flowText;
            ft.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            ft.font = { name: 'Tahoma', size: 8.5, bold: true };
            applyBorderToRange(stepRow, 2, stepRow, 6, thinBorder);
        }

        applyBorderToRange(stepRow, 1, stepRow, 7, thinBorder);

        // Keterangan in H..Q
        ws.mergeCells(stepRow, 8, stepRow, 17);
        const descCell = ws.getCell(stepRow, 8);
        descCell.value = step.desc || '';
        descCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        descCell.font = { name: 'Tahoma', size: 9 };
        applyBorderToRange(stepRow, 8, stepRow, 17, thinBorder);

        // PIC in R..U
        ws.mergeCells(stepRow, 18, stepRow, 21);
        const picCell = ws.getCell(stepRow, 18);
        picCell.value = step.pic || 'ICT Support';
        picCell.alignment = { horizontal: 'center', vertical: 'middle' };
        picCell.font = { name: 'Tahoma', size: 9 };
        applyBorderToRange(stepRow, 18, stepRow, 21, thinBorder);

        ws.getRow(stepRow).height = Math.max(30, (step.desc || '').length > 60 ? 36 : 30);
        currentRow++;
    });

    // 3. APD & SAFETY ROW
    currentRow++;
    const apdHeaderRow = currentRow;
    // Safety / Quality / Cost on Left A..M
    ws.mergeCells(apdHeaderRow, 1, apdHeaderRow + 2, 13);
    const legCell = ws.getCell(apdHeaderRow, 1);
    const safetyStr = ikData.safety !== false ? ' [√] SAFETY (K3) ' : ' [ ] SAFETY (K3) ';
    const qualityStr = ikData.quality !== false ? ' [√] QUALITY ' : ' [ ] QUALITY ';
    const costStr = ikData.cost !== false ? ' [√] COST ' : ' [ ] COST ';
    legCell.value = `KRITERIA PROSES:\n⚙ ${safetyStr}     ◈ ${qualityStr}     ◯ ${costStr}`;
    legCell.font = { name: 'Tahoma', size: 10, bold: true };
    legCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    applyBorderToRange(apdHeaderRow, 1, apdHeaderRow + 2, 13, thinBorder);

    // K3 Logo in Safety Box if available
    if (k3B64) {
        const k3Id = workbook.addImage({ base64: k3B64, extension: 'jpeg' });
        ws.addImage(k3Id, {
            tl: { col: 0.5, row: apdHeaderRow - 0.9 },
            br: { col: 1.8, row: apdHeaderRow + 1.9 }
        });
    }

    // APD Header N..U
    ws.mergeCells(apdHeaderRow, 14, apdHeaderRow, 21);
    const apdHeaderCell = ws.getCell(apdHeaderRow, 14);
    apdHeaderCell.value = 'STANDARISASI ALAT PELINDUNG DIRI';
    apdHeaderCell.font = { name: 'Tahoma', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    apdHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    apdHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF065F46' } // Emerald green header
    };
    applyBorderToRange(apdHeaderRow, 14, apdHeaderRow, 21, thinBorder);

    // APD Cards Row (apdHeaderRow + 1 to apdHeaderRow + 2)
    const apdCardsRow = apdHeaderRow + 1;
    const apdEndRow = apdHeaderRow + 2;

    // Card 1: Sepatu (Col 14-15)
    ws.mergeCells(apdCardsRow, 14, apdEndRow, 15);
    applyBorderToRange(apdCardsRow, 14, apdEndRow, 15, thinBorder);
    if (sepatuB64) {
        const imgId = workbook.addImage({ base64: sepatuB64, extension: 'jpeg' });
        ws.addImage(imgId, {
            tl: { col: 13.1, row: apdCardsRow - 0.9 },
            br: { col: 14.9, row: apdEndRow }
        });
    }

    // Card 2: Helm (Col 16-17)
    ws.mergeCells(apdCardsRow, 16, apdEndRow, 17);
    applyBorderToRange(apdCardsRow, 16, apdEndRow, 17, thinBorder);
    if (helmB64) {
        const imgId = workbook.addImage({ base64: helmB64, extension: 'jpeg' });
        ws.addImage(imgId, {
            tl: { col: 15.1, row: apdCardsRow - 0.9 },
            br: { col: 16.9, row: apdEndRow }
        });
    }

    // Card 3: Sarung Tangan (Col 18-19)
    ws.mergeCells(apdCardsRow, 18, apdEndRow, 19);
    applyBorderToRange(apdCardsRow, 18, apdEndRow, 19, thinBorder);
    if (sarungB64) {
        const imgId = workbook.addImage({ base64: sarungB64, extension: 'png' });
        ws.addImage(imgId, {
            tl: { col: 17.1, row: apdCardsRow - 0.9 },
            br: { col: 18.9, row: apdEndRow }
        });
    }

    // Card 4: ESD Strap (Col 20-21)
    ws.mergeCells(apdCardsRow, 20, apdEndRow, 21);
    applyBorderToRange(apdCardsRow, 20, apdEndRow, 21, thinBorder);
    if (esdB64) {
        const imgId = workbook.addImage({ base64: esdB64, extension: 'png' });
        ws.addImage(imgId, {
            tl: { col: 19.1, row: apdCardsRow - 0.9 },
            br: { col: 20.9, row: apdEndRow }
        });
    }

    ws.getRow(apdHeaderRow).height = 18;
    ws.getRow(apdCardsRow).height = 24;
    ws.getRow(apdEndRow).height = 24;

    currentRow = apdEndRow + 1;

    // 4. REVISION TABLE & APPROVAL MATRIX
    const revStartRow = currentRow;

    // Header Riwayat Revisi A..M
    ws.mergeCells(revStartRow, 1, revStartRow, 2);
    ws.getCell(revStartRow, 1).value = 'No.';
    ws.getCell(revStartRow, 1).alignment = { horizontal: 'center' };
    ws.getCell(revStartRow, 1).font = { name: 'Tahoma', size: 9, bold: true };

    ws.mergeCells(revStartRow, 3, revStartRow, 4);
    ws.getCell(revStartRow, 3).value = 'Tanggal';
    ws.getCell(revStartRow, 3).alignment = { horizontal: 'center' };
    ws.getCell(revStartRow, 3).font = { name: 'Tahoma', size: 9, bold: true };

    ws.getCell(revStartRow, 5).value = 'Rev.';
    ws.getCell(revStartRow, 5).alignment = { horizontal: 'center' };
    ws.getCell(revStartRow, 5).font = { name: 'Tahoma', size: 9, bold: true };

    ws.mergeCells(revStartRow, 6, revStartRow, 11);
    ws.getCell(revStartRow, 6).value = 'Isi Revisi';
    ws.getCell(revStartRow, 6).alignment = { horizontal: 'center' };
    ws.getCell(revStartRow, 6).font = { name: 'Tahoma', size: 9, bold: true };

    ws.mergeCells(revStartRow, 12, revStartRow, 13);
    ws.getCell(revStartRow, 12).value = 'PIC';
    ws.getCell(revStartRow, 12).alignment = { horizontal: 'center' };
    ws.getCell(revStartRow, 12).font = { name: 'Tahoma', size: 9, bold: true };
    applyBorderToRange(revStartRow, 1, revStartRow, 13, thinBorder);

    // Header Approval N..U (3 Kolom: Disetujui, Diperiksa, Dibuat)
    ws.mergeCells(revStartRow, 14, revStartRow, 16);
    ws.getCell(revStartRow, 14).value = 'Disetujui';
    ws.getCell(revStartRow, 14).alignment = { horizontal: 'center' };
    ws.getCell(revStartRow, 14).font = { name: 'Tahoma', size: 9, bold: true };

    ws.mergeCells(revStartRow, 17, revStartRow, 18);
    ws.getCell(revStartRow, 17).value = 'Diperiksa';
    ws.getCell(revStartRow, 17).alignment = { horizontal: 'center' };
    ws.getCell(revStartRow, 17).font = { name: 'Tahoma', size: 9, bold: true };

    ws.mergeCells(revStartRow, 19, revStartRow, 21);
    ws.getCell(revStartRow, 19).value = 'Dibuat';
    ws.getCell(revStartRow, 19).alignment = { horizontal: 'center' };
    ws.getCell(revStartRow, 19).font = { name: 'Tahoma', size: 9, bold: true };
    applyBorderToRange(revStartRow, 14, revStartRow, 21, thinBorder);

    // Rows for Revision and Signatures
    const revs = ikData.revisions && ikData.revisions.length > 0 ? ikData.revisions : [
        { no: '1', date: '01 Oktober 2021', rev: '0', desc: 'New Issue', pic: 'Mulyana' },
        { no: '2', date: '11 Maret 2025', rev: '1', desc: 'Perubahan kode perusahaan', pic: 'Mulyana' }
    ];

    for (let i = 0; i < 2; i++) {
        const rRow = revStartRow + 1 + i;
        const item = revs[i] || { no: '', date: '', rev: '', desc: '', pic: '' };

        ws.mergeCells(rRow, 1, rRow, 2);
        ws.getCell(rRow, 1).value = item.no;
        ws.getCell(rRow, 1).alignment = { horizontal: 'center' };

        ws.mergeCells(rRow, 3, rRow, 4);
        ws.getCell(rRow, 3).value = item.date;
        ws.getCell(rRow, 3).alignment = { horizontal: 'center' };

        ws.getCell(rRow, 5).value = item.rev;
        ws.getCell(rRow, 5).alignment = { horizontal: 'center' };

        ws.mergeCells(rRow, 6, rRow, 11);
        ws.getCell(rRow, 6).value = item.desc;

        ws.mergeCells(rRow, 12, rRow, 13);
        ws.getCell(rRow, 12).value = item.pic;
        ws.getCell(rRow, 12).alignment = { horizontal: 'center' };

        applyBorderToRange(rRow, 1, rRow, 13, thinBorder);
        ws.getRow(rRow).height = 18;
    }

    // Signature Space (merge rows revStartRow + 1 to revStartRow + 2)
    const sigStart = revStartRow + 1;
    const sigEnd = revStartRow + 2;
    ws.mergeCells(sigStart, 14, sigEnd, 16);
    ws.mergeCells(sigStart, 17, sigEnd, 18);
    ws.mergeCells(sigStart, 19, sigEnd, 21);
    applyBorderToRange(sigStart, 14, sigEnd, 16, thinBorder);
    applyBorderToRange(sigStart, 17, sigEnd, 18, thinBorder);
    applyBorderToRange(sigStart, 19, sigEnd, 21, thinBorder);

    // Names Row
    const namesRow = revStartRow + 3;
    ws.mergeCells(namesRow, 1, namesRow, 13); // blank under rev table
    applyBorderToRange(namesRow, 1, namesRow, 13, thinBorder);

    ws.mergeCells(namesRow, 14, namesRow, 16);
    ws.getCell(namesRow, 14).value = ikData.approvedBy || 'Herno Aji Sanjaya';
    ws.getCell(namesRow, 14).font = { name: 'Tahoma', size: 9, bold: true };
    ws.getCell(namesRow, 14).alignment = { horizontal: 'center' };

    ws.mergeCells(namesRow, 17, namesRow, 18);
    ws.getCell(namesRow, 17).value = ikData.checkedBy || 'Hery Hermawan';
    ws.getCell(namesRow, 17).font = { name: 'Tahoma', size: 9, bold: true };
    ws.getCell(namesRow, 17).alignment = { horizontal: 'center' };

    ws.mergeCells(namesRow, 19, namesRow, 21);
    ws.getCell(namesRow, 19).value = ikData.preparedBy || 'Mulyana';
    ws.getCell(namesRow, 19).font = { name: 'Tahoma', size: 9, bold: true };
    ws.getCell(namesRow, 19).alignment = { horizontal: 'center' };

    applyBorderToRange(namesRow, 14, namesRow, 21, thinBorder);
    ws.getRow(namesRow).height = 20;

    const footerRow = namesRow + 1;
    ws.mergeCells(footerRow, 1, footerRow, 21);
    const fCell = ws.getCell(footerRow, 1);
    let effectiveFooter = ikData.footerCode || (isKG ? 'TCFKG-FM-MR-01-02a (Rev 01, 11 Maret 2025)' : 'TCFSG-FM-MR-01-02a (Rev 01, 11 Maret 2025)');
    if (isKG && typeof effectiveFooter === 'string') {
        effectiveFooter = effectiveFooter.replace(/TCFSG/g, 'TCFKG');
    }
    fCell.value = effectiveFooter;
    fCell.font = { name: 'Tahoma', size: 8, italic: true, color: { argb: 'FF64748B' } };
    fCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(footerRow).height = 18;

    // Write file & trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${ikData.docNumber || 'IK'}_${(ikData.title || 'Dokumen').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

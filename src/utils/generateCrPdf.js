import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';

const loadImage = (src) => {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(img);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

const fmtRp = (val) => `Rp ${Math.round(Number(val) || 0).toLocaleString('id-ID')}`;
const fmtNum = (val) => Math.round(Number(val) || 0).toLocaleString('id-ID');

const CAT_LABELS = {
  PHOTOCOPY_PRINT: 'Photocopy & Print',
  SOFTWARE_LICENSE: 'Software & Lisensi',
  NETWORK_ISP: 'Jaringan & ISP',
  HARDWARE_INFRA: 'Hardware & Infra',
  CONSUMABLES: 'Consumables ICT',
  OTHER: 'Efisiensi Lainnya'
};

const drawCard = (doc, x, y, w, h, title, bigValue, subText, accent) => {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFillColor(...accent);
  doc.rect(x, y, w, 1.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(100, 116, 139);
  doc.text(title, x + 3, y + 5.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(15, 23, 42);
  doc.text(bigValue, x + 3, y + 11.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.9);
  doc.setTextColor(71, 85, 105);
  doc.text(subText, x + 3, y + 15.8);
};

export const generateCrPdf = async ({
  year = 2027,
  plant = 'SG',
  items = [],
  summary = {},
  ricohBaseline = null
}) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const pageHeight = doc.internal.pageSize.getHeight(); // 210
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 273

  const plantLabel = plant === 'KG' ? 'PLANT KARAWANG' : plant === 'ALL' ? 'ALL PLANT (SG & KG)' : 'PLANT SADANG - PURWAKARTA';
  const now = new Date();
  const printDate = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  const logoImg = await loadImage(logoTCF);
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', marginX, 8, 17, 17);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('PT TRICENTRUM FORTUNA', marginX + 20, 12.5);

  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`${plantLabel}  •  ICT COST REDUCTION & EFFICIENCY PROGRAM`, marginX + 20, 16.8);

  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`PROPOSAL & TRACKING COST REDUCTION (CR) ICT TAHUN ${year}`, marginX + 20, 21.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Dokumen Perencanaan Efisiensi Biaya Operasional & Pengendalian Kuota  •  Dicetak: ${printDate}`, marginX + 20, 25);

  // Meta Box top right
  const boxW = 62;
  const boxX = pageWidth - marginX - boxW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(boxX, 8.5, boxW, 17.5, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('KODE DOKUMEN', boxX + 3, 13);
  doc.text('TAHUN ANGGARAN', boxX + 3, 17);
  doc.text('TOTAL INISIATIF', boxX + 3, 21);
  doc.text('TARGET REDUKSI', boxX + 3, 24.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`: TCF${plant}-CR-ICT-${year}`, boxX + 26, 13);
  doc.text(`: FY ${year} (${plant})`, boxX + 26, 17);
  doc.text(`: ${items.length} Program CR`, boxX + 26, 21);
  doc.setTextColor(5, 150, 105);
  doc.text(`: ${summary.avg_reduction_pct || 0}% Efisiensi`, boxX + 26, 24.8);

  // Accent divider
  doc.setFillColor(5, 150, 105);
  doc.rect(marginX, 28, contentWidth * 0.65, 0.8, 'F');
  doc.setFillColor(30, 58, 138);
  doc.rect(marginX + contentWidth * 0.65, 28, contentWidth * 0.35, 0.8, 'F');

  // 4 Summary Cards
  const cardW = (contentWidth - 9) / 4;
  const cardY = 31;
  drawCard(
    doc, marginX, cardY, cardW, 18.5,
    'TOTAL BIAYA BASELINE / THN',
    fmtRp(summary.total_baseline_annual),
    'Proyeksi tanpa program efisiensi (status quo)',
    [100, 116, 139]
  );
  drawCard(
    doc, marginX + cardW + 3, cardY, cardW, 18.5,
    `TARGET BIAYA SETELAH CR ${year}`,
    fmtRp(summary.total_target_annual),
    `Setelah implementasi ${items.length} inisiatif CR`,
    [37, 99, 235]
  );
  drawCard(
    doc, marginX + (cardW + 3) * 2, cardY, cardW, 18.5,
    'ESTIMASI PENGHEMATAN / THN',
    fmtRp(summary.total_saving_annual),
    `~${fmtRp(summary.total_saving_monthly)}/bln (${summary.avg_reduction_pct || 0}% reduksi)`,
    [16, 185, 129]
  );
  drawCard(
    doc, marginX + (cardW + 3) * 3, cardY, cardW, 18.5,
    'NET SAVING & REALISASI YTD',
    fmtRp(summary.net_saving_annual),
    `Investasi: ${fmtRp(summary.total_investment)} | Aktual YTD: ${fmtRp(summary.actual_saving_ytd)}`,
    [245, 158, 11]
  );

  // Section I: Daftar Program CR & Impact Finansial
  let nextY = 55;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 58, 138);
  doc.text(`I. REKAPITULASI PROGRAM COST REDUCTION (CR) ICT TAHUN ${year}`, marginX, nextY);

  const crRows = items.map((item, idx) => [
    idx + 1,
    item.cr_code || `CR-${idx + 1}`,
    CAT_LABELS[item.category] || item.category,
    `${item.title}\nDept: ${item.target_dept || '-'}`,
    fmtRp(item.baseline_monthly),
    fmtRp(item.target_monthly),
    fmtRp(item.saving_monthly),
    `${item.active_months || 12} bln`,
    fmtRp(item.saving_annual),
    `${item.reduction_pct || 0}%`,
    `${item.pic || '-'}\n[${item.status || 'PROPOSED'}]`
  ]);

  crRows.push([
    '',
    'TOTAL',
    '',
    `${items.length} Inisiatif Efisiensi Biaya ICT`,
    fmtRp(items.reduce((s, x) => s + (x.baseline_monthly || 0), 0)),
    fmtRp(items.reduce((s, x) => s + (x.target_monthly || 0), 0)),
    fmtRp(summary.total_saving_monthly),
    '-',
    fmtRp(summary.total_saving_annual),
    `${summary.avg_reduction_pct || 0}%`,
    `Net: ${fmtRp(summary.net_saving_annual)}`
  ]);

  autoTable(doc, {
    startY: nextY + 2.5,
    head: [[
      'No', 'Kode', 'Kategori', 'Program Inisiatif CR & Dept Sasaran',
      'Baseline/Bln', 'Target/Bln', 'Hemat/Bln', 'Durasi',
      'Hemat/Thn', 'Reduksi', 'PIC & Status'
    ]],
    body: crRows,
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 6.3, fontStyle: 'bold', halign: 'center', cellPadding: 1.4 },
    bodyStyles: { fontSize: 6.1, cellPadding: 1.2, textColor: [30, 41, 59], valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 25 },
      3: { cellWidth: 74 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      9: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
      10: { cellWidth: 38 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === crRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.textColor = [6, 95, 70];
      }
    }
  });

  nextY = (doc.lastAutoTable?.finalY || nextY) + 7;

  // Section II: Root Cause & Action Plan Detail
  if (nextY > pageHeight - 55) {
    doc.addPage();
    nextY = 18;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 58, 138);
  doc.text('II. ANALISA MASALAH (ROOT CAUSE), RENCANA AKSI (COUNTERMEASURE) & KPI DELIVERABLE', marginX, nextY);

  const actionRows = items.map((item, idx) => [
    item.cr_code || `CR-${idx + 1}`,
    item.title,
    item.problem_statement || '-',
    item.action_plan || '-',
    item.kpi_metric || '-'
  ]);

  autoTable(doc, {
    startY: nextY + 2.5,
    head: [['Kode', 'Program CR', 'Masalah / Root Cause Saat Ini', 'Countermeasure / Langkah Eksekusi', 'Target KPI Deliverable']],
    body: actionRows,
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontSize: 6.3, fontStyle: 'bold', cellPadding: 1.3 },
    bodyStyles: { fontSize: 6.0, cellPadding: 1.3, textColor: [30, 41, 59], valign: 'top' },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 48, fontStyle: 'bold' },
      2: { cellWidth: 72 },
      3: { cellWidth: 88 },
      4: { cellWidth: 50 }
    }
  });

  nextY = (doc.lastAutoTable?.finalY || nextY) + 7;

  // Section III: Ricoh Telemetry Baseline if available
  if (ricohBaseline?.hasData) {
    if (nextY > pageHeight - 60) {
      doc.addPage();
      nextY = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(30, 58, 138);
    doc.text(
      `III. DATA BASELINE TELEMETRI RICOH (${(ricohBaseline.monthsAnalyzed || []).join(', ')}) — REFERENSI PARETO PHOTOCOPY & PRINT`,
      marginX,
      nextY
    );

    const deptRows = (ricohBaseline.topDepartments || []).map((d, i) => [
      i + 1,
      d.department,
      fmtNum(d.avgMonthlySheets),
      fmtNum(d.avgCopyBw),
      fmtNum(d.avgColorAll),
      fmtRp(d.avgMonthlyCost),
      fmtRp(d.avgMonthlyCost * 12)
    ]);

    autoTable(doc, {
      startY: nextY + 2.5,
      head: [['No', 'Departemen', 'Rata2 Lembar/Bln', 'Rata2 Copy B/W/Bln', 'Rata2 Color/Bln', 'Estimasi Biaya/Bln', 'Proyeksi Biaya/Thn']],
      body: deptRows,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 6.3, fontStyle: 'bold', halign: 'center', cellPadding: 1.3 },
      bodyStyles: { fontSize: 6.1, cellPadding: 1.2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 65, fontStyle: 'bold' },
        2: { cellWidth: 38, halign: 'right' },
        3: { cellWidth: 38, halign: 'right' },
        4: { cellWidth: 38, halign: 'right', textColor: [147, 51, 234], fontStyle: 'bold' },
        5: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
      }
    });

    nextY = (doc.lastAutoTable?.finalY || nextY) + 8;
  }

  // Signature block
  if (nextY > pageHeight - 38) {
    doc.addPage();
    nextY = 20;
  }
  const sigW = 68;
  const sigPositions = [marginX + 12, marginX + 102, marginX + 192];
  const sigTitles = ['Disusun Oleh (ICT Dept)', 'Diperiksa Oleh (FAT / Purchasing)', 'Disetujui Oleh (Manajemen / Direktur)'];
  sigTitles.forEach((t, i) => {
    const sx = sigPositions[i];
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(sx, nextY, sigW, 24, 1.5, 1.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(t, sx + sigW / 2, nextY + 4.5, { align: 'center' });
    doc.line(sx + 6, nextY + 18.5, sx + sigW - 6, nextY + 18.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('Tanggal : ____ / ____ / ________', sx + sigW / 2, nextY + 22, { align: 'center' });
  });

  // Footer page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`PT TRICENTRUM FORTUNA  •  Enterprise Budgeting & Cost Reduction ICT FY ${year}`, marginX, pageHeight - 6);
    doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
  }

  doc.save(`Proposal_CR_ICT_${plant}_${year}.pdf`);
};


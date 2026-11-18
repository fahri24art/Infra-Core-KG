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

const formatIndoDate = (ymd) => {
  if (!ymd) return '-';
  const parts = String(ymd).split('-');
  if (parts.length !== 3) return ymd;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
};

const formatMonthLabel = (ym) => {
  if (!ym) return '-';
  const parts = String(ym).split('-');
  if (parts.length < 2) return ym;
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${months[mIdx] || parts[1]} ${parts[0]}`;
};

const drawStatCard = (doc, x, y, w, h, title, bigValue, subText, accentColor) => {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFillColor(...accentColor);
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

export const generateRicohManagementPdf = async ({
  devices = [],
  departments = [],
  reportMeta = {},
  billingConfig = {}
}) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 273 mm

  const mode = reportMeta.mode || 'current'; // 'current' | 'months' | 'custom'
  const isCurrentMode = mode === 'current';

  // Contract pricing rates (default matches PT. Sakura Jaya Solusi Invoice SJ-74879)
  const rateBw = billingConfig.rateBw != null ? Number(billingConfig.rateBw) : 100;
  const rateColor = billingConfig.rateColor != null ? Number(billingConfig.rateColor) : 1400;
  const monthlyBaseFee = billingConfig.monthlyBaseFee != null ? Number(billingConfig.monthlyBaseFee) : 1900000;
  const freeBwPerMonth = billingConfig.freeBwPerMonth != null ? Number(billingConfig.freeBwPerMonth) : 1000;
  const freeColorPerMonth = billingConfig.freeColorPerMonth != null ? Number(billingConfig.freeColorPerMonth) : 100;
  const includeTax = billingConfig.includeTax === true;

  const effectiveMonths = Math.max(0.03, Number(reportMeta.monthsCount) || 1);

  const now = new Date();
  const printDateStr =
    now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ` ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} WIB`;

  // Normalize device usage & split quotas cleanly (Copy B/W vs Copy Color)
  const normalizedDevices = devices.map((d) => {
    const qPrtBw = Number(d.monthly_quota_bw) || 0;
    const qPrtCol = Number(d.monthly_quota_color) || 0;
    const fbCpy = Number(d.monthly_quota_copier) || 0;
    const qCpyBw = d.monthly_quota_copier_bw != null ? Number(d.monthly_quota_copier_bw) : Math.round(fbCpy * 0.8);
    const qCpyCol = d.monthly_quota_copier_color != null ? Number(d.monthly_quota_copier_color) : Math.max(0, fbCpy - qCpyBw);
    const qTot = qPrtBw + qPrtCol + qCpyBw + qCpyCol;

    const uPrtBw = Number(d.current_usage_bw) || 0;
    const uPrtCol = Number(d.current_usage_color) || 0;
    const uCpyBw = Number(d.current_usage_copier_bw) || 0;
    const uCpyCol = Number(d.current_usage_copier_color) || 0;
    const uTot = uPrtBw + uPrtCol + uCpyBw + uCpyCol;

    const bwAll = uPrtBw + uCpyBw;
    const colAll = uPrtCol + uCpyCol;
    const costBw = bwAll * rateBw;
    const costCol = colAll * rateColor;
    const costTot = costBw + costCol;

    return {
      ...d,
      qPrtBw, qPrtCol, qCpyBw, qCpyCol, qTot,
      uPrtBw, uPrtCol, uCpyBw, uCpyCol, uTot,
      bwAll, colAll, costBw, costCol, costTot
    };
  });

  // Sort: in current mode by highest quota then usage; in historical/custom mode by highest cost/usage
  const sortedDevices = [...normalizedDevices].sort((a, b) => {
    if (isCurrentMode) {
      if (b.qTot !== a.qTot) return b.qTot - a.qTot;
      if (b.uTot !== a.uTot) return b.uTot - a.uTot;
    } else {
      if (b.costTot !== a.costTot) return b.costTot - a.costTot;
      if (b.uTot !== a.uTot) return b.uTot - a.uTot;
    }
    return (a.computer_name || '').localeCompare(b.computer_name || '');
  });

  // Global KPI totals + Department rollup
  let totQPrtBw = 0, totQPrtCol = 0, totQCpyBw = 0, totQCpyCol = 0;
  let totUPrtBw = 0, totUPrtCol = 0, totUCpyBw = 0, totUCpyCol = 0;
  let activeComputersCount = 0;
  const deptMap = {};

  sortedDevices.forEach((d) => {
    totQPrtBw += d.qPrtBw;
    totQPrtCol += d.qPrtCol;
    totQCpyBw += d.qCpyBw;
    totQCpyCol += d.qCpyCol;

    totUPrtBw += d.uPrtBw;
    totUPrtCol += d.uPrtCol;
    totUCpyBw += d.uCpyBw;
    totUCpyCol += d.uCpyCol;

    if (d.uTot > 0) activeComputersCount += 1;

    const deptName = d.department_name || 'General';
    if (!deptMap[deptName]) {
      deptMap[deptName] = {
        name: deptName,
        device_count: 0,
        qPrtBw: 0, qPrtCol: 0, qCpyBw: 0, qCpyCol: 0,
        uPrtBw: 0, uPrtCol: 0, uCpyBw: 0, uCpyCol: 0,
        costBw: 0, costCol: 0, costTot: 0
      };
    }
    const e = deptMap[deptName];
    e.device_count += 1;
    e.qPrtBw += d.qPrtBw;
    e.qPrtCol += d.qPrtCol;
    e.qCpyBw += d.qCpyBw;
    e.qCpyCol += d.qCpyCol;
    e.uPrtBw += d.uPrtBw;
    e.uPrtCol += d.uPrtCol;
    e.uCpyBw += d.uCpyBw;
    e.uCpyCol += d.uCpyCol;
    e.costBw += d.costBw;
    e.costCol += d.costCol;
    e.costTot += d.costTot;
  });

  const totQuotaAll = totQPrtBw + totQPrtCol + totQCpyBw + totQCpyCol;
  const totUsageAll = totUPrtBw + totUPrtCol + totUCpyBw + totUCpyCol;
  const totAllBwUsed = totUPrtBw + totUCpyBw;
  const totAllColUsed = totUPrtCol + totUCpyCol;

  const grossClickCostBw = totAllBwUsed * rateBw;
  const grossClickCostCol = totAllColUsed * rateColor;
  const grossClickCostTotal = grossClickCostBw + grossClickCostCol;

  // Invoice-style billable calculation (PT. Sakura Jaya Solusi Contract)
  const freeBwQuota = Math.round(freeBwPerMonth * effectiveMonths);
  const freeColQuota = Math.round(freeColorPerMonth * effectiveMonths);
  const billableBw = Math.max(0, totAllBwUsed - freeBwQuota);
  const billableCol = Math.max(0, totAllColUsed - freeColQuota);
  const baseFeeAmount = Math.round(monthlyBaseFee * effectiveMonths);
  const overageBwFee = billableBw * rateBw;
  const overageColFee = billableCol * rateColor;
  const subTotalBill = baseFeeAmount + overageBwFee + overageColFee;
  const dppLain = Math.round(subTotalBill * (11 / 12));
  const ppn12 = Math.round(dppLain * 0.12);
  const totalWithPpn = subTotalBill + ppn12;
  const pph23 = Math.round(subTotalBill * 0.02);
  const nettEstimateBill = includeTax ? (totalWithPpn - pph23) : subTotalBill;

  const utilizationAll = totQuotaAll > 0 ? ((totUsageAll / totQuotaAll) * 100).toFixed(1) : '0.0';
  const colorCostShare = grossClickCostTotal > 0 ? ((grossClickCostCol / grossClickCostTotal) * 100).toFixed(1) : '0.0';

  const deptList = Object.values(deptMap)
    .map((dept) => {
      const totalQuota = dept.qPrtBw + dept.qPrtCol + dept.qCpyBw + dept.qCpyCol;
      const totalUsed = dept.uPrtBw + dept.uPrtCol + dept.uCpyBw + dept.uCpyCol;
      const pct = totalQuota > 0 ? ((totalUsed / totalQuota) * 100).toFixed(1) : '0.0';
      const costSharePct = grossClickCostTotal > 0 ? ((dept.costTot / grossClickCostTotal) * 100).toFixed(1) : '0.0';
      return { ...dept, totalQuota, totalUsed, pct, costSharePct };
    })
    .sort((a, b) => (isCurrentMode ? b.totalQuota - a.totalQuota : b.costTot - a.costTot));

  // Header period label
  let periodSubtitle = reportMeta.periodLabel || '';
  let periodBoxLabel = '';
  if (!periodSubtitle) {
    if (isCurrentMode) {
      const cStart = reportMeta.startDate ? formatIndoDate(reportMeta.startDate) : 'Tgl 21 Siklus Aktif';
      const cEnd = `${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
      periodSubtitle = `Siklus Berjalan: ${cStart} 00:01 WIB s/d ${cEnd}`;
      periodBoxLabel = 'Siklus Aktif';
    } else if (mode === 'months') {
      const ms = reportMeta.selectedMonths || [];
      periodSubtitle = ms.length > 1
        ? `Arsip Multi-Bulan: ${formatMonthLabel(ms[0])} s/d ${formatMonthLabel(ms[ms.length - 1])} (${ms.length} Siklus)`
        : `Arsip Bulanan: ${formatMonthLabel(ms[0])}`;
      periodBoxLabel = `${ms.length || 1} Siklus Bln`;
    } else {
      const st = reportMeta.startTime || '00:00';
      const et = reportMeta.endTime || '23:59';
      periodSubtitle = `Custom Periode: ${formatIndoDate(reportMeta.startDate)} (${st} WIB) s/d ${formatIndoDate(reportMeta.endDate)} (${et} WIB)`;
      periodBoxLabel = 'Custom Tanggal';
    }
  } else {
    periodBoxLabel = reportMeta.shortTag || (mode === 'months' ? `${effectiveMonths} Siklus Bln` : 'Custom');
  }

  // 1. Render Page 1 Header
  const logoImgData = await loadImage(logoTCF);
  if (logoImgData) {
    try {
      doc.addImage(logoImgData, 'PNG', marginX, 9.5, 23, 20.5);
    } catch (e) {}
  }

  const textStartX = marginX + 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PT TRICENTRUM FORTUNA', textStartX, 14.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(37, 99, 235);
  const storedOrg = (typeof localStorage !== 'undefined' && localStorage.getItem('organization'))
    || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('organization'))
    || (typeof document !== 'undefined' && /karawang/i.test(document.title) ? 'TCF-KG' : '');
  const defaultOrgLabel = storedOrg === 'TCF-KG' ? 'PLANT KARAWANG' : 'PLANT SADANG - PURWAKARTA';
  doc.text(`${reportMeta.orgName || defaultOrgLabel}  •  RICOH ENTERPRISE QUOTA & COST CONTROL`, textStartX, 18.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN EKSEKUTIF PEMAKAIAN KUOTA & RINCIAN PEMBIAYAAN RICOH', textStartX, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  doc.setTextColor(71, 85, 105);
  doc.text(`${periodSubtitle}   •   Dicetak: ${printDateStr}`, textStartX, 28.8);

  // Right Meta Info Box
  const metaBoxW = 60;
  const metaBoxX = pageWidth - marginX - metaBoxW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(metaBoxX, 9.5, metaBoxW, 21, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('KODE DOKUMEN', metaBoxX + 3, 13.5);
  doc.text('PERIODE DATA', metaBoxX + 3, 18);
  doc.text('TARIF KONTRAK', metaBoxX + 3, 22.5);
  doc.text('VENDOR RENTAL', metaBoxX + 3, 27);

  doc.setTextColor(30, 58, 138);
  doc.text(': TCFSG-RPT-RICOH-02', metaBoxX + 24, 13.5);
  doc.setTextColor(16, 185, 129);
  doc.text(`: ${periodBoxLabel} (${sortedDevices.length} PC)`, metaBoxX + 24, 18);
  doc.setTextColor(225, 29, 72);
  doc.text(`: BW Rp ${rateBw} | Col Rp ${fmtNum(rateColor)}`, metaBoxX + 24, 22.5);
  doc.setTextColor(15, 23, 42);
  doc.text(': PT. Sakura Jaya Solusi', metaBoxX + 24, 27);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(marginX, 32.5, pageWidth - marginX, 32.5);

  // 2. Render 4 Stat KPI Cards
  const cardY = 35;
  const cardH = 18;
  const cardGap = 3.5;
  const cardW = (contentWidth - cardGap * 3) / 4;

  drawStatCard(
    doc,
    marginX,
    cardY,
    cardW,
    cardH,
    'PERANGKAT & AKTIVITAS',
    `${sortedDevices.length} Unit (${activeComputersCount} Aktif)`,
    isCurrentMode
      ? `Idle/Nol: ${sortedDevices.length - activeComputersCount} Unit • Cut-off: Tgl 21`
      : `Rentang: ${periodBoxLabel}`,
    [37, 99, 235]
  );

  drawStatCard(
    doc,
    marginX + cardW + cardGap,
    cardY,
    cardW,
    cardH,
    'TOTAL VOLUME CETAK & COPY',
    `${fmtNum(totUsageAll)} Lembar`,
    `Prt ${fmtNum(totUPrtBw)}/${fmtNum(totUPrtCol)} | Cpy BW ${fmtNum(totUCpyBw)} | Col ${fmtNum(totUCpyCol)}`,
    [99, 102, 241]
  );

  drawStatCard(
    doc,
    marginX + (cardW + cardGap) * 2,
    cardY,
    cardW,
    cardH,
    'BIAYA KLIK PEMAKAIAN (GROSS)',
    fmtRp(grossClickCostTotal),
    `B/W: ${fmtRp(grossClickCostBw)} | Col: ${fmtRp(grossClickCostCol)} (${colorCostShare}%)`,
    [16, 185, 129]
  );

  drawStatCard(
    doc,
    marginX + (cardW + cardGap) * 3,
    cardY,
    cardW,
    cardH,
    includeTax ? 'ESTIMASI TAGIHAN NETT (INC. SEWA & PAJAK)' : 'ESTIMASI TAGIHAN SEWA + KLIK',
    fmtRp(nettEstimateBill),
    isCurrentMode
      ? `Utilisasi Kuota: ${utilizationAll}% (${fmtNum(totQuotaAll)} lbr)`
      : `Termasuk Sewa ${fmtRp(baseFeeAmount)}`,
    [225, 29, 72]
  );

  // 3. Section I: Department Summary Table (Separated Copy B/W vs Copy Color + Cost Rp)
  let cursorY = 57;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 58, 138);
  doc.text('I. REKAPITULASI KUOTA (PISAH COPY B/W & COLOR), PEMAKAIAN, & BIAYA PER DEPARTEMEN', marginX, cursorY);

  let deptHead, deptBody, deptColStyles;
  if (isCurrentMode) {
    deptHead = [[
      'No', 'Departemen', 'PC',
      'Q.PrtBW', 'Q.PrtCol', 'Q.CpyBW', 'Q.CpyCol', 'Tot Kuota',
      'P.PrtBW', 'P.PrtCol', 'P.CpyBW', 'P.CpyCol', 'Tot Pakai',
      'Biaya B/W', 'Biaya Color', 'Total Biaya', '%'
    ]];
    deptBody = deptList.map((dept, idx) => [
      idx + 1,
      dept.name,
      dept.device_count,
      fmtNum(dept.qPrtBw),
      fmtNum(dept.qPrtCol),
      fmtNum(dept.qCpyBw),
      fmtNum(dept.qCpyCol),
      fmtNum(dept.totalQuota),
      fmtNum(dept.uPrtBw),
      fmtNum(dept.uPrtCol),
      fmtNum(dept.uCpyBw),
      fmtNum(dept.uCpyCol),
      fmtNum(dept.totalUsed),
      fmtRp(dept.costBw),
      fmtRp(dept.costCol),
      fmtRp(dept.costTot),
      `${dept.pct}%`
    ]);
    deptBody.push([
      '',
      'TOTAL KESELURUHAN',
      sortedDevices.length,
      fmtNum(totQPrtBw),
      fmtNum(totQPrtCol),
      fmtNum(totQCpyBw),
      fmtNum(totQCpyCol),
      fmtNum(totQuotaAll),
      fmtNum(totUPrtBw),
      fmtNum(totUPrtCol),
      fmtNum(totUCpyBw),
      fmtNum(totUCpyCol),
      fmtNum(totUsageAll),
      fmtRp(grossClickCostBw),
      fmtRp(grossClickCostCol),
      fmtRp(grossClickCostTotal),
      `${utilizationAll}%`
    ]);
    // Sum = 7+31+9 + 15+14+15+14+17 + 15+14+15+14+17 + 20+21+23+12 = 273 mm
    deptColStyles = {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 31, fontStyle: 'bold' },
      2: { cellWidth: 9, halign: 'center' },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 14, halign: 'right' },
      5: { cellWidth: 15, halign: 'right' },
      6: { cellWidth: 14, halign: 'right' },
      7: { cellWidth: 17, halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138] },
      8: { cellWidth: 15, halign: 'right' },
      9: { cellWidth: 14, halign: 'right' },
      10: { cellWidth: 15, halign: 'right' },
      11: { cellWidth: 14, halign: 'right' },
      12: { cellWidth: 17, halign: 'right', fontStyle: 'bold' },
      13: { cellWidth: 20, halign: 'right' },
      14: { cellWidth: 21, halign: 'right', textColor: [109, 40, 217] },
      15: { cellWidth: 23, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      16: { cellWidth: 12, halign: 'center', fontStyle: 'bold' }
    };
  } else {
    deptHead = [[
      'No', 'Departemen', 'PC',
      'Print B/W', 'Print Color', 'Copy B/W', 'Copy Color',
      'Total Print', 'Total Copy', 'Grand Total',
      'Biaya B/W', 'Biaya Color', 'Total Biaya', 'Porsi %'
    ]];
    deptBody = deptList.map((dept, idx) => [
      idx + 1,
      dept.name,
      dept.device_count,
      fmtNum(dept.uPrtBw),
      fmtNum(dept.uPrtCol),
      fmtNum(dept.uCpyBw),
      fmtNum(dept.uCpyCol),
      fmtNum(dept.uPrtBw + dept.uPrtCol),
      fmtNum(dept.uCpyBw + dept.uCpyCol),
      fmtNum(dept.totalUsed),
      fmtRp(dept.costBw),
      fmtRp(dept.costCol),
      fmtRp(dept.costTot),
      `${dept.costSharePct}%`
    ]);
    deptBody.push([
      '',
      'TOTAL KESELURUHAN',
      sortedDevices.length,
      fmtNum(totUPrtBw),
      fmtNum(totUPrtCol),
      fmtNum(totUCpyBw),
      fmtNum(totUCpyCol),
      fmtNum(totUPrtBw + totUPrtCol),
      fmtNum(totUCpyBw + totUCpyCol),
      fmtNum(totUsageAll),
      fmtRp(grossClickCostBw),
      fmtRp(grossClickCostCol),
      fmtRp(grossClickCostTotal),
      '100.0%'
    ]);
    // Sum = 8+37+10 + 18+18+18+18 + 19+19+21 + 25+25+26+11 = 273 mm
    deptColStyles = {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 37, fontStyle: 'bold' },
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 19, halign: 'right' },
      8: { cellWidth: 19, halign: 'right' },
      9: { cellWidth: 21, halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138] },
      10: { cellWidth: 25, halign: 'right' },
      11: { cellWidth: 25, halign: 'right', textColor: [109, 40, 217] },
      12: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      13: { cellWidth: 11, halign: 'center', fontStyle: 'bold' }
    };
  }

  autoTable(doc, {
    startY: cursorY + 2.5,
    head: deptHead,
    body: deptBody,
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 6,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 1.2
    },
    bodyStyles: {
      fontSize: 6.1,
      cellPadding: 1.0,
      textColor: [30, 41, 59]
    },
    columnStyles: deptColStyles,
    didParseCell: (data) => {
      if (data.row.index === deptBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  // Optional Section I.B: Monthly Trend Comparison when multi-month is chosen
  let nextY = (doc.lastAutoTable?.finalY || 120) + 6;
  const monthlyBreakdown = Array.isArray(reportMeta.monthlyBreakdown) ? reportMeta.monthlyBreakdown : [];
  if (monthlyBreakdown.length > 1) {
    if (nextY > pageHeight - 55) {
      doc.addPage();
      nextY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(30, 58, 138);
    doc.text('I.B. PERBANDINGAN VOLUME & ESTIMASI BIAYA PER SIKLUS BULAN', marginX, nextY);

    const mHead = [['Bulan Siklus', 'Print B/W', 'Print Color', 'Copy B/W', 'Copy Color', 'Total Lembar', 'Biaya B/W', 'Biaya Color', 'Total Biaya Klik', 'Keterangan']];
    const mBody = monthlyBreakdown.map((m) => {
      const mBw = (Number(m.bw) || 0) + (Number(m.copier_bw) || 0);
      const mCol = (Number(m.color) || 0) + (Number(m.copier_color) || 0);
      const cBw = mBw * rateBw;
      const cCol = mCol * rateColor;
      let note = m.is_active ? 'Siklus Berjalan' : 'Arsip Siklus';
      if (['2026-07', '2026-08', '2026-09'].includes(m.month)) note = 'Sinkron Invoice Sakura';
      return [
        formatMonthLabel(m.month),
        fmtNum(m.bw),
        fmtNum(m.color),
        fmtNum(m.copier_bw),
        fmtNum(m.copier_color),
        fmtNum(m.total),
        fmtRp(cBw),
        fmtRp(cCol),
        fmtRp(cBw + cCol),
        note
      ];
    });
    autoTable(doc, {
      startY: nextY + 2.5,
      head: mHead,
      body: mBody,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 6.2, halign: 'center', cellPadding: 1.2 },
      bodyStyles: { fontSize: 6.2, cellPadding: 1.1, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 34, fontStyle: 'bold' },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 22, halign: 'right' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 28, halign: 'right' },
        7: { cellWidth: 28, halign: 'right' },
        8: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
        9: { cellWidth: 41, halign: 'left' }
      }
    });
    nextY = (doc.lastAutoTable?.finalY || nextY) + 6;

    // Section I.C: Monthly Usage & Cost Breakdown Per Department
    const deptMonthly = Array.isArray(reportMeta.deptMonthlyBreakdown) ? reportMeta.deptMonthlyBreakdown : [];
    const monthKeys = monthlyBreakdown.map(m => m.month).filter(Boolean);
    if (deptMonthly.length > 0 && monthKeys.length > 1) {
      if (nextY > pageHeight - 65) {
        doc.addPage();
        nextY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(30, 58, 138);
      doc.text('I.C. PERBANDINGAN RINCIAN PEMAKAIAN & BIAYA BULANAN PER DEPARTEMEN', marginX, nextY);

      const shortMonth = (ym) => {
        const [y, m] = String(ym || '').split('-');
        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${names[parseInt(m, 10) - 1] || m} ${y || ''}`.trim();
      };

      const useDetailedCols = monthKeys.length <= 4;
      let dmHead = [];
      let dmColStyles = {};

      if (useDetailedCols) {
        const topRow = [
          { content: 'No', rowSpan: 2, styles: { valign: 'middle' } },
          { content: 'Departemen', rowSpan: 2, styles: { valign: 'middle' } }
        ];
        const subRow = [];
        monthKeys.forEach(mk => {
          topRow.push({ content: shortMonth(mk), colSpan: 2, styles: { halign: 'center' } });
          subRow.push('Lbr (BW/Col)', 'Biaya');
        });
        topRow.push({ content: 'Akumulasi & Tren', colSpan: 3, styles: { halign: 'center' } });
        subRow.push('Total Lbr', 'Rata2/Bln', 'Tren Bln Akhir');
        dmHead = [topRow, subRow];

        const monthColsWidth = 273 - 7 - 32 - 19 - 19 - 20; // 176mm shared across months
        const pairW = monthColsWidth / monthKeys.length;
        const lbrW = Math.floor(pairW * 0.48);
        const rpW = Number((pairW - lbrW).toFixed(1));
        dmColStyles[0] = { cellWidth: 7, halign: 'center' };
        dmColStyles[1] = { cellWidth: 32, fontStyle: 'bold' };
        let colCursor = 2;
        monthKeys.forEach(() => {
          dmColStyles[colCursor++] = { cellWidth: lbrW, halign: 'right' };
          dmColStyles[colCursor++] = { cellWidth: rpW, halign: 'right', textColor: [5, 150, 105] };
        });
        dmColStyles[colCursor++] = { cellWidth: 19, halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138] };
        dmColStyles[colCursor++] = { cellWidth: 19, halign: 'right' };
        dmColStyles[colCursor] = { cellWidth: 20, halign: 'center', fontStyle: 'bold' };
      } else {
        const hdr = ['No', 'Departemen', ...monthKeys.map(shortMonth), 'Total Lbr', 'Rata2/Bln', 'Tren'];
        dmHead = [hdr];
        const monthColsWidth = 273 - 7 - 30 - 18 - 18 - 16;
        const eachW = Number((monthColsWidth / monthKeys.length).toFixed(1));
        dmColStyles[0] = { cellWidth: 7, halign: 'center' };
        dmColStyles[1] = { cellWidth: 30, fontStyle: 'bold' };
        let colCursor = 2;
        monthKeys.forEach(() => {
          dmColStyles[colCursor++] = { cellWidth: eachW, halign: 'right' };
        });
        dmColStyles[colCursor++] = { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138] };
        dmColStyles[colCursor++] = { cellWidth: 18, halign: 'right' };
        dmColStyles[colCursor] = { cellWidth: 16, halign: 'center', fontStyle: 'bold' };
      }

      const monthTotalsAcc = {};
      monthKeys.forEach(mk => { monthTotalsAcc[mk] = { bw: 0, col: 0, total: 0, cost: 0 }; });
      let grandTotDeptMonths = 0;

      const dmBody = deptMonthly.map((d, idx) => {
        const row = [idx + 1, d.department];
        let deptTotalLbr = 0;
        monthKeys.forEach(mk => {
          const stat = d.months?.[mk] || { bw: 0, color: 0, copier_bw: 0, copier_color: 0, total: 0 };
          const bwAll = (Number(stat.bw) || 0) + (Number(stat.copier_bw) || 0);
          const colAll = (Number(stat.color) || 0) + (Number(stat.copier_color) || 0);
          const totLbr = bwAll + colAll;
          const cost = (bwAll * rateBw) + (colAll * rateColor);
          deptTotalLbr += totLbr;
          monthTotalsAcc[mk].bw += bwAll;
          monthTotalsAcc[mk].col += colAll;
          monthTotalsAcc[mk].total += totLbr;
          monthTotalsAcc[mk].cost += cost;

          if (useDetailedCols) {
            row.push(totLbr > 0 ? `${fmtNum(totLbr)}\n(${fmtNum(bwAll)}/${fmtNum(colAll)})` : '0');
            row.push(cost > 0 ? fmtRp(cost) : 'Rp 0');
          } else {
            row.push(totLbr > 0 ? `${fmtNum(totLbr)}\n${fmtRp(cost)}` : '0');
          }
        });
        grandTotDeptMonths += deptTotalLbr;

        const lastMk = monthKeys[monthKeys.length - 1];
        const prevMk = monthKeys[monthKeys.length - 2];
        const lastVol = d.months?.[lastMk]?.total || 0;
        const prevVol = d.months?.[prevMk]?.total || 0;
        let trendTxt = '—';
        if (prevVol > 0) {
          const pct = Math.round(((lastVol - prevVol) / prevVol) * 100);
          trendTxt = `${pct > 0 ? '+' : ''}${pct}%`;
        } else if (lastVol > 0) {
          trendTxt = 'Baru';
        }

        row.push(fmtNum(deptTotalLbr));
        row.push(fmtNum(Math.round(deptTotalLbr / monthKeys.length)));
        row.push(trendTxt);
        return row;
      });

      // Total Keseluruhan row
      const totRow = ['', 'TOTAL KESELURUHAN'];
      monthKeys.forEach(mk => {
        const mt = monthTotalsAcc[mk];
        if (useDetailedCols) {
          totRow.push(`${fmtNum(mt.total)}\n(${fmtNum(mt.bw)}/${fmtNum(mt.col)})`);
          totRow.push(fmtRp(mt.cost));
        } else {
          totRow.push(`${fmtNum(mt.total)}\n${fmtRp(mt.cost)}`);
        }
      });
      const lastMT = monthTotalsAcc[monthKeys[monthKeys.length - 1]]?.total || 0;
      const prevMT = monthTotalsAcc[monthKeys[monthKeys.length - 2]]?.total || 0;
      const totTrend = prevMT > 0 ? `${lastMT - prevMT > 0 ? '+' : ''}${Math.round(((lastMT - prevMT) / prevMT) * 100)}%` : '—';
      totRow.push(fmtNum(grandTotDeptMonths), fmtNum(Math.round(grandTotDeptMonths / monthKeys.length)), totTrend);
      dmBody.push(totRow);

      const trendColIdx = useDetailedCols ? (2 + monthKeys.length * 2 + 2) : (2 + monthKeys.length + 2);
      autoTable(doc, {
        startY: nextY + 2.5,
        head: dmHead,
        body: dmBody,
        theme: 'grid',
        margin: { left: marginX, right: marginX },
        headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontSize: 5.8, fontStyle: 'bold', halign: 'center', cellPadding: 1.0 },
        bodyStyles: { fontSize: 5.7, cellPadding: 0.9, textColor: [30, 41, 59], valign: 'middle' },
        columnStyles: dmColStyles,
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === dmBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = [15, 23, 42];
          } else if (data.section === 'body' && data.column.index === trendColIdx) {
            const val = String(data.cell.raw || '');
            if (val.startsWith('+')) data.cell.styles.textColor = [220, 38, 38];
            else if (val.startsWith('-')) data.cell.styles.textColor = [5, 150, 105];
          }
        }
      });
      nextY = (doc.lastAutoTable?.finalY || nextY) + 6;
    }
  }

  // 4. Section II: Billing / Invoice Cost Estimation Summary (Mirror PT. Sakura Jaya Solusi Invoice SJ-74879)
  if (nextY > pageHeight - 62) {
    doc.addPage();
    nextY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 58, 138);
  doc.text('II. SIMULASI RINCIAN PEMBIAYAAN VENDOR (ACUAN INVOICE KONTRAK PT. SAKURA JAYA SOLUSI)', marginX, nextY);

  const billRows = [
    [
      '1',
      `Biaya Sewa Minimum Mesin (${reportMeta.monthsCount ? `${effectiveMonths} Siklus Bln` : '1 Siklus Bln'} — Incl. Free ${fmtNum(freeBwQuota)} lbr B/W & ${fmtNum(freeColQuota)} lbr Color)`,
      `${effectiveMonths} bln`,
      fmtRp(monthlyBaseFee),
      fmtRp(baseFeeAmount)
    ],
    [
      '2',
      `Pemakaian B/W (Print ${fmtNum(totUPrtBw)} + Copy ${fmtNum(totUCpyBw)} = ${fmtNum(totAllBwUsed)} lbr) - Free Min ${fmtNum(freeBwQuota)} lbr`,
      `${fmtNum(billableBw)} lbr`,
      fmtRp(rateBw),
      fmtRp(overageBwFee)
    ],
    [
      '3',
      `Pemakaian Color (Print ${fmtNum(totUPrtCol)} + Copy ${fmtNum(totUCpyCol)} = ${fmtNum(totAllColUsed)} lbr) - Free Min ${fmtNum(freeColQuota)} lbr`,
      `${fmtNum(billableCol)} lbr`,
      fmtRp(rateColor),
      fmtRp(overageColFee)
    ],
    ['', includeTax ? 'SUB TOTAL (SEWA + PEMAKAIAN KLIK)' : 'TOTAL ESTIMASI BIAYA (SEWA + PEMAKAIAN KLIK — NON PPN)', '', '', fmtRp(subTotalBill)]
  ];

  if (includeTax) {
    billRows.push(
      ['', 'DPP Nilai Lain (11/12 x Sub Total)', '', '', fmtRp(dppLain)],
      ['', 'PPN 12% (12% x DPP Nilai Lain)', '', '', fmtRp(ppn12)],
      ['', 'Sub Total + PPN 12%', '', '', fmtRp(totalWithPpn)],
      ['', 'Potongan PPh Pasal 23 (2% x Sub Total)', '', '', `- ${fmtRp(pph23)}`],
      ['', 'ESTIMASI TOTAL TAGIHAN NETT (SIAP BAYAR)', '', '', fmtRp(nettEstimateBill)]
    );
  }

  autoTable(doc, {
    startY: nextY + 2.5,
    head: [['No', 'Komponen Biaya Kontrak Sewa & Click Charge Ricoh', 'Volume Terhitung', 'Tarif Satuan', 'Nominal (Rp)']],
    body: billRows,
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 6.3, halign: 'center', cellPadding: 1.3 },
    bodyStyles: { fontSize: 6.3, cellPadding: 1.15, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 158 },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 33, halign: 'right' },
      4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === 3 && includeTax) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
      if (data.row.index === billRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.textColor = [6, 95, 70];
      }
    }
  });

  let billingNoteY = (doc.lastAutoTable?.finalY || nextY) + 3.5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  const notes = [
    '* Catatan: Biaya di atas dihitung dari total output PC/PIN terlacak sistem. Cetak langsung mesin tanpa PIN (direct/scan-copy fisik/admin) tetap terhitung pada counter invoice vendor.'
  ];
  if (reportMeta.hasSeptemberAnomaly) {
    notes.push('* Catatan Audit: Data arsip 2026-09 (74,885 lbr) mengandung akumulasi counter mesin yang tertarik saat migrasi cut-off tgl 22 Okt.');
  }
  if (reportMeta.dailyCopierCaveat) {
    notes.push('* Catatan Log Harian: Rincian Copy harian sebelum 24 Sep 2026 belum tercatat di log harian (hanya tersimpan di arsip bulanan).');
  }
  notes.forEach((n, idx) => {
    doc.text(n, marginX, billingNoteY + idx * 3);
  });

  // 5. Section III: Detailed Per-Device & Employee Table (always start cleanly if tight)
  let sec3Y = billingNoteY + notes.length * 3 + 5;
  if (sec3Y > pageHeight - 40) {
    doc.addPage();
    sec3Y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 58, 138);
  doc.text('III. RINCIAN LENGKAP PER PERANGKAT & KARYAWAN (COPY B/W & COPY COLOR TERPISAH + BIAYA)', marginX, sec3Y);

  const hidePin = reportMeta.hidePin === true;
  let devHead, devBody, devColStyles;
  if (isCurrentMode) {
    devHead = [[
      '#', 'Nama Komputer', 'Pengguna / PIC', 'Dept', ...(hidePin ? [] : ['PIN']),
      'Q.PBW', 'Q.PCol', 'Q.CBW', 'Q.CCol', 'Tot Q',
      'U.PBW', 'U.PCol', 'U.CBW', 'U.CCol', 'Tot U',
      'Biaya B/W', 'Biaya Col', 'Total Biaya', 'Status'
    ]];
    devBody = sortedDevices.map((d, idx) => [
      idx + 1,
      d.computer_name || '-',
      d.inventory_user_name || d.inventory_contact || '-',
      d.department_name || 'General',
      ...(hidePin ? [] : [d.user_code || '-']),
      fmtNum(d.qPrtBw),
      fmtNum(d.qPrtCol),
      fmtNum(d.qCpyBw),
      fmtNum(d.qCpyCol),
      fmtNum(d.qTot),
      fmtNum(d.uPrtBw),
      fmtNum(d.uPrtCol),
      fmtNum(d.uCpyBw),
      fmtNum(d.uCpyCol),
      fmtNum(d.uTot),
      fmtRp(d.costBw),
      fmtRp(d.costCol),
      fmtRp(d.costTot),
      d.status === 'locked' ? 'Blocked' : (d.qTot === 0 ? 'Idle (0)' : 'Active')
    ]);
    const o = hidePin ? -1 : 0;
    devColStyles = {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: hidePin ? 28 : 23, fontStyle: 'bold' },
      2: { cellWidth: hidePin ? 33 : 28 },
      3: { cellWidth: 18 },
      ...(!hidePin ? { 4: { cellWidth: 10, halign: 'center' } } : {}),
      [5 + o]: { cellWidth: 12, halign: 'right' },
      [6 + o]: { cellWidth: 11, halign: 'right' },
      [7 + o]: { cellWidth: 12, halign: 'right' },
      [8 + o]: { cellWidth: 11, halign: 'right' },
      [9 + o]: { cellWidth: 14, halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138] },
      [10 + o]: { cellWidth: 12, halign: 'right' },
      [11 + o]: { cellWidth: 11, halign: 'right' },
      [12 + o]: { cellWidth: 12, halign: 'right' },
      [13 + o]: { cellWidth: 11, halign: 'right' },
      [14 + o]: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
      [15 + o]: { cellWidth: 17, halign: 'right' },
      [16 + o]: { cellWidth: 18, halign: 'right', textColor: [109, 40, 217] },
      [17 + o]: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      [18 + o]: { cellWidth: 11, halign: 'center', fontStyle: 'bold' }
    };
  } else {
    devHead = [[
      '#', 'Nama Komputer', 'Pengguna / PIC', 'Departemen', ...(hidePin ? [] : ['PIN']),
      'Print B/W', 'Print Color', 'Copy B/W', 'Copy Color', 'Total Pakai',
      'Biaya B/W', 'Biaya Color', 'Total Biaya', 'Porsi %'
    ]];
    devBody = sortedDevices.map((d, idx) => [
      idx + 1,
      d.computer_name || '-',
      d.inventory_user_name || d.inventory_contact || '-',
      d.department_name || 'General',
      ...(hidePin ? [] : [d.user_code || '-']),
      fmtNum(d.uPrtBw),
      fmtNum(d.uPrtCol),
      fmtNum(d.uCpyBw),
      fmtNum(d.uCpyCol),
      fmtNum(d.uTot),
      fmtRp(d.costBw),
      fmtRp(d.costCol),
      fmtRp(d.costTot),
      grossClickCostTotal > 0 ? `${((d.costTot / grossClickCostTotal) * 100).toFixed(1)}%` : '0.0%'
    ]);
    const o = hidePin ? -1 : 0;
    devColStyles = {
      0: { cellWidth: 9, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: hidePin ? 34 : 28, fontStyle: 'bold' },
      2: { cellWidth: hidePin ? 41 : 35 },
      3: { cellWidth: 25 },
      ...(!hidePin ? { 4: { cellWidth: 12, halign: 'center' } } : {}),
      [5 + o]: { cellWidth: 17, halign: 'right' },
      [6 + o]: { cellWidth: 17, halign: 'right' },
      [7 + o]: { cellWidth: 17, halign: 'right' },
      [8 + o]: { cellWidth: 17, halign: 'right' },
      [9 + o]: { cellWidth: 19, halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138] },
      [10 + o]: { cellWidth: 22, halign: 'right' },
      [11 + o]: { cellWidth: 23, halign: 'right', textColor: [109, 40, 217] },
      [12 + o]: { cellWidth: 25, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      [13 + o]: { cellWidth: 17, halign: 'center', fontStyle: 'bold' }
    };
  }

  autoTable(doc, {
    startY: sec3Y + 2.5,
    head: devHead,
    body: devBody,
    theme: 'grid',
    showHead: 'everyPage',
    margin: { top: 18, left: marginX, right: marginX, bottom: 14 },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: isCurrentMode ? 5.6 : 6.2,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 1.2
    },
    bodyStyles: {
      fontSize: isCurrentMode ? 5.5 : 6.0,
      cellPadding: 0.95,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: devColStyles,
    didParseCell: (data) => {
      if (isCurrentMode && data.column.index === (hidePin ? 17 : 18)) {
        if (data.cell.raw === 'Blocked') data.cell.styles.textColor = [225, 29, 72];
        else if (data.cell.raw === 'Idle (0)') data.cell.styles.textColor = [148, 163, 184];
        else data.cell.styles.textColor = [16, 185, 129];
      }
    }
  });

  // 6. Signature Block
  let finalTableY = doc.lastAutoTable?.finalY || 150;
  if (finalTableY + 38 > pageHeight - 14) {
    doc.addPage();
    finalTableY = 22;
  }

  const signY = finalTableY + 8;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const signColWidth = contentWidth / 3;
  const col1X = marginX + signColWidth / 2;
  const col2X = marginX + signColWidth + signColWidth / 2;
  const col3X = marginX + signColWidth * 2 + signColWidth / 2;

  doc.text('Dibuat Oleh,', col1X, signY, { align: 'center' });
  doc.text('Diperiksa Oleh,', col2X, signY, { align: 'center' });
  doc.text('Disetujui Oleh,', col3X, signY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text('ICT Technical Support', col1X, signY + 4, { align: 'center' });
  doc.text('ICT Section Head', col2X, signY + 4, { align: 'center' });
  doc.text('Plant Manager / Direktur', col3X, signY + 4, { align: 'center' });

  const lineY = signY + 21;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(col1X - 28, lineY, col1X + 28, lineY);
  doc.line(col2X - 28, lineY, col2X + 28, lineY);
  doc.line(col3X - 28, lineY, col3X + 28, lineY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('( .................................................... )', col1X, lineY + 4, { align: 'center' });
  doc.text('( .................................................... )', col2X, lineY + 4, { align: 'center' });
  doc.text('( .................................................... )', col3X, lineY + 4, { align: 'center' });

  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('Tgl: .......................................', col1X, lineY + 7.5, { align: 'center' });
  doc.text('Tgl: .......................................', col2X, lineY + 7.5, { align: 'center' });
  doc.text('Tgl: .......................................', col3X, lineY + 7.5, { align: 'center' });

  // 7. Consistent Running Header (page >= 2) & Footer on EVERY page
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (p > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(30, 58, 138);
      doc.text('PT TRICENTRUM FORTUNA — LAPORAN EKSEKUTIF KUOTA & PEMBIAYAAN RICOH (LANJUTAN)', marginX, 9.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(`${periodSubtitle}   •   Dicetak: ${printDateStr}`, marginX, 13);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(marginX, 15, pageWidth - marginX, 15);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(148, 163, 184);
    doc.text('PT TRICENTRUM FORTUNA  •  Power Asset ICT  •  Ricoh Quota & Cost Control', marginX, pageHeight - 6.3);
    doc.text('Dokumen Resmi Manajemen — Internal Confidentiality', pageWidth / 2, pageHeight - 6.3, { align: 'center' });
    doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - marginX, pageHeight - 6.3, { align: 'right' });
  }

  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const tag = isCurrentMode ? 'SiklusAktif' : periodBoxLabel.replace(/[^a-zA-Z0-9_-]/g, '');
  doc.save(`Laporan_Eksekutif_Ricoh_${tag}_${yyyymmdd}.pdf`);
};

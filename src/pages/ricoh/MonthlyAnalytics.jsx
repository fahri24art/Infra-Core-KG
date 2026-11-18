import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Calendar, BarChart3, TrendingUp, Search, Filter, Download, FileText,
  Printer, Copy, Sparkles, DollarSign, Building2, Monitor, SlidersHorizontal, Layers
} from 'lucide-react';
import { generateRicohManagementPdf } from '../../utils/generateRicohManagementPdf';

const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString('id-ID');
const fmtRp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

const formatMonthLabelId = (ym) => {
  if (!ym) return '-';
  const parts = String(ym).substring(0, 7).split('-');
  if (parts.length < 2) return ym;
  const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const idx = parseInt(parts[1], 10) - 1;
  return `${names[idx] || parts[1]} ${parts[0]}`;
};

const MonthlyAnalytics = () => {
  const isPublic = typeof window !== 'undefined' && window.location.pathname.startsWith('/public');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mode: monthly or custom date range
  const [mode, setMode] = useState('monthly');
  const [customLogs, setCustomLogs] = useState([]);
  const [groupMultiMonth, setGroupMultiMonth] = useState(true);

  // Default to active month
  const d = new Date();
  const fallbackMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const [startMonth, setStartMonth] = useState(fallbackMonth);
  const [endMonth, setEndMonth] = useState(fallbackMonth);

  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('cost_desc');
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Kontrak PT. Sakura Jaya Solusi default (Non-PPN)
  const [billingConfig, setBillingConfig] = useState({
    rateBw: 100,
    rateColor: 1400,
    monthlyBaseFee: 1900000,
    freeBwPerMonth: 1000,
    freeColorPerMonth: 100,
    includeTax: false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, deptRes] = await Promise.all([
          axios.get('/api/ricoh/monthly-stats'),
          axios.get('/api/ricoh/monthly-logs'),
          axios.get('/api/ricoh/departments').catch(() => ({ data: [] }))
        ]);
        const sData = statsRes.data;
        setStats(sData);
        setLogs(logsRes.data || []);
        setDepartments(deptRes.data || []);

        if (sData?.billingCycle?.billingMonth) {
          setStartMonth(sData.billingCycle.billingMonth);
          setEndMonth(sData.billingCycle.billingMonth);
        }
        if (sData?.billingCycle?.startDate && sData?.billingCycle?.endDate) {
          setStartDate(sData.billingCycle.startDate);
          setEndDate(new Date().toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error('Error fetching monthly analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (mode === 'custom' && startDate && endDate) {
      const fetchCustom = async () => {
        try {
          const res = await axios.get(`/api/ricoh/custom-range-logs?start=${startDate}&end=${endDate}`);
          setCustomLogs(res.data || []);
        } catch (err) {
          console.error('Error fetching custom logs', err);
        }
      };
      fetchCustom();
    }
  }, [mode, startDate, endDate]);

  // Distinct available months (sorted newest first)
  const availableMonths = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => {
      const ym = String(l.month || '').substring(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) set.add(ym);
    });
    return [...set].sort().reverse();
  }, [logs]);

  // Period-filtered logs (before search filter, so Section I & II reflect full plant period unless searched)
  const periodLogs = useMemo(() => {
    let result = mode === 'monthly' ? [...logs] : [...customLogs];
    if (mode === 'monthly' && (startMonth || endMonth)) {
      result = result.filter((l) => {
        const ym = String(l.month || '').substring(0, 7);
        if (startMonth && ym < startMonth) return false;
        if (endMonth && ym > endMonth) return false;
        return true;
      });
    }
    return result;
  }, [logs, customLogs, mode, startMonth, endMonth]);

  // Search-filtered logs
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return periodLogs;
    const q = search.toLowerCase();
    return periodLogs.filter((l) =>
      (l.computer_name || '').toLowerCase().includes(q) ||
      (l.department_name || '').toLowerCase().includes(q) ||
      (l.month || '').toLowerCase().includes(q) ||
      (l.inventory_user_name || '').toLowerCase().includes(q) ||
      (!isPublic && (l.user_code || '').toLowerCase().includes(q))
    );
  }, [periodLogs, search, isPublic]);

  // Selected unique months in filtered range (for multi-month billing multiplier)
  const selectedMonthsList = useMemo(() => {
    if (mode !== 'monthly') return [];
    const set = new Set();
    periodLogs.forEach((l) => {
      const ym = String(l.month || '').substring(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) set.add(ym);
    });
    const arr = [...set].sort();
    if (arr.length > 0) return arr;
    return startMonth ? [startMonth] : [];
  }, [periodLogs, mode, startMonth]);

  const monthsCount = mode === 'monthly' ? Math.max(1, selectedMonthsList.length) : 1;

  // Aggregate rows per PC (1:1 identical with PDF Section III), or keep per-month rows when toggled off
  const deviceRows = useMemo(() => {
    const rateBw = Number(billingConfig.rateBw) || 0;
    const rateColor = Number(billingConfig.rateColor) || 0;

    let rows = [];
    if (mode === 'custom' || groupMultiMonth || monthsCount <= 1) {
      const map = {};
      filteredLogs.forEach((l) => {
        const key = (l.computer_name || '').toLowerCase().trim() || `row_${Math.random()}`;
        if (!map[key]) {
          map[key] = {
            id: key,
            month: monthsCount > 1 ? `${selectedMonthsList[0]} s/d ${selectedMonthsList[selectedMonthsList.length - 1]}` : (l.month || ''),
            computer_name: l.computer_name || '-',
            inventory_user_name: l.inventory_user_name || (l.inventory_contact ? l.inventory_contact.split('@')[0] : '-'),
            department_name: l.department_name || 'General',
            user_code: l.user_code || '-',
            bw_usage: 0,
            color_usage: 0,
            copier_bw_usage: 0,
            copier_color_usage: 0
          };
        }
        map[key].bw_usage += Number(l.bw_usage || 0);
        map[key].color_usage += Number(l.color_usage || 0);
        map[key].copier_bw_usage += Number(l.copier_bw_usage || 0);
        map[key].copier_color_usage += Number(l.copier_color_usage || 0);
      });
      rows = Object.values(map);
    } else {
      rows = filteredLogs.map((l, idx) => ({
        ...l,
        id: l.id || `${l.computer_name}_${idx}`,
        inventory_user_name: l.inventory_user_name || (l.inventory_contact ? l.inventory_contact.split('@')[0] : '-'),
        department_name: l.department_name || 'General',
        user_code: l.user_code || '-',
        bw_usage: Number(l.bw_usage || 0),
        color_usage: Number(l.color_usage || 0),
        copier_bw_usage: Number(l.copier_bw_usage || 0),
        copier_color_usage: Number(l.copier_color_usage || 0)
      }));
    }

    const enriched = rows.map((r) => {
      const bwAll = r.bw_usage + r.copier_bw_usage;
      const colAll = r.color_usage + r.copier_color_usage;
      const total = bwAll + colAll;
      const costBw = bwAll * rateBw;
      const costCol = colAll * rateColor;
      const costTotal = costBw + costCol;
      return { ...r, bwAll, colAll, total, costBw, costCol, costTotal };
    });

    enriched.sort((a, b) => {
      switch (sortBy) {
        case 'cost_desc':
          if (b.costTotal !== a.costTotal) return b.costTotal - a.costTotal;
          return b.total - a.total;
        case 'total_desc': return b.total - a.total;
        case 'total_asc': return a.total - b.total;
        case 'bw_desc': return b.bwAll - a.bwAll;
        case 'color_desc': return b.colAll - a.colAll;
        case 'name_asc': return (a.computer_name || '').localeCompare(b.computer_name || '');
        case 'month_desc': return (b.month || '').localeCompare(a.month || '');
        default: return b.costTotal - a.costTotal;
      }
    });

    return enriched;
  }, [filteredLogs, billingConfig, mode, groupMultiMonth, monthsCount, selectedMonthsList, sortBy]);

  // Global Totals + Vendor Contract Simulation + Department Breakdown (1:1 mirror of generateRicohManagementPdf.js)
  const reportSummary = useMemo(() => {
    const rateBw = Number(billingConfig.rateBw) || 0;
    const rateColor = Number(billingConfig.rateColor) || 0;
    const monthlyBaseFee = Number(billingConfig.monthlyBaseFee) || 0;
    const freeBwPerMonth = Number(billingConfig.freeBwPerMonth) || 0;
    const freeColorPerMonth = Number(billingConfig.freeColorPerMonth) || 0;
    const includeTax = billingConfig.includeTax === true;

    let printBW = 0, printColor = 0, copyBW = 0, copyColor = 0;
    let activeCount = 0;
    const deptMap = {};

    deviceRows.forEach((d) => {
      printBW += d.bw_usage;
      printColor += d.color_usage;
      copyBW += d.copier_bw_usage;
      copyColor += d.copier_color_usage;
      if (d.total > 0) activeCount += 1;

      const dName = d.department_name || 'General';
      if (!deptMap[dName]) {
        deptMap[dName] = {
          name: dName,
          pcs: new Set(),
          printBW: 0, printColor: 0, copyBW: 0, copyColor: 0,
          costBw: 0, costCol: 0, costTotal: 0
        };
      }
      deptMap[dName].pcs.add((d.computer_name || '').toLowerCase());
      deptMap[dName].printBW += d.bw_usage;
      deptMap[dName].printColor += d.color_usage;
      deptMap[dName].copyBW += d.copier_bw_usage;
      deptMap[dName].copyColor += d.copier_color_usage;
      deptMap[dName].costBw += d.costBw;
      deptMap[dName].costCol += d.costCol;
      deptMap[dName].costTotal += d.costTotal;
    });

    const totalPrint = printBW + printColor;
    const totalCopy = copyBW + copyColor;
    const bwAll = printBW + copyBW;
    const colAll = printColor + copyColor;
    const grandTotal = totalPrint + totalCopy;

    const grossBw = bwAll * rateBw;
    const grossCol = colAll * rateColor;
    const grossTotal = grossBw + grossCol;
    const colCostSharePct = grossTotal > 0 ? ((grossCol / grossTotal) * 100).toFixed(1) : '0.0';

    const freeBw = Math.round(freeBwPerMonth * monthsCount);
    const freeCol = Math.round(freeColorPerMonth * monthsCount);
    const billableBw = Math.max(0, bwAll - freeBw);
    const billableCol = Math.max(0, colAll - freeCol);
    const baseFee = Math.round(monthlyBaseFee * monthsCount);
    const overBwFee = billableBw * rateBw;
    const overColFee = billableCol * rateColor;
    const subTotalBill = baseFee + overBwFee + overColFee;
    const dppLain = Math.round(subTotalBill * (11 / 12));
    const ppn12 = Math.round(dppLain * 0.12);
    const pph23 = Math.round(subTotalBill * 0.02);
    const finalTotalBill = includeTax ? (subTotalBill + ppn12 - pph23) : subTotalBill;

    const deptRows = Object.values(deptMap)
      .map((dept) => {
        const totPrt = dept.printBW + dept.printColor;
        const totCpy = dept.copyBW + dept.copyColor;
        const totAll = totPrt + totCpy;
        const sharePct = grossTotal > 0 ? ((dept.costTotal / grossTotal) * 100).toFixed(1) : '0.0';
        return {
          ...dept,
          pcCount: dept.pcs.size,
          totPrt,
          totCpy,
          totAll,
          sharePct
        };
      })
      .sort((a, b) => b.costTotal - a.costTotal);

    return {
      activeCount,
      printBW, printColor, copyBW, copyColor,
      totalPrint, totalCopy, bwAll, colAll, grandTotal,
      grossBw, grossCol, grossTotal, colCostSharePct,
      freeBw, freeCol, billableBw, billableCol,
      baseFee, overBwFee, overColFee, subTotalBill,
      dppLain, ppn12, pph23, finalTotalBill, includeTax,
      deptRows
    };
  }, [deviceRows, billingConfig, monthsCount]);

  // Period display label
  const periodDisplayLabel = useMemo(() => {
    if (mode === 'custom') return `Rentang Harian: ${startDate} s/d ${endDate}`;
    if (selectedMonthsList.length > 1) {
      return `Arsip Multi-Bulan: ${formatMonthLabelId(selectedMonthsList[0])} s/d ${formatMonthLabelId(selectedMonthsList[selectedMonthsList.length - 1])} (${selectedMonthsList.length} Siklus)`;
    }
    const targetM = selectedMonthsList[0] || endMonth || startMonth;
    const isCurr = targetM === stats?.billingCycle?.billingMonth;
    return isCurr
      ? `Siklus Aktif: ${formatMonthLabelId(targetM)} (${stats?.billingCycle?.label || 'Tgl 21 – Berjalan'})`
      : `Arsip Bulanan: ${formatMonthLabelId(targetM)}`;
  }, [mode, startDate, endDate, selectedMonthsList, startMonth, endMonth, stats]);

  const handleQuickMonth = (preset) => {
    setMode('monthly');
    const activeM = stats?.billingCycle?.billingMonth || fallbackMonth;
    if (preset === 'active') {
      setStartMonth(activeM);
      setEndMonth(activeM);
    } else if (preset === 'prev') {
      const prevM = availableMonths.find((m) => m < activeM) || activeM;
      setStartMonth(prevM);
      setEndMonth(prevM);
    } else if (preset === '3m') {
      const sorted = [...availableMonths].sort();
      const slice = sorted.slice(-3);
      if (slice.length > 0) {
        setStartMonth(slice[0]);
        setEndMonth(slice[slice.length - 1]);
      }
    } else if (preset === 'all') {
      const sorted = [...availableMonths].sort();
      if (sorted.length > 0) {
        setStartMonth(sorted[0]);
        setEndMonth(sorted[sorted.length - 1]);
      }
    }
  };

  // CSV Export with exact PDF columns + Vendor Cost Summary (PIN omitted on public routes)
  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `LAPORAN PEMAKAIAN & PEMBIAYAAN RICOH (${periodDisplayLabel})\n`;
    csvContent += isPublic
      ? 'No,Nama Komputer,Pengguna / PIC,Departemen,Print BW,Print Color,Copy BW,Copy Color,Total Pakai,Biaya BW (Rp),Biaya Color (Rp),Total Biaya (Rp),Porsi %\n'
      : 'No,Nama Komputer,Pengguna / PIC,Departemen,PIN,Print BW,Print Color,Copy BW,Copy Color,Total Pakai,Biaya BW (Rp),Biaya Color (Rp),Total Biaya (Rp),Porsi %\n';

    deviceRows.forEach((r, idx) => {
      const sharePct = reportSummary.grossTotal > 0 ? ((r.costTotal / reportSummary.grossTotal) * 100).toFixed(1) : '0.0';
      const row = [
        idx + 1,
        r.computer_name,
        r.inventory_user_name || '-',
        r.department_name || 'General',
        ...(isPublic ? [] : [r.user_code || '-']),
        r.bw_usage,
        r.color_usage,
        r.copier_bw_usage,
        r.copier_color_usage,
        r.total,
        r.costBw,
        r.costCol,
        r.costTotal,
        `${sharePct}%`
      ];
      csvContent += row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const totalRow = [
      'TOTAL', '', '', ...(isPublic ? [''] : ['', '']),
      reportSummary.printBW,
      reportSummary.printColor,
      reportSummary.copyBW,
      reportSummary.copyColor,
      reportSummary.grandTotal,
      reportSummary.grossBw,
      reportSummary.grossCol,
      reportSummary.grossTotal,
      '100.0%'
    ];
    csvContent += totalRow.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n\n';
    csvContent += `"SIMULASI TAGIHAN SAKURA (${billingConfig.includeTax ? 'PPN 12% - PPh 23' : 'NON PPN'})",,,,\n`;
    csvContent += `"Sewa Minimum (${monthsCount} bln incl. Free ${reportSummary.freeBw} BW & ${reportSummary.freeCol} Col)",${reportSummary.baseFee}\n`;
    csvContent += `"Over Pemakaian B/W (${reportSummary.billableBw} lbr x Rp ${billingConfig.rateBw})",${reportSummary.overBwFee}\n`;
    csvContent += `"Over Pemakaian Color (${reportSummary.billableCol} lbr x Rp ${billingConfig.rateColor})",${reportSummary.overColFee}\n`;
    csvContent += `"TOTAL ESTIMASI TAGIHAN",${reportSummary.finalTotalBill}\n`;

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      mode === 'monthly'
        ? `Ricoh_Executive_Report_${startMonth}_to_${endMonth}.csv`
        : `Ricoh_Executive_Report_${startDate}_to_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Identical Executive Management PDF generator
  const exportToPDF = async () => {
    setPdfGenerating(true);
    try {
      const pdfDevices = deviceRows.map((r) => ({
        computer_name: r.computer_name,
        inventory_user_name: r.inventory_user_name,
        department_name: r.department_name,
        user_code: r.user_code,
        status: 'active',
        monthly_quota_bw: 0,
        monthly_quota_color: 0,
        monthly_quota_copier_bw: 0,
        monthly_quota_copier_color: 0,
        current_usage_bw: r.bw_usage,
        current_usage_color: r.color_usage,
        current_usage_copier_bw: r.copier_bw_usage,
        current_usage_copier_color: r.copier_color_usage
      }));

      const queryOrg = new URLSearchParams(window.location.search).get('org')
        || localStorage.getItem('organization')
        || 'TCF-SG';
      const orgLabel = queryOrg === 'TCF-KG' ? 'PLANT KARAWANG' : 'PLANT SADANG - PURWAKARTA';

      const monthlyBreakdownMap = {};
      const deptMonthlyMap = {};
      if (mode === 'monthly') {
        filteredLogs.forEach((l) => {
          const ym = String(l.month || '').substring(0, 7);
          if (!/^\d{4}-\d{2}$/.test(ym)) return;
          const bw = Number(l.bw_usage || 0);
          const col = Number(l.color_usage || 0);
          const cbw = Number(l.copier_bw_usage || 0);
          const ccol = Number(l.copier_color_usage || 0);
          const tot = bw + col + cbw + ccol;

          if (!monthlyBreakdownMap[ym]) {
            monthlyBreakdownMap[ym] = { month: ym, bw: 0, color: 0, copier_bw: 0, copier_color: 0, total: 0 };
          }
          monthlyBreakdownMap[ym].bw += bw;
          monthlyBreakdownMap[ym].color += col;
          monthlyBreakdownMap[ym].copier_bw += cbw;
          monthlyBreakdownMap[ym].copier_color += ccol;
          monthlyBreakdownMap[ym].total += tot;

          const dept = String(l.department_name || 'General').trim() || 'General';
          if (!deptMonthlyMap[dept]) {
            deptMonthlyMap[dept] = { department: dept, total: 0, months: {} };
          }
          if (!deptMonthlyMap[dept].months[ym]) {
            deptMonthlyMap[dept].months[ym] = { bw: 0, color: 0, copier_bw: 0, copier_color: 0, total: 0 };
          }
          deptMonthlyMap[dept].months[ym].bw += bw;
          deptMonthlyMap[dept].months[ym].color += col;
          deptMonthlyMap[dept].months[ym].copier_bw += cbw;
          deptMonthlyMap[dept].months[ym].copier_color += ccol;
          deptMonthlyMap[dept].months[ym].total += tot;
          deptMonthlyMap[dept].total += tot;
        });
      }
      const monthlyBreakdown = Object.values(monthlyBreakdownMap).sort((a, b) => a.month.localeCompare(b.month));
      const deptMonthlyBreakdown = Object.values(deptMonthlyMap).sort((a, b) => b.total - a.total);

      const reportMeta = mode === 'monthly'
        ? {
            mode: 'months',
            orgName: orgLabel,
            selectedMonths: selectedMonthsList.length > 0 ? selectedMonthsList : [startMonth],
            monthsCount,
            monthlyBreakdown,
            deptMonthlyBreakdown,
            shortTag: `${monthsCount} Siklus Bln`,
            hidePin: isPublic
          }
        : {
            mode: 'custom',
            orgName: orgLabel,
            startDate,
            startTime: '00:00',
            endDate,
            endTime: '23:59',
            monthsCount: 1,
            dailyCopierCaveat: startDate < '2026-09-24',
            hidePin: isPublic
          };

      await generateRicohManagementPdf({
        devices: pdfDevices,
        departments,
        reportMeta,
        billingConfig
      });
    } catch (err) {
      console.error('Failed to generate Executive PDF:', err);
      alert('Gagal membuat PDF Eksekutif: ' + err.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  const quickCardCost = (mObj) => {
    const bw = Number(mObj?.bw || 0) + Number(mObj?.cbw || 0);
    const col = Number(mObj?.color || 0) + Number(mObj?.ccolor || 0);
    const bill = (Number(billingConfig.monthlyBaseFee) || 1900000)
      + Math.max(0, bw - (Number(billingConfig.freeBwPerMonth) || 1000)) * (Number(billingConfig.rateBw) || 100)
      + Math.max(0, col - (Number(billingConfig.freeColorPerMonth) || 100)) * (Number(billingConfig.rateColor) || 1400);
    return bill;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider animate-pulse flex flex-col items-center gap-3">
        <Sparkles size={24} className="text-blue-500 animate-spin" />
        <span>Loading Monthly Analytics & Cost Summary...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Quick Top Benchmarks (This Cycle, Prev Month, YTD) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <Calendar size={14} /> Siklus Aktif ({stats?.billingCycle?.billingMonth || '-'})
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {fmtRp(quickCardCost(stats?.thisMonth))}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {fmtNum((stats?.thisMonth?.bw || 0) + (stats?.thisMonth?.color || 0) + (stats?.thisMonth?.cbw || 0) + (stats?.thisMonth?.ccolor || 0))}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">lembar</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-semibold">
            Prt {fmtNum(stats?.thisMonth?.bw)}/{fmtNum(stats?.thisMonth?.color)} • Cpy BW {fmtNum(stats?.thisMonth?.cbw)} | Col {fmtNum(stats?.thisMonth?.ccolor)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BarChart3 size={14} /> Siklus Sebelumnya ({stats?.prevBillingCycle?.billingMonth || '-'})
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {fmtRp(quickCardCost(stats?.lastMonth))}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {fmtNum((stats?.lastMonth?.bw || 0) + (stats?.lastMonth?.color || 0) + (stats?.lastMonth?.cbw || 0) + (stats?.lastMonth?.ccolor || 0))}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">lembar</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-semibold">
            Prt {fmtNum(stats?.lastMonth?.bw)}/{fmtNum(stats?.lastMonth?.color)} • Cpy BW {fmtNum(stats?.lastMonth?.cbw)} | Col {fmtNum(stats?.lastMonth?.ccolor)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <TrendingUp size={14} /> Akumulasi Tahun Berjalan
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              YTD {availableMonths.length} Bln
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {fmtNum((stats?.thisYear?.bw || 0) + (stats?.thisYear?.color || 0) + (stats?.thisYear?.cbw || 0) + (stats?.thisYear?.ccolor || 0))}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">lembar</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-semibold">
            Prt {fmtNum(stats?.thisYear?.bw)}/{fmtNum(stats?.thisYear?.color)} • Cpy BW {fmtNum(stats?.thisYear?.cbw)} | Col {fmtNum(stats?.thisYear?.ccolor)}
          </p>
        </div>
      </div>

      {/* Filter & Export Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setMode('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'monthly' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setMode('custom')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'custom' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Harian
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Dari</span>
              <input
                type={mode === 'monthly' ? 'month' : 'date'}
                value={mode === 'monthly' ? startMonth : startDate}
                onChange={(e) => mode === 'monthly' ? setStartMonth(e.target.value) : setStartDate(e.target.value)}
                className="bg-transparent text-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Sampai</span>
              <input
                type={mode === 'monthly' ? 'month' : 'date'}
                value={mode === 'monthly' ? endMonth : endDate}
                onChange={(e) => mode === 'monthly' ? setEndMonth(e.target.value) : setEndDate(e.target.value)}
                className="bg-transparent text-slate-800 outline-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button onClick={() => handleQuickMonth('active')} className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer">Aktif</button>
              <button onClick={() => handleQuickMonth('prev')} className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer">Bulan Lalu</button>
              <button onClick={() => handleQuickMonth('3m')} className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer">3 Bln</button>
              <button onClick={() => handleQuickMonth('all')} className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer">Semua</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder={isPublic ? 'Cari PC, PIC, dept...' : 'Cari PC, PIC, dept, PIN...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700">
              <Filter size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent outline-none cursor-pointer"
              >
                <option value="cost_desc">Biaya Tertinggi (Sama PDF)</option>
                <option value="total_desc">Volume Terbanyak</option>
                <option value="bw_desc">B/W Terbanyak</option>
                <option value="color_desc">Color Terbanyak</option>
                <option value="name_asc">A-Z (Nama PC)</option>
                <option value="total_asc">Volume Terkecil</option>
              </select>
            </div>

            <button
              onClick={() => setShowBillingPanel((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showBillingPanel ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Tarif Sakura</span>
            </button>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <FileText size={14} />
              <span>Excel</span>
            </button>
            <button
              onClick={exportToPDF}
              disabled={pdfGenerating || deviceRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <Download size={14} />
              <span>{pdfGenerating ? 'Membuat...' : 'PDF Eksekutif'}</span>
            </button>
          </div>
        </div>

        {/* Optional Collapsible Sakura Contract Config */}
        {showBillingPanel && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Tarif B/W (Rp)</label>
              <input type="number" value={billingConfig.rateBw} onChange={(e) => setBillingConfig((p) => ({ ...p, rateBw: Number(e.target.value) || 0 }))} className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Tarif Color (Rp)</label>
              <input type="number" value={billingConfig.rateColor} onChange={(e) => setBillingConfig((p) => ({ ...p, rateColor: Number(e.target.value) || 0 }))} className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Sewa / Bln (Rp)</label>
              <input type="number" value={billingConfig.monthlyBaseFee} onChange={(e) => setBillingConfig((p) => ({ ...p, monthlyBaseFee: Number(e.target.value) || 0 }))} className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Free B/W / Bln</label>
              <input type="number" value={billingConfig.freeBwPerMonth} onChange={(e) => setBillingConfig((p) => ({ ...p, freeBwPerMonth: Number(e.target.value) || 0 }))} className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block">Free Color / Bln</label>
              <input type="number" value={billingConfig.freeColorPerMonth} onChange={(e) => setBillingConfig((p) => ({ ...p, freeColorPerMonth: Number(e.target.value) || 0 }))} className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white font-bold" />
            </div>
            <label className="flex items-center gap-2 font-bold text-slate-700 pb-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={billingConfig.includeTax}
                onChange={(e) => setBillingConfig((p) => ({ ...p, includeTax: e.target.checked }))}
                className="rounded border-slate-300 text-emerald-600"
              />
              <span>+ PPN 12% &amp; PPh 23</span>
            </label>
          </div>
        )}
      </div>

      {/* Period Banner + 4 Exact Executive KPI Cards (Mirrors Page 1 Top Header of Management PDF) */}
      <div className="bg-slate-900 text-white rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
            Laporan Eksekutif Pemakaian &amp; Pembiayaan Ricoh
          </span>
          <h3 className="text-sm font-black tracking-tight">{periodDisplayLabel}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200">
            Vendor: PT. Sakura Jaya Solusi
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
            Tarif: B/W {fmtRp(billingConfig.rateBw)} | Color {fmtRp(billingConfig.rateColor)} ({billingConfig.includeTax ? 'Dengan Pajak' : 'Non-PPN'})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 border-t-4 border-t-blue-600 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Perangkat &amp; Aktivitas</p>
          <p className="text-xl font-black text-slate-900 mt-1">{deviceRows.length} Unit ({reportSummary.activeCount} Aktif)</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Rentang: {mode === 'monthly' ? `${monthsCount} Siklus Bln` : 'Custom Tanggal'}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 border-t-4 border-t-indigo-600 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Volume Cetak &amp; Copy</p>
          <p className="text-xl font-black text-slate-900 mt-1">{fmtNum(reportSummary.grandTotal)} Lembar</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Prt {fmtNum(reportSummary.printBW)}/{fmtNum(reportSummary.printColor)} | Cpy BW {fmtNum(reportSummary.copyBW)} | Col {fmtNum(reportSummary.copyColor)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 border-t-4 border-t-amber-500 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Biaya Klik Pemakaian (Gross)</p>
          <p className="text-xl font-black text-slate-900 mt-1">{fmtRp(reportSummary.grossTotal)}</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            B/W: {fmtRp(reportSummary.grossBw)} | Col: {fmtRp(reportSummary.grossCol)} ({reportSummary.colCostSharePct}%)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 border-t-4 border-t-emerald-600 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estimasi Tagihan Sewa + Klik</p>
          <p className="text-xl font-black text-emerald-700 mt-1">{fmtRp(reportSummary.finalTotalBill)}</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Termasuk Sewa {fmtRp(reportSummary.baseFee)} ({billingConfig.includeTax ? 'Nett + Pajak' : 'Non-PPN'})
          </p>
        </div>
      </div>

      {/* SECTION I: REKAPITULASI PEMAKAIAN & BIAYA PER DEPARTEMEN (Mirrors PDF Section I) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Building2 size={15} className="text-blue-600" />
            I. Rekapitulasi Pemakaian &amp; Biaya Per Departemen (Copy B/W &amp; Color Terpisah)
          </h4>
          <span className="text-[11px] font-bold text-slate-500">{reportSummary.deptRows.length} Departemen</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#1E3A8A] text-white font-bold uppercase tracking-wider text-[10px]">
                <th className="px-3 py-2.5 text-center">No</th>
                <th className="px-3 py-2.5">Departemen</th>
                <th className="px-3 py-2.5 text-center">PC</th>
                <th className="px-3 py-2.5 text-right">Print B/W</th>
                <th className="px-3 py-2.5 text-right">Print Color</th>
                <th className="px-3 py-2.5 text-right">Copy B/W</th>
                <th className="px-3 py-2.5 text-right">Copy Color</th>
                <th className="px-3 py-2.5 text-right">Total Print</th>
                <th className="px-3 py-2.5 text-right">Total Copy</th>
                <th className="px-3 py-2.5 text-right">Grand Total</th>
                <th className="px-3 py-2.5 text-right">Biaya B/W</th>
                <th className="px-3 py-2.5 text-right">Biaya Color</th>
                <th className="px-3 py-2.5 text-right">Total Biaya</th>
                <th className="px-3 py-2.5 text-right">Porsi %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportSummary.deptRows.map((dept, idx) => (
                <tr key={dept.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-900">{dept.name}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-slate-600">{dept.pcCount}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{fmtNum(dept.printBW)}</td>
                  <td className="px-3 py-2.5 text-right text-indigo-600 font-semibold">{fmtNum(dept.printColor)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{fmtNum(dept.copyBW)}</td>
                  <td className="px-3 py-2.5 text-right text-indigo-600 font-semibold">{fmtNum(dept.copyColor)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">{fmtNum(dept.totPrt)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">{fmtNum(dept.totCpy)}</td>
                  <td className="px-3 py-2.5 text-right font-black text-slate-900">{fmtNum(dept.totAll)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{fmtRp(dept.costBw)}</td>
                  <td className="px-3 py-2.5 text-right text-purple-700 font-semibold">{fmtRp(dept.costCol)}</td>
                  <td className="px-3 py-2.5 text-right font-black text-emerald-700">{fmtRp(dept.costTotal)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-700">{dept.sharePct}%</td>
                </tr>
              ))}
              {reportSummary.deptRows.length > 0 && (
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5">TOTAL KESELURUHAN</td>
                  <td className="px-3 py-2.5 text-center">{deviceRows.length}</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(reportSummary.printBW)}</td>
                  <td className="px-3 py-2.5 text-right text-indigo-700">{fmtNum(reportSummary.printColor)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(reportSummary.copyBW)}</td>
                  <td className="px-3 py-2.5 text-right text-indigo-700">{fmtNum(reportSummary.copyColor)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(reportSummary.totalPrint)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(reportSummary.totalCopy)}</td>
                  <td className="px-3 py-2.5 text-right text-blue-700">{fmtNum(reportSummary.grandTotal)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtRp(reportSummary.grossBw)}</td>
                  <td className="px-3 py-2.5 text-right text-purple-700">{fmtRp(reportSummary.grossCol)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-800">{fmtRp(reportSummary.grossTotal)}</td>
                  <td className="px-3 py-2.5 text-right">100.0%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION II: SIMULASI RINCIAN PEMBIAYAAN VENDOR (Mirrors PDF Section II) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <DollarSign size={15} className="text-emerald-600" />
            II. Simulasi Rincian Pembiayaan Vendor (Acuan Invoice Kontrak PT. Sakura Jaya Solusi)
          </h4>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {billingConfig.includeTax ? 'Mode Dengan PPN 12% & PPh 23' : 'Mode Non-PPN (Sebelum Pajak)'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0F172A] text-white font-bold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-2.5 text-center w-12">No</th>
                <th className="px-4 py-2.5">Komponen Biaya Kontrak Sewa &amp; Click Charge Ricoh</th>
                <th className="px-4 py-2.5 text-right">Volume Terhitung</th>
                <th className="px-4 py-2.5 text-right">Tarif Satuan</th>
                <th className="px-4 py-2.5 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-center font-bold text-slate-500">1</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">
                  Biaya Sewa Minimum Mesin ({monthsCount} Siklus Bln — Incl. Free {fmtNum(reportSummary.freeBw)} lbr B/W &amp; {fmtNum(reportSummary.freeCol)} lbr Color)
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-700">{monthsCount} bln</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmtRp(billingConfig.monthlyBaseFee)}</td>
                <td className="px-4 py-2.5 text-right font-black text-slate-900">{fmtRp(reportSummary.baseFee)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-center font-bold text-slate-500">2</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">
                  Pemakaian B/W (Print {fmtNum(reportSummary.printBW)} + Copy {fmtNum(reportSummary.copyBW)} = {fmtNum(reportSummary.bwAll)} lbr) - Free Min {fmtNum(reportSummary.freeBw)} lbr
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-700">{fmtNum(reportSummary.billableBw)} lbr</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmtRp(billingConfig.rateBw)}</td>
                <td className="px-4 py-2.5 text-right font-black text-slate-900">{fmtRp(reportSummary.overBwFee)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-center font-bold text-slate-500">3</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">
                  Pemakaian Color (Print {fmtNum(reportSummary.printColor)} + Copy {fmtNum(reportSummary.copyColor)} = {fmtNum(reportSummary.colAll)} lbr) - Free Min {fmtNum(reportSummary.freeCol)} lbr
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-700">{fmtNum(reportSummary.billableCol)} lbr</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{fmtRp(billingConfig.rateColor)}</td>
                <td className="px-4 py-2.5 text-right font-black text-slate-900">{fmtRp(reportSummary.overColFee)}</td>
              </tr>

              {billingConfig.includeTax ? (
                <>
                  <tr className="bg-slate-50 font-bold text-slate-800">
                    <td></td>
                    <td colSpan="3" className="px-4 py-2">Sub Total (Sewa + Pemakaian Klik Sebelum Pajak)</td>
                    <td className="px-4 py-2 text-right">{fmtRp(reportSummary.subTotalBill)}</td>
                  </tr>
                  <tr className="bg-slate-50 text-slate-600">
                    <td></td>
                    <td colSpan="3" className="px-4 py-2">DPP Nilai Lain (11/12) — PPN 12% (+) {fmtRp(reportSummary.ppn12)} | PPh 23 2% (-) {fmtRp(reportSummary.pph23)}</td>
                    <td className="px-4 py-2 text-right font-bold">+{fmtRp(reportSummary.ppn12 - reportSummary.pph23)}</td>
                  </tr>
                  <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-black text-emerald-800 text-sm">
                    <td></td>
                    <td colSpan="3" className="px-4 py-3">ESTIMASI NETT TRANSFER VENDOR (SETELAH PPN 12% &amp; PPh 23)</td>
                    <td className="px-4 py-3 text-right">{fmtRp(reportSummary.finalTotalBill)}</td>
                  </tr>
                </>
              ) : (
                <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-black text-emerald-800 text-sm">
                  <td></td>
                  <td colSpan="3" className="px-4 py-3">TOTAL ESTIMASI BIAYA (SEWA + PEMAKAIAN KLIK — NON PPN)</td>
                  <td className="px-4 py-3 text-right">{fmtRp(reportSummary.finalTotalBill)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] italic text-slate-500">
          * Catatan: Biaya di atas dihitung dari total output PC/PIN terlacak sistem. Cetak langsung mesin tanpa PIN (direct/scan-copy fisik/admin) tetap terhitung pada counter invoice vendor.
        </div>
      </div>

      {/* SECTION III: RINCIAN LENGKAP PER PERANGKAT & KARYAWAN (Mirrors PDF Section III) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Monitor size={15} className="text-indigo-600" />
            III. Rincian Lengkap Per Perangkat &amp; Karyawan (Copy B/W &amp; Copy Color Terpisah + Biaya)
          </h4>
          <div className="flex items-center gap-2">
            {mode === 'monthly' && monthsCount > 1 && (
              <button
                onClick={() => setGroupMultiMonth((v) => !v)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1"
              >
                <Layers size={12} />
                {groupMultiMonth ? 'Mode: Gabung Per PC (Sama PDF)' : 'Mode: Rinci Per Bulan'}
              </button>
            )}
            <span className="text-[11px] font-bold text-slate-500">{deviceRows.length} Baris</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0F172A] text-white font-bold uppercase tracking-wider text-[10px]">
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5">Nama Komputer</th>
                <th className="px-3 py-2.5">Pengguna / PIC</th>
                <th className="px-3 py-2.5">Departemen</th>
                {!isPublic && <th className="px-3 py-2.5 text-center">PIN</th>}
                <th className="px-3 py-2.5 text-right">Print B/W</th>
                <th className="px-3 py-2.5 text-right">Print Color</th>
                <th className="px-3 py-2.5 text-right">Copy B/W</th>
                <th className="px-3 py-2.5 text-right">Copy Color</th>
                <th className="px-3 py-2.5 text-right">Total Pakai</th>
                <th className="px-3 py-2.5 text-right">Biaya B/W</th>
                <th className="px-3 py-2.5 text-right">Biaya Color</th>
                <th className="px-3 py-2.5 text-right">Total Biaya</th>
                <th className="px-3 py-2.5 text-right">Porsi %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deviceRows.map((row, index) => {
                const sharePct = reportSummary.grossTotal > 0 ? ((row.costTotal / reportSummary.grossTotal) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={row.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-900">{row.computer_name}</div>
                      {!groupMultiMonth && monthsCount > 1 && (
                        <span className="text-[10px] font-mono text-slate-400">{String(row.month || '').substring(0, 7)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{row.inventory_user_name || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {row.department_name || 'General'}
                      </span>
                    </td>
                    {!isPublic && (
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600">{row.user_code || '-'}</td>
                    )}
                    <td className="px-3 py-2.5 text-right text-slate-700">{fmtNum(row.bw_usage)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-indigo-600">{fmtNum(row.color_usage)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{fmtNum(row.copier_bw_usage)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-indigo-600">{fmtNum(row.copier_color_usage)}</td>
                    <td className="px-3 py-2.5 text-right font-black text-slate-900">{fmtNum(row.total)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{fmtRp(row.costBw)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-purple-700">{fmtRp(row.costCol)}</td>
                    <td className="px-3 py-2.5 text-right font-black text-emerald-700">{fmtRp(row.costTotal)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-700">{sharePct}%</td>
                  </tr>
                );
              })}

              {deviceRows.length > 0 && (
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                  <td colSpan={isPublic ? 4 : 5} className="px-3 py-2.5">TOTAL KESELURUHAN ({deviceRows.length} Unit)</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(reportSummary.printBW)}</td>
                  <td className="px-3 py-2.5 text-right text-indigo-700">{fmtNum(reportSummary.printColor)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(reportSummary.copyBW)}</td>
                  <td className="px-3 py-2.5 text-right text-indigo-700">{fmtNum(reportSummary.copyColor)}</td>
                  <td className="px-3 py-2.5 text-right text-blue-700">{fmtNum(reportSummary.grandTotal)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtRp(reportSummary.grossBw)}</td>
                  <td className="px-3 py-2.5 text-right text-purple-700">{fmtRp(reportSummary.grossCol)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-800">{fmtRp(reportSummary.grossTotal)}</td>
                  <td className="px-3 py-2.5 text-right">100.0%</td>
                </tr>
              )}

              {deviceRows.length === 0 && (
                <tr>
                  <td colSpan={isPublic ? 13 : 14} className="px-6 py-12 text-center text-slate-400 font-bold">
                    Tidak ada data pemakaian Ricoh pada periode filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default MonthlyAnalytics;

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Calendar, BarChart3, TrendingUp, Search, Filter, Download, FileText, Printer, Copy, Sparkles, ChevronRight, Layers } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import TCFLogo from '../../assets/Logo_TCF_Sec_Processed.png';

const MonthlyAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Mode: monthly or custom
  const [mode, setMode] = useState('monthly');
  const [customLogs, setCustomLogs] = useState([]);

  // Date range defaults to current month
  const d = new Date();
  const currentMonthValue = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const [startMonth, setStartMonth] = useState(currentMonthValue);
  const [endMonth, setEndMonth] = useState(currentMonthValue);

  // Custom date range defaults to current month boundaries
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total_desc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          axios.get('/api/ricoh/monthly-stats'),
          axios.get('/api/ricoh/monthly-logs')
        ]);
        setStats(statsRes.data);
        setLogs(logsRes.data);
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
          setCustomLogs(res.data);
        } catch (err) {
          console.error('Error fetching custom logs', err);
        }
      };
      fetchCustom();
    }
  }, [mode, startDate, endDate]);

  const processedLogs = useMemo(() => {
    let result = mode === 'monthly' ? [...logs] : [...customLogs];

    if (mode === 'monthly' && (startMonth || endMonth)) {
      result = result.filter(l => {
        const logMonthStr = (l.month || '').substring(0, 7); 
        if (startMonth && logMonthStr < startMonth) return false;
        if (endMonth && logMonthStr > endMonth) return false;
        return true;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => 
        (l.computer_name || '').toLowerCase().includes(q) ||
        (l.department_name || '').toLowerCase().includes(q) ||
        (l.month || '').toLowerCase().includes(q) ||
        (l.inventory_user_name || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const totalA = Number(a.bw_usage || 0) + Number(a.color_usage || 0) + Number(a.copier_bw_usage || 0) + Number(a.copier_color_usage || 0);
      const totalB = Number(b.bw_usage || 0) + Number(b.color_usage || 0) + Number(b.copier_bw_usage || 0) + Number(b.copier_color_usage || 0);
      
      switch (sortBy) {
        case 'total_desc': return totalB - totalA;
        case 'total_asc': return totalA - totalB;
        case 'bw_desc': return Number(b.bw_usage || 0) - Number(a.bw_usage || 0);
        case 'color_desc': return Number(b.color_usage || 0) - Number(a.color_usage || 0);
        case 'name_asc': return (a.computer_name || '').localeCompare(b.computer_name || '');
        case 'month_desc': return (b.month || '').localeCompare(a.month || '');
        default: return totalB - totalA;
      }
    });

    return result;
  }, [logs, customLogs, mode, search, startMonth, endMonth, startDate, endDate, sortBy]);

  const totals = useMemo(() => {
    let printBW = 0;
    let printColor = 0;
    let copyBW = 0;
    let copyColor = 0;

    processedLogs.forEach(log => {
      printBW += Number(log.bw_usage || 0);
      printColor += Number(log.color_usage || 0);
      copyBW += Number(log.copier_bw_usage || 0);
      copyColor += Number(log.copier_color_usage || 0);
    });

    return {
      printBW,
      printColor,
      copyBW,
      copyColor,
      totalPrint: printBW + printColor,
      totalCopy: copyBW + copyColor,
      grandTotal: printBW + printColor + copyBW + copyColor
    };
  }, [processedLogs]);

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Month,Computer/User,Department,Print BW,Print Color,Copy BW,Copy Color,Total\n";

    processedLogs.forEach(log => {
      const row = [
        log.month || '',
        (log.computer_name || '') + (log.inventory_user_name ? ` (${log.inventory_user_name})` : ''),
        log.department_name || 'Unassigned',
        Number(log.bw_usage || 0),
        Number(log.color_usage || 0),
        Number(log.copier_bw_usage || 0),
        Number(log.copier_color_usage || 0),
        Number(log.bw_usage || 0) + Number(log.color_usage || 0) + Number(log.copier_bw_usage || 0) + Number(log.copier_color_usage || 0)
      ];
      const escapedRow = row.map(v => `"${String(v).replace(/"/g, '""')}"`);
      csvContent += escapedRow.join(",") + "\n";
    });

    const totalRow = [
      "GRAND TOTAL",
      "",
      "",
      totals.printBW,
      totals.printColor,
      totals.copyBW,
      totals.copyColor,
      totals.grandTotal
    ];
    csvContent += totalRow.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = mode === 'monthly' 
      ? `Ricoh_Monthly_Report_${startMonth || 'All'}_to_${endMonth || 'All'}.csv`
      : `Ricoh_Custom_Report_${startDate}_to_${endDate}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    const org = localStorage.getItem('organization') || 'TCF-SG';
    const isSG = org === 'TCF-SG';
    const plantName = isSG ? "Plant Sadang" : "Plant Karawang";
    const companyName = "PT Tricentrum Fortuna";
    
    const logoImg = new Image();
    logoImg.src = TCFLogo;
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });

    try {
      doc.addImage(logoImg, 'PNG', 14, 10, 25, 25);
    } catch (e) {
      console.warn("Failed to add logo to PDF");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(companyName, 42, 16);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`(${plantName})`, 42, 22);
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Ricoh Usage Report", 42, 30);
    
    const formatMonthYear = (dateString) => {
      if (!dateString) return '';
      const [year, month] = dateString.split('-');
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const monthIndex = parseInt(month, 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `Bulan ${monthNames[monthIndex]} ${year}`;
      }
      return dateString;
    };

    let periodText = "";
    if (mode === 'monthly') {
      periodText = `Periode: ${formatMonthYear(endMonth)}`;
    } else {
      const endYM = endDate ? endDate.substring(0, 7) : '';
      periodText = `Periode: ${formatMonthYear(endYM)}`;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(periodText, 42, 36);

    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);

    const tableColumn = ["Computer/User", "Department", "Print BW", "Print Color", "Copy BW", "Copy Color", "Total"];
    const tableRows = [];

    processedLogs.forEach(log => {
      const rowData = [
        (log.computer_name || '') + (log.inventory_user_name ? `\n${log.inventory_user_name}` : ''),
        log.department_name || 'Unassigned',
        Number(log.bw_usage || 0).toLocaleString(),
        Number(log.color_usage || 0).toLocaleString(),
        Number(log.copier_bw_usage || 0).toLocaleString(),
        Number(log.copier_color_usage || 0).toLocaleString(),
        (Number(log.bw_usage || 0) + Number(log.color_usage || 0) + Number(log.copier_bw_usage || 0) + Number(log.copier_color_usage || 0)).toLocaleString()
      ];
      tableRows.push(rowData);
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total - Print BW: ${totals.printBW.toLocaleString()} | Print Color: ${totals.printColor.toLocaleString()}`, 14, 48);
    doc.text(`Grand Total - Copy BW: ${totals.copyBW.toLocaleString()} | Copy Color: ${totals.copyColor.toLocaleString()}`, 14, 54);
    doc.text(`Overall Total: ${totals.grandTotal.toLocaleString()}`, 14, 60);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 65,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    const filename = mode === 'monthly' 
      ? `Ricoh_Report_${plantName.replace(' ', '')}_${startMonth || 'All'}.pdf`
      : `Ricoh_Report_${plantName.replace(' ', '')}_${startDate}_to_${endDate}.pdf`;
    doc.save(filename);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider animate-pulse flex flex-col items-center gap-3">
        <Sparkles size={24} className="text-blue-500 animate-spin" />
        <span>Loading Monthly Analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Bento Cards: This Month, Last Month, This Year */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: This Month */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <Calendar size={14} />
              Current Month Usage
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Active
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight mb-4">
            {((stats?.thisMonth?.bw || 0) + (stats?.thisMonth?.color || 0) + (stats?.thisMonth?.cbw || 0) + (stats?.thisMonth?.ccolor || 0)).toLocaleString()}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">pages</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Print</span>
              <span className="font-bold text-slate-800">
                {(Number(stats?.thisMonth?.bw || 0) + Number(stats?.thisMonth?.color || 0)).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {stats?.thisMonth?.bw || 0} BW • {stats?.thisMonth?.color || 0} Col
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Copy</span>
              <span className="font-bold text-slate-800">
                {(Number(stats?.thisMonth?.cbw || 0) + Number(stats?.thisMonth?.ccolor || 0)).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {stats?.thisMonth?.cbw || 0} BW • {stats?.thisMonth?.ccolor || 0} Col
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Last Month */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-900/[0.02] rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BarChart3 size={14} />
              Previous Month
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Benchmark
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight mb-4">
            {((stats?.lastMonth?.bw || 0) + (stats?.lastMonth?.color || 0) + (stats?.lastMonth?.cbw || 0) + (stats?.lastMonth?.ccolor || 0)).toLocaleString()}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">pages</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Print</span>
              <span className="font-bold text-slate-800">
                {(Number(stats?.lastMonth?.bw || 0) + Number(stats?.lastMonth?.color || 0)).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {stats?.lastMonth?.bw || 0} BW • {stats?.lastMonth?.color || 0} Col
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Copy</span>
              <span className="font-bold text-slate-800">
                {(Number(stats?.lastMonth?.cbw || 0) + Number(stats?.lastMonth?.ccolor || 0)).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {stats?.lastMonth?.cbw || 0} BW • {stats?.lastMonth?.ccolor || 0} Col
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Year to Date */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <TrendingUp size={14} />
              Year-to-Date Volume
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              YTD 2026
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight mb-4">
            {((stats?.thisYear?.bw || 0) + (stats?.thisYear?.color || 0) + (stats?.thisYear?.cbw || 0) + (stats?.thisYear?.ccolor || 0)).toLocaleString()}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">pages</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Print</span>
              <span className="font-bold text-slate-800">
                {(Number(stats?.thisYear?.bw || 0) + Number(stats?.thisYear?.color || 0)).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {stats?.thisYear?.bw || 0} BW • {stats?.thisYear?.color || 0} Col
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Copy</span>
              <span className="font-bold text-slate-800">
                {(Number(stats?.thisYear?.cbw || 0) + Number(stats?.thisYear?.ccolor || 0)).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {stats?.thisYear?.cbw || 0} BW • {stats?.thisYear?.ccolor || 0} Col
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Control Bar: Mode, Dates, Sort, Search, Export */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        
        {/* Left: Mode Toggle & Range Pickers */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setMode('monthly')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                mode === 'monthly' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                mode === 'custom' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Harian
            </button>
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2">
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
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700">
            <Filter size={13} className="text-slate-400" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="total_desc">Terbanyak (Total)</option>
              <option value="total_asc">Terdikit (Total)</option>
              <option value="bw_desc">Terbanyak (B&W)</option>
              <option value="color_desc">Terbanyak (Color)</option>
              <option value="month_desc">Terbaru (Bulan)</option>
              <option value="name_asc">A-Z (Nama PC)</option>
            </select>
          </div>

        </div>

        {/* Right: Search & Export Actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search PC, dept, user..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 shadow-inner"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <FileText size={14} />
              <span>Excel</span>
            </button>
            <button 
              onClick={exportToPDF}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Download size={14} />
              <span>PDF</span>
            </button>
          </div>

        </div>

      </div>

      {/* Filtered Grand Total Banner */}
      {processedLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm tracking-tight">Summary Filtered Period</h4>
              <p className="text-xs text-slate-400 font-semibold">{processedLogs.length} audit records analyzed</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Print (BW / Col)</span>
              <span className="font-bold text-slate-800">
                {totals.printBW.toLocaleString()} <span className="text-slate-400 font-normal">BW</span> • <strong className="text-indigo-600">{totals.printColor.toLocaleString()}</strong> <span className="text-indigo-400 font-normal">Col</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Copy (BW / Col)</span>
              <span className="font-bold text-slate-800">
                {totals.copyBW.toLocaleString()} <span className="text-slate-400 font-normal">BW</span> • <strong className="text-indigo-600">{totals.copyColor.toLocaleString()}</strong> <span className="text-indigo-400 font-normal">Col</span>
              </span>
            </div>

            <div className="border-l border-slate-200 pl-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grand Total</span>
              <span className="text-2xl font-black text-blue-600 tracking-tight">
                {totals.grandTotal.toLocaleString()} <span className="text-xs font-semibold text-slate-400">pgs</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Computer / User</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5 text-center bg-slate-100/50" colSpan="2">Print Output (BW / Color)</th>
                <th className="px-5 py-3.5 text-center bg-slate-100/30" colSpan="2">Copier Output (BW / Color)</th>
                <th className="px-5 py-3.5 text-right">Combined Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedLogs.map((log, index) => {
                const rowTotal = Number(log.bw_usage || 0) + Number(log.color_usage || 0) + Number(log.copier_bw_usage || 0) + Number(log.copier_color_usage || 0);

                return (
                  <tr key={log.id || index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 font-mono text-[11px]">
                      {log.month}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800">{log.computer_name}</div>
                      {(log.inventory_user_name || log.inventory_contact) && (
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                          {log.inventory_user_name || (log.inventory_contact && log.inventory_contact.split('@')[0])}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {log.department_name || 'Unassigned'}
                      </span>
                    </td>

                    {/* Print Output */}
                    <td className="px-5 py-3.5 text-right font-bold text-slate-700 bg-slate-50/30">
                      {Number(log.bw_usage || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-left font-bold text-indigo-600 bg-slate-50/30 border-r border-slate-100">
                      {Number(log.color_usage || 0).toLocaleString()}
                    </td>

                    {/* Copier Output */}
                    <td className="px-5 py-3.5 text-right font-bold text-slate-700 bg-slate-50/10">
                      {Number(log.copier_bw_usage || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-left font-bold text-indigo-600 bg-slate-50/10 border-r border-slate-100">
                      {Number(log.copier_color_usage || 0).toLocaleString()}
                    </td>

                    {/* Combined Total */}
                    <td className="px-5 py-3.5 text-right font-black text-slate-900 text-sm">
                      {rowTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {processedLogs.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-bold">
                    No monthly log records found for the chosen date range.
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

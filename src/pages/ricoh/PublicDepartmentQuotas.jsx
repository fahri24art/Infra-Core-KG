import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Search, Filter, Sparkles, Laptop, ChevronDown, ChevronRight, Lock, Users
} from 'lucide-react';

const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString('id-ID');
const fmtRp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

const formatPrimaryIp = (rawIp) => {
  if (!rawIp) return '';
  const cleaned = String(rawIp).replace(/[{}"\s]/g, '').split(',').filter(Boolean);
  const nonLinkLocal = cleaned.find((ip) => !ip.startsWith('169.254.'));
  return nonLinkLocal || cleaned[0] || '';
};

const QuotaProgressBar = ({ current = 0, max = 0, label = 'Prints' }) => {
  const safeMax = Number(max) || 0;
  const safeCurr = Number(current) || 0;
  const percentage = safeMax > 0 ? Math.min((safeCurr / safeMax) * 100, 100) : (safeCurr > 0 ? 100 : 0);
  const isDanger = percentage >= 85;
  const isWarning = percentage >= 60 && percentage < 85;

  let barColor = 'from-blue-500 to-indigo-600';
  let badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

  if (isDanger) {
    barColor = 'from-rose-500 to-red-600';
    badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  } else if (isWarning) {
    barColor = 'from-amber-500 to-amber-600';
    badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (label.toLowerCase().includes('color')) {
    barColor = 'from-purple-500 to-pink-600';
    badgeStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  } else if (label.toLowerCase().includes('bw')) {
    barColor = 'from-slate-400 to-slate-200';
    badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  } else if (label.toLowerCase().includes('copy')) {
    barColor = 'from-emerald-500 to-teal-600';
    badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
            {label}
          </span>
          <span className="font-bold text-white">
            {safeCurr.toLocaleString()} <span className="text-slate-400 font-normal">/ {safeMax.toLocaleString()}</span>
          </span>
        </div>
        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${badgeStyle}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="h-2 w-full bg-slate-900/80 rounded-full overflow-hidden p-[1px] border border-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${barColor} shadow-lg`}
        />
      </div>
    </div>
  );
};

// Light-card Mini Progress Bar matching Image 2 (User Quota Table Row)
const UserMiniProgressBar = ({ current = 0, max = 0, label }) => {
  const safeMax = Number(max) || 0;
  const safeCurr = Number(current) || 0;
  const percentage = safeMax > 0 ? Math.min((safeCurr / safeMax) * 100, 100) : (safeCurr > 0 ? 100 : 0);
  const isDanger = percentage >= 85;
  const isWarning = percentage >= 60 && percentage < 85;

  let fillClass = 'bg-indigo-500';
  let badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (isDanger) {
    fillClass = 'bg-rose-500';
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (isWarning) {
    fillClass = 'bg-amber-500';
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (percentage === 0) {
    fillClass = 'bg-emerald-500';
    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="font-black uppercase tracking-wider text-slate-500 w-[72px]">{label}</span>
          <span className="font-black text-slate-800">{fmtNum(safeCurr)}</span>
          <span className="text-slate-400 font-semibold">/ {fmtNum(safeMax)}</span>
        </div>
        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${badgeClass}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default function PublicDepartmentQuotas() {
  const [departments, setDepartments] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('usage');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedDeptIds, setExpandedDeptIds] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [deptRes, devRes] = await Promise.all([
          axios.get('/api/ricoh/departments'),
          axios.get('/api/ricoh/devices/quotas')
        ]);
        setDepartments(deptRes.data || []);
        setDevices(devRes.data || []);
      } catch (err) {
        console.error('Failed to fetch department/device quotas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  // Group devices cleanly per department and sort by highest output
  const devicesByDept = useMemo(() => {
    const map = {};
    departments.forEach((dept) => {
      map[dept.id] = [];
    });
    devices.forEach((dev) => {
      const matchedDept = departments.find(
        (d) =>
          (dev.department_id != null && d.id === dev.department_id) ||
          (dev.department_name && d.name && dev.department_name.toLowerCase() === d.name.toLowerCase())
      );
      if (matchedDept) {
        map[matchedDept.id].push(dev);
      }
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const totA =
          Number(a.current_usage_bw || 0) +
          Number(a.current_usage_color || 0) +
          Number(a.current_usage_copier_bw || 0) +
          Number(a.current_usage_copier_color || 0);
        const totB =
          Number(b.current_usage_bw || 0) +
          Number(b.current_usage_color || 0) +
          Number(b.current_usage_copier_bw || 0) +
          Number(b.current_usage_copier_color || 0);
        if (totB !== totA) return totB - totA;
        const qA =
          Number(a.monthly_quota_bw || 0) +
          Number(a.monthly_quota_color || 0) +
          Number(a.monthly_quota_copier_bw || 0) +
          Number(a.monthly_quota_copier_color || 0);
        const qB =
          Number(b.monthly_quota_bw || 0) +
          Number(b.monthly_quota_color || 0) +
          Number(b.monthly_quota_copier_bw || 0) +
          Number(b.monthly_quota_copier_color || 0);
        return qB - qA;
      });
    });
    return map;
  }, [departments, devices]);

  const sortedDepartments = useMemo(() => {
    let filtered = departments;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = departments.filter((d) => {
        if ((d.name || '').toLowerCase().includes(q)) return true;
        const deptDevs = devicesByDept[d.id] || [];
        return deptDevs.some(
          (dev) =>
            (dev.computer_name || '').toLowerCase().includes(q) ||
            (dev.inventory_user_name || '').toLowerCase().includes(q)
        );
      });
    }
    return [...filtered].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = (a.name || '').localeCompare(b.name || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'usage') {
        const valA =
          Number(a.current_usage_bw || 0) +
          Number(a.current_usage_color || 0) +
          Number(a.current_usage_copier_bw ?? 0) +
          Number(a.current_usage_copier_color ?? 0);
        const valB =
          Number(b.current_usage_bw || 0) +
          Number(b.current_usage_color || 0) +
          Number(b.current_usage_copier_bw ?? 0) +
          Number(b.current_usage_copier_color ?? 0);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [departments, devicesByDept, searchQuery, sortField, sortDirection]);

  const toggleDept = (deptId) => {
    setExpandedDeptIds((prev) => ({
      ...prev,
      [deptId]: !prev[deptId]
    }));
  };

  const getCurrentPeriod = () => {
    const d = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
        <Sparkles size={18} className="animate-spin text-blue-400" />
        <span>Loading Department Quotas...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Building2 size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-wide uppercase flex items-center gap-2.5">
              <span>Department Printing Quota Status</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {departments.length} Units
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Billing Period: <span className="text-blue-400 font-bold">{getCurrentPeriod()}</span>
              <span className="text-slate-500 ml-2">• Klik departemen untuk melihat rincian user &amp; kuota</span>
            </p>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search dept, user, PC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-white/10 rounded-xl text-xs font-bold text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-');
                setSortField(f);
                setSortDirection(d);
              }}
              className="text-xs font-bold text-slate-200 outline-none bg-transparent cursor-pointer"
            >
              <option value="usage-desc" className="bg-slate-900 text-white">Highest Usage</option>
              <option value="usage-asc" className="bg-slate-900 text-white">Lowest Usage</option>
              <option value="name-asc" className="bg-slate-900 text-white">Name (A-Z)</option>
              <option value="name-desc" className="bg-slate-900 text-white">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expandable Department Quota List */}
      <div className="space-y-3">
        {sortedDepartments.map((dept) => {
          const deptDevsAll = devicesByDept[dept.id] || [];
          const qSearch = searchQuery.trim().toLowerCase();
          const deptNameMatch = !qSearch || (dept.name || '').toLowerCase().includes(qSearch);
          const deptDevs = deptNameMatch
            ? deptDevsAll
            : deptDevsAll.filter(
                (dev) =>
                  (dev.computer_name || '').toLowerCase().includes(qSearch) ||
                  (dev.inventory_user_name || '').toLowerCase().includes(qSearch)
              );

          const isExpanded = Boolean(expandedDeptIds[dept.id]) || (qSearch.length > 0 && !deptNameMatch && deptDevs.length > 0);

          const prtBw = Number(dept.current_usage_bw || 0);
          const prtCol = Number(dept.current_usage_color || 0);
          const cpyBw = Number(dept.current_usage_copier_bw || 0);
          const cpyCol = Number(dept.current_usage_copier_color || 0);
          const totalUsage = prtBw + prtCol + cpyBw + cpyCol;
          const bwTot = prtBw + cpyBw;
          const colTot = prtCol + cpyCol;
          const estCost = bwTot * 100 + colTot * 1400;

          return (
            <div
              key={dept.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                isExpanded
                  ? 'bg-slate-800/75 border-blue-500/40 ring-1 ring-blue-500/20'
                  : 'bg-slate-800/40 hover:bg-slate-800/70 border-white/10 hover:border-white/20'
              }`}
            >
              {/* Clickable Department Summary Row */}
              <div
                onClick={() => toggleDept(dept.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDept(dept.id);
                  }
                }}
                className="p-4 sm:p-5 flex flex-col xl:flex-row items-start xl:items-center gap-4 xl:gap-8 cursor-pointer select-none group"
              >
                {/* Dept Profile + Expand Chevron */}
                <div className="w-full xl:w-72 flex items-center gap-3.5 shrink-0">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors shrink-0 ${
                    isExpanded
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                      : 'bg-slate-800 border-white/10 text-slate-300 group-hover:text-blue-400'
                  }`}>
                    <Building2 size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-white text-sm uppercase tracking-wider truncate">{dept.name}</div>
                      <span className="text-slate-400 group-hover:text-blue-400 transition-colors shrink-0">
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                      <Laptop size={12} className="text-slate-500" />
                      {dept.device_count || dept.devices_count || deptDevsAll.length} Connected Devices
                    </p>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="flex-1 w-full space-y-2">
                  <QuotaProgressBar
                    current={prtBw}
                    max={dept.monthly_quota_bw ?? 10000}
                    label="Print B/W"
                  />
                  <QuotaProgressBar
                    current={prtCol}
                    max={dept.monthly_quota_color ?? 5000}
                    label="Print Color"
                  />
                  <QuotaProgressBar
                    current={cpyBw}
                    max={dept.monthly_quota_copier_bw ?? (dept.monthly_quota_copier || 400)}
                    label="Copy B/W"
                  />
                  <QuotaProgressBar
                    current={cpyCol}
                    max={dept.monthly_quota_copier_color ?? 100}
                    label="Copy Color"
                  />
                </div>

                {/* Total Output & Est. Cost */}
                <div className="w-full xl:w-auto xl:min-w-[165px] text-right xl:text-center pt-3 xl:pt-0 border-t border-white/10 xl:border-0 shrink-0 space-y-1">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Month Total</p>
                    <p className="text-base font-black text-white">
                      {totalUsage.toLocaleString()} <span className="text-xs font-normal text-slate-400">pgs</span>
                    </p>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[11px] font-black text-emerald-400">
                      Est. {fmtRp(estCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expandable Dropdown: Per-User / Device Breakdown (Read-Only, Without Aksi & Kontrol) */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-white/10 bg-slate-950/50 p-3 sm:p-4"
                  >
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden text-slate-800">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                          <Users size={14} className="text-blue-600" />
                          <span>Rincian Kuota Pengguna — {dept.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">
                          {deptDevs.length} Perangkat Terdaftar (Read-Only)
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3">Perangkat Komputer / Pengguna</th>
                              <th className="px-4 py-3 min-w-[290px]">Utilisasi Kuota (Print &amp; Copy B/W / Color)</th>
                              <th className="px-4 py-3 text-center">Total Output</th>
                              <th className="px-4 py-3 text-center">Status Cetak</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {deptDevs.map((dev) => {
                              const uPrtBw = Number(dev.current_usage_bw || 0);
                              const qPrtBw = Number(dev.monthly_quota_bw || 0);
                              const uPrtCol = Number(dev.current_usage_color || 0);
                              const qPrtCol = Number(dev.monthly_quota_color || 0);
                              const uCpyBw = Number(dev.current_usage_copier_bw || 0);
                              const qCpyBw = dev.monthly_quota_copier_bw ?? Math.round(Number(dev.monthly_quota_copier || 0) * 0.8);
                              const uCpyCol = Number(dev.current_usage_copier_color || 0);
                              const qCpyCol = dev.monthly_quota_copier_color ?? Math.max(0, Number(dev.monthly_quota_copier || 0) - qCpyBw);

                              const totalPrt = uPrtBw + uPrtCol;
                              const totalCpy = uCpyBw + uCpyCol;
                              const totalOut = totalPrt + totalCpy;
                              const devCost = (uPrtBw + uCpyBw) * 100 + (uPrtCol + uCpyCol) * 1400;
                              const cleanIp = formatPrimaryIp(dev.ip_address);

                              const isFullLocked = dev.status === 'locked' && dev.copier_status === 'locked';
                              const isPartialLocked =
                                !isFullLocked &&
                                (dev.status === 'locked' ||
                                  dev.copier_status === 'locked' ||
                                  dev.copier_bw_status === 'locked' ||
                                  dev.copier_color_status === 'locked');

                              return (
                                <tr key={dev.id || dev.computer_name} className="hover:bg-slate-50/80 transition-colors">
                                  {/* Column 1: Perangkat & Pengguna */}
                                  <td className="px-4 py-3.5 align-middle">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                        <Laptop size={16} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-black text-slate-900 text-xs tracking-tight truncate">
                                          {dev.computer_name}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                                            {dev.inventory_user_name || '-'}
                                          </span>
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                            {dev.department_name || dept.name}
                                          </span>
                                          {cleanIp && (
                                            <span className="text-[9px] font-mono text-slate-400">
                                              {cleanIp}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Column 2: 4-Bar Quota Utilization */}
                                  <td className="px-4 py-3.5 align-middle space-y-1.5">
                                    <UserMiniProgressBar current={uPrtBw} max={qPrtBw} label="PRINT B/W" />
                                    <UserMiniProgressBar current={uPrtCol} max={qPrtCol} label="PRINT COLOR" />
                                    <UserMiniProgressBar current={uCpyBw} max={qCpyBw} label="COPY B/W" />
                                    <UserMiniProgressBar current={uCpyCol} max={qCpyCol} label="COPY COLOR" />
                                  </td>

                                  {/* Column 3: Total Output & Cost */}
                                  <td className="px-4 py-3.5 align-middle text-center">
                                    <div className="inline-flex flex-col items-center px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 min-w-[130px]">
                                      <span className="text-sm font-black text-slate-900">{fmtNum(totalOut)}</span>
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">LEMBAR</span>
                                      <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                                        {fmtNum(totalPrt)} Prt • <span className="text-emerald-600">{fmtNum(totalCpy)} Cpy</span>
                                      </span>
                                      <span className="text-[10px] font-black text-emerald-700 mt-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                                        {fmtRp(devCost)}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Column 4: Status Cetak (No Aksi & Kontrol) */}
                                  <td className="px-4 py-3.5 align-middle text-center">
                                    {isFullLocked ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider">
                                        <Lock size={11} /> LOCKED
                                      </span>
                                    ) : isPartialLocked ? (
                                      <div className="inline-flex flex-col items-center gap-1">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                                          LIMIT PARTIAL
                                        </span>
                                        <div className="flex flex-wrap justify-center gap-1 text-[9px] font-bold text-slate-500">
                                          {dev.status === 'locked' && <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-600">Prt Lock</span>}
                                          {dev.copier_bw_status === 'locked' && <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-600">Cpy BW Lock</span>}
                                          {dev.copier_color_status === 'locked' && <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-600">Cpy Col Lock</span>}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        ACTIVE
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {deptDevs.length === 0 && (
                              <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-slate-400 font-bold text-xs">
                                  Tidak ada perangkat yang cocok pada departemen ini.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {sortedDepartments.length === 0 && (
          <div className="py-16 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
            No departments or users matched the search query.
          </div>
        )}
      </div>

    </div>
  );
}

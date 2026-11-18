import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Printer, AlertTriangle, TrendingUp, Droplets, Activity, Box, Shield, Copy,
  RefreshCw, BarChart3, Clock, X, FileText, DollarSign, Layers, Building2, Users, Calendar
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { y: 14, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString('id-ID');
const fmtRp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
const fmtRpCompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000000) return `Rp ${(v / 1000000).toFixed(1)} jt`;
  if (v >= 1000) return `Rp ${Math.round(v / 1000)} rb`;
  return `Rp ${Math.round(v)}`;
};

const StatCard = ({ id, title, value, icon: Icon, badge, footer, color, isDark }) => (
  <motion.div
    id={id}
    variants={itemVariants}
    className={`p-4 flex flex-col justify-between gap-3 relative overflow-hidden group rounded-3xl transition-all duration-300 border ${
      isDark
        ? 'bg-slate-900/70 backdrop-blur-xl border-white/10 hover:border-white/25'
        : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
    }`}
  >
    <div className="flex justify-between items-center">
      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm`}>
        <Icon size={20} />
      </div>
      {badge && (
        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
          isDark
            ? 'text-slate-300 bg-white/10 border-white/10'
            : 'text-slate-600 bg-slate-100 border-slate-200/70'
        }`}>
          {badge}
        </span>
      )}
    </div>

    <div>
      <p className={`text-[10px] font-black tracking-widest uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {title}
      </p>
      <h3 className={`text-xl xl:text-2xl font-black mt-0.5 tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </h3>
      {footer && (
        <p className={`text-[11px] font-semibold mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {footer}
        </p>
      )}
    </div>
  </motion.div>
);

const TonerLevel = ({ label, level, color, isDark }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-end">
      <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-xs font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{level ?? 0}%</span>
    </div>
    <div className={`h-2 rounded-full overflow-hidden p-[1px] border ${
      isDark ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200/60'
    }`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, level || 0))}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

const Dashboard = ({ theme = 'light', onOpenPdfModal }) => {
  const isDark = theme === 'dark';
  const [execData, setExecData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricView, setMetricView] = useState('volume'); // 'volume' | 'cost'
  const [dailyRange, setDailyRange] = useState(14); // 7 | 14
  const [selectedComputer, setSelectedComputer] = useState(null);

  const fetchData = async () => {
    try {
      const [execRes, deviceRes, logRes] = await Promise.all([
        axios.get('/api/ricoh/executive-summary'),
        axios.get('/api/ricoh/devices/status'),
        axios.get('/api/ricoh/logs')
      ]);
      setExecData(execRes.data);
      setDevices(deviceRes.data || []);
      setLogs(logRes.data || []);
    } catch (err) {
      console.error('Failed to fetch dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  const kpis = execData?.kpis || {
    today: { total: 0, bw_all: 0, col_all: 0 },
    week: { total: 0, bw: 0, color: 0 },
    cycle: {
      u_prt_bw: 0, u_prt_col: 0, u_cpy_bw: 0, u_cpy_col: 0,
      bw_all: 0, col_all: 0, u_total: 0, q_total: 0,
      utilization_pct: 0, active_devices: 0, total_devices: 0,
      cost_bw_gross: 0, cost_col_gross: 0, cost_total_gross: 0,
      contract_cost: { baseFee: 1900000, overBw: 0, overCol: 0, totalNonPpn: 1900000 }
    }
  };

  const cyc = kpis.cycle;
  const contractCost = cyc.contract_cost || { baseFee: 1900000, overBw: 0, overCol: 0, totalNonPpn: 1900000 };
  const colorClickShare = cyc.cost_total_gross > 0
    ? Math.round((cyc.cost_col_gross / cyc.cost_total_gross) * 100)
    : 0;

  const dailySeries = useMemo(() => {
    const arr = execData?.dailySeries || [];
    return dailyRange === 7 ? arr.slice(-7) : arr;
  }, [execData, dailyRange]);

  const monthlySeries = useMemo(() => {
    return (execData?.monthlySeries || []).map(m => ({
      ...m,
      bill_million: Number((m.bill_non_ppn / 1000000).toFixed(2))
    }));
  }, [execData]);

  const deptChartData = useMemo(() => {
    return (execData?.departmentBreakdown || []).slice(0, 8);
  }, [execData]);

  const volumeMixPie = useMemo(() => ([
    { name: 'Print B/W', value: cyc.u_prt_bw || 0, color: '#1e3a8a' },
    { name: 'Copy B/W', value: cyc.u_cpy_bw || 0, color: '#0284c7' },
    { name: 'Print Color', value: cyc.u_prt_col || 0, color: '#ec4899' },
    { name: 'Copy Color', value: cyc.u_cpy_col || 0, color: '#a855f7' }
  ]).filter(x => x.value > 0), [cyc]);

  const costMixPie = useMemo(() => ([
    { name: 'Sewa Min Mesin', value: contractCost.baseFee || 1900000, color: '#0f172a' },
    { name: 'Klik B/W (@Rp 100)', value: contractCost.overBw || 0, color: '#2563eb' },
    { name: 'Klik Color (@Rp 1.400)', value: contractCost.overCol || 0, color: '#ec4899' }
  ]).filter(x => x.value > 0), [contractCost]);

  const onlineMachinesCount = devices.filter(d => d.status === 'online').length;
  const topUsers = execData?.topUsers || [];

  const getComputerJobs = (computerName) => {
    return logs
      .filter(log => {
        const nameMatch = log.message.match(/(?:PRINT|PHOTOCOPY|COPIER) by (.*?)(?: \(| printed| copied)/i);
        return nameMatch && nameMatch[1].trim() === computerName;
      })
      .map(log => {
        const isCopy = log.event_type === 'COPIER' || /COPIER|PHOTOCOPY|copied/i.test(log.message);
        const pageMatch = log.message.match(/(?:printed|copied) (\d+) (BW|COLOR) page/i);
        const ipMatch = log.message.match(/on ([\d\.]+)/);
        return {
          id: log.id,
          timestamp: log.timestamp,
          jobType: isCopy ? 'PHOTOCOPY' : 'PRINT',
          pages: pageMatch ? parseInt(pageMatch[1], 10) : 0,
          type: pageMatch ? pageMatch[2].toUpperCase() : 'BW',
          machine: ipMatch ? ipMatch[1].replace(/\.$/, '') : 'Ricoh MFP'
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const getLogBadge = (log) => {
    const nameMatch = log.message.match(/(?:PRINT|PHOTOCOPY|COPIER) by (.*?)(?: \(| printed| copied)/i);
    const computerName = nameMatch ? nameMatch[1].trim() : null;
    if (log.event_type === 'QUOTA_LOCK' || log.event_type === 'QUOTA_EXCEEDED' || log.event_type === 'COPIER_LOCKED') {
      return { icon: Shield, cls: 'bg-rose-50 text-rose-600 border-rose-200', tag: 'Locked', computerName };
    }
    if (log.event_type === 'COPIER' || /COPIER|PHOTOCOPY|copied/i.test(log.message)) {
      return { icon: Copy, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', tag: 'Copy', computerName };
    }
    if (/PRINT|printed/i.test(log.message)) {
      return { icon: Printer, cls: 'bg-blue-50 text-blue-700 border-blue-200', tag: 'Print', computerName };
    }
    return { icon: Activity, cls: 'bg-slate-100 text-slate-600 border-slate-200', tag: 'System', computerName };
  };

  const cardSurface = isDark
    ? 'bg-slate-900/65 backdrop-blur-xl border border-white/10 shadow-xl'
    : 'bg-white border border-slate-200/80 shadow-sm';
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const axisTickColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipSurface = isDark
    ? { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: '#fff', fontSize: '12px' }
    : { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', color: '#0f172a', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.12)' };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top Executive Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Executive Print & Cost Telemetry
            </h1>
            {execData?.cycle?.label && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Calendar size={12} />
                Siklus: {execData.cycle.label} ({execData.cycle.daysRemaining}h lagi reset)
              </span>
            )}
          </div>
          <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Monitoring real-time volume cetak, kuota per departemen (B/W & Color), serta estimasi biaya kontrak vendor (Non-PPN).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 select-none">
          {/* Volume vs Cost Switcher */}
          <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => setMetricView('volume')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                metricView === 'volume'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <BarChart3 size={13} />
              Volume (Lembar)
            </button>
            <button
              onClick={() => setMetricView('cost')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                metricView === 'cost'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <DollarSign size={13} />
              Biaya (Rupiah)
            </button>
          </div>

          {onOpenPdfModal && (
            <button
              onClick={onOpenPdfModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
            >
              <FileText size={14} />
              Download PDF Manajemen
            </button>
          )}

          <button
            onClick={fetchData}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              isDark
                ? 'bg-slate-900 border-white/10 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Sync Live
          </button>
        </div>
      </div>

      {/* Row 1: 6 Accurate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          id="stat-prints-today"
          title="Hari Ini"
          value={`${fmtNum(kpis.today.total)} lbr`}
          icon={Activity}
          badge="Today"
          footer={`B/W ${fmtNum(kpis.today.bw_all)} • Color ${fmtNum(kpis.today.col_all)}`}
          color="from-blue-500 to-indigo-600"
          isDark={isDark}
        />
        <StatCard
          id="stat-prints-weekly"
          title="7 Hari Terakhir"
          value={`${fmtNum(kpis.week.total)} lbr`}
          icon={TrendingUp}
          badge="Mingguan"
          footer={`Rata-rata ${fmtNum(Math.round((kpis.week.total || 0) / 7))} lbr/hari`}
          color="from-cyan-500 to-blue-600"
          isDark={isDark}
        />
        <StatCard
          id="stat-prints-monthly"
          title="Siklus Bulan Ini"
          value={`${fmtNum(cyc.u_total)} lbr`}
          icon={Layers}
          badge={`${cyc.utilization_pct}% Kuota`}
          footer={`Dari total plafon ${fmtNum(cyc.q_total)} lbr`}
          color="from-violet-500 to-purple-600"
          isDark={isDark}
        />
        <StatCard
          id="stat-copy-split"
          title="Print vs Photocopy"
          value={`${fmtNum(cyc.u_prt_bw + cyc.u_prt_col)} / ${fmtNum(cyc.u_cpy_bw + cyc.u_cpy_col)}`}
          icon={Copy}
          badge="Siklus Ini"
          footer={`Copy B/W ${fmtNum(cyc.u_cpy_bw)} • Color ${fmtNum(cyc.u_cpy_col)}`}
          color="from-teal-500 to-emerald-600"
          isDark={isDark}
        />
        <StatCard
          id="stat-est-bill"
          title="Est. Tagihan (Non-PPN)"
          value={fmtRpCompact(contractCost.totalNonPpn)}
          icon={DollarSign}
          badge="Sakura Contract"
          footer={`Tepat: ${fmtRp(contractCost.totalNonPpn)}`}
          color="from-emerald-500 to-green-600"
          isDark={isDark}
        />
        <StatCard
          id="stat-color-impact"
          title="Porsi Biaya Color"
          value={`${colorClickShare}% Beban`}
          icon={Droplets}
          badge={`${onlineMachinesCount}/${devices.length} Online`}
          footer={`${fmtNum(cyc.col_all)} lbr Color = ${fmtRpCompact(cyc.cost_col_gross)}`}
          color="from-pink-500 to-rose-600"
          isDark={isDark}
        />
      </div>

      {/* Row 2: 2x2 Modern Executive Charts Grid (Inspired by Financial + Telemetry Dashboards) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Chart 1: Monthly Trend Combo (Stacked Bars B/W + Color + Line Total Cost Non-PPN) */}
        <motion.div variants={itemVariants} className={`xl:col-span-7 p-5 rounded-3xl ${cardSurface}`}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
            <div>
              <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Tren Bulanan: Volume Cetak vs Estimasi Tagihan Kontrak
              </h3>
              <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Batang: Lembar B/W & Color (sinkron Invoice Sakura Jul–Sep) • Garis: Estimasi Tagihan Non-PPN (Rp Juta)
              </p>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
              B/W Rp 100 • Color Rp 1.400
            </span>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlySeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: axisTickColor, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: axisTickColor, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#059669', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}jt`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div style={tooltipSurface} className="p-3.5 min-w-[220px] space-y-1.5">
                        <p className="font-black text-xs border-b pb-1.5 border-slate-200">{row.label}</p>
                        <div className="flex justify-between text-xs"><span>B/W (Print + Copy):</span><b>{fmtNum(row.bw_all)} lbr</b></div>
                        <div className="flex justify-between text-xs text-pink-600"><span>Color (Print + Copy):</span><b>{fmtNum(row.col_all)} lbr</b></div>
                        <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-100"><span>Total Volume:</span><span>{fmtNum(row.total)} lbr</span></div>
                        <div className="flex justify-between text-xs text-emerald-700 font-black"><span>Est. Tagihan Non-PPN:</span><span>{fmtRp(row.bill_non_ppn)}</span></div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                <Bar yAxisId="left" dataKey="bw_all" name="Total B/W (lbr)" stackId="vol" fill="#1d4ed8" radius={[0, 0, 4, 4]} barSize={32} />
                <Bar yAxisId="left" dataKey="col_all" name="Total Color (lbr)" stackId="vol" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={32} />
                <Line yAxisId="right" type="monotone" dataKey="bill_million" name="Tagihan Non-PPN (Rp Jt)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 2: Daily Activity Area Curve (Clean exact dates, Volume or Cost toggle) */}
        <motion.div variants={itemVariants} className={`xl:col-span-5 p-5 rounded-3xl ${cardSurface}`}>
          <div className="flex justify-between items-center gap-2 mb-4">
            <div>
              <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Aktivitas Harian ({dailyRange} Hari Terakhir)
              </h3>
              <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {metricView === 'cost' ? 'Biaya klik harian (Rp) • Senin–Minggu aktual' : 'Total halaman harian (Print + Copy B/W vs Color)'}
              </p>
            </div>
            <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
              {[7, 14].map(d => (
                <button
                  key={d}
                  onClick={() => setDailyRange(d)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    dailyRange === d ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {d}H
                </button>
              ))}
            </div>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bwAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: axisTickColor, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: axisTickColor, fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => metricView === 'cost' ? `${Math.round(v / 1000)}rb` : fmtNum(v)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div style={tooltipSurface} className="p-3 min-w-[190px] space-y-1">
                        <p className="font-black text-xs border-b pb-1 border-slate-200">{row.date} ({row.label})</p>
                        <div className="flex justify-between text-xs"><span>Print B/W:</span><b>{fmtNum(row.print_bw)}</b></div>
                        <div className="flex justify-between text-xs"><span>Copy B/W:</span><b>{fmtNum(row.copy_bw)}</b></div>
                        <div className="flex justify-between text-xs text-pink-600"><span>Color (Prt+Cpy):</span><b>{fmtNum(row.col_all)}</b></div>
                        <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-100"><span>Total:</span><span>{fmtNum(row.total)} lbr</span></div>
                        <div className="flex justify-between text-xs font-black text-emerald-700"><span>Biaya Klik:</span><span>{fmtRp(row.cost_rp)}</span></div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                {metricView === 'cost' ? (
                  <Area type="monotone" dataKey="cost_rp" name="Biaya Klik (Rp)" stroke="#10b981" strokeWidth={2.5} fill="url(#bwAreaGrad)" />
                ) : (
                  <>
                    <Area type="monotone" dataKey="bw_all" name="B/W (Prt+Cpy)" stroke="#2563eb" strokeWidth={2.5} fill="url(#bwAreaGrad)" />
                    <Area type="monotone" dataKey="col_all" name="Color (Prt+Cpy)" stroke="#ec4899" strokeWidth={2.5} fill="url(#colAreaGrad)" />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 3: Top Departments Breakdown (Volume or Rupiah) */}
        <motion.div variants={itemVariants} className={`xl:col-span-7 p-5 rounded-3xl ${cardSurface}`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Beban Cetak & Biaya Per Departemen (Siklus Aktif)
              </h3>
              <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Menampilkan {metricView === 'cost' ? 'Rupiah biaya klik B/W (@100) vs Color (@1.400)' : 'pemakaian Print B/W, Copy B/W & Color per departemen'}
              </p>
            </div>
            <Building2 size={18} className="text-blue-500" />
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData} margin={{ top: 10, right: 12, left: 4, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axisTickColor, fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis
                  tick={{ fill: axisTickColor, fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => metricView === 'cost' ? (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : `${Math.round(v / 1000)}rb`) : fmtNum(v)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div style={tooltipSurface} className="p-3.5 min-w-[230px] space-y-1">
                        <p className="font-black text-xs border-b pb-1 border-slate-200">{row.name} ({row.active_pc}/{row.pc_count} PC aktif)</p>
                        <div className="flex justify-between text-xs"><span>Print B/W:</span><b>{fmtNum(row.u_prt_bw)} / {fmtNum(row.q_prt_bw)}</b></div>
                        <div className="flex justify-between text-xs"><span>Print Color:</span><b>{fmtNum(row.u_prt_col)} / {fmtNum(row.q_prt_col)}</b></div>
                        <div className="flex justify-between text-xs"><span>Copy B/W:</span><b>{fmtNum(row.u_cpy_bw)} / {fmtNum(row.q_cpy_bw)}</b></div>
                        <div className="flex justify-between text-xs"><span>Copy Color:</span><b>{fmtNum(row.u_cpy_col)} / {fmtNum(row.q_cpy_col)}</b></div>
                        <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-100">
                          <span>Total Utilisasi:</span><span>{fmtNum(row.u_total)} ({row.utilization_pct}%)</span>
                        </div>
                        <div className="flex justify-between text-xs font-black text-emerald-700">
                          <span>Biaya Klik Dept:</span><span>{fmtRp(row.cost_total)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                {metricView === 'cost' ? (
                  <>
                    <Bar dataKey="cost_bw" name="Biaya B/W (Rp)" stackId="cost" fill="#2563eb" radius={[0, 0, 4, 4]} barSize={28} />
                    <Bar dataKey="cost_color" name="Biaya Color (Rp)" stackId="cost" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={28} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="u_prt_bw" name="Print B/W" stackId="v" fill="#1e3a8a" barSize={28} />
                    <Bar dataKey="u_cpy_bw" name="Copy B/W" stackId="v" fill="#0ea5e9" barSize={28} />
                    <Bar dataKey="u_prt_col" name="Print Color" stackId="v" fill="#ec4899" barSize={28} />
                    <Bar dataKey="u_cpy_col" name="Copy Color" stackId="v" fill="#a855f7" radius={[6, 6, 0, 0]} barSize={28} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 4: Dual Donut Breakdown (Volume Mix & Cost Share) */}
        <motion.div variants={itemVariants} className={`xl:col-span-5 p-5 rounded-3xl ${cardSurface} flex flex-col justify-between`}>
          <div className="mb-2">
            <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Komposisi Lembar vs Struktur Biaya Tagihan
            </h3>
            <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Perbandingan porsi pemakaian fisik terhadap rupiah tagihan kontrak Sakura
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center flex-1">
            {/* Donut 1: Volume Mix */}
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-white/10' : 'bg-slate-50/70 border-slate-200/70'}`}>
              <p className="text-[10px] font-black uppercase tracking-wider text-center text-slate-500 mb-1">
                Proporsi Volume ({fmtNum(cyc.u_total)} lbr)
              </p>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={volumeMixPie} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={3}>
                      {volumeMixPie.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => `${fmtNum(val)} lbr`} contentStyle={tooltipSurface} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-1">
                {volumeMixPie.map(item => (
                  <div key={item.name} className="flex justify-between items-center text-[10px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span>{cyc.u_total > 0 ? Math.round((item.value / cyc.u_total) * 100) : 0}% ({fmtNum(item.value)})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut 2: Contract Bill Mix */}
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-white/10' : 'bg-slate-50/70 border-slate-200/70'}`}>
              <p className="text-[10px] font-black uppercase tracking-wider text-center text-emerald-700 mb-1">
                Proporsi Rupiah ({fmtRpCompact(contractCost.totalNonPpn)})
              </p>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costMixPie} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={3}>
                      {costMixPie.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => fmtRp(val)} contentStyle={tooltipSurface} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-1">
                {costMixPie.map(item => (
                  <div key={item.name} className="flex justify-between items-center text-[10px] font-bold">
                    <span className="flex items-center gap-1.5 truncate max-w-[120px]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span>{fmtRpCompact(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 3: Top Users Cost/Quota Leaderboard & Machine Toner Health */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Top Users Table */}
        <motion.div variants={itemVariants} className={`xl:col-span-8 p-5 rounded-3xl ${cardSurface}`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className={`text-base font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Users size={18} className="text-indigo-500" />
                Top Pengguna Cetak & Copy Terbesar (Klik User untuk Riwayat Detail)
              </h3>
              <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Rincian lembar (Print/Copy B/W & Color terpisah) beserta estimasi biaya pemakaian per karyawan
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                  isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
                }`}>
                  <th className="py-2.5 pr-3">#</th>
                  <th className="py-2.5 px-2">User / Komputer</th>
                  <th className="py-2.5 px-2">Dept</th>
                  <th className="py-2.5 px-2 text-right">Prt BW</th>
                  <th className="py-2.5 px-2 text-right">Prt Col</th>
                  <th className="py-2.5 px-2 text-right">Cpy BW</th>
                  <th className="py-2.5 px-2 text-right">Cpy Col</th>
                  <th className="py-2.5 px-2 text-right">Total / Kuota</th>
                  <th className="py-2.5 pl-2 text-right">Est. Biaya</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                {topUsers.map((u, i) => {
                  const pct = u.q_total > 0 ? Math.min(100, Math.round((u.u_total / u.q_total) * 100)) : 100;
                  return (
                    <tr
                      key={u.computer_name}
                      onClick={() => setSelectedComputer(u.computer_name)}
                      className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-blue-50/50'}`}
                    >
                      <td className="py-2.5 pr-3 font-black text-slate-400">#{i + 1}</td>
                      <td className="py-2.5 px-2">
                        <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{u.user_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {u.computer_name}{!(typeof window !== 'undefined' && window.location.pathname.startsWith('/public')) && u.pin ? ` • PIN ${u.pin}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {u.department}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold">{fmtNum(u.u_prt_bw)}</td>
                      <td className="py-2.5 px-2 text-right font-semibold text-pink-600">{fmtNum(u.u_prt_col)}</td>
                      <td className="py-2.5 px-2 text-right font-semibold">{fmtNum(u.u_cpy_bw)}</td>
                      <td className="py-2.5 px-2 text-right font-semibold text-purple-600">{fmtNum(u.u_cpy_col)}</td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="font-black">{fmtNum(u.u_total)} <span className="text-[10px] font-normal text-slate-400">/ {fmtNum(u.q_total)}</span></div>
                        <div className="w-20 ml-auto h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                          <div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="py-2.5 pl-2 text-right font-black text-emerald-600">{fmtRp(u.cost_total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Fleet Toner Health + Live Events */}
        <div className="xl:col-span-4 space-y-5">
          {/* Physical Printer Status */}
          <motion.div variants={itemVariants} className={`p-5 rounded-3xl ${cardSurface}`}>
            <h3 className={`text-base font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Kesehatan Mesin & Toner Ricoh
            </h3>
            <div className="space-y-3">
              {devices.map(device => (
                <div
                  key={device.id}
                  className={`p-3.5 rounded-2xl border ${
                    isDark ? 'bg-slate-800/40 border-white/10' : 'bg-slate-50/80 border-slate-200/70'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <div>
                      <h5 className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{device.name}</h5>
                      <span className="text-[10px] font-mono text-slate-400">{device.ip}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      device.status === 'online'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {device.status}
                    </span>
                  </div>
                  {device.status === 'online' ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <TonerLevel label="Cyan" level={device.cyan} color="#06b6d4" isDark={isDark} />
                      <TonerLevel label="Magenta" level={device.magenta} color="#ec4899" isDark={isDark} />
                      <TonerLevel label="Yellow" level={device.yellow} color="#eab308" isDark={isDark} />
                      <TonerLevel label="Black" level={device.black} color={isDark ? '#94a3b8' : '#0f172a'} isDark={isDark} />
                    </div>
                  ) : (
                    <p className="text-xs text-rose-500 font-bold flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Mesin tidak merespons
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Compact Live Telemetry Stream */}
          <motion.div variants={itemVariants} className={`p-5 rounded-3xl ${cardSurface}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Live Activity Feed
              </h3>
              <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live
              </span>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {logs.slice(0, 15).map(log => {
                const { icon: Icon, cls, tag, computerName } = getLogBadge(log);
                return (
                  <div
                    key={log.id}
                    onClick={() => computerName && setSelectedComputer(computerName)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-colors ${
                      computerName ? 'cursor-pointer' : ''
                    } ${isDark ? 'bg-slate-800/40 border-white/5 hover:border-white/15' : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100/70'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${cls}`}>
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${cls}`}>{tag}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-[11px] font-semibold mt-1 truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {log.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* User/PC Slide-Over Detail Panel */}
      <AnimatePresence>
        {selectedComputer && (() => {
          const jobs = getComputerJobs(selectedComputer);
          const totalBW = jobs.filter(j => j.type === 'BW').reduce((s, j) => s + j.pages, 0);
          const totalColor = jobs.filter(j => j.type === 'COLOR').reduce((s, j) => s + j.pages, 0);
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
                onClick={() => setSelectedComputer(null)}
              />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={`fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col ${
                  isDark ? 'bg-slate-900 border-l border-white/10 text-white' : 'bg-white'
                }`}
              >
                <div className={`p-4 border-b flex items-start justify-between ${
                  isDark ? 'border-white/10 bg-slate-800/80' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                      <Printer size={18} />
                    </div>
                    <div>
                      <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedComputer}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Print & Copy Events</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedComputer(null)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100">
                  <div className="rounded-xl p-3 text-center bg-slate-50 border border-slate-200/60">
                    <p className="text-[9px] font-black uppercase text-slate-400">Events</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{jobs.length}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center bg-slate-50 border border-slate-200/60">
                    <p className="text-[9px] font-black uppercase text-slate-400">BW Log</p>
                    <p className="text-xl font-black text-slate-700 mt-0.5">{fmtNum(totalBW)}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center bg-pink-50 border border-pink-200/60">
                    <p className="text-[9px] font-black uppercase text-pink-500">Color Log</p>
                    <p className="text-xl font-black text-pink-600 mt-0.5">{fmtNum(totalColor)}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {jobs.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs font-semibold">Tidak ada log event terbaru di feed</div>
                  ) : jobs.map(job => (
                    <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/60 bg-slate-50/70">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        job.jobType === 'PHOTOCOPY' ? 'bg-emerald-50 text-emerald-600' : job.type === 'COLOR' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {job.jobType === 'PHOTOCOPY' ? <Copy size={16} /> : <Printer size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200">{job.jobType} • {job.type}</span>
                          <span className="text-xs font-black text-slate-800">{job.pages} lbr</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{job.machine}</p>
                      </div>
                      <div className="text-right text-[10px] font-bold text-slate-500 shrink-0">
                        <div>{new Date(job.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</div>
                        <div>{new Date(job.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;

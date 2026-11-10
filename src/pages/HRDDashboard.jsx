import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ClipboardCheck, AlertTriangle, ShieldCheck, Activity, Flame, HardHat, Heart } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import HSEDashboard from './hse/HSEDashboard';

// ── Reusable Donut Card ────────────────────────────────────
const COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16'];

function DonutCard({ title, checked, unchecked, pct, color }) {
    const data = [
        { name: 'Sudah Checksheet', value: checked },
        { name: 'Belum', value: unchecked },
    ];
    const donutColor = [color || '#22c55e', '#e2e8f0'];
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 text-center">{title}</p>
            <div className="relative w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={36} outerRadius={52} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                            {data.map((_, i) => <Cell key={i} fill={donutColor[i]} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900">{pct}%</span>
                </div>
            </div>
            <div className="flex gap-3 mt-2">
                <div className="text-center">
                    <p className="text-base font-black text-emerald-600">{checked}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Done</p>
                </div>
                <div className="w-px bg-slate-100" />
                <div className="text-center">
                    <p className="text-base font-black text-amber-500">{unchecked}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Pending</p>
                </div>
            </div>
        </div>
    );
}

// ── HRGA Tab ───────────────────────────────────────────────
export function HRGADashboard({ isGuest = false, org = 'TCF-SG' }) {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/hr/dashboard/summary', {
            headers: { 'x-organization': org }
        })
            .then(r => r.json())
            .then(d => { if (d.success) setSummary(d.data); })
            .finally(() => setLoading(false));
    }, [org]);

    const topStats = summary ? [
        { label: 'Total Aset', value: summary.totalAssets, icon: Package, bg: 'bg-blue-50', text: 'text-blue-600', link: '/hrd/assets' },
        { label: 'Sudah Checksheet', value: summary.totalChecked, icon: ClipboardCheck, bg: 'bg-emerald-50', text: 'text-emerald-600', link: '/hrd/assets' },
        { label: 'Belum Checksheet', value: summary.totalUnchecked, icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-500', link: '/hrd/assets' },
        { label: 'Coverage', value: `${summary.pctChecked}%`, icon: ShieldCheck, bg: 'bg-violet-50', text: 'text-violet-600', link: '/hrd/assets' },
    ] : [];

    // Overall pie chart data
    const overallData = summary ? [
        { name: 'Sudah Checksheet', value: summary.totalChecked },
        { name: 'Belum Checksheet', value: summary.totalUnchecked },
    ] : [];

    // Category distribution pie
    const catPieData = summary?.byCategory?.slice(0, 8).map(c => ({ name: c.category, value: c.total })) || [];

    return (
        <div className="space-y-3">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse h-24" />
                )) : topStats.map((s, i) => (
                    <div key={i} onClick={() => !isGuest && s.link && navigate(s.link)} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 transition-all ${isGuest ? '' : 'cursor-pointer hover:border-blue-300'}`}>
                        <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                            <s.icon size={22} className={s.text} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{s.value}</p>
                            <p className="text-xs font-bold text-slate-400">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Overall Donut */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="text-sm font-black text-slate-700 mb-4">Coverage Keseluruhan</h3>
                    {loading ? <div className="h-52 animate-pulse bg-slate-50 rounded-xl" /> : (
                        <div className="relative h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={overallData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={2} stroke="#fff">
                                        <Cell fill="#22c55e" />
                                        <Cell fill="#e2e8f0" />
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [v + ' aset', n]} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-3xl font-black text-slate-900">{summary?.pctChecked}%</p>
                                <p className="text-xs font-bold text-slate-400">Checked</p>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-center gap-4 mt-2">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-slate-600">Sudah ({summary?.totalChecked || 0})</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200" /><span className="text-xs font-bold text-slate-600">Belum ({summary?.totalUnchecked || 0})</span></div>
                    </div>
                </div>

                {/* Category Distribution Donut */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="text-sm font-black text-slate-700 mb-4">Distribusi per Kategori</h3>
                    {loading ? <div className="h-52 animate-pulse bg-slate-50 rounded-xl" /> : (
                        <ResponsiveContainer width="100%" height={208}>
                            <PieChart>
                                <Pie data={catPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={2} stroke="#fff">
                                    {catPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v, n) => [v + ' aset', n]} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Per-category checksheet coverage table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="text-sm font-black text-slate-700 mb-4">Status per Kategori</h3>
                    {loading ? <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-8 animate-pulse bg-slate-50 rounded-lg" />)}</div> : (
                        <div className="space-y-2 overflow-y-auto max-h-52 pr-1">
                            {(summary?.byCategory || []).map((c, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <p className="text-xs font-semibold text-slate-600 flex-1 truncate">{c.category}</p>
                                    <div className="flex items-center gap-1 text-xs">
                                        <span className="font-black text-emerald-600">{c.checked}</span>
                                        <span className="text-slate-300">/</span>
                                        <span className="font-bold text-slate-500">{c.total}</span>
                                    </div>
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.pct}%` }} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 w-8 text-right">{c.pct}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Per-category Donut Grid */}
            <div>
                <h3 className="text-sm font-black text-slate-700 mb-4">Checksheet Coverage per Kategori</h3>
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
                        {Array(6).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-44 animate-pulse" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        {(summary?.byCategory || []).slice(0, 10).map((c, i) => (
                            <DonutCard
                                key={i}
                                title={c.category}
                                checked={c.checked}
                                unchecked={c.unchecked}
                                pct={c.pct}
                                color={COLORS[i % COLORS.length]}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


// ── Main Dashboard (Combined View) ───────────────────────────────
export default function HRDDashboard() {
    return (
        <div className="space-y-12">
            {/* Page Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">HR & GA Dashboard</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Pemantauan Aset, Maintenance & HSE — PT. Tri Centrum Fortuna</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Last Updated</p>
                    <p className="text-sm font-black text-slate-700">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            {/* HRGA Content */}
            <div className="space-y-3">
                <HRGADashboard />
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-slate-200 my-8"></div>

            {/* HSE Content */}
            <div className="space-y-3">
                <HSEDashboard />
            </div>
        </div>
    );
}

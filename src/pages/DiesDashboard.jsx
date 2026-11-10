import React, { useState, useMemo, useEffect } from 'react';
import { 
    Activity, Clock, ShieldCheck, AlertTriangle, Settings, Wrench, Target, 
    TrendingUp, TrendingDown, DollarSign, Layers, Package, BarChart2, CheckCircle,
    ArrowUpRight, AlertCircle, Zap
} from 'lucide-react';
import { 
    BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

export default function DiesDashboard() {
    const [inventory, setInventory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Dies Master for charts
                const resInv = await fetch('/api/dies/inventory');
                if (resInv.ok) {
                    const jsonInv = await resInv.json();
                    if (jsonInv.success) setInventory(jsonInv.data);
                }
                
                // Fetch new Dashboard Stats
                const resStats = await fetch('/api/dies/dashboard-stats');
                if (resStats.ok) {
                    const jsonStats = await resStats.json();
                    if (jsonStats.success) setStats(jsonStats.data);
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    // Helper for formatting Currency
    const formatIDR = (val) => {
        if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
        return `Rp ${(val / 1000).toFixed(0)}K`;
    };

    // 12 Primary KPI Metrics (Combined Real + Mock)
    const kpis = useMemo(() => {
        const mtbf = stats ? `${stats.mtbf_hours} Hours` : '675 Hours';
        const mttr = stats ? `${stats.mttr_hours} Hours` : '1.4 Hours';
        const costSaving = stats && stats.total_repair_cost ? formatIDR(125000000 - stats.total_repair_cost) : 'Rp 125.000.000';
        const breakdownFreq = stats ? `${stats.ticket_count} Cases` : '2 Cases';

        return [
            { label: 'Dies Availability', value: '99.2%', trend: '+0.5%', isGood: true, icon: Activity },
            { label: 'MTBF', value: mtbf, trend: 'Real Data', isGood: true, icon: Clock },
            { label: 'MTTR', value: mttr, trend: 'Real Data', isGood: true, icon: Wrench },
            { label: 'PM Compliance', value: '100%', trend: 'On Target', isGood: true, icon: ShieldCheck },
            { label: 'Tool Life Achievement', value: '112%', trend: '+5%', isGood: true, icon: Target },
            { label: 'Breakdown Frequency', value: breakdownFreq, trend: 'Real Data', isGood: true, icon: AlertCircle },
            { label: 'Defect By Dies', value: '0.18%', trend: '-0.05%', isGood: true, icon: TrendingDown },
            { label: 'Repeat Repair', value: '0%', trend: 'Stable', isGood: true, icon: CheckCircle },
            { label: 'Improvement Project', value: '5', trend: 'In Progress', isGood: true, icon: TrendingUp },
            { label: 'Cost Saving', value: costSaving, trend: 'YTD', isGood: true, icon: DollarSign },
            { label: 'Utilization', value: '91%', trend: '+2%', isGood: true, icon: Zap },
            { label: 'Emergency Repair', value: '4%', trend: '-1%', isGood: true, icon: AlertTriangle },
        ];
    }, [stats]);

    // MOCK DATA FOR 8 LISTS
    const topBreakdowns = [
        { name: 'DIES-SP-005 (Bracket)', cases: 3, time: '12 Hrs' },
        { name: 'DIES-BP-012 (Door Panel)', cases: 2, time: '8 Hrs' },
        { name: 'DIES-SP-022 (Hinge)', cases: 2, time: '5 Hrs' },
        { name: 'DIES-BP-008 (Hood)', cases: 1, time: '14 Hrs' },
        { name: 'DIES-SP-011 (Lock Base)', cases: 1, time: '3 Hrs' },
    ];

    const topCosts = [
        { name: 'DIES-BP-008 (Hood)', cost: 'Rp 45.000.000' },
        { name: 'DIES-SP-005 (Bracket)', cost: 'Rp 12.500.000' },
        { name: 'DIES-BP-012 (Door Panel)', cost: 'Rp 8.200.000' },
        { name: 'DIES-SP-044 (Clip)', cost: 'Rp 4.100.000' },
        { name: 'DIES-BP-001 (Fender)', cost: 'Rp 2.500.000' },
    ];

    const sparepartConsumption = [
        { part: 'Guide Post 25x150', qty: 45, cost: 'Rp 15M' },
        { part: 'Punch Round D8', qty: 32, cost: 'Rp 8M' },
        { part: 'Gas Spring 500N', qty: 28, cost: 'Rp 25M' },
        { part: 'Die Button D8', qty: 24, cost: 'Rp 5M' },
        { part: 'Coil Spring Red', qty: 20, cost: 'Rp 2M' },
    ];

    const kaizenProgress = [
        { title: 'Scrap chute redesign DIES-SP-001', progress: 80 },
        { title: 'Sensor integration for misfeed', progress: 100 },
        { title: 'Titanium coating for Punch D8', progress: 45 },
        { title: 'Quick die change mechanism', progress: 20 },
        { title: 'Gas spring pressure tracking', progress: 10 },
    ];

    const costSavingData = [
        { month: 'Jan', saving: 15 },
        { month: 'Feb', saving: 22 },
        { month: 'Mar', saving: 45 },
        { month: 'Apr', saving: 25 },
        { month: 'May', saving: 18 },
    ];

    // Dynamic Data from DB
    const pmDueDies = useMemo(() => {
        return inventory.filter(i => {
            const current = i.hit_counter?.current_hit || 0;
            const target = i.hit_counter?.target_pm_hit || 100000;
            return (target - current) < 5000;
        });
    }, [inventory]);

    const criticalDies = useMemo(() => {
        // Mocking critical based on mock logic + real hit counter
        return inventory.slice(0, 5).map(i => {
            const current = i.hit_counter?.current_hit || 0;
            const target = i.hit_counter?.target_pm_hit || 100000;
            const life = Math.max(0, 100 - ((current / target) * 100));
            return {
                name: `${i.asset_code} (${i.item_name})`,
                life: life.toFixed(1),
                status: life < 20 ? 'Critical' : 'Warning'
            }
        }).sort((a,b) => parseFloat(a.life) - parseFloat(b.life));
    }, [inventory]);

    const diesLifeRemaining = useMemo(() => {
        const ranges = { '0-20%': 0, '21-50%': 0, '51-80%': 0, '81-100%': 0 };
        inventory.forEach(i => {
            const current = i.hit_counter?.current_hit || 0;
            const target = i.hit_counter?.target_pm_hit || 100000;
            const life = Math.max(0, 100 - ((current / target) * 100));
            if (life <= 20) ranges['0-20%']++;
            else if (life <= 50) ranges['21-50%']++;
            else if (life <= 80) ranges['51-80%']++;
            else ranges['81-100%']++;
        });
        return Object.keys(ranges).map(k => ({ name: k, count: ranges[k] }));
    }, [inventory]);

    return (
        <div className="space-y-3 bg-slate-50 min-h-screen pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Engineering Dies KPI</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Comprehensive Maintenance & Performance Overview</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                        Export Report PDF
                    </button>
                    <a 
                        href="http://localhost:3000" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 transition-all gap-2"
                    >
                        <Activity size={16} /> Andon Live
                    </a>
                </div>
            </div>

            {/* 12 KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.isGood ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                <kpi.icon size={16} />
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {kpi.trend}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">{kpi.value}</h3>
                            <p className="text-xs font-bold text-slate-400 leading-tight mt-0.5">{kpi.label}</p>
                        </div>
                        {/* Decorative Background Icon */}
                        <kpi.icon size={48} className="absolute -bottom-2 -right-2 text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
            </div>

            {/* 8 Analytical Lists / Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                
                {/* 1. PM Due This Week */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:col-span-1">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                        <h2 className="text-sm font-black text-slate-800">PM Due This Week</h2>
                        <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">{pmDueDies.length}</span>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto max-h-[250px] custom-scrollbar space-y-3">
                        {pmDueDies.length > 0 ? pmDueDies.map(die => (
                            <div key={die.id} className="flex flex-col p-3 border border-rose-100 bg-rose-50/30 rounded-xl">
                                <span className="text-xs font-bold text-slate-800">{die.asset_code}</span>
                                <span className="text-[10px] text-rose-600 font-bold mt-1">Due in {((die.hit_counter?.target_pm_hit||100000)-(die.hit_counter?.current_hit||0)).toLocaleString()} Hits</span>
                            </div>
                        )) : (
                            <div className="text-center py-8 opacity-50">
                                <ShieldCheck size={32} className="mx-auto text-emerald-500 mb-2" />
                                <p className="text-xs font-bold text-slate-400">All Clear</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Top 10 Critical Dies */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:col-span-1">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <h2 className="text-sm font-black text-slate-800">Top 5 Critical Dies (Life)</h2>
                    </div>
                    <div className="p-4 flex-1 space-y-3">
                        {criticalDies.map((die, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                <div className="truncate pr-2">
                                    <span className="text-xs font-bold text-slate-700 block truncate">{die.name}</span>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${die.life < 20 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {die.life}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Top Breakdown Dies */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:col-span-1">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <h2 className="text-sm font-black text-slate-800">Top 5 Breakdown Dies</h2>
                    </div>
                    <div className="p-4 flex-1 space-y-3">
                        {topBreakdowns.map((b, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                <div className="truncate pr-2">
                                    <span className="text-xs font-bold text-slate-700 block truncate">{b.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-rose-600 block">{b.cases} Cases</span>
                                    <span className="text-[9px] text-slate-400 font-bold">{b.time} DT</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Top Repair Cost Dies */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:col-span-1">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <h2 className="text-sm font-black text-slate-800">Top 5 Repair Cost Dies</h2>
                    </div>
                    <div className="p-4 flex-1 space-y-3">
                        {topCosts.map((c, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                <div className="truncate pr-2">
                                    <span className="text-xs font-bold text-slate-700 block truncate">{c.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-md">{c.cost}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Sparepart Consumption */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:col-span-2">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <h2 className="text-sm font-black text-slate-800">Top 5 Sparepart Consumption</h2>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase">
                                <tr>
                                    <th className="px-3 py-1.5 text-[10px] uppercase">Sparepart Name</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase text-center">Qty Consumed</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase text-right">Total Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sparepartConsumption.map((s, idx) => (
                                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="px-3 py-1.5 text-[11px] font-bold text-slate-700 text-[11px]">{s.part}</td>
                                        <td className="px-3 py-1.5 text-[11px] text-center text-[11px] font-bold text-blue-600">{s.qty} pcs</td>
                                        <td className="px-3 py-1.5 text-[11px] text-right text-[11px] font-bold text-rose-600">{s.cost}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 6. Dies Life Remaining Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:col-span-1">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <h2 className="text-sm font-black text-slate-800">Dies Life Remaining (%)</h2>
                    </div>
                    <div className="p-4 flex-1 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={diesLifeRemaining} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {diesLifeRemaining.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === '0-20%' ? '#ef4444' : entry.name === '21-50%' ? '#f59e0b' : '#10b981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 7. Cost Saving YTD Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:col-span-1">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <h2 className="text-sm font-black text-slate-800">Cost Saving YTD (Million Rp)</h2>
                    </div>
                    <div className="p-4 flex-1 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={costSavingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                <Line type="monotone" dataKey="saving" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 8. Kaizen Progress */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:col-span-4">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <h2 className="text-sm font-black text-slate-800">Kaizen (Improvement) Progress</h2>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {kaizenProgress.map((k, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-slate-700 line-clamp-1 pr-2" title={k.title}>{k.title}</span>
                                    <span className={`text-[10px] font-black ${k.progress === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{k.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className={`h-2 rounded-full ${k.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                        style={{ width: `${k.progress}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

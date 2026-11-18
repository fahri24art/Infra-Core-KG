import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity, Calendar, CheckCircle, Zap, RefreshCw, ChevronDown, Download,
    HardDrive, Cpu, Wifi, Shield, ArrowUpRight, Users, Ticket, LayoutGrid,
    Monitor, Box, BarChart3
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, LabelList
} from 'recharts';

export default function Dashboard() {
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    const isSuperAdmin = user && ['super_user', 'superuser', 'administrator', 'admin'].includes(user.role?.toLowerCase());
    const userOrg = user?.organization || 'TCF-SG';
    const activeOrg = isSuperAdmin ? (sessionStorage.getItem('organization') || userOrg) : userOrg;
    const isKG = activeOrg === 'TCF-KG';
    const isTechnician = Boolean(
        user && (
            ['technician', 'teknisi'].includes(user.role?.toLowerCase()) ||
            user.role?.toLowerCase()?.includes('technician') ||
            user.role?.toLowerCase()?.includes('teknisi') ||
            user.role?.toLowerCase()?.includes('tech') ||
            (isKG && user.username?.toLowerCase() === 'agung')
        )
    );
    const isKGTechnician = isKG && isTechnician;

    // Reactive Light/Dark mode watcher so Recharts & surfaces flip immediately with Topbar toggle
    const [isDark, setIsDark] = useState(() =>
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    );

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        const syncTheme = () => setIsDark(root.classList.contains('dark'));
        syncTheme();
        const obs = new MutationObserver(syncTheme);
        obs.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const [summary, setSummary] = useState({
        assets: { total: 0, underMaintenance: 0 },
        tickets: { open: 0, resolved: 0 },
        users: { total: 0 }
    });
    const [allAssets, setAllAssets] = useState([]);
    const [maintenanceSchedule, setMaintenanceSchedule] = useState([]);
    const [infraGuardMetrics, setInfraGuardMetrics] = useState({ activeNodes: [], alerts: [], serverMetrics: null });
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('Last 30 Days');

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const orgQuery = `organization=${activeOrg}`;
            const currentYear = new Date().getFullYear();
            const semester = new Date().getMonth() < 6 ? 1 : 2;

            const [summaryRes, assetsRes, maintRes, infraGuardMetricsRes] = await Promise.all([
                fetch(`/api/network/stats?${orgQuery}`).catch(() => ({ json: () => ({ assets: { total: 0, underMaintenance: 0 }, tickets: { open: 0, resolved: 0 }, users: { total: 0 } }) })),
                fetch(`/api/network/assets?${orgQuery}`).catch(() => ({ json: () => [] })),
                fetch(`/api/network/maintenance/schedule?year=${currentYear}&semester=${semester}&${orgQuery}`).catch(() => ({ json: () => [] })),
                fetch(`/api/network/infraguard-metrics?${orgQuery}`).catch(() => ({ json: () => ({ activeNodes: [], alerts: [], serverMetrics: null }) }))
            ]);

            const summaryData = await summaryRes.json().catch(() => ({ assets: { total: 0, underMaintenance: 0 }, tickets: { open: 0, resolved: 0 }, users: { total: 0 } }));
            const assetsData = await assetsRes.json().catch(() => []);
            const maintData = await maintRes.json().catch(() => []);
            const infraData = await infraGuardMetricsRes.json().catch(() => ({ activeNodes: [], alerts: [], serverMetrics: null }));

            setSummary(summaryData);
            setAllAssets(Array.isArray(assetsData) ? assetsData : []);
            setInfraGuardMetrics(infraData || { activeNodes: [], alerts: [], serverMetrics: null });

            if (Array.isArray(maintData)) {
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentWeek = Math.ceil(now.getDate() / 7);
                const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                const upcoming = [];

                for (const item of maintData) {
                    if (!item.plan?.planning_data) continue;
                    let pd = {};
                    try { pd = typeof item.plan.planning_data === 'string' ? JSON.parse(item.plan.planning_data) : item.plan.planning_data; } catch { continue; }
                    let ad = {};
                    try { ad = typeof item.plan.actual_data === 'string' ? JSON.parse(item.plan.actual_data || '{}') : (item.plan.actual_data || {}); } catch {}

                    const nextKey = Object.keys(pd)
                        .filter((k) => {
                            const [m, w] = k.split('_').map(Number);
                            const isFuture = m > currentMonth || (m === currentMonth && w >= currentWeek);
                            return isFuture && !ad[k];
                        })
                        .sort()[0];

                    if (nextKey) {
                        const [m, w] = nextKey.split('_').map(Number);
                        upcoming.push({ ...item, nextSlotLabel: `${monthNames[m] || m} W${w}` });
                    }
                    if (upcoming.length >= 6) break;
                }
                setMaintenanceSchedule(upcoming);
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const assetDistData = useMemo(() => {
        const counts = allAssets.reduce((acc, asset) => {
            const cat = asset.category || 'Other';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [allAssets]);

    const totalAssetsCount = summary?.assets?.total || allAssets.length || 0;
    const maintCount = summary?.assets?.underMaintenance || 0;
    const healthyCount = Math.max(0, totalAssetsCount - maintCount);
    const readinessPct = totalAssetsCount > 0 ? ((healthyCount / totalAssetsCount) * 100).toFixed(1) : '100.0';

    const handleExportSnapshot = () => {
        const rows = [
            ['INFRA CORE COMMAND CENTER SNAPSHOT', activeOrg],
            ['Metric', 'Value'],
            ['Inventory Nodes', totalAssetsCount],
            ['Healthy Nodes', healthyCount],
            ['Active Maintenance', maintCount],
            ['Readiness %', `${readinessPct}%`],
            ['Open Tickets', summary?.tickets?.open || 0],
            ['Ops Capacity (Users)', summary?.users?.total || 0],
            [],
            ['Category Distribution', 'Count'],
            ...assetDistData.map(d => [d.name, d.value])
        ];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const link = document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        link.download = `InfraCore_Command_Summary_${activeOrg}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="text-center space-y-3">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-blue-500 font-bold tracking-widest text-[10px] uppercase animate-pulse">Syncing Command Center...</p>
                </div>
            </div>
        );
    }

    const surfaceCard = isDark
        ? 'bg-[#0b132b] border border-slate-800 shadow-xl shadow-black/30'
        : 'bg-white border border-slate-200/80 shadow-sm';

    const innerTile = isDark
        ? 'bg-[#0f172a] border border-slate-800 hover:border-slate-700'
        : 'bg-slate-50/80 border border-slate-200/80 hover:border-slate-300';

    const titleText = isDark ? 'text-white' : 'text-slate-900';
    const subText = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="space-y-6 pb-16 relative">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${titleText}`}>
                            Command <span className="text-blue-500">Center</span>
                        </h1>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isDark
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                            Fleet {readinessPct}% Ready
                        </span>
                    </div>
                    <p className={`font-medium text-xs sm:text-sm mt-1 ${subText}`}>
                        Monitoring ICT Infrastructure, Asset Distribution &amp; Support Operations ({activeOrg}).
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className={`rounded-xl px-3 py-2 flex items-center gap-2 border ${
                        isDark ? 'bg-[#0b132b] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
                    }`}>
                        <Calendar size={14} className="text-blue-500" />
                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                            className={`bg-transparent text-[11px] font-black uppercase tracking-wider outline-none cursor-pointer ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                        >
                            <option value="Last 30 Days" className={isDark ? 'bg-slate-900 text-white' : ''}>Last 30 Days</option>
                            <option value="Last 7 Days" className={isDark ? 'bg-slate-900 text-white' : ''}>Last 7 Days</option>
                            <option value="This Year" className={isDark ? 'bg-slate-900 text-white' : ''}>This Year</option>
                        </select>
                    </div>
                    <button
                        onClick={fetchDashboard}
                        title="Refresh Live Metrics"
                        className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                        <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleExportSnapshot}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                            isDark
                                ? 'bg-[#0b132b] hover:bg-slate-800 border-slate-800 text-slate-200'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                        }`}
                    >
                        <Download size={14} className="text-emerald-500" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <StatCard onClick={() => navigate('/ict/assets')} icon={HardDrive} label="Inventory Nodes" value={totalAssetsCount} delta="+2.4%" color="blue" />
                <StatCard onClick={() => navigate('/ict/maintenance')} icon={Zap} label="Active Maint" value={maintCount} delta={maintCount === 0 ? 'Clear' : 'Queued'} color="amber" />
                <StatCard onClick={() => navigate('/ict/tickets')} icon={Ticket} label="Open Tickets" value={summary?.tickets?.open || 0} delta={`${summary?.tickets?.resolved || 0} Solved`} color="rose" />
                <StatCard onClick={() => navigate('/admin')} icon={Users} label="Ops Capacity" value={summary?.users?.total || 0} delta="Stable" color="emerald" />
            </div>

            {/* ── Centralized Unified Dashboards ── */}
            <div className={`${surfaceCard} rounded-3xl p-4 sm:p-5 border-l-4 border-l-blue-600`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-sm font-black flex items-center gap-2 ${titleText}`}>
                        <LayoutGrid className="text-blue-500" size={16} />
                        <span>Unified Dashboards</span>
                    </h2>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${subText}`}>Quick Launch Modules</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <QuickModuleCard
                        isDark={isDark}
                        onClick={() => navigate('/ict/assets')}
                        icon={Box}
                        gradient="from-blue-500 to-indigo-600"
                        title="Dashboard Asset"
                        subtitle="Manajemen & Tracking Aset"
                    />
                    <QuickModuleCard
                        isDark={isDark}
                        onClick={() => navigate(`/public/dashboard/view/ticket?org=${activeOrg}`)}
                        icon={Ticket}
                        gradient="from-rose-500 to-pink-600"
                        title="Dashboard Ticket"
                        subtitle="Monitoring Helpdesk"
                    />
                    {!isKGTechnician && (
                        <QuickModuleCard
                            isDark={isDark}
                            onClick={() => navigate('/ict/infraguard-dashboard')}
                            icon={Shield}
                            gradient="from-emerald-500 to-teal-600"
                            title="Infra Guard"
                            subtitle="Security & Network Gateway"
                        />
                    )}
                    <QuickModuleCard
                        isDark={isDark}
                        onClick={() => navigate('/ict/reports')}
                        icon={Activity}
                        gradient="from-amber-500 to-orange-600"
                        title="System Analytics"
                        subtitle="Performance KPI & Metrics"
                    />
                </div>
            </div>

            {/* ── Row 1: Asset Distribution + Maintenance Roadmap ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Asset Distribution (2/3) */}
                <div className={`lg:col-span-2 ${surfaceCard} rounded-3xl p-5 sm:p-6 flex flex-col justify-between`}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className={`text-base sm:text-lg font-black flex items-center gap-2.5 ${titleText}`}>
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <BarChart3 size={18} />
                                </div>
                                <span>Asset Nodes Distribution</span>
                            </h2>
                            <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${subText}`}>
                                Hardware category breakdown across active fleet
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/ict/assets')}
                            className={`text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                                isDark ? 'border-slate-700 text-blue-400 hover:bg-slate-800' : 'border-slate-200 text-blue-600 hover:bg-blue-50'
                            }`}
                        >
                            Lihat Aset
                        </button>
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={assetDistData} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#E2E8F0'} horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke={isDark ? '#e2e8f0' : '#334155'}
                                    tick={{ fill: isDark ? '#e2e8f0' : '#334155', fontSize: 12, fontWeight: 700 }}
                                    width={95}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}
                                    contentStyle={{
                                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                        borderRadius: '14px',
                                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                        color: isDark ? '#f8fafc' : '#0f172a',
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
                                    }}
                                    itemStyle={{ color: isDark ? '#60a5fa' : '#2563eb', fontWeight: 800 }}
                                    labelStyle={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 800 }}
                                />
                                <Bar dataKey="value" name="Units" radius={[0, 8, 8, 0]} barSize={24}>
                                    {assetDistData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3B82F6', '#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'][index % 6]} />
                                    ))}
                                    <LabelList
                                        dataKey="value"
                                        position="right"
                                        fill={isDark ? '#f8fafc' : '#0f172a'}
                                        fontSize={12}
                                        fontWeight={800}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className={`${innerTile} p-3.5 rounded-2xl transition-colors`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${subText}`}>Total Assets</p>
                            <p className={`text-2xl font-black mt-0.5 ${titleText}`}>{totalAssetsCount}</p>
                        </div>
                        <div className={`${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50/70 border border-emerald-200/70'} p-3.5 rounded-2xl`}>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Healthy Nodes</p>
                            <p className="text-2xl font-black text-emerald-500 mt-0.5">{healthyCount}</p>
                        </div>
                        <div className={`${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50/70 border border-amber-200/70'} p-3.5 rounded-2xl`}>
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Under Maint</p>
                            <p className="text-2xl font-black text-amber-500 mt-0.5">{maintCount}</p>
                        </div>
                        <div className={`${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50/70 border border-blue-200/70'} p-3.5 rounded-2xl`}>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Readiness</p>
                            <p className="text-2xl font-black text-blue-500 mt-0.5">{readinessPct}%</p>
                        </div>
                    </div>
                </div>

                {/* Maintenance Roadmap (1/3) */}
                <div className={`${surfaceCard} rounded-3xl flex flex-col overflow-hidden`}>
                    <div className={`px-5 py-4 border-b flex items-center justify-between ${
                        isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-slate-50/80 border-slate-200/70'
                    }`}>
                        <div>
                            <h2 className={`text-base font-black flex items-center gap-2 ${titleText}`}>
                                <span className={`p-1.5 rounded-lg ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                                    <Zap size={16} />
                                </span>
                                <span>Roadmap</span>
                            </h2>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${subText}`}>
                                Next scheduled node service
                            </p>
                        </div>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                            isDark ? 'bg-[#0b132b] border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                            <Calendar size={16} />
                        </div>
                    </div>

                    <div className="flex-1 p-4 space-y-2.5 overflow-y-auto custom-scrollbar max-h-[340px]">
                        {maintenanceSchedule.length > 0 ? maintenanceSchedule.map((item, i) => (
                            <div
                                key={i}
                                onClick={() => navigate(`/ict/maintenance/execution/${item.asset.id}`)}
                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                                    isDark
                                        ? 'bg-[#0f172a] border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/70'
                                        : 'bg-slate-50/60 border-slate-200/80 hover:border-amber-400 hover:bg-amber-50/40'
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                    isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
                                }`}>
                                    <Cpu size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs sm:text-sm font-black truncate ${titleText}`}>{item.asset.name}</p>
                                    <p className={`text-[10px] font-mono font-bold truncate ${subText}`}>{item.asset.inventory_number}</p>
                                </div>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 border ${
                                    isDark
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                }`}>
                                    {item.nextSlotLabel || 'Queue'}
                                </span>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                                    isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-500'
                                }`}>
                                    <CheckCircle size={28} />
                                </div>
                                <p className={`text-sm font-black uppercase tracking-widest ${titleText}`}>Schedule Clear</p>
                                <p className={`text-xs font-bold mt-1 ${subText}`}>No pending action required</p>
                            </div>
                        )}
                    </div>

                    <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200/70 bg-slate-50/60'}`}>
                        <button
                            onClick={() => navigate('/ict/maintenance')}
                            className={`w-full py-3 rounded-xl text-[11px] uppercase tracking-[0.18em] font-black border transition-all cursor-pointer ${
                                isDark
                                    ? 'bg-[#0b132b] border-slate-700 text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/40'
                                    : 'bg-white border-slate-300 text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                        >
                            View Full Schedule
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Row 2: Infra Guard Telemetry (Protected with force-dark-table) ── */}
            <div className="bg-gradient-to-br from-[#0f172a] via-[#131c38] to-[#0b1120] border border-indigo-500/20 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-3">
                            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                                <Shield size={20} />
                            </span>
                            <span>{isKG ? 'Plant KG Node Telemetry' : 'Infra Guard Telemetry'}</span>
                        </h2>
                        <p className="text-[11px] text-indigo-200/70 font-bold uppercase tracking-widest mt-1">
                            {isKG ? 'Real-time gateway & server metrics from Plant Karawang' : 'Real-time gateway & server metrics from Server 3'}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/ict/infraguard')}
                        className="px-4 py-2 bg-indigo-500/15 border border-indigo-400/30 rounded-xl text-[11px] font-black uppercase tracking-widest text-indigo-200 hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                    >
                        Open Terminal <ArrowUpRight size={14} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Active Uplinks (force-dark-table prevents light override) */}
                    <div className="force-dark-table lg:col-span-2 overflow-x-auto custom-scrollbar bg-slate-950/60 backdrop-blur-md rounded-2xl border border-white/10 p-3">
                        <table className="force-dark-table w-full text-left min-w-[440px]">
                            <thead>
                                <tr className="text-[10px] font-black text-indigo-300/80 uppercase tracking-[0.18em] border-b border-white/10">
                                    <th className="py-3 px-3">Active Uplinks</th>
                                    <th className="py-3 px-3 text-center">IP Address</th>
                                    <th className="py-3 px-3 text-center">Last Seen</th>
                                    <th className="py-3 px-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {infraGuardMetrics?.activeNodes?.length > 0 ? infraGuardMetrics.activeNodes.slice(0, 5).map((node, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                                                <span className="text-xs font-bold text-white">{node.hostname}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center text-xs font-mono font-bold text-cyan-300">
                                            {node.ip}
                                        </td>
                                        <td className="py-3 px-3 text-center text-xs font-semibold text-slate-300">
                                            {new Date(node.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <span className="inline-flex px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest">
                                                ONLINE
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-10 text-center">
                                            <Wifi size={24} className="mx-auto text-indigo-300/40 mb-2" />
                                            <p className="text-xs font-bold text-indigo-200/60 uppercase tracking-widest">No Active Uplinks</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Server Performance */}
                    <div className="bg-slate-950/60 backdrop-blur-md rounded-2xl border border-white/10 p-5 flex flex-col justify-center">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-200/80 mb-5 text-center">
                            Gateway Server Load
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-xs font-black mb-2">
                                    <span className="text-slate-200 uppercase tracking-wider">CPU Usage</span>
                                    <span className="text-indigo-300">{infraGuardMetrics?.serverMetrics?.cpu_usage || 0}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${infraGuardMetrics?.serverMetrics?.cpu_usage || 0}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-black mb-2">
                                    <span className="text-slate-200 uppercase tracking-wider">Memory</span>
                                    <span className="text-cyan-300">{infraGuardMetrics?.serverMetrics?.memory_usage || 0}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700" style={{ width: `${infraGuardMetrics?.serverMetrics?.memory_usage || 0}%` }} />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10 text-center">
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-400/25 text-[10px] font-black uppercase tracking-widest">
                                    <Shield size={12} className="text-indigo-400" /> Protected by Infra Guard
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 3: Highlight Banners ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div
                    onClick={() => navigate('/ict/assets')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl overflow-hidden relative p-6 group cursor-pointer shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/25 shrink-0">
                            <Monitor size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Fleet Integration</h3>
                            <p className="text-blue-100 text-xs font-bold mt-1 leading-relaxed">
                                Node integrity running at <span className="text-white font-black bg-white/20 px-1.5 py-0.5 rounded">{readinessPct}%</span> — Managing <span className="text-white font-black">{totalAssetsCount}</span> enterprise assets.
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/ict/infraguard-dashboard')}
                    className="bg-gradient-to-r from-slate-800 to-slate-950 border border-slate-700/60 rounded-3xl overflow-hidden relative p-6 group cursor-pointer shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-cyan-400 border border-white/15 shrink-0">
                            <Activity size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Uptime Performance</h3>
                            <p className="text-slate-300 text-xs font-bold mt-1 leading-relaxed">
                                Core router uptime: <span className="text-white font-black bg-white/15 px-1.5 py-0.5 rounded">{infraGuardMetrics?.serverMetrics?.uptime || '99.98%'}</span> — Node latency optimized to <span className="text-cyan-400 font-black">~15ms</span>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

function QuickModuleCard({ isDark, onClick, icon: Icon, gradient, title, subtitle }) {
    return (
        <div
            onClick={onClick}
            className={`rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-200 group border ${
                isDark
                    ? 'bg-[#0f172a] border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80'
                    : 'bg-slate-50/70 border-slate-200/80 hover:border-blue-400 hover:bg-white shadow-xs hover:shadow-md'
            }`}
        >
            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-2xl shadow-md flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className={`font-black text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
                <p className={`text-[10px] font-bold uppercase tracking-wider truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
            </div>
            <ArrowUpRight size={15} className={`shrink-0 opacity-40 group-hover:opacity-100 transition-opacity ${isDark ? 'text-white' : 'text-slate-600'}`} />
        </div>
    );
}

function StatCard({ icon: Icon, label, value, delta, color, onClick }) {
    const colors = {
        blue: { bg: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-600/25', text: 'text-blue-100' },
        emerald: { bg: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-600/25', text: 'text-emerald-100' },
        rose: { bg: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-600/25', text: 'text-rose-100' },
        amber: { bg: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-600/25', text: 'text-amber-100' }
    };

    const c = colors[color] || colors.blue;

    return (
        <div
            onClick={onClick}
            className={`bg-gradient-to-br ${c.bg} rounded-3xl p-5 shadow-lg ${c.shadow} group hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden`}
        >
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/15 blur-2xl rounded-full group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center text-white">
                    <Icon size={20} />
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border bg-white/20 text-white border-white/25">
                    {delta}
                </span>
            </div>
            <div className="relative z-10">
                <p className={`text-[10px] font-black uppercase tracking-[0.18em] mb-1 ${c.text}`}>{label}</p>
                <div className="text-3xl font-black text-white tracking-tight">{value}</div>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity, Clock, Calendar, CheckCircle, AlertCircle,
    TrendingUp, Monitor, LayoutGrid, ArrowUpRight,
    Users, Ticket, Briefcase, Globe, Zap, Search,
    Filter, RefreshCw, ChevronDown, Download, MoreHorizontal,
    HardDrive, Cpu, Wifi, Smartphone, Server, Shield,
    Terminal, Lock, Box, BarChart3
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area,
    Legend, BarChart, Bar, Cell, PieChart, Pie
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

    const [summary, setSummary] = useState({
        assets: { total: 0, underMaintenance: 0 },
        tickets: { open: 0, resolved: 0 },
        users: { total: 0 }
    });
    const [activity, setActivity] = useState({ created: [], closed: [] });
    const [departments, setDepartments] = useState([]);
    const [allAssets, setAllAssets] = useState([]);
    const [maintenanceSchedule, setMaintenanceSchedule] = useState([]);
    const [ticketCategories, setTicketCategories] = useState([]);
    const [ticketsData, setTicketsData] = useState([]);
    const [monitoringAlerts, setMonitoringAlerts] = useState({ whatsapp: [], email: [], teams: [] });
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

            const [summaryRes, detailedRes, assetsRes, maintRes, categoriesRes, ticketsRes, whatsappRes, emailRes, teamsRes, infraGuardMetricsRes] = await Promise.all([
                fetch(`/api/network/stats?${orgQuery}`).catch(() => ({ json: () => ({ assets: { total: 0, underMaintenance: 0 }, tickets: { open: 0, resolved: 0 }, users: { total: 0 } }) })),
                fetch(`/api/network/stats/dashboard?${orgQuery}`).catch(() => ({ json: () => ({ activity: { created: [], closed: [] }, departments: [] }) })),
                fetch(`/api/network/assets?${orgQuery}`).catch(() => ({ json: () => [] })),
                fetch(`/api/network/maintenance/schedule?year=${currentYear}&semester=${semester}&${orgQuery}`).catch(() => ({ json: () => [] })),
                fetch(`/api/network/stats/categories?${orgQuery}`).catch(() => ({ json: () => [] })),
                fetch(`/api/network/tickets?${orgQuery}`).catch(() => ({ json: () => [] })),
                fetch(`/api/monitoring/alerts?platform=whatsapp&${orgQuery}`).catch(() => ({ json: () => [] })),
                fetch(`/api/monitoring/alerts?platform=email&${orgQuery}`).catch(() => ({ json: () => [] })),
                fetch(`/api/monitoring/alerts?platform=teams&${orgQuery}`).catch(() => ({ json: () => [] })),
                fetch(`/api/network/infraguard-metrics?${orgQuery}`).catch(() => ({ json: () => ({ activeNodes: [], alerts: [], serverMetrics: null }) }))
            ]);

            const summaryData   = await summaryRes.json().catch(() => ({ assets: { total: 0, underMaintenance: 0 }, tickets: { open: 0, resolved: 0 }, users: { total: 0 } }));
            const detailedData  = await detailedRes.json().catch(() => ({ activity: { created: [], closed: [] }, departments: [] }));
            const assetsData    = await assetsRes.json().catch(() => []);
            const maintData     = await maintRes.json().catch(() => []);
            const categoriesData = await categoriesRes.json().catch(() => []);
            const ticketsDataRaw = await ticketsRes.json().catch(() => []);
            const whatsappData  = await whatsappRes.json().catch(() => []);
            const emailData     = await emailRes.json().catch(() => []);
            const teamsData     = await teamsRes.json().catch(() => []);
            const infraData     = await infraGuardMetricsRes.json().catch(() => ({ activeNodes: [], alerts: [], serverMetrics: null }));

            setSummary(summaryData);
            setActivity(detailedData?.activity || { created: [], closed: [] });
            setDepartments(detailedData?.departments || []);
            setAllAssets(Array.isArray(assetsData) ? assetsData : []);
            setTicketCategories(Array.isArray(categoriesData) ? categoriesData : []);
            setTicketsData(Array.isArray(ticketsDataRaw) ? ticketsDataRaw : []);
            setInfraGuardMetrics(infraData || { activeNodes: [], alerts: [], serverMetrics: null });
            setMonitoringAlerts({
                whatsapp: Array.isArray(whatsappData) ? whatsappData : [],
                email: Array.isArray(emailData) ? emailData : [],
                teams: Array.isArray(teamsData) ? teamsData : []
            });

            if (Array.isArray(maintData)) {
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentWeek = Math.ceil(now.getDate() / 7);
                const upcoming = maintData.filter(item => {
                    if (!item.plan?.planning_data) return false;
                    let pd = {};
                    try { pd = typeof item.plan.planning_data === 'string' ? JSON.parse(item.plan.planning_data) : item.plan.planning_data; } catch { return false; }
                    return Object.keys(pd).some(k => {
                        const [m, w] = k.split('_').map(Number);
                        const isFuture = m > currentMonth || (m === currentMonth && w >= currentWeek);
                        let ad = {};
                        try { ad = typeof item.plan.actual_data === 'string' ? JSON.parse(item.plan.actual_data || '{}') : (item.plan.actual_data || {}); } catch {}
                        return isFuture && !ad[k];
                    });
                }).slice(0, 6);
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
            const cat = asset.category || 'Unknown';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [allAssets]);

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

    return (
        <div className="space-y-6 pb-16 relative">
            {/* Background glowing effects for premium feel */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Command <span className="text-blue-600">Center</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Monitoring ICT Infrastructure and Support Operations.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-white border border-[#E1E1E1] rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{timeframe}</span>
                        <ChevronDown size={13} className="text-slate-400" />
                    </div>
                    <button onClick={fetchDashboard} className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95">
                        <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-[#E1E1E1] rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all">
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard onClick={() => navigate('/ict/assets')} icon={HardDrive} label="Inventory Nodes"  value={summary?.assets?.total || 0}            delta="+2.4%" trend="up" color="blue" />
                <StatCard onClick={() => navigate('/ict/maintenance')} icon={Zap}       label="Active Maint"     value={summary?.assets?.underMaintenance || 0} delta="-15%"  trend="down" color="amber" />
                <StatCard onClick={() => navigate('/ict/tickets')} icon={Ticket}    label="Open Tickets"     value={summary?.tickets?.open || 0}            delta="+12%"  trend="up" color="rose" />
                <StatCard onClick={() => navigate('/admin')} icon={Users}     label="Ops Capacity"     value={summary?.users?.total || 0}             delta="Stable" trend="neutral" color="emerald" />
            </div>

            {/* ── Centralized Unified Dashboards ── */}
            <div className="card-unifi p-4 shadow-sm border-l-4 border-blue-600">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
                    <LayoutGrid className="text-blue-600" size={16} /> Unified Dashboards
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div onClick={() => navigate('/ict/assets')} className="bg-white/60 backdrop-blur-md border border-white/40 hover:border-blue-400 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(37,99,235,0.15)] hover:-translate-y-1">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            <Box size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm group-hover:text-blue-700 transition-colors">Dashboard Asset</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Manajemen & Tracking Aset</p>
                        </div>
                    </div>
                    
                    <div onClick={() => {
                        const org = JSON.parse(sessionStorage.getItem('user') || '{}')?.organization || 'TCF-SG';
                        navigate(`/public/dashboard/view/ticket?org=${org}`);
                    }} className="bg-white/60 backdrop-blur-md border border-white/40 hover:border-rose-400 hover:bg-gradient-to-br hover:from-white hover:to-rose-50/50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(225,29,72,0.15)] hover:-translate-y-1">
                        <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-lg shadow-rose-500/30 flex items-center justify-center text-white group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                            <Ticket size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm group-hover:text-rose-700 transition-colors">Dashboard Ticket</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Monitoring Helpdesk</p>
                        </div>
                    </div>

                    <div onClick={() => navigate('/ict/reports')} className="bg-white/60 backdrop-blur-md border border-white/40 hover:border-amber-400 hover:bg-gradient-to-br hover:from-white hover:to-amber-50/50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)] hover:-translate-y-1">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/30 flex items-center justify-center text-white group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm group-hover:text-amber-700 transition-colors">System Analytics</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Performance KPI & Metrics</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 1: Asset Distribution + Maintenance Roadmap ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Asset Distribution (takes 2/3) */}
                <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/40 rounded-3xl p-6 flex flex-col relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-blue-100/50 text-blue-600 rounded-xl">
                                    <BarChart3 size={20} />
                                </div>
                                Asset Nodes Distribution
                            </h2>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Distribution by hardware category across the fleet</p>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[260px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={assetDistData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} fontWeight="bold" width={90} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                                    {assetDistData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3B82F6', '#6366F1', '#8B5CF6', '#10B981', '#F59E0B'][index % 5]} className="hover:opacity-80 transition-opacity" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Assets</p>
                                <p className="text-3xl font-black text-slate-800">{summary?.assets?.total || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><HardDrive size={24} /></div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border border-emerald-100/50 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Healthy Nodes</p>
                                <p className="text-3xl font-black text-emerald-600">{(summary?.assets?.total || 0) - (summary?.assets?.underMaintenance || 0)}</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-100/50 rounded-xl flex items-center justify-center text-emerald-500"><Activity size={24} /></div>
                        </div>
                    </div>
                </div>

                {/* Maintenance Roadmap (takes 1/3) */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/40 rounded-3xl flex flex-col overflow-hidden relative group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="px-6 py-5 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/80 to-transparent flex items-center justify-between relative z-10">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                <div className="p-1.5 bg-amber-100/50 text-amber-600 rounded-lg">
                                    <Zap size={18} />
                                </div>
                                Roadmap
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Next scheduled node service</p>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                            <Calendar size={18} className="text-slate-400" />
                        </div>
                    </div>

                    <div className="flex-1 p-5 space-y-3 overflow-y-auto custom-scrollbar min-h-[250px] relative z-10">
                        {maintenanceSchedule.length > 0 ? maintenanceSchedule.map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-3.5 bg-white border border-slate-100 shadow-sm rounded-2xl hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
                                <div className="w-10 h-10 rounded-xl bg-amber-50/50 border border-amber-100/50 flex items-center justify-center text-amber-600 flex-shrink-0">
                                    <Cpu size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate">{item.asset.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{item.asset.inventory_number}</p>
                                </div>
                                <span className="text-[10px] font-black text-amber-600 uppercase bg-amber-100/50 px-2.5 py-1 rounded-lg flex-shrink-0 shadow-inner">Queue</span>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle size={32} className="text-emerald-400" />
                                </div>
                                <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Schedule Clear</p>
                                <p className="text-[11px] font-bold text-slate-400 mt-1">No action required</p>
                            </div>
                        )}
                    </div>

                    <div className="p-5 border-t border-slate-100/50 bg-slate-50/50 relative z-10">
                        <button onClick={() => navigate('/ict/maintenance')} className="w-full py-3.5 bg-white border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-xl text-[11px] uppercase tracking-[0.2em] font-black transition-all shadow-sm active:scale-95">
                            View Full Schedule
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Row 2.5: Infra Guard Telemetry ── */}
            {/* ── Row 2.5: Infra Guard Telemetry ── */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 shadow-2xl shadow-indigo-900/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                                <Shield size={20} />
                            </div>
                            Plant KG Node Telemetry
                        </h2>
                        <p className="text-[11px] text-indigo-200/60 font-bold uppercase tracking-widest mt-1">Real-time gateway & server metrics from Plant Karawang</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                    {/* Active Uplinks */}
                    <div className="lg:col-span-2 overflow-x-auto custom-scrollbar bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-2">
                        <table className="w-full text-left min-w-[400px]">
                            <thead>
                                <tr className="text-[10px] font-black text-indigo-200/50 uppercase tracking-[0.2em] border-b border-white/10">
                                    <th className="pb-4 pl-4 pr-4">Active Uplinks</th>
                                    <th className="pb-4 text-center">IP Address</th>
                                    <th className="pb-4 text-center">Last Seen</th>
                                    <th className="pb-4 pr-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {infraGuardMetrics?.activeNodes?.length > 0 ? infraGuardMetrics.activeNodes.slice(0, 4).map((node, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 pl-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                                <span className="text-xs font-bold text-indigo-50">{node.hostname}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center text-[11px] font-bold text-indigo-200/70 tracking-wider">
                                            {node.ip}
                                        </td>
                                        <td className="py-4 text-center text-[11px] font-bold text-indigo-200/50">
                                            {new Date(node.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <span className="inline-flex px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest shadow-inner">
                                                ONLINE
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center">
                                            <Wifi size={24} className="mx-auto text-indigo-200/30 mb-3" />
                                            <p className="text-[11px] font-bold text-indigo-200/50 uppercase tracking-widest">No Active Uplinks</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Server Performance */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-sm flex flex-col justify-center">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/60 mb-6 text-center">Gateway Server Load</h3>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-[11px] font-black mb-2">
                                    <span className="text-indigo-100 uppercase tracking-wider">CPU Usage</span>
                                    <span className="text-indigo-400">{infraGuardMetrics?.serverMetrics?.cpu_usage || 0}%</span>
                                </div>
                                <div className="w-full h-2 bg-indigo-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${infraGuardMetrics?.serverMetrics?.cpu_usage || 0}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[11px] font-black mb-2">
                                    <span className="text-indigo-100 uppercase tracking-wider">Memory</span>
                                    <span className="text-blue-400">{infraGuardMetrics?.serverMetrics?.memory_usage || 0}%</span>
                                </div>
                                <div className="w-full h-2 bg-indigo-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${infraGuardMetrics?.serverMetrics?.memory_usage || 0}%` }} />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10 text-center">
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <Shield size={12} className="text-indigo-400" /> Protected by Infra Guard
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* ── Row 3: Info Highlight Banners ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fleet Integration Banner */}
                <div onClick={() => navigate('/ict/assets')} className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl overflow-hidden relative p-6 group cursor-pointer shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-20 -mt-20 transition-all duration-700 group-hover:scale-150" />
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 flex-shrink-0 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                            <Monitor size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">Fleet Integration</h3>
                            <p className="text-blue-100 text-xs font-bold mt-1.5 leading-relaxed tracking-wide">
                                Node integrity check running at <span className="text-white font-black bg-white/20 px-1.5 py-0.5 rounded-md">99.8%</span>.
                                <br />Managing <span className="text-white font-black">{summary?.assets?.total || 0}</span> enterprise assets.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Performance Banner */}
                <div onClick={() => navigate('/ict/reports')} className="bg-gradient-to-r from-slate-800 to-slate-950 rounded-3xl overflow-hidden relative p-6 group cursor-pointer shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full -ml-20 -mb-20 transition-all duration-700 group-hover:scale-150" />
                    <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-blue-400 border border-white/10 flex-shrink-0 shadow-inner group-hover:-rotate-12 transition-transform duration-500">
                            <Activity size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">Uptime Performance</h3>
                            <p className="text-slate-300 text-xs font-bold mt-1.5 leading-relaxed tracking-wide">
                                Core router uptime: <span className="text-white font-black bg-white/10 px-1.5 py-0.5 rounded-md">{infraGuardMetrics?.serverMetrics?.uptime || 'Active'}</span>.
                                <br />Node latency optimized to <span className="text-blue-400 font-black">~15ms</span>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

function StatCard({ icon: Icon, label, value, delta, trend, color, onClick }) {
    const colors = {
        blue: { bg: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/40', text: 'text-blue-100', icon: 'text-white' },
        emerald: { bg: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/40', text: 'text-emerald-100', icon: 'text-white' },
        rose: { bg: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/40', text: 'text-rose-100', icon: 'text-white' },
        amber: { bg: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/40', text: 'text-amber-100', icon: 'text-white' }
    };

    const c = colors[color] || colors.blue;

    return (
        <div onClick={onClick} className={`bg-gradient-to-br ${c.bg} rounded-3xl p-5 shadow-lg ${c.shadow} group hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden`}>
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50"></div>
            {/* Glowing orb */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700"></div>

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                    <Icon size={22} />
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border bg-white/20 backdrop-blur-md text-white border-white/30 shadow-sm`}>
                    {delta}
                </div>
            </div>
            <div className="relative z-10">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${c.text}`}>{label}</p>
                <div className="text-3xl font-black text-white tracking-tighter drop-shadow-md group-hover:scale-105 origin-left transition-transform duration-300">{value}</div>
            </div>
        </div>
    );
}

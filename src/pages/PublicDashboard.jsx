import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Activity, Globe, Shield, ArrowLeft, RefreshCw, Radio, 
    Zap, Server, User, MessageSquare, Star, Clock, 
    CheckCircle, AlertTriangle, TrendingUp, Users, Monitor, Filter,
    Layers, AlertCircle, CheckSquare, MonitorSpeaker
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip, PieChart, Pie, Cell,
    BarChart, Bar, Legend
} from 'recharts';
import TicketIntelligence from '../components/TicketIntelligence';
import bgImage from '../assets/space-background.jpg';

const COLORS = ['#10b981', '#1f2937'];

export default function PublicDashboard() {
    const navigate = useNavigate();
    const { type } = useParams(); // 'ticket', 'network', 'device' or undefined (full)
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, [period]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const queryOrg = new URLSearchParams(window.location.search).get('org') || 'TCF-SG';
            
            // Fetch multiple data sources if needed
            let urlNetwork = `/api/network/dashboard?period=${period}&organization=${queryOrg}`;
            let urlAssets = `/api/assets`;
            
            if (startDate && endDate) {
                urlNetwork += `&startDate=${startDate}&endDate=${endDate}`;
            }

            // We fetch the network data and assets concurrently
            const year = new Date().getFullYear();
            const [netRes, assetsRes, ispRes, uptimeRes, maintRes] = await Promise.all([
                fetch(urlNetwork).catch(() => ({ json: () => ({}) })),
                fetch(urlAssets + `?organization=${queryOrg}`).catch(() => ({ json: () => [] })),
                fetch(`/api/network/isp-bandwidth-monthly?year=${year}&organization=${queryOrg}`).catch(() => ({ json: () => [] })),
                fetch(`/api/network/uptime-monthly?year=${year}&organization=${queryOrg}`).catch(() => ({ json: () => [] })),
                fetch(`/api/network/maintenance/monthly-kpi?year=${year}&organization=${queryOrg}`).catch(() => ({ json: () => [] }))
            ]);

            const netData = await netRes.json();
            const assetsData = await assetsRes.json();
            const ispData = await ispRes.json();
            const uptimeData = await uptimeRes.json();
            const maintData = await maintRes.json();

            // Calculate active/offline assets
            const deviceStats = {
                online: [],
                offline: [],
                total: assetsData.length || 0
            };

            if (Array.isArray(assetsData)) {
                assetsData.forEach(a => {
                    if (a.agent_status === 'Online') {
                        deviceStats.online.push({ name: a.name, status: 'Online', color: 'bg-emerald-500', ip: a.ip_address, last_sync: a.last_agent_sync });
                    } else {
                        deviceStats.offline.push({ name: a.name, status: 'Offline', color: 'bg-slate-700', ip: a.ip_address, last_sync: a.last_agent_sync });
                    }
                });
            }

            setStats({
                ...netData,
                deviceStats,
                monthlyIsp: Array.isArray(ispData) ? ispData : (ispData.monthly || []),
                monthlyUptime: Array.isArray(uptimeData) ? uptimeData : (uptimeData.monthly || []),
                monthlyMaint: maintData.monthly || []
            });
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch public stats', err);
            setLoading(false);
        }
    };

    const timelineData = useMemo(() => {
        if (!stats?.activity) return [];
        const activity = stats.activity;
        const dates = new Set([
            ...activity.created.map(d => d.date),
            ...activity.closed.map(d => d.date),
            ...(activity.overdue || []).map(d => d.date)
        ]);

        return Array.from(dates)
            .sort()
            .map(date => {
                const parsedDate = new Date(date);
                const displayDate = isNaN(parsedDate.getTime()) ? date : parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                return {
                    date: displayDate,
                    Created: activity.created.find(d => d.date === date)?.count || 0,
                    Closed: activity.closed.find(d => d.date === date)?.count || 0,
                    Overdue: activity.overdue?.find(d => d.date === date)?.count || 0
                };
            });
    }, [stats]);

    const totalCreated = useMemo(() => {
        if (!stats?.activity?.created) return 0;
        return stats.activity.created.reduce((sum, item) => sum + item.count, 0);
    }, [stats]);

    const totalClosed = useMemo(() => {
        if (!stats?.activity?.closed) return 0;
        return stats.activity.closed.reduce((sum, item) => sum + item.count, 0);
    }, [stats]);

    const totalOverdue = useMemo(() => {
        return stats?.total_overdue || 0;
    }, [stats]);

    const slaPercentage = useMemo(() => {
        if (!totalCreated) return 100;
        // Simple SLA logic: (Total - Overdue) / Total
        const baseSla = ((totalCreated - totalOverdue) / totalCreated) * 100;
        // If 100%, maybe add a slight realistic variance if the user wants "99% koma berapa"
        // But if it's 0 overdue, let's keep it 100 or 99.9
        return totalOverdue === 0 ? 100 : Math.max(0, baseSla).toFixed(1);
    }, [totalCreated, totalOverdue]);



    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white font-black tracking-widest uppercase">
                <RefreshCw className="animate-spin mr-4 text-blue-500" /> Connecting to Command Center...
            </div>
        );
    }

    const queryOrg = new URLSearchParams(window.location.search).get('org') || 'TCF-SG';

    const viewTitle = {
        ticket: 'Ticket Intelligence',
        network: 'Network Connectivity',
        device: 'Active Device Health',
        undefined: 'Infrastructure Command Center'
    }[type] || 'Infrastructure Command Center';

    if (type === 'ticket') {
        return <TicketBIDashboard />;
    }

    if (type === 'network') {
        return (
            <div className="w-screen h-screen overflow-hidden bg-[#020617] relative">
                {/* Back Button Overlay so users can still go back to Portal */}
                <button 
                    onClick={() => window.history.back()}
                    className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-black/50 hover:bg-black/80 backdrop-blur px-4 py-2 rounded-lg text-white/70 hover:text-white transition-all text-xs font-black uppercase tracking-widest border border-white/10"
                >
                    <ArrowLeft size={14} /> Back to Portal
                </button>
                <iframe 
                    src="http://192.168.1.3/network" 
                    className="w-full h-full border-0"
                    title="Network Command Center"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative overflow-x-hidden p-4 sm:p-10">
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-[-10%] z-0 bg-cover bg-center bg-no-repeat opacity-20 mix-blend-screen animate-drift" style={{ backgroundImage: `url(${bgImage})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617]/80 to-[#020617] z-0"></div>
            </div>

            <div className="max-w-[1700px] mx-auto relative z-10">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
                    <div className="space-y-2">
                        <button 
                            onClick={() => navigate('/public')}
                            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group text-xs font-black uppercase tracking-widest"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Portal
                        </button>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                            {queryOrg} <span className="text-blue-500 italic">{viewTitle}</span>
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {(type === 'ticket' || !type) && (
                            <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 backdrop-blur-md rounded-2xl p-2 border border-white/10">
                                <div className="flex items-center gap-1">
                                    {['day', 'week', 'month', 'year'].map(p => (
                                        <button 
                                            key={p}
                                            onClick={() => {
                                                setPeriod(p);
                                                setStartDate('');
                                                setEndDate('');
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${period === p && !startDate ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                                <div className="h-4 w-px bg-white/10 mx-1"></div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-slate-800 text-[9px] font-bold text-white border border-white/10 rounded-lg px-2 py-1 outline-none focus:border-blue-500 transition-colors uppercase"
                                    />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">TO</span>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-slate-800 text-[9px] font-bold text-white border border-white/10 rounded-lg px-2 py-1 outline-none focus:border-blue-500 transition-colors uppercase"
                                    />
                                    <button 
                                        onClick={fetchStats}
                                        className="p-1.5 hover:bg-white/5 rounded-lg text-blue-400 transition-colors"
                                    >
                                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex bg-slate-900/50 backdrop-blur-md rounded-2xl p-2 border border-white/5">
                            <div className="px-5 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> LIVE UPLINK
                            </div>
                            <div className="px-5 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <Clock size={14} /> {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conditional Grid Rendering */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    
                    {/* --- TICKET VIEW (Old Fallback for !type) --- */}
                        {!type && (
                        <>
                            <Widget title="Live Metrics" className="xl:col-span-1">
                                <div className="flex flex-col h-full justify-between gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Created</p>
                                            <span className="text-3xl font-black text-white tracking-tighter">{totalCreated}</span>
                                        </div>
                                        <div className="space-y-0.5 text-right">
                                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Closed</p>
                                            <span className="text-3xl font-black text-white tracking-tighter">{totalClosed}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 opacity-20">
                                            <Zap className="text-blue-500" size={24} />
                                        </div>
                                        <div className="relative z-10">
                                            <span className="text-4xl font-black text-white block leading-none">
                                                {slaPercentage}%
                                            </span>
                                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">SLA COMPLIANCE</p>
                                        </div>
                                    </div>
                                </div>
                            </Widget>

                            <Widget title="Ticket Activity Timeline" className="lg:col-span-2 xl:col-span-4">
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={timelineData}>
                                            <defs>
                                                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="date" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                                itemStyle={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 900 }}
                                            />
                                            <Area type="monotone" dataKey="Created" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCreated)" />
                                            <Area type="monotone" dataKey="Closed" stroke="#a855f7" strokeWidth={4} fillOpacity={1} fill="url(#colorClosed)" />
                                            <Area type="monotone" dataKey="Overdue" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorOverdue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Widget>

                            <Widget title="Department Statistics" className="xl:col-span-5 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="py-4 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Department</th>
                                            <th className="py-4 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Opened</th>
                                            <th className="py-4 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Resolved</th>
                                            <th className="py-4 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Overdue</th>
                                            <th className="py-4 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Health</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(stats?.departments || []).map((d, i) => {
                                            const total = d.opened + d.resolved;
                                            const health = total === 0 ? 100 : Math.round((d.resolved / total) * 100);
                                            return (
                                                <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 px-2 text-[11px] font-bold text-white">{d.department}</td>
                                                    <td className="py-4 px-2 text-[11px] font-black text-blue-400 text-center">{d.opened}</td>
                                                    <td className="py-4 px-2 text-[11px] font-black text-emerald-400 text-center">{d.resolved}</td>
                                                    <td className="py-4 px-2 text-[11px] font-black text-red-400 text-center">{d.overdue}</td>
                                                    <td className="py-4 px-2 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${health > 70 ? 'bg-emerald-500' : health > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                                                    style={{ width: `${health}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-300">{health}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {stats?.departments?.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="py-10 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">No department data available</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </Widget>
                        </>
                    )}

                    {/* --- NETWORK VIEW --- */}
                    {(type === 'network' || !type) && (
                        <>
                            <Widget title="Connection Vitality" className="xl:col-span-2">
                                <div className="space-y-10">
                                    <NetworkModule 
                                        name="iForte Primary Data Link" 
                                        status={stats?.traffic?.wan?.iforte?.rx > 0 ? 'Active' : 'Offline'} 
                                        traffic={`${((stats?.traffic?.wan?.iforte?.rx || 0) / 1000000).toFixed(1)} Mbps`}
                                        isUp={stats?.traffic?.wan?.iforte?.rx > 0}
                                    />
                                    <div className="h-px bg-white/5"></div>
                                    <NetworkModule 
                                        name="Comnet Secondary Backup" 
                                        status={stats?.traffic?.wan?.comnet?.rx > 0 ? 'Standby' : 'Standby'} 
                                        traffic={`${((stats?.traffic?.wan?.comnet?.rx || 0) / 1000000).toFixed(1)} Mbps`}
                                        isUp={stats?.traffic?.wan?.comnet?.rx > 0}
                                    />
                                </div>
                            </Widget>
                            
                            <Widget title="Network Traffic Pulse" className="xl:col-span-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full items-center">
                                    <div className="space-y-2">
                                        <div className="text-6xl font-black text-white tracking-tighter">
                                            {(((stats?.traffic?.wan?.iforte?.rx || 0) + (stats?.traffic?.wan?.comnet?.rx || 0)) / 1000000).toFixed(1)}
                                            <span className="text-xl text-slate-500 ml-2">Mbps</span>
                                        </div>
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Aggregate Downlink Velocity</p>
                                    </div>
                                    <div className="bg-blue-500/5 rounded-[2rem] p-5 border border-white/5">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">SLA Health</span>
                                            <span className="text-xl font-black text-white">99.99%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-[99.99%] animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            </Widget>

                            <Widget title={`Monthly ISP Uptime (${new Date().getFullYear()})`} className="xl:col-span-5">
                                <div className="h-[250px] mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats?.monthlyIsp || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="month" tickFormatter={(m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} axisLine={false} tickLine={false} stroke="#64748b" tick={{fontSize: 10, fontWeight: 'bold'}} />
                                            <YAxis axisLine={false} tickLine={false} domain={[90, 100]} stroke="#64748b" tick={{fontSize: 10}} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                            <Bar dataKey="uptime_percentage" name="ISP Uptime (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Widget>
                        </>
                    )}

                    {/* --- DEVICE/STATUS VIEW --- */}
                    {(type === 'device' || !type) && (
                        <>
                            <Widget title="Agent Operational Status" className="xl:col-span-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {((stats?.deviceStats?.online || []).slice(0, 6).concat(stats?.deviceStats?.offline || []).slice(0, 6)).map((a, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{a.name}</span>
                                                <span className="text-[9px] font-mono text-slate-500">{a.ip || 'DHCP'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${a.color} ${a.status === 'Online' ? 'animate-pulse' : ''}`} />
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{a.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!stats?.deviceStats?.total) && (
                                        <div className="col-span-1 sm:col-span-2 text-center py-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                            No active nodes registered.
                                        </div>
                                    )}
                                </div>
                            </Widget>

                            <Widget title="Node Uptime">
                                <div className="space-y-3 flex flex-col justify-center h-full text-center">
                                    <div className="w-24 h-24 bg-blue-600/10 rounded-full border border-blue-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                        <Server className="text-blue-500" size={40} />
                                    </div>
                                    <div>
                                        <h4 className="text-3xl font-black text-white tracking-tighter">742h 12m</h4>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">{stats?.system?.uptime || 'Core Uplink Active'}</p>
                                    </div>
                                </div>
                            </Widget>

                            <Widget title="IQS Score" className="xl:col-span-2">
                                <div className="h-full flex flex-col items-center justify-center relative">
                                    <ResponsiveContainer width="100%" height={160}>
                                        <PieChart>
                                            <Pie
                                                data={stats?.deviceStats?.total > 0 ? [
                                                    { value: stats.deviceStats.online.length },
                                                    { value: stats.deviceStats.offline.length }
                                                ] : [{ value: 0 }, { value: 100 }]}
                                                cx="50%"
                                                cy="80%"
                                                startAngle={180}
                                                endAngle={0}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={0}
                                                dataKey="value"
                                            >
                                                <Cell fill="#10b981" />
                                                <Cell fill="#1f2937" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="text-center -mt-8">
                                        <span className="text-5xl font-black text-white">
                                            {stats?.deviceStats?.total > 0 ? Math.round((stats.deviceStats.online.length / stats.deviceStats.total) * 100) : 0}%
                                        </span>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 tracking-[0.2em]">Quality Index (IQS)</p>
                                    </div>
                                </div>
                            </Widget>

                            <Widget title={`Monthly Node Uptime (${new Date().getFullYear()})`} className="xl:col-span-3">
                                <div className="h-[250px] mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats?.monthlyUptime || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="month" tickFormatter={(m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} axisLine={false} tickLine={false} stroke="#64748b" tick={{fontSize: 10, fontWeight: 'bold'}} />
                                            <YAxis axisLine={false} tickLine={false} domain={[90, 100]} stroke="#64748b" tick={{fontSize: 10}} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                            <Bar dataKey="uptime_percentage" name="Server Uptime (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Widget>

                            <Widget title={`Monthly Preventive Maintenance (${new Date().getFullYear()})`} className="xl:col-span-2">
                                <div className="h-[250px] mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats?.monthlyMaint || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="month" tickFormatter={(m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} axisLine={false} tickLine={false} stroke="#64748b" tick={{fontSize: 10, fontWeight: 'bold'}} />
                                            <YAxis axisLine={false} tickLine={false} domain={[0, 100]} stroke="#64748b" tick={{fontSize: 10}} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                            <Bar dataKey="completion_percentage" name="Completion Rate (%)" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Widget>
                        </>
                    )}

                </div>

                {/* Footer Section */}
                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="" className="h-6 opacity-20 grayscale" />
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em]">System Node: PW-704 | Region: SG-CORE</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Widget({ title, children, className = "" }) {
    return (
        <div className={`bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-5 shadow-2xl flex flex-col ${className} animate-in fade-in slide-in-from-bottom duration-700`}>
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{title}</h3>
                <div className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}

function NetworkModule({ name, status, traffic, isUp }) {
    return (
        <div className="relative group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h4 className="text-xl font-black text-white tracking-tight uppercase group-hover:text-blue-400 transition-colors">{name}</h4>
                    <p className={`text-[10px] font-black tracking-widest uppercase mt-1 ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>{status}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-white tracking-tighter">{traffic}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Current Load</p>
                </div>
            </div>
            <div className="flex gap-1.5 h-4 items-end">
                {Array.from({ length: 40 }).map((_, i) => (
                    <div 
                        key={i} 
                        className={`flex-1 rounded-sm transition-all duration-500 ${isUp ? 'bg-emerald-500/20 group-hover:bg-emerald-500/40' : 'bg-red-500/10 group-hover:bg-red-500/30'}`}
                        style={{ height: `${Math.random() * 100}%` }}
                    ></div>
                ))}
            </div>
        </div>
    );
}

function TicketBIDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [monthlyKpi, setMonthlyKpi] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(localStorage.getItem('tcf_activeTab') || 'Tickets');
    const [ticketSource, setTicketSource] = useState('all'); // 'all' | 'user' | 'system'

    useEffect(() => {
        localStorage.setItem('tcf_activeTab', activeTab);
    }, [activeTab]);
    const [statTab, setStatTab] = useState('Department'); // For Statistics table
    const [period, setPeriod] = useState('custom');
    
    // Default to last 30 days
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);
    const [startDate, setStartDate] = useState(defaultStart.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        setLoading(true);
        const queryOrg = new URLSearchParams(window.location.search).get('org') || 'TCF-SG';
        const timestamp = new Date().getTime();
        
        let urlParams = `organization=${queryOrg}&period=${period}&t=${timestamp}&ticketType=${ticketSource}`;
        if (period === 'custom') {
            urlParams += `&startDate=${startDate}&endDate=${endDate}`;
        }

        Promise.all([
            fetch(`/api/network/tickets/analytics/dashboard?${urlParams}`, { cache: 'no-store' }).then(r => r.json()),
            fetch(`/api/network/tickets/resolution-kpi?${urlParams}`, { cache: 'no-store' }).then(r => r.json())
        ])
        .then(([d, m]) => { 
            setData(d); 
            setMonthlyKpi(Array.isArray(m) ? m : (m.monthly || []));
            setLoading(false); 
        })
        .catch(e => { console.error(e); setLoading(false); });
    }, [period, startDate, endDate, ticketSource]);

    if (loading) return <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center text-slate-500 font-bold">Loading Analytics...</div>;

    const c = data?.counts || {};
    const COLORS_DONUT = ['#e11d48', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'];

    const KpiCard = ({ val, label, gradientClasses, icon: Icon }) => (
        <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradientClasses} shadow-lg border border-white/10 w-full sm:w-[calc(50%-1rem)] md:w-[calc(33.33%-1rem)] lg:flex-1 group transition-all hover:-translate-y-1 hover:shadow-xl`}>
            <div className="absolute -right-4 -top-4 text-white/10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                <Icon size={100} />
            </div>
            <div className="relative z-10 flex flex-col items-start">
                <span className="text-4xl font-black text-white leading-none mb-1 drop-shadow-md">{val}</span>
                <span className="text-xs text-white/90 font-bold uppercase tracking-widest">{label}</span>
            </div>
        </div>
    );

    const statData = data?.stats?.[statTab.toLowerCase() + 's'] || [];

    return (
        <div className="min-h-screen bg-[#f4f7fa] text-slate-800 font-sans p-4 -mx-6 -mt-6">
            <div className="max-w-[1400px] mx-auto mb-6">
                <button 
                    onClick={() => navigate('/public')}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors group text-xs font-black uppercase tracking-widest bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 w-fit"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Center Dashboard
                </button>
            </div>
            <div className="max-w-[1400px] mx-auto bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
                {/* Tabs */}
                <div className="flex flex-wrap border-b border-slate-200 px-2 items-center bg-slate-50">
                    {['Tickets', 'SLA', 'Call Details'].map((t) => (
                        <button 
                            key={t} 
                            onClick={() => setActiveTab(t)}
                            className={`px-6 py-4 text-sm font-bold ${activeTab === t ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t}
                        </button>
                    ))}
                    <div className="ml-auto p-4 flex flex-wrap items-center gap-3">
                        {period === 'custom' && (
                            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-2 py-1 shadow-sm">
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm font-bold text-slate-600 focus:outline-none bg-transparent" />
                                <span className="text-slate-400 font-bold">-</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm font-bold text-slate-600 focus:outline-none bg-transparent" />
                            </div>
                        )}
                        <select 
                            value={period} 
                            onChange={(e) => setPeriod(e.target.value)}
                            className="text-sm font-bold text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                            <option value="custom">Custom Range</option>
                            <option value="year">This Year</option>
                            <option value="month">This Month</option>
                            <option value="week">This Week</option>
                            <option value="day">Today</option>
                        </select>
                        <button className="p-1.5 border rounded-md border-slate-300 bg-white text-slate-500 hover:bg-slate-50 shadow-sm"><Filter size={16}/></button>
                    </div>
                </div>

                <div className="p-4 space-y-3 bg-[#f4f7fa]">
                    
                    {activeTab === 'Tickets' && (
                        <>
                            {/* Ticket Source Filter Tabs */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1.5">
                                        <Filter size={13} className="text-blue-600" /> Sumber Tiket:
                                    </span>
                                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                        <button
                                            onClick={() => setTicketSource('all')}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${ticketSource === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            <Layers size={13} className={ticketSource === 'all' ? 'text-blue-600' : 'text-slate-400'} />
                                            <span>Semua Tiket</span>
                                            {data?.summary && <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-200 text-slate-700">{data.summary.total}</span>}
                                        </button>
                                        <button
                                            onClick={() => setTicketSource('user')}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${ticketSource === 'user' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            <Users size={13} className={ticketSource === 'user' ? 'text-blue-600' : 'text-slate-400'} />
                                            <span>Tiket User (Helpdesk)</span>
                                            {data?.summary && <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-blue-100 text-blue-800">{data.summary.user}</span>}
                                        </button>
                                        <button
                                            onClick={() => setTicketSource('system')}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${ticketSource === 'system' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            <Server size={13} className={ticketSource === 'system' ? 'text-purple-600' : 'text-slate-400'} />
                                            <span>Tiket Sistem (Auto-Alert)</span>
                                            {data?.summary && <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-purple-100 text-purple-800">{data.summary.system}</span>}
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 font-medium hidden sm:block">
                                    {ticketSource === 'user' ? '👤 Menampilkan data khusus tiket dari pengguna / karyawan' :
                                     ticketSource === 'system' ? '🤖 Menampilkan data auto-alert dari Uptime Kuma & sistem' :
                                     '🌐 Menampilkan gabungan seluruh tiket sistem & pengguna'}
                                </div>
                            </div>

                            {/* KPI Bubbles */}
                            <div className="flex flex-wrap items-stretch justify-between gap-4 pb-4">
                                <KpiCard val={c.All||0} label="Semua Tiket" gradientClasses="from-blue-500 to-blue-700" icon={Layers} />
                                <KpiCard val={c.Diajukan !== undefined ? c.Diajukan : (c.Open||0)} label="Diajukan" gradientClasses="from-sky-400 to-sky-600" icon={AlertCircle} />
                                <KpiCard val={c.Diproses !== undefined ? c.Diproses : (c.Pending||0)} label="Diproses" gradientClasses="from-amber-400 to-amber-500" icon={Clock} />
                                <KpiCard val={c.Selesai !== undefined ? c.Selesai : (c.Closed||0)} label="Selesai" gradientClasses="from-emerald-400 to-emerald-600" icon={CheckSquare} />
                                <KpiCard val={c.Ditolak||0} label="Ditolak" gradientClasses="from-rose-400 to-rose-600" icon={AlertTriangle} />
                            </div>

                            {/* Charts Row 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Tickets by Channel */}
                                <div className="bg-white border border-slate-200 p-4 rounded-lg flex flex-col">
                                    <h3 className="text-sm text-slate-500 mb-2">Tickets by Channel</h3>
                                    <div className="flex-1 min-h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={data?.channels||[]} cx="35%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" stroke="none">
                                                    {(data?.channels||[]).map((entry, index) => <Cell key={index} fill={COLORS_DONUT[index % COLORS_DONUT.length]} />)}
                                                </Pie>
                                                <Tooltip />
                                                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="square" wrapperStyle={{ fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                
                                {/* Tickets by Priority */}
                                <div className="bg-white border border-slate-200 p-4 rounded-lg flex flex-col">
                                    <h3 className="text-sm text-slate-500 mb-2">Tickets by Priority</h3>
                                    <div className="flex-1 min-h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={data?.priorities||[]} cx="35%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" stroke="none">
                                                    {(data?.priorities||[]).map((entry, index) => <Cell key={index} fill={['#3b82f6', '#f43f5e', '#f59e0b', '#10b981'][index%4]} />)}
                                                </Pie>
                                                <Tooltip />
                                                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="square" wrapperStyle={{ fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Tickets by Type */}
                                <div className="bg-white border border-slate-200 p-4 rounded-lg flex flex-col">
                                    <h3 className="text-sm text-slate-500 mb-2">Tickets by Topic</h3>
                                    <div className="flex-1 min-h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data?.types||[]} margin={{top: 20, right: 20, left: -20, bottom: 40}}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis 
                                                    dataKey="name" 
                                                    axisLine={{stroke: '#cbd5e1'}} 
                                                    tickLine={true} 
                                                    interval={0}
                                                    height={60}
                                                    tick={({ x, y, payload }) => {
                                                        const full = payload?.value || '';
                                                        const short = full.includes(' - ') ? full.split(' - ').slice(-1)[0] : full;
                                                        const display = short.length > 16 ? short.substring(0, 16) + '…' : short;
                                                        return (
                                                            <text x={x} y={y + 12} textAnchor="end" fill="#64748b" fontSize={9} transform={`rotate(-25 ${x} ${y + 12})`}>
                                                                {display}
                                                            </text>
                                                        );
                                                    }}
                                                />
                                                <YAxis label={{ value: 'Number of Tickets', angle: -90, position: 'insideLeft', style: {fontSize: '11px'} }} tick={{fontSize: 10}} axisLine={{stroke: '#cbd5e1'}} />
                                                <Tooltip />
                                                <Bar dataKey="value" fill="#94a3b8" barSize={30}>
                                                    {(data?.types||[]).map((entry, index) => <Cell key={index} fill={['#93c5fd', '#fca5a5', '#6b7280', '#34d399'][index%4]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Area Chart: Ticket Activity */}
                            <div className="bg-white border border-slate-200 p-4 rounded-lg flex flex-col mt-6 shadow-sm">
                                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center">
                                    <Activity size={20} className="mr-2 text-blue-600"/> 
                                    Ticket Activity Timeline 
                                    <span className="text-xs font-semibold text-slate-500 ml-2">
                                        {ticketSource === 'user' ? '(Tiket User)' : ticketSource === 'system' ? '(Tiket Sistem)' : '(Semua Tiket)'}
                                    </span>
                                </h3>
                                <div className="flex-1" style={{ minHeight: '350px' }}>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <AreaChart data={monthlyKpi} margin={{top: 10, right: 30, left: -20, bottom: 0}}>
                                            <defs>
                                                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} minTickGap={20} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                                            <Area type="monotone" dataKey="total_tickets" name="Created" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCreated)" />
                                            <Area type="monotone" dataKey="resolved_tickets" name="Closed" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorClosed)" />
                                            <Area type="monotone" dataKey="overdue_tickets" name="Overdue" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorOverdue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Detailed Statistics Table */}
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm mt-6 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center"><Layers size={20} className="mr-2 text-indigo-600"/> Statistics</h3>
                                </div>
                                <div className="flex bg-slate-50 border-b border-slate-200">
                                    {['Department', 'Topic', 'Agent'].map(tab => (
                                        <button 
                                            key={tab}
                                            onClick={() => setStatTab(tab)}
                                            className={`px-6 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${statTab === tab ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 shadow-[0_-1px_0_0_#e2e8f0_inset]' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-white border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-widest font-black">
                                                <th className="px-3 py-1.5 text-[10px] uppercase tracking-widest">{statTab}</th>
                                                <th className="py-4 px-3 text-center" uppercase tracking-widest>Opened</th>
                                                <th className="py-4 px-3 text-center" uppercase tracking-widest>Assigned</th>
                                                <th className="py-4 px-3 text-center" uppercase tracking-widest>Overdue</th>
                                                <th className="py-4 px-3 text-center" uppercase tracking-widest>Closed</th>
                                                <th className="py-4 px-3 text-center" uppercase tracking-widest>Reopened</th>
                                                <th className="py-4 px-3 text-center" uppercase tracking-widest>Deleted</th>
                                                <th className="py-4 px-3 text-center" uppercase tracking-widest>Service Time</th>
                                                <th className="py-4 px-3 text-center" uppercase tracking-widest>Response Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {statData.map((row, idx) => (
                                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                    <td className="px-3 py-1.5 font-bold text-slate-700">{row.name}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-slate-600">{row.opened}</td>
                                                    <td className="py-3 px-3 text-center font-medium text-slate-600">{row.assigned}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-rose-500">{row.overdue}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-emerald-600">{row.closed}</td>
                                                    <td className="py-3 px-3 text-center font-medium text-amber-500">{row.reopened}</td>
                                                    <td className="py-3 px-3 text-center font-medium text-slate-400">{row.deleted}</td>
                                                    <td className="py-3 px-3 text-center font-medium text-slate-600">{row.svcTime} hrs</td>
                                                    <td className="py-3 px-3 text-center font-medium text-slate-600">{row.replyTime} min</td>
                                                </tr>
                                            ))}
                                            {statData.length === 0 && (
                                                <tr><td colSpan="9" className="py-8 text-center text-slate-400 font-medium">No data available for this period.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'SLA' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-5 rounded-xl h-full flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
                                    <div className="absolute -right-10 -bottom-10 text-white/5">
                                        <Zap size={200} />
                                    </div>
                                    <h3 className="text-4xl font-black text-white mb-2 z-10">{data?.slaMetrics?.avgResolutionHours || '0.0'}</h3>
                                    <p className="text-lg font-medium text-slate-400 z-10 mb-6">Avg Resolution Time (Hours)</p>
                                    <div className="flex gap-4 z-10">
                                        <div className="bg-white/10 backdrop-blur rounded-lg p-4 px-6 border border-white/10">
                                            <div className="text-2xl font-bold text-emerald-400">{data?.slaMetrics?.totalResolved || 0}</div>
                                            <div className="text-xs text-slate-300 uppercase tracking-widest mt-1">Resolved</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur rounded-lg p-4 px-6 border border-white/10">
                                            <div className="text-2xl font-bold text-blue-400">{data?.slaMetrics?.totalTickets || 0}</div>
                                            <div className="text-xs text-slate-300 uppercase tracking-widest mt-1">Total</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* First Reply Time */}
                            <div className="flex flex-col">
                                <div className="flex mt-2">
                                    <div className="px-4 py-2 text-[11px] font-bold border-t-2 border-t-blue-600 border-x border-slate-200 bg-white shadow-[0_-2px_0_0_#2563eb] rounded-t-sm z-10 relative top-[1px]">
                                        First Reply (Minutes)
                                    </div>
                                    <div className="flex-1 border-b border-slate-200"></div>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-b-lg rounded-tr-lg p-4 flex-1" style={{ minHeight: '350px' }}>
                                    {data?.firstReplies?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={data.firstReplies} margin={{top: 10, right: 10, left: 0, bottom: 20}}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" axisLine={{stroke: '#cbd5e1'}} tickLine={true} tick={{fontSize: 10}} label={{ value: 'Channel', position: 'bottom', offset: 0, style: {fontSize: 12, fontWeight: 'bold'} }} />
                                                <YAxis label={{ value: 'Average Response Time (Min)', angle: -90, position: 'insideLeft', offset: 15, style: {fontSize: 11, fontWeight: 'bold'} }} tick={{fontSize: 10}} axisLine={{stroke: '#cbd5e1'}} />
                                                <Tooltip />
                                                <Bar dataKey="value" fill="#6366f1" barSize={60}>
                                                    {data.firstReplies.map((entry, index) => <Cell key={index} fill={['#312e81', '#ea580c', '#1e3a8a', '#fef08a', '#a855f7', '#38bdf8'][index%6]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-400 font-medium">No First Reply Data</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}



                    {activeTab === 'Call Details' && (
                        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center"><MonitorSpeaker size={20} className="mr-2 text-blue-600"/> Phone / WhatsApp Source Details</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] tracking-wider font-bold">
                                            <th className="px-3 py-1.5 text-[10px] uppercase tracking-widest">Ticket ID</th>
                                            <th className="px-3 py-1.5 text-[10px] uppercase tracking-widest">Subject</th>
                                            <th className="px-3 py-1.5 text-[10px] uppercase tracking-widest">Source</th>
                                            <th className="px-3 py-1.5 text-[10px] uppercase tracking-widest">Contact</th>
                                            <th className="px-3 py-1.5 text-right" uppercase tracking-widest>Date Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data?.callDetails||[]).map((call, idx) => (
                                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-1.5 font-bold text-blue-600">#{call.ticket_id}</td>
                                                <td className="px-3 py-1.5 font-semibold text-slate-700">{call.subject}</td>
                                                <td className="px-3 py-1.5 text-[11px]">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${call.source.toLowerCase().includes('wa') ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {call.source}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 font-medium text-slate-600">{call.contact} ({call.caller})</td>
                                                <td className="px-3 py-1.5 text-right text-slate-500">{new Date(call.date).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {(!data?.callDetails || data.callDetails.length === 0) && (
                                            <tr>
                                                <td colSpan="5" className="py-12 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Clock size={48} className="text-slate-200 mb-4" />
                                                        <p className="text-slate-400 font-medium">No Phone or WA tickets recorded in this period.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

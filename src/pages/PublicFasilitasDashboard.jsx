import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Activity, Heart, Package, ClipboardCheck, ShieldCheck, PieChart, Info, ArrowLeft, Watch } from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip } from 'recharts';
import bgImage from '../assets/space-background.jpg'; // We can use the space background for a cinematic feel

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function PublicFasilitasDashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryOrg = new URLSearchParams(location.search).get('org') || 'TCF-SG';
    const org = queryOrg;

    const [hseData, setHseData] = useState(null);
    const [hrData, setHrData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [hseRes, hrRes] = await Promise.all([
                    fetch(`/api/hse/dashboard/summary?org=${org}`, { headers: { 'x-organization': org } }),
                    fetch(`/api/hr/dashboard/summary?org=${org}`, { headers: { 'x-organization': org } })
                ]);
                const hseJson = await hseRes.json();
                const hrJson = await hrRes.json();
                
                if (hseJson.success) setHseData(hseJson.data);
                if (hrJson.success) setHrData(hrJson.data);
            } catch (err) {
                console.error('Failed to fetch data', err);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 60000); // Auto refresh every 1 minute
        return () => clearInterval(interval);
    }, [org]);

    if (!hseData || !hrData) {
        return (
            <div className="h-screen w-screen bg-[#020617] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <Shield size={48} className="text-emerald-500 mb-4" />
                    <p className="text-slate-400 font-bold tracking-widest uppercase">Initializing Telemetry...</p>
                </div>
            </div>
        );
    }

    const hrTopStats = [
        { label: 'Total Aset', value: hrData.totalAssets, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { label: 'Sudah Checksheet', value: hrData.totalChecked, icon: ClipboardCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: 'Belum Checksheet', value: hrData.totalUnchecked, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        { label: 'Coverage', value: `${hrData.pctChecked}%`, icon: ShieldCheck, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    ];

    const catPieData = hrData?.byCategory?.slice(0, 5).map(c => ({ name: c.category, value: c.total })) || [];

    return (
        <div className="h-screen w-screen bg-[#020617] text-white font-sans overflow-hidden flex flex-col relative">
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-[-10%] z-0 bg-cover bg-center bg-no-repeat opacity-20 mix-blend-screen" style={{ backgroundImage: `url(${bgImage})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617]/90 to-[#020617] z-0"></div>
                
                {/* Glowing Orbs */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
            </div>

            {/* Header - Fixed Height */}
            <div className="relative z-10 h-[10%] min-h-[80px] px-8 flex justify-between items-center border-b border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                            <Shield className="text-emerald-500" size={24} /> 
                            Safety & Facilities <span className="text-emerald-500">Command</span>
                        </h1>
                        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-1">Live Telemetry Dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xl font-black text-white tracking-tight">
                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl font-black tracking-widest text-sm uppercase shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        {org}
                    </div>
                </div>
            </div>

            {/* Main Content Area - Remaining Height */}
            <div className="relative z-10 flex-1 p-4 flex flex-col gap-4 overflow-hidden">
                
                {/* TOP ROW: HSE Metrics (Takes up 40% height) */}
                <div className="grid grid-cols-4 gap-4 h-[40%]">
                    {/* Zero Accident Hero Card */}
                    <div className="col-span-1 bg-gradient-to-br from-emerald-500/20 to-teal-900/40 border border-emerald-500/30 rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
                            <Shield size={120} />
                        </div>
                        <div className="flex items-center justify-between opacity-80 relative z-10">
                            <h3 className="font-black uppercase tracking-widest text-emerald-400 text-sm">Zero Accident</h3>
                            <Activity size={20} className="text-emerald-400 animate-pulse" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-baseline gap-2">
                                <span className="text-7xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">{hseData.zeroAccidentDays}</span>
                                <span className="text-emerald-400 font-bold text-xl uppercase tracking-widest">Days</span>
                            </div>
                            <p className="text-xs font-medium text-emerald-200/60 mt-2 uppercase tracking-wider">Since last recorded LTI</p>
                        </div>
                    </div>

                    {/* Incident Rate */}
                    <div className="col-span-1 bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col justify-between backdrop-blur-sm">
                        <div className="flex items-center justify-between opacity-60">
                            <h3 className="font-bold uppercase tracking-widest text-slate-300 text-xs">Incident Rate</h3>
                            <AlertTriangle size={18} className="text-rose-400" />
                        </div>
                        <div>
                            <span className="text-5xl font-black tracking-tighter text-white">{hseData.incidentCountThisYear}</span>
                            <p className="text-xs font-medium text-slate-500 mt-2 uppercase tracking-wider">Total incidents this year</p>
                        </div>
                    </div>

                    {/* Open CAPA */}
                    <div className="col-span-1 bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col justify-between backdrop-blur-sm">
                        <div className="flex items-center justify-between opacity-60">
                            <h3 className="font-bold uppercase tracking-widest text-slate-300 text-xs">Open CAPA</h3>
                            <ClipboardCheck size={18} className="text-amber-400" />
                        </div>
                        <div>
                            <span className="text-5xl font-black tracking-tighter text-white">{hseData.openCapaCount}</span>
                            <p className="text-xs font-medium text-slate-500 mt-2 uppercase tracking-wider">Corrective actions pending</p>
                        </div>
                    </div>

                    {/* Patrol Findings */}
                    <div className="col-span-1 bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col justify-between backdrop-blur-sm">
                        <div className="flex items-center justify-between opacity-60">
                            <h3 className="font-bold uppercase tracking-widest text-slate-300 text-xs">Patrol Findings</h3>
                            <Activity size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <span className="text-5xl font-black tracking-tighter text-white">{hseData.findingsThisMonth}</span>
                            <p className="text-xs font-medium text-slate-500 mt-2 uppercase tracking-wider">Unsafe conditions this month</p>
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW: Facilities / HRGA Metrics (Takes up 60% height) */}
                <div className="flex-1 flex gap-4 min-h-0">
                    
                    {/* Left Col: KPI Grid (2x2) */}
                    <div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-4 h-full">
                        {hrTopStats.map((s, i) => (
                            <div key={i} className={`rounded-3xl ${s.bg} border ${s.border} p-4 flex flex-col justify-center relative overflow-hidden backdrop-blur-md`}>
                                <div className="absolute top-4 right-4 opacity-20">
                                    <s.icon size={48} className={s.color} />
                                </div>
                                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/5`}>
                                    <s.icon size={20} className={s.color} />
                                </div>
                                <div>
                                    <p className="text-4xl font-black text-white tracking-tighter">{s.value}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Col: Charts & Status */}
                    <div className="w-1/2 bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col backdrop-blur-sm">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <PieChart size={16} className="text-blue-400" /> Asset Distribution Matrix
                        </h3>
                        
                        <div className="flex-1 flex min-h-0">
                            {/* Chart Area */}
                            <div className="w-1/2 h-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={catPieData.length ? catPieData : [{ name: 'No Data', value: 1 }]}
                                            innerRadius="60%"
                                            outerRadius="80%"
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {catPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                                            itemStyle={{ color: 'white' }}
                                        />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Legend Area */}
                            <div className="w-1/2 flex flex-col justify-center pl-6">
                                <div className="space-y-3">
                                    {catPieData.map((c, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                                <span className="text-sm font-medium text-slate-300 truncate max-w-[120px]" title={c.name}>{c.name}</span>
                                            </div>
                                            <span className="text-sm font-black text-white">{c.value}</span>
                                        </div>
                                    ))}
                                    {catPieData.length === 0 && (
                                        <div className="text-sm text-slate-500 italic">No asset data available.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

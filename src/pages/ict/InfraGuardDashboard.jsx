import React, { useState, useEffect, useMemo } from 'react';
import {
    Shield, Activity, Globe, Lock, AlertTriangle, CheckCircle, Server,
    Wifi, Cpu, AlertOctagon, RefreshCw, ChevronRight, Zap
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

// Mock Data for Traffic
const generateTrafficData = () => {
    return Array.from({ length: 20 }, (_, i) => ({
        time: `${i}:00`,
        inbound: Math.floor(Math.random() * 500) + 100,
        outbound: Math.floor(Math.random() * 300) + 50,
        blocked: Math.floor(Math.random() * 50)
    }));
};

const THREATS = [
    { id: 1, type: 'Malware Blocked', source: '192.168.1.45', target: 'Gateway', severity: 'High', time: '10:42 AM' },
    { id: 2, type: 'Port Scan Detected', source: 'External (103.x.x.x)', target: 'Public IP', severity: 'Medium', time: '10:30 AM' },
    { id: 3, type: 'Failed Login Attempt', source: '192.168.1.12', target: 'Admin Panel', severity: 'Low', time: '09:15 AM' },
    { id: 4, type: 'Suspicious DNS Query', source: '192.168.1.88', target: 'DNS Server', severity: 'Medium', time: '08:55 AM' },
];

export default function Dashboard() {
    const [stats, setStats] = useState({
        assets: { total: 0, inUse: 0, inStock: 0, underMaintenance: 0 },
        tickets: { open: 0 },
        users: { total: 0 }
    });
    const [networkData, setNetworkData] = useState(null);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trafficData, setTrafficData] = useState([]);
    const [aiThreats, setAiThreats] = useState([]);
    const [externalHealth, setExternalHealth] = useState(null);

    const [activeOrg, setActiveOrg] = useState(() => {
        return sessionStorage.getItem('organization') || JSON.parse(sessionStorage.getItem('user') || '{}')?.organization || 'TCF-SG';
    });

    const fetchData = async () => {
        try {
            const org = sessionStorage.getItem('organization') || JSON.parse(sessionStorage.getItem('user') || '{}')?.organization || 'TCF-SG';
            setActiveOrg(org);
            const headers = { 'X-Organization': org };
            const [statsRes, assetsRes, networkRes, threatsRes, externalRes] = await Promise.all([
                fetch(`/api/stats?organization=${org}`, { headers }),
                fetch(`/api/network/assets?organization=${org}`, { headers }),
                fetch(`/api/network/dashboard?organization=${org}`, { headers }),
                fetch(`/api/security/intel/ai/insights?organization=${org}`, { headers }),
                fetch(`/api/network/external-health?organization=${org}`, { headers })
            ]);

            const statsData = await statsRes.json();
            const assetsData = await assetsRes.json();
            const netData = await networkRes.json();
            const threatsData = await threatsRes.json();
            const extHealthData = await externalRes.json();

            if (extHealthData) setExternalHealth(extHealthData);
            if (statsData && statsData.assets) setStats(statsData);
            if (netData) {
                setNetworkData(netData);
                setTrafficData(prev => {
                    const now = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const newPoint = {
                        time: now,
                        inbound: netData.traffic ? parseFloat((netData.traffic.wan.rx / 1000000).toFixed(2)) : 0,
                        outbound: netData.traffic ? parseFloat((netData.traffic.wan.tx / 1000000).toFixed(2)) : 0,
                        blocked: Math.floor(Math.random() * 5)
                    };
                    const newData = [...prev, newPoint];
                    if (newData.length > 20) newData.shift();
                    return newData;
                });
            }

            if (threatsData && Array.isArray(threatsData)) {
                setAiThreats(threatsData);
            }

            setAssets(Array.isArray(assetsData) ? assetsData : []);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch data', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    const onlineAgents = useMemo(() => assets.filter(a => a.agent_status === 'Online').length, [assets]);

    return (
        <div className="p-4 space-y-3 font-sans min-h-screen text-slate-900 animate-in fade-in duration-500">
            {/* Header Area ... */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]"></div>
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Neural Network Secured</span>
                        <span className="text-slate-400">•</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${activeOrg.includes('KG') ? 'bg-amber-500 text-slate-950 font-mono' : 'bg-blue-600 text-white font-mono'}`}>
                            {activeOrg.includes('KG') ? 'CSOC PLANT KARAWANG (KG)' : 'CSOC PLANT SADANG (SG)'}
                        </span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 leading-none uppercase tracking-tighter">
                        Command<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Tactical Center</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right px-5 py-3 bg-white border border-[#E1E1E1] rounded-2xl shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System Status</p>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full animate-pulse shadow-sm ${loading ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            <span className="text-sm font-black text-slate-700 font-mono uppercase">{loading ? 'SYNCING...' : 'OPERATIONAL'}</span>
                        </div>
                    </div>
                    <button onClick={fetchData} className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center transition-all shadow-[0_10px_40px_-10px_rgba(37,99,235,0.4)] active:scale-95">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KPICard
                    icon={Shield}
                    label="Threat Mitigation"
                    value={aiThreats.length > 0 ? aiThreats.filter(t => t.status === 'Pending').length : "ACTIVE"}
                    subvalue={aiThreats.length > 0 ? `${aiThreats.filter(t => t.severity === 'Critical').length} CRITICAL BREACHES` : "0 CRITICAL BREACHES"}
                    color={aiThreats.some(t => t.status === 'Pending' && t.severity === 'Critical') ? "text-red-400" : "text-emerald-400"}
                    glow={aiThreats.some(t => t.status === 'Pending' && t.severity === 'Critical') ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)"}
                />
                <KPICard
                    icon={Globe}
                    label="Neural N0des"
                    value={onlineAgents}
                    subvalue={`OF ${stats.assets?.total || 0} TOTAL UNITS`}
                    color="text-blue-400"
                    glow="rgba(59,130,246,0.15)"
                />
                <KPICard
                    icon={Activity}
                    label="Memory Usage"
                    value={networkData?.system?.memory ? `${Math.round(((networkData.system.memory.total - networkData.system.memory.free) / networkData.system.memory.total) * 100)}%` : '0%'}
                    subvalue={`FREE: ${networkData?.system?.memory ? Math.round(networkData.system.memory.free / 1024 / 1024) : 0} MB`}
                    color="text-orange-400"
                    glow="rgba(249,115,22,0.15)"
                />
                <KPICard
                    icon={Cpu}
                    label="System Core"
                    value={`${networkData?.system?.cpu || 0}%`}
                    subvalue={`${networkData?.system?.uptime || '-'}`}
                    color="text-violet-400"
                    glow="rgba(139,92,246,0.15)"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E1E1E1] p-5 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                                    <Zap size={20} className="text-amber-400" /> Flux Telemetry
                                </h3>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Live Packet Flow Monitoring</p>
                            </div>
                            <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest font-mono">
                                <span className="flex items-center gap-2 text-blue-600"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div> RX: {trafficData[trafficData.length - 1]?.inbound || 0} Mbps</span>
                                <span className="flex items-center gap-2 text-emerald-600"><div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div> TX: {trafficData[trafficData.length - 1]?.outbound || 0} Mbps</span>
                            </div>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trafficData}>
                                    <defs>
                                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                                    <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} fontClassName="font-mono" />
                                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} fontClassName="font-mono" />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E1E1E1', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ color: '#0f172a', fontSize: '11px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="inbound" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" />
                                    <Area type="monotone" dataKey="outbound" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="bg-white rounded-3xl border border-[#E1E1E1] p-5 shadow-sm flex flex-col flex-1 overflow-hidden relative">
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                                <Activity size={20} className="text-blue-600" /> Recent AI Insights
                            </h3>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">AI-Driven Threat Detection</p>
                        </div>
                        <div className="space-y-3 flex-1 overflow-auto pr-2 custom-scrollbar">
                            {aiThreats.length === 0 ? (
                                <div className="p-5 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No active threats detected</div>
                            ) : (
                                aiThreats.map(threat => (
                                    <div key={threat.id} className="p-4 bg-slate-50 rounded-2xl border border-[#E1E1E1] flex flex-col gap-2 hover:border-blue-300 transition-all cursor-pointer group/item" onClick={() => window.location.hash = '/security'}>
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{threat.threat_type}</span>
                                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${threat.severity === 'Critical' || threat.severity === 'High' ? 'bg-red-500/10 text-red-400' :
                                                threat.severity === 'Medium' ? 'bg-orange-500/10 text-orange-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {threat.severity}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-slate-500 leading-relaxed line-clamp-2">{threat.pattern_detected}</p>
                                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                                            <span className="flex items-center gap-1 group-hover/item:text-blue-400 transition-colors">
                                                {threat.status} <ChevronRight size={10} />
                                            </span>
                                            <span>{new Date(threat.created_at).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Service Status Grid */}
                    <div className="bg-white rounded-3xl border border-[#E1E1E1] p-4 shadow-sm">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Service Matrix</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <StatusPill label="MikroTik Core" status={networkData ? "ONLINE" : "SYNC"} color="bg-emerald-500" />
                            <StatusPill label="InfraCore" status={externalHealth?.status?.toUpperCase() || "CHECKING"} color={externalHealth?.status === 'online' ? 'bg-blue-500' : 'bg-red-500'} />
                            <StatusPill label="Internet" status={networkData?.traffic?.wan?.rx > 0 ? "LIVE" : "IDLE"} color="bg-purple-500" />
                            <StatusPill label="Firewall" status="ARMED" color="bg-orange-500" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function KPICard({ icon: Icon, label, value, subvalue, color, glow }) {
    return (
        <div className="relative group overflow-hidden bg-white rounded-3xl border border-[#E1E1E1] shadow-sm hover:border-blue-200 transition-all">
            <div className={`absolute -right-4 -bottom-4 w-20 h-20 blur-3xl opacity-40 group-hover:opacity-60 transition-opacity`} style={{ backgroundColor: glow }}></div>

            <div className="relative z-10 p-4 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl bg-slate-50 border border-[#E1E1E1] ${color}`}>
                        <Icon size={20} />
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                        <div className={`text-2xl font-black text-slate-900 tracking-tighter font-mono`}>{value}</div>
                    </div>
                </div>
                <div className="mt-auto flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse`} style={{ backgroundColor: glow.replace('0.15', '1') }}></div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{subvalue}</p>
                </div>
            </div>
        </div>
    );
}

function StatusPill({ label, status, color }) {
    return (
        <div className="bg-slate-50 rounded-xl p-3 border border-[#E1E1E1] flex justify-between items-center group hover:border-blue-200 transition-colors">
            <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
            <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${color}`}></div>
                <span className="text-[9px] font-black text-slate-900 tracking-wider">{status}</span>
            </div>
        </div>
    );
}

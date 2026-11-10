import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Download, Monitor, Activity, Zap, Server,
    Terminal as TerminalIcon, Smartphone, X, Minimize2,
    Maximize2, Shield, Globe, ShieldCheck, ChevronRight,
    ArrowUpRight, Clock, Search, Cpu, HardDrive
} from 'lucide-react';
import logo from '../assets/Logo_TCF_Sec_Processed.png';
import RemoteDesktop from '../components/RemoteDesktop';

export default function Agent() {
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Remote Control State
    const [showRemote, setShowRemote] = useState(false);
    const [activeSession, setActiveSession] = useState(null);

    useEffect(() => {
        fetchAgents();
        const interval = setInterval(fetchAgents, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/network/agents');
            const data = await res.json();
            if (Array.isArray(data)) {
                setDevices(data);
            } else {
                setDevices([]);
            }
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch agents', err);
            setLoading(false);
        }
    };

    const openRemoteSession = (device) => {
        setActiveSession(device);
        setShowRemote(true);
    };

    const isOnline = (device) => {
        if (!device.last_agent_sync) return false;
        const now = new Date().getTime();
        const lastSync = new Date(device.last_agent_sync).getTime();
        const diffSeconds = (now - lastSync) / 1000;
        return diffSeconds < 60; // Online jika heartbeat < 60 detik
    };

    const filteredDevices = devices.filter(d =>
        (d.hostname || d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.ip_address || '').includes(searchTerm)
    );

    if (showRemote && activeSession) {
        return <RemoteDesktop asset={activeSession} onBack={() => setShowRemote(false)} />;
    }

    return (
        <div className="space-y-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-5 rounded-[2rem] border border-[#E1E1E1] shadow-sm">
                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                             <Zap size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                                Agent <span className="text-blue-600">Control</span>
                            </h1>
                            <p className="text-slate-500 font-bold mt-1 text-sm uppercase tracking-[0.2em]">Unified Management Node</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                        <Activity size={20} className="animate-pulse" />
                        <span className="text-xs font-black tracking-widest uppercase">{devices.length} Nodes Connected</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* Left Side: Download & Features */}
                <div className="lg:col-span-4 space-y-3">
                    <div className="card-unifi p-5 group">
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center border border-[#E1E1E1]">
                                    <Download className="text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">TCF Agent</h3>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">v7.06.GOLD (Configurable)</p>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed font-medium">
                                Deploy the **Master Agent** package to manage your hardware nodes remotely with 256-bit encryption.
                            </p>
                            <a
                                href="/TCF_Agent_Configurable_v7.6.exe"
                                download="TCF_Agent_Configurable_v7.6.exe"
                                className="w-full btn-primary-unifi py-4 flex items-center justify-center gap-3 active:scale-95 text-xs uppercase tracking-widest"
                            >
                                <Download size={18} />
                                Download Package
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <FeatureItem icon={Cpu} label="System Sync" desc="Automated mapping." />
                        <FeatureItem icon={ShieldCheck} label="Secure Tunnel" desc="Encrypted RDP." />
                        <FeatureItem icon={Globe} label="Global Access" desc="Edge-to-edge link." />
                    </div>
                </div>

                {/* Right Side: Device List */}
                <div className="lg:col-span-8 card-unifi p-5 h-full min-h-[600px] flex flex-col">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#F0F0F0]">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <Monitor size={24} className="text-blue-600" /> Active Uplinks
                            </h3>
                            <p className="text-slate-500 text-xs font-medium mt-1">Real-time status of nodes in current sector.</p>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or IP..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#F8F9FB] border border-[#E1E1E1] rounded-2xl py-3 pl-12 pr-6 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-sm font-bold w-full md:w-72"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="py-32 text-center">
                                <div className="relative w-12 h-12 mx-auto mb-6">
                                    <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
                                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                                </div>
                                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Scanning Frequencies...</p>
                            </div>
                        ) : filteredDevices.length === 0 ? (
                            <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                                <Monitor className="mx-auto mb-4 text-slate-200" size={64} />
                                <p className="text-slate-500 font-bold">No active agents found.</p>
                            </div>
                        ) : (
                            filteredDevices.map(device => (
                                <div key={device.id} className="bg-white border border-[#E1E1E1] p-4 rounded-2xl hover:border-blue-600/30 hover:bg-slate-50/30 transition-all group relative">
                                    <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-[#E1E1E1] flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                                                <Monitor size={28} />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 transition-colors">{device.hostname || device.name}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                                                    <Globe size={12} className="text-blue-600" /> {device.ip_address || '0.0.0.0'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-5">
                                            <div className="hidden xl:block">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Architecture</p>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {(() => {
                                                        try {
                                                            const specs = typeof device.specs === 'string' ? JSON.parse(device.specs) : device.specs;
                                                            return specs?.os || device.os_info || 'Unknown OS';
                                                        } catch (e) { return device.os_info || 'Unknown OS'; }
                                                    })()}
                                                </p>
                                            </div>
                                            <div className="hidden sm:block">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Contact</p>
                                                <p className="text-xs font-bold text-slate-700">{device.last_agent_sync ? new Date(device.last_agent_sync).toLocaleTimeString() : (device.last_seen ? new Date(device.last_seen).toLocaleTimeString() : 'N/A')}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isOnline(device)
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}>
                                                    {isOnline(device) ? 'Online' : 'Offline'}
                                                </div>
                                                <button
                                                    onClick={() => openRemoteSession(device)}
                                                    className="w-12 h-12 bg-slate-50 border border-[#E1E1E1] rounded-xl flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-90"
                                                >
                                                    <ArrowUpRight size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon: Icon, label, desc }) {
    return (
        <div className="card-unifi p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                <Icon size={22} />
            </div>
            <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">{label}</h4>
                <p className="text-[10px] text-slate-500 font-bold mt-1.5">{desc}</p>
            </div>
        </div>
    );
}

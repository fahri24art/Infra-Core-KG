import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Plus, Search, Filter, Monitor, Printer, Server, Wifi,
    Smartphone, HardDrive, Cpu, Activity, AlertCircle,
    FileText, X, CheckCircle, Clock, RefreshCw, User
} from 'lucide-react';

import AssetSidebar from '../components/AssetSidebar';

export default function Assets() {
    const [assets, setAssets] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Modal State for Quick Ticket
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedAssetForTicket, setSelectedAssetForTicket] = useState(null);
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketDesc, setTicketDesc] = useState('');
    let currentUser = null;
    try {
        const stored = sessionStorage.getItem('user');
        if (stored) currentUser = JSON.parse(stored);
    } catch (e) {
        console.error("Failed to parse user from localStorage", e);
    }

    const category = searchParams.get('category');
    const type = searchParams.get('type');

    useEffect(() => {
        fetchData();
    }, [category, type]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // UPDATED PATHS: added /network prefix
            const [assetsRes, ticketsRes] = await Promise.all([
                fetch('/api/network/assets'),
                fetch('/api/network/tickets')
            ]);

            const assetsData = await assetsRes.json();
            const ticketsData = await ticketsRes.json();

            setAssets(Array.isArray(assetsData) ? assetsData : []);
            setTickets(Array.isArray(ticketsData) ? ticketsData : []);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch data', err);
            setLoading(false);
        }
    };

    const handleTypeChange = (newType) => {
        const params = new URLSearchParams(searchParams);
        if (newType === 'All') {
            params.delete('type');
        } else {
            params.set('type', newType);
        }
        setSearchParams(params);
    };

    // --- Helpers ---
    const getIcon = (category, type) => {
        const cat = (category || '').toLowerCase();
        const typ = (type || '').toLowerCase();

        if (cat.includes('printer')) return <Printer size={20} />;
        if (cat.includes('phone') || typ.includes('mobile')) return <Smartphone size={20} />;
        if (cat.includes('monitor')) return <Monitor size={20} />; // Specific monitor icon if distinct from desktop
        if (typ.includes('laptop')) return <Cpu size={20} />; // Or a Laptop icon if available, using Cpu for now or generic
        if (cat.includes('server')) return <Server size={20} />;
        if (cat.includes('network')) return <Wifi size={20} />;
        return <HardDrive size={20} />; // Default for Desktop
    };

    const getOpenTicketCount = (assetId) => {
        if (!assetId || !Array.isArray(tickets)) return 0;
        return tickets.filter(t => t && t.asset_id === assetId && t.status !== 'Closed' && t.status !== 'Resolved').length;
    };

    const getTicketUser = (assetId) => {
        if (!assetId || !Array.isArray(tickets)) return null;
        const ticket = tickets.find(t => t.asset_id === assetId && t.status !== 'Closed' && t.status !== 'Resolved');
        return ticket ? ticket.user_name : null;
    };

    const getSpecs = (asset) => {
        try {
            if (typeof asset.specs === 'object' && asset.specs !== null) return asset.specs;
            if (typeof asset.specs === 'string' && asset.specs.trim().startsWith('{')) return JSON.parse(asset.specs);
            return {};
        } catch (e) { return {}; }
    };

    // --- Create Ticket Logic ---
    const openTicketModal = (asset) => {
        setSelectedAssetForTicket(asset);
        setTicketSubject(`Issue with ${asset.name}`);
        setShowTicketModal(true);
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/network/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: ticketSubject,
                    description: ticketDesc,
                    priority: 'Medium',
                    asset_id: selectedAssetForTicket.id,
                    user_id: currentUser?.id || 1,
                    email: currentUser?.email || 'admin@example.com'
                })
            });

            if (res.ok) {
                alert('Ticket created successfully!');
                setShowTicketModal(false);
                setTicketDesc('');
                fetchData(); // Refresh counts
            } else {
                alert('Failed to create ticket.');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating ticket.');
        }
    };

    // --- Filtering ---
    const assetsArray = Array.isArray(assets) ? assets : [];
    const filteredAssets = assetsArray.filter(asset => {
        if (!asset) return false;
        if (category && asset.category !== category) return false;
        if (type && asset.type !== type) return false;
        const search = searchTerm.toLowerCase();
        return (
            String(asset.name || '').toLowerCase().includes(search) ||
            String(asset.serial_number || '').toLowerCase().includes(search) ||
            String(asset.inventory_number || '').toLowerCase().includes(search) ||
            String(asset.location || '').toLowerCase().includes(search) ||
            String(asset.contact || '').toLowerCase().includes(search)
        );
    });

    // --- Statistics ---
    const stats = {
        total: filteredAssets.length,
        online: filteredAssets.filter(a => a.agent_status === 'Online').length,
        issues: filteredAssets.filter(a => getOpenTicketCount(a.id) > 0).length,
        maintenance: filteredAssets.filter(a => a.status === 'In Repair' || a.status === 'In Maintenance').length
    };

    // --- Create Ticket Logic ---
    // ...

    // --- Filtering ---
    // ...

    // --- Statistics ---
    // ...

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden font-sans text-slate-100">
            <AssetSidebar />

            <div className="flex-1 overflow-y-auto p-5 space-y-10">

                {/* Header & Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            {category ? `${category}s` : 'Integrated IT Asset Fleet'}
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">
                            Real-time inventory mapping and helpdesk synchronization across {stats.total} devices.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={fetchData} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-blue-400 shadow-sm transition-all active:scale-95">
                            <RefreshCw size={24} />
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirm("Sinkronisasi data dari server GLPI (192.168.1.66)? Proses ini mungkin memakan waktu.")) return;
                                try {
                                    setLoading(true);
                                    const res = await fetch('/api/network/glpi/sync', { method: 'POST' });
                                    if (res.ok) {
                                        alert('Sinkronisasi Berhasil!');
                                        fetchData();
                                    } else {
                                        const errData = await res.json();
                                        throw new Error(errData.error || 'Gagal melakukan sinkronisasi');
                                    }
                                } catch (e) {
                                    alert('Sinkronisasi Gagal: ' + e.message);
                                    setLoading(false);
                                }
                            }}
                            className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-black border border-white/10 shadow-2xl flex items-center transition-all active:scale-95"
                        >
                            <RefreshCw size={20} className="mr-2" />
                            Sinkronisasi GLPI
                        </button>
                        <Link to="/assets/new" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-200 flex items-center transition-all active:scale-95">
                            <Plus size={20} className="mr-2" />
                            Add Asset
                        </Link>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/10 flex items-center justify-between group hover:border-blue-500/50 transition-all">
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Fleet</p>
                            <h3 className="text-3xl font-black text-white tracking-tighter">{stats.total}</h3>
                        </div>
                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <HardDrive size={28} />
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/10 flex items-center justify-between group hover:border-green-500/50 transition-all">
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Connected</p>
                            <h3 className="text-3xl font-black text-green-500 tracking-tighter">{stats.online}</h3>
                        </div>
                        <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 group-hover:bg-green-600 group-hover:text-white transition-all">
                            <Activity size={28} />
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-red-500/20 flex items-center justify-between group hover:border-red-500/50 transition-all">
                        <div>
                            <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-1">Alerts</p>
                            <h3 className="text-3xl font-black text-red-500 tracking-tighter">{stats.issues}</h3>
                        </div>
                        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-all">
                            <AlertCircle size={28} />
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/10 flex items-center justify-between group hover:border-orange-500/50 transition-all">
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">In Service</p>
                            <h3 className="text-3xl font-black text-orange-500 tracking-tighter">{stats.maintenance}</h3>
                        </div>
                        <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-all">
                            <Cpu size={28} />
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col xl:flex-row gap-4 justify-between items-center">
                    <div className="flex p-1.5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-x-auto max-w-full">
                        {[
                            { label: 'All', value: 'All' },
                            { label: 'Desktop', value: 'Desktop' },
                            { label: 'Laptop', value: 'Laptop' },
                            { label: 'Printer', value: 'Printer' },
                            { label: 'Monitor', value: 'Monitor' },
                            { label: 'Phone', value: 'Mobile' },
                            { label: 'Server', value: 'Server' }
                        ].map(t => (
                            <button
                                key={t.value}
                                onClick={() => handleTypeChange(t.value)}
                                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${(type === t.value) || (t.value === 'All' && !type)
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full xl:w-[450px] group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Type name, tag, or owner to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-[2rem] outline-none ring-4 ring-transparent focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-white placeholder-slate-500 shadow-2xl"
                        />
                    </div>
                </div>

                {/* Main Asset Table */}
                <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="p-4 text-[10px] uppercase tracking-widest">Asset Definition</th>
                                <th className="p-4 text-[10px] uppercase tracking-widest">Configuration</th>
                                <th className="p-4 text-[10px] uppercase tracking-widest">Deployment</th>
                                <th className="p-4 text-center" uppercase tracking-widest>Status</th>
                                <th className="p-4 text-[10px] uppercase tracking-widest">Connectivity</th>
                                <th className="p-4 text-right w-32" uppercase tracking-widest>Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {loading ? (
                                <tr><td colSpan="6" className="p-20 text-center"><div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div></td></tr>
                            ) : filteredAssets.length === 0 ? (
                                <tr><td colSpan="6" className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-50">Operational fleet empty</td></tr>
                            ) : (
                                filteredAssets.map(asset => {
                                    const ticketCount = getOpenTicketCount(asset.id);
                                    return (
                                        <tr key={asset.id} className="hover:bg-blue-50/20 transition-all group">
                                            <td className="p-4 text-[11px]">
                                                <div className="flex items-center space-x-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-white/5 text-slate-400 flex items-center justify-center shrink-0 border border-white/10 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                        {getIcon(asset.category)}
                                                    </div>
                                                    <div>
                                                        <Link to={`/assets/${asset.id}`} className="font-black text-white text-lg group-hover:text-blue-400 transition-colors block leading-tight">
                                                            {asset.name}
                                                        </Link>
                                                        <div className="text-[10px] font-bold text-slate-500 font-mono mt-1 flex items-center uppercase tracking-tighter">
                                                            ID: {asset.inventory_number || 'UNTAGGED'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4 text-[11px]">
                                                <div className="text-sm font-black text-slate-100">{asset.model || 'Standard Unit'}</div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{asset.manufacturer}</div>
                                                {(() => {
                                                    try {
                                                        let s = {};
                                                        if (asset.specs) {
                                                            try {
                                                                s = typeof asset.specs === 'string' ? JSON.parse(asset.specs) : asset.specs;
                                                            } catch (e) { s = {}; }
                                                        }
                                                        if (!s || typeof s !== 'object') s = {};
                                                        if (s && !Array.isArray(s)) {
                                                            const ramRaw = s.total_ram || s.ram;
                                                            const ram = ramRaw ? (typeof ramRaw === 'number' ? Math.round(ramRaw / 1024 / 1024 / 1024) + 'GB' : String(ramRaw)) : '';
                                                            const cpuRaw = s.cpu_model || s.processor;
                                                            const cpu = cpuRaw ? String(cpuRaw).replace(/Intel |Core |AMD |Ryzen /gi, '').split(' ')[0] : '';
                                                            if (cpu || ram) {
                                                                return (
                                                                    <div className="flex items-center space-x-2 mt-2">
                                                                        {cpu && (
                                                                            <div className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg uppercase">
                                                                                {cpu}
                                                                            </div>
                                                                        )}
                                                                        {ram && (
                                                                            <div className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg uppercase">
                                                                                {ram}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                        }
                                                    } catch (e) {
                                                        console.warn("Spec parse error", e);
                                                    }
                                                    return null;
                                                })()}
                                            </td>

                                            <td className="p-4 text-[11px]">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center text-slate-100 font-bold">
                                                        <User size={14} className="mr-2 text-slate-500" />
                                                        {asset.user_name || asset.contact || 'No Owner'}
                                                    </div>
                                                    <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                        {asset.location || 'Unknown Sector'}
                                                    </div>
                                                    {(() => {
                                                        const s = getSpecs(asset);
                                                        if (s.department || s.division) {
                                                            return (
                                                                <div className="flex flex-col mt-1 pt-1 border-t border-white/5">
                                                                    {s.department && <div className="text-[9px] text-slate-400 font-medium truncate w-32" title={s.department}>{s.department}</div>}
                                                                    {s.division && <div className="text-[9px] text-slate-500 font-medium truncate w-32" title={s.division}>{s.division}</div>}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </td>

                                            <td className="p-4 text-center">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${asset.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    asset.status === 'In Repair' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                        'bg-white/5 text-slate-500 border-white/10'
                                                    }`}>
                                                    {asset.status}
                                                </span>
                                            </td>

                                            <td className="p-4 text-[11px]">
                                                <div className="flex flex-col items-start space-y-2">
                                                    <div className={`flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${asset.agent_status === 'Online' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${asset.agent_status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                        Agent {asset.agent_status || 'Offline'}
                                                    </div>

                                                    {ticketCount > 0 ? (
                                                        <div className="flex flex-col space-y-1">
                                                            <div className="flex items-center space-x-2 text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 uppercase tracking-tighter">
                                                                <AlertCircle size={10} />
                                                                <span>{ticketCount} ACTIVE ERRORS</span>
                                                            </div>
                                                            {(() => {
                                                                const tUser = getTicketUser(asset.id);
                                                                if (tUser) return (
                                                                    <div className="text-[9px] font-bold text-red-400 pl-1">
                                                                        Req: {tUser.split(' ')[0]}
                                                                    </div>
                                                                );
                                                                return null;
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center space-x-2 text-[9px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 uppercase tracking-tighter">
                                                            <CheckCircle size={10} />
                                                            <span>System Stable</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end space-x-3">
                                                    {asset.uuid && asset.agent_status === 'Online' ? (
                                                        <Link
                                                            to={`/remote/${asset.uuid}`}
                                                            target="_blank"
                                                            className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-90"
                                                            title="Remote Connect"
                                                        >
                                                            <Monitor size={18} />
                                                        </Link>
                                                    ) : (
                                                        <div className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-300 rounded-xl cursor-not-allowed">
                                                            <Monitor size={18} />
                                                        </div>
                                                    )}
                                                    <Link
                                                        to={`/assets/${asset.id}`}
                                                        className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 hover:text-blue-400 hover:border-blue-400 rounded-xl shadow-2xl transition-all active:scale-90"
                                                        title="Control Center"
                                                    >
                                                        <FileText size={18} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>


                {/* Quick Ticket Modal (Inherited logic from legacy) */}
                {
                    showTicketModal && selectedAssetForTicket && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                                <div className="bg-slate-50 px-10 py-6 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-black text-slate-800 flex items-center uppercase tracking-widest text-xs">
                                        <AlertCircle size={20} className="text-red-500 mr-4" />
                                        Initiate Emergency Ticket
                                    </h3>
                                    <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-slate-900 active:scale-90 transition-all">
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleCreateTicket} className="p-10 space-y-3">
                                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center">
                                        <Monitor size={32} className="text-blue-600 mr-4" />
                                        <div>
                                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Selected Hardware</div>
                                            <div className="font-black text-slate-800">{selectedAssetForTicket.name}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Issue Summary</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 outline-none transition-all font-bold text-slate-700"
                                            placeholder="Brief title of the problem"
                                            value={ticketSubject}
                                            onChange={e => setTicketSubject(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Detailed Logs / Description</label>
                                        <textarea
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 h-40 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 outline-none transition-all font-bold text-slate-700 resize-none"
                                            placeholder="What exactly happened? Steps to reproduce?"
                                            value={ticketDesc}
                                            onChange={e => setTicketDesc(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2rem] shadow-2xl shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest text-xs"
                                    >
                                        Dispatch Ticket to Helpdesk
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}

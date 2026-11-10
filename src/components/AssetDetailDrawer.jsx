import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Cpu, HardDrive, Monitor, Shield, Activity, FileText, Smartphone, Server, Printer, Wifi, Hash, MapPin, User, ArrowUpRight } from 'lucide-react';

export default function AssetDetailDrawer({ assetId, onClose }) {
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!assetId) return;
        setLoading(true);
        fetch(`/api/network/assets/${assetId}`)
            .then(res => res.json())
            .then(data => {
                setAsset(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch asset details", err);
                setLoading(false);
            });
    }, [assetId]);

    const getIcon = (category) => {
        const cat = (category || '').toLowerCase();
        if (cat.includes('printer')) return <Printer size={24} className="text-purple-500" />;
        if (cat.includes('phone') || cat.includes('mobile')) return <Smartphone size={24} className="text-green-500" />;
        if (cat.includes('server')) return <Server size={24} className="text-orange-500" />;
        if (cat.includes('network') || cat.includes('cctv')) return <Wifi size={24} className="text-indigo-500" />;
        if (cat.includes('desktop')) return <Monitor size={24} className="text-blue-500" />;
        return <Cpu size={24} className="text-slate-500" />;
    };

    const specs = asset?.specs ? (typeof asset.specs === 'string' ? JSON.parse(asset.specs) : asset.specs) : {};
    const peripherals = asset?.peripherals ? (typeof asset.peripherals === 'string' ? JSON.parse(asset.peripherals) : asset.peripherals) : null;

    return (
        <div className={`fixed inset-0 z-[999] bg-slate-900/20 backdrop-blur-sm transition-opacity ${assetId ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={onClose}>
            <div 
                className={`absolute right-0 top-0 bottom-0 w-full max-w-[450px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] border-l border-slate-200 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${assetId ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={e => e.stopPropagation()}
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Asset...</p>
                    </div>
                ) : asset ? (
                    <div className="flex flex-col h-full">
                        {/* HEADER */}
                        <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                                    {getIcon(asset.category)}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 leading-tight">{asset.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                            asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                                            asset.status === 'Rusak' || asset.status === 'Mati Total' ? 'bg-rose-100 text-rose-700' : 
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {asset.status}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-500">{asset.category}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            
                            {/* Key Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Hash size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Asset ID</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 truncate">{asset.inventory_number || '-'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <MapPin size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Location</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 truncate">{asset.location || '-'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <User size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Assigned User / PC Login</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">{asset.user_name || asset.contact || '-'} {asset.windows_login ? `(${asset.windows_login})` : ''}</p>
                                </div>
                            </div>

                            {/* Hardware Specs */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Cpu size={16} className="text-blue-500"/> Hardware Specifications
                                </h3>
                                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                                    <div className="p-3 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">Processor</span>
                                        <span className="text-xs font-bold text-slate-900 text-right w-1/2 truncate" title={specs.cpu}>{specs.cpu || '-'}</span>
                                    </div>
                                    <div className="p-3 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">Memory (RAM)</span>
                                        <span className="text-xs font-bold text-slate-900">{specs.ram_gb ? `${specs.ram_gb} GB` : '-'}</span>
                                    </div>
                                    <div className="p-3 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">Storage</span>
                                        <span className="text-xs font-bold text-slate-900">{specs.storage_info ? String(specs.storage_info).replace(/GB/i, ' GB') : '-'}</span>
                                    </div>
                                    <div className="p-3 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">Brand / Model</span>
                                        <span className="text-xs font-bold text-slate-900">{asset.manufacturer || '-'} / {asset.model || '-'}</span>
                                    </div>
                                    <div className="p-3 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">Serial Number</span>
                                        <span className="text-xs font-mono font-bold text-slate-900">{asset.serial_number || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Connected Peripherals (V27 Agent) */}
                            {peripherals && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Monitor size={16} className="text-teal-500"/> Connected Peripherals
                                    </h3>
                                    <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                                        {/* Monitors */}
                                        {peripherals.monitors && peripherals.monitors.length > 0 && (
                                            <div className="p-3 flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 w-1/3">Monitors</span>
                                                <div className="flex flex-col items-end w-2/3">
                                                    {peripherals.monitors.map((mon, idx) => (
                                                        <span key={idx} className="text-xs font-bold text-slate-900 truncate" title={mon}>{mon}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Keyboards */}
                                        {peripherals.keyboards && peripherals.keyboards.length > 0 && (
                                            <div className="p-3 flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 w-1/3">Keyboards</span>
                                                <div className="flex flex-col items-end w-2/3">
                                                    {peripherals.keyboards.map((kb, idx) => (
                                                        <span key={idx} className="text-xs font-bold text-slate-900 truncate" title={kb}>{kb}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Mice */}
                                        {peripherals.mice && peripherals.mice.length > 0 && (
                                            <div className="p-3 flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 w-1/3">Mice</span>
                                                <div className="flex flex-col items-end w-2/3">
                                                    {peripherals.mice.map((m, idx) => (
                                                        <span key={idx} className="text-xs font-bold text-slate-900 truncate" title={m}>{m}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Printers */}
                                        {peripherals.printers && peripherals.printers.length > 0 && (
                                            <div className="p-3 flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 w-1/3">Printers</span>
                                                <div className="flex flex-col items-end w-2/3">
                                                    {peripherals.printers.map((p, idx) => (
                                                        <span key={idx} className="text-xs font-bold text-slate-900 truncate" title={p}>{p}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Network & Software */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Wifi size={16} className="text-indigo-500"/> Network & Software
                                </h3>
                                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                                    <div className="p-3 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">Operating System</span>
                                        <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={specs.os}>{specs.os || '-'}</span>
                                    </div>
                                    <div className="p-3 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">IP Address</span>
                                        <span className="text-xs font-mono font-bold text-slate-900">{asset.ip_address || '-'}</span>
                                    </div>
                                    <div className="p-3 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">MAC Address</span>
                                        <span className="text-xs font-mono font-bold text-slate-900 uppercase">{specs.mac_address || '-'}</span>
                                    </div>
                                    <div className="p-3 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">Agent Status</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${asset.agent_status === 'Online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                            <span className="text-xs font-bold text-slate-900">{asset.agent_status || 'Offline'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-3">
                            {asset.uuid && asset.agent_status === 'Online' ? (
                                <Link
                                    to={`/ict/remote/${asset.uuid}`}
                                    target="_blank"
                                    className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-md"
                                >
                                    <Monitor size={16} /> Remote Control
                                </Link>
                            ) : (
                                <div className="flex items-center justify-center gap-2 py-3 bg-slate-200 text-slate-400 rounded-xl font-bold text-xs cursor-not-allowed">
                                    <Monitor size={16} /> Offline
                                </div>
                            )}
                            <Link
                                to={`/ict/assets/${asset.id}`}
                                className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                            >
                                Full Details <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-400">Asset not found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Database, 
    HardDrive, 
    RefreshCw,
    XCircle,
    Server,
    Activity
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function DataCenterMonitoring() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ proxmox: [], synology: [] });
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/network/datacenter/status');
            if (!response.ok) throw new Error("Failed to fetch data center status");
            const result = await response.json();
            setData(result);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderProxmoxNodes = () => {
        return data.proxmox.map((px, i) => {
            const isOnline = px.status === 'online';
            return (
                <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Server className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{px.name}</h3>
                                <p className="text-sm text-slate-500">{px.ip}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>

                    {!isOnline ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center text-sm font-bold">
                                <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                {px.error || "Connection Failed"}
                            </div>
                            <button 
                                onClick={() => navigate('/ict/admin/settings?tab=virtualization')}
                                className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-black uppercase tracking-wider rounded-lg transition-colors border border-red-200"
                            >
                                Setup Credentials
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {px.data && px.data.map((node, j) => {
                                const memPercent = (node.mem / node.maxmem) * 100;
                                const cpuPercent = (node.cpu) * 100;
                                
                                return (
                                    <div key={j} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                                            <span className="font-bold text-slate-800">Node: {node.node}</span>
                                            <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Uptime: {(node.uptime / 3600).toFixed(1)} hrs</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-500 font-medium">CPU Usage</span>
                                                    <span className="text-slate-900 font-bold">{cpuPercent.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${cpuPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                        style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-500 font-medium">Memory</span>
                                                    <span className="text-slate-900 font-bold">{memPercent.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${memPercent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                                        style={{ width: `${Math.min(memPercent, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Advanced Node Info */}
                                            {node.details && (
                                                <div className="col-span-2 grid grid-cols-2 gap-4 mt-2 p-3 bg-white rounded-lg border border-slate-200 text-xs shadow-sm">
                                                    <div>
                                                        <div className="flex justify-between mb-1.5">
                                                            <span className="text-slate-500">Load Average</span>
                                                            <span className="text-slate-900 font-bold">{node.details.loadavg?.[0]}, {node.details.loadavg?.[1]}, {node.details.loadavg?.[2]}</span>
                                                        </div>
                                                        <div className="flex justify-between mb-1.5">
                                                            <span className="text-slate-500">IO Delay</span>
                                                            <span className="text-slate-900 font-bold">{((node.details.wait || 0) * 100).toFixed(2)}%</span>
                                                        </div>
                                                        <div className="flex justify-between mb-1.5">
                                                            <span className="text-slate-500">CPU Model</span>
                                                            <span className="text-slate-900 font-bold truncate max-w-[150px] text-right" title={node.details.cpuinfo?.model}>
                                                                {node.details.cpuinfo?.model}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between mb-1.5">
                                                            <span className="text-slate-500">KSM Sharing</span>
                                                            <span className="text-slate-900 font-bold">
                                                                {node.details.ksm?.shared ? (node.details.ksm.shared / 1024 / 1024 / 1024).toFixed(2) : 0} GiB
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between mb-1.5">
                                                            <span className="text-slate-500">SWAP Usage</span>
                                                            <span className="text-slate-900 font-bold">
                                                                {node.details.swap?.total ? ((node.details.swap.used / node.details.swap.total) * 100).toFixed(1) : 0}% 
                                                                ({node.details.swap ? (node.details.swap.used / 1024 / 1024).toFixed(1) : 0} MiB)
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between mb-1.5">
                                                            <span className="text-slate-500">PVE Version</span>
                                                            <span className="text-slate-900 font-bold">{node.details.pveversion}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Proxmox Storage section */}
                                            {node.storage && node.storage.length > 0 && (
                                                <div className="col-span-2 mt-4 pt-4 border-t border-slate-200">
                                                    <p className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Node Storage Volumes</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {node.storage.map((st, k) => {
                                                            const stPercent = st.total > 0 ? (st.used / st.total) * 100 : 0;
                                                            return (
                                                                <div key={k} className="bg-white rounded p-3 border border-slate-200 shadow-sm">
                                                                    <div className="flex justify-between text-xs mb-2">
                                                                        <span className="text-slate-700 font-bold flex items-center">
                                                                            <HardDrive className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                                                                            {st.storage}
                                                                        </span>
                                                                        <span className="text-slate-900 font-bold">{stPercent.toFixed(1)}%</span>
                                                                    </div>
                                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                                                                        <div 
                                                                            className={`h-full rounded-full ${stPercent > 85 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                                            style={{ width: `${Math.min(stPercent, 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <div className="text-[10px] font-medium text-slate-500 text-right">
                                                                        {(st.used / 1024 / 1024 / 1024).toFixed(1)} GB / {(st.total / 1024 / 1024 / 1024).toFixed(1)} GB
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            );
        });
    };

    const renderSynologyNAS = () => {
        return data.synology.map((nas, i) => {
            const isOnline = nas.status === 'online';
            let storagePercent = 0;
            let storageUsed = 0;
            let storageTotal = 0;

            if (isOnline && nas.storage && nas.storage.volumes && nas.storage.volumes.length > 0) {
                const vol = nas.storage.volumes[0];
                storageUsed = parseInt(vol.size.used);
                storageTotal = parseInt(vol.size.total);
                storagePercent = (storageUsed / storageTotal) * 100;
            }

            return (
                <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <HardDrive className="text-emerald-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{nas.name}</h3>
                                <p className="text-sm text-slate-500">{nas.ip}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>

                    {!isOnline ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center text-sm font-bold">
                                <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                {nas.error || "Connection Failed"}
                            </div>
                            <button 
                                onClick={() => navigate('/ict/admin/settings?tab=virtualization')}
                                className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-black uppercase tracking-wider rounded-lg transition-colors border border-red-200"
                            >
                                Setup Credentials
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="border-b border-slate-100 pb-2">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Model</p>
                                    <p className="text-sm font-bold text-slate-900">{nas.system?.model}</p>
                                </div>
                                <div className="border-b border-slate-100 pb-2">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">DSM Version</p>
                                    <p className="text-sm font-bold text-slate-900">{nas.system?.firmware_ver}</p>
                                </div>
                                <div className="border-b border-slate-100 pb-2">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Temperature</p>
                                    <p className="text-sm font-bold text-emerald-600">{nas.system?.sys_temp} °C</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Uptime</p>
                                    <p className="text-sm font-bold text-slate-900">{nas.system?.up_time}</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Volume 1 Usage</p>
                                <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-4 border-slate-200 bg-white shadow-inner">
                                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90">
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="42"
                                            fill="transparent"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            className={storagePercent > 85 ? "text-red-500" : "text-emerald-500"}
                                            strokeDasharray="264"
                                            strokeDashoffset={264 - (264 * storagePercent) / 100}
                                        />
                                    </svg>
                                    <span className="text-2xl font-black text-slate-900 z-10">{storagePercent.toFixed(0)}%</span>
                                </div>
                                <p className="text-xs font-medium text-slate-500 mt-4 text-center bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                    <span className="text-slate-900 font-bold">{(storageUsed / 1024/1024/1024/1024).toFixed(2)} TB</span> / {(storageTotal / 1024/1024/1024/1024).toFixed(2)} TB
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center tracking-tight">
                        <Database className="mr-3 text-blue-600" size={28} />
                        Data Center Monitor
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Real-time status of Proxmox Clusters and Synology NAS Storage</p>
                </div>
                <button 
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                    <RefreshCw className={loading ? "animate-spin text-blue-500" : "text-slate-400"} size={18} />
                    <span>{loading ? 'Syncing...' : 'Refresh Status'}</span>
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-600 font-medium shadow-sm">
                    <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    {error}
                </div>
            )}

            <div className="mb-8">
                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center uppercase tracking-wider">
                    <Server className="mr-2 text-blue-600" size={20} />
                    Proxmox Clusters
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {renderProxmoxNodes()}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center uppercase tracking-wider">
                    <HardDrive className="mr-2 text-emerald-600" size={20} />
                    Synology Backup Storage
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {renderSynologyNAS()}
                </div>
            </div>
        </div>
    );
}

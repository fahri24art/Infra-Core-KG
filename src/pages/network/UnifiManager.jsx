import React, { useState, useEffect } from 'react';
import { Wifi, Signal, Laptop, Smartphone, Monitor, HardDrive, Filter, RefreshCw, ArrowUpDown, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const getProtoLabel = (proto) => {
    const map = { 0: '802.11a', 1: '802.11b', 2: '802.11g', 4: '802.11n', 5: '802.11ac', 6: '802.11ax' };
    return map[proto] || 'WiFi';
};

export default function UnifiManager() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, wireless, wired
    const [subFilter, setSubFilter] = useState('all'); // all, users, guests
    const [sortField, setSortField] = useState('hostname');
    const [sortOrder, setSortOrder] = useState('asc');

    const fetchData = async () => {
        try {
            const res = await fetch('/api/network/unifi');
            if (!res.ok) throw new Error('Unreachable Unifi Controller');
            const json = await res.json();
            setData(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-3">
                <RefreshCw className="animate-spin text-blue-500" size={48} />
                <p className="text-slate-500 font-bold animate-pulse text-lg">Initializing Unifi Connect Protocol...</p>
            </div>
        );
    }

    const clients = data?.details || [];
    const deviceMap = data?.deviceMap || {};

    const filteredClients = clients.filter(c => {
        const typeMatch = filter === 'all' ? true : (filter === 'wireless' ? !c.is_wired : c.is_wired);
        const subMatch = subFilter === 'all' ? true : (subFilter === 'users' ? !c.is_guest : c.is_guest);
        return typeMatch && subMatch;
    });

    const sortedClients = [...filteredClients].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === 'load') {
            aVal = (a.rx_bytes || 0) + (a.tx_bytes || 0);
            bVal = (b.rx_bytes || 0) + (b.tx_bytes || 0);
        } else if (sortField === 'ap_name') {
            aVal = deviceMap[a.ap_mac] || deviceMap[a.sw_mac] || 'Backbone';
            bVal = deviceMap[b.ap_mac] || deviceMap[b.sw_mac] || 'Backbone';
        } else if (sortField === 'is_wired') {
            aVal = a.is_wired ? 1 : 0;
            bVal = b.is_wired ? 1 : 0;
        }

        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const SortIcon = ({ field }) => (
        <ArrowUpDown size={10} className={`inline-block ml-1 ${sortField === field ? 'text-blue-500' : 'opacity-30'}`} />
    );

    const totalWireless = clients.filter(c => !c.is_wired).length;
    const totalWired = clients.filter(c => c.is_wired).length;

    return (
        <div className="space-y-5 animate-in fade-in duration-1000">
            {/* Mission Control Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Monitor className="text-blue-600" size={24} />
                        Unifi Connect
                    </h1>
                    <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider ml-1">Real-time Unified Network Infrastructure Monitoring</p>
                </div>

                {/* Tactical Filters */}
                <div className="flex flex-wrap gap-1 p-1 bg-slate-100/50 rounded-xl border border-slate-200 shadow-sm">
                    {['all', 'wireless', 'wired'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-tight ${filter === f ? 'bg-white text-blue-600 shadow-sm scale-102' : 'text-slate-500 hover:text-slate-600'}`}
                        >
                            {f} ({f === 'all' ? clients.length : (f === 'wireless' ? totalWireless : totalWired)})
                        </button>
                    ))}
                </div>

                <div className="flex gap-1 p-1 bg-slate-100/50 rounded-xl border border-slate-200 shadow-sm">
                    {['all', 'users', 'guests'].map(f => (
                        <button
                            key={f}
                            onClick={() => setSubFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-tight ${subFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}
                        >
                            {f} ({f === 'all' ? clients.length : clients.filter(c => f === 'users' ? !c.is_guest : c.is_guest).length})
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Infrastructure Table Card */}
            <Card className="bg-white border border-slate-100 rounded-xl md:rounded-2xl shadow-xl shadow-slate-100/30 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 cursor-pointer select-none">
                                <th onClick={() => handleSort('hostname')} className="px-5 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest pl-8 hover:text-slate-600">Name <SortIcon field="hostname" /></th>
                                <th onClick={() => handleSort('ip')} className="px-3 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-600">IP Address <SortIcon field="ip" /></th>
                                <th onClick={() => handleSort('experience')} className="px-3 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center hover:text-slate-600">Exp <SortIcon field="experience" /></th>
                                <th onClick={() => handleSort('is_wired')} className="px-3 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-600">Type <SortIcon field="is_wired" /></th>
                                <th onClick={() => handleSort('ap_name')} className="px-3 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-600">AP / Port <SortIcon field="ap_name" /></th>
                                <th onClick={() => handleSort('channel')} className="px-2 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center hover:text-slate-600">Ch <SortIcon field="channel" /></th>
                                <th onClick={() => handleSort('proto')} className="px-3 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-600">WIFI <SortIcon field="proto" /></th>
                                <th onClick={() => handleSort('signal')} className="px-3 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center hover:text-slate-600">Sig <SortIcon field="signal" /></th>
                                <th onClick={() => handleSort('load')} className="px-3 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center hover:text-slate-600">Load <SortIcon field="load" /></th>
                                <th onClick={() => handleSort('rx_bytes')} className="px-3 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-600">Down <SortIcon field="rx_bytes" /></th>
                                <th onClick={() => handleSort('tx_bytes')} className="px-3 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-600">Up <SortIcon field="tx_bytes" /></th>
                                <th onClick={() => handleSort('uptime')} className="px-5 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest pr-8 text-right hover:text-slate-600"><SortIcon field="uptime" /> Uptime</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedClients.map((client) => {
                                const apName = deviceMap[client.ap_mac] || deviceMap[client.sw_mac] || 'Backbone';
                                const signalPct = Math.min(100, Math.max(0, (client.signal + 100) * 2));
                                const totalLoad = (client.rx_bytes || 0) + (client.tx_bytes || 0);

                                return (
                                    <tr key={client.mac} className="hover:bg-blue-50/20 transition-all group">
                                        {/* Name & Icon */}
                                        <td className="px-5 py-1.5 pl-8 text-[11px]">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`p-1.5 rounded-lg shadow-sm border border-slate-100/50 ${client.is_wired ? 'bg-slate-50 text-slate-500' : 'bg-blue-50 text-blue-500'}`}>
                                                    {client.is_wired ? <HardDrive size={12} /> : (
                                                        client.hostname.toLowerCase().includes('iphone') || client.hostname.toLowerCase().includes('android')
                                                            ? <Smartphone size={12} />
                                                            : <Laptop size={12} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-700 text-[11px] tracking-tight truncate max-w-[150px]">{client.hostname}</p>
                                                    <p className="text-[9px] text-slate-500 font-mono opacity-60">
                                                        {client.mac.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* IP */}
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <span className="text-slate-500 font-mono text-[10px] font-bold">
                                                {client.ip}
                                            </span>
                                        </td>

                                        {/* Experience */}
                                        <td className="px-3 py-1.5 text-center">
                                            <div className="inline-flex items-center px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-black text-[9px] border border-emerald-100/50">
                                                {client.experience}%
                                            </div>
                                        </td>

                                        {/* Group/Type */}
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white ${client.is_wired ? 'bg-slate-400' : 'bg-indigo-500'}`}>
                                                {client.is_wired ? 'LAN' : 'WiFi'}
                                            </span>
                                        </td>

                                        {/* AP / Port */}
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <p className="text-blue-500 font-black text-[10px] hover:underline cursor-pointer truncate max-w-[120px]">
                                                {apName} {client.is_wired && client.sw_port && <span className="text-slate-700 font-bold">#{client.sw_port}</span>}
                                            </p>
                                        </td>

                                        {/* Channel */}
                                        <td className="px-2 py-1.5 text-center">
                                            <span className="text-slate-500 font-bold text-[10px]">{client.channel || '-'}</span>
                                        </td>

                                        {/* Connection Protocol */}
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <div className="flex flex-col">
                                                <span className="text-slate-600 font-black text-[10px]">{client.is_wired ? 'GbE' : getProtoLabel(client.proto)}</span>
                                                {!client.is_wired && <span className="text-[9px] text-slate-500 font-bold opacity-70 uppercase leading-none">{client.radio === 'ng' ? '2.4G' : '5G'}</span>}
                                            </div>
                                        </td>

                                        {/* Signal */}
                                        <td className="px-3 py-1.5 text-center">
                                            {!client.is_wired ? (
                                                <div className="flex items-center gap-1.5 justify-center">
                                                    <span className="text-slate-500 font-black text-[9px] w-6">{signalPct}%</span>
                                                    <div className="w-8 h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                        <div
                                                            className={`h-full rounded-full ${signalPct > 70 ? 'bg-emerald-500' : (signalPct > 40 ? 'bg-blue-500' : 'bg-amber-500')}`}
                                                            style={{ width: `${signalPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : <span className="text-slate-800 text-[10px]">-</span>}
                                        </td>

                                        {/* Load Visualizer */}
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden flex mx-auto">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${Math.min(100, (client.rx_bytes / (totalLoad || 1)) * 100)}%` }}
                                                />
                                                <div
                                                    className="h-full bg-emerald-500"
                                                    style={{ width: `${Math.min(100, (client.tx_bytes / (totalLoad || 1)) * 100)}%` }}
                                                />
                                            </div>
                                        </td>

                                        {/* RX Bytes */}
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <span className="text-slate-500 font-black text-[10px]">{formatBytes(client.rx_bytes)}</span>
                                        </td>

                                        {/* TX Bytes */}
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <span className="text-slate-500 font-black text-[10px]">{formatBytes(client.tx_bytes)}</span>
                                        </td>

                                        {/* Uptime */}
                                        <td className="px-5 py-1.5 pr-8 text-right">
                                            <span className="text-slate-500 font-bold text-[10px]">{formatUptime(client.uptime)}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Traceability */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-slate-500 text-[9px] font-black uppercase tracking-widest pl-8 pr-8">
                    <div className="flex items-center gap-4 opacity-60">
                        <span>Systems: {filteredClients.length}</span>
                        <span>Pulse: 10s</span>
                    </div>
                    <div className="flex items-center gap-4 opacity-80">
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> RX</div>
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> TX</div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

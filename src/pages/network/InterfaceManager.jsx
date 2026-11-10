import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Network, Activity, ArrowDown, ArrowUp, Wifi, Zap } from 'lucide-react';

export default function InterfaceManager() {
    const [interfaces, setInterfaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchInterfaces = async () => {
        try {
            let res;
            try {
                res = await fetch('/api/network/interfaces');
            } catch (e) {
                res = await fetch('/api/network/interfaces');
            }
            const data = await res.json();
            if (res.ok) {
                setInterfaces(data.interfaces || data);
                setError(null);
            } else {
                throw new Error(data.error || 'Failed to fetch');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterfaces();
        const interval = setInterval(fetchInterfaces, 3000);
        return () => clearInterval(interval);
    }, []);

    if (loading && interfaces.length === 0) return (
        <div className="flex justify-center p-10">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <Card className="p-0 bg-white shadow-xl shadow-slate-100/50 border border-slate-100 rounded-xl md:rounded-2xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">Interface List</h2>
                    <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Real-time traffic and link status</p>
                </div>
                <div className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">
                    {interfaces.length} INTF
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm font-bold text-center">
                    {error}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-500 font-black text-[9px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-3 py-1.5 text-[10px] uppercase tracking-widest">ST</th>
                            <th className="px-3 py-1.5 text-[10px] uppercase tracking-widest">Interface Name</th>
                            <th className="px-3 py-1.5 text-[10px] uppercase tracking-widest">Type</th>
                            <th className="px-3 py-1.5 text-right" uppercase tracking-widest>TX Rate</th>
                            <th className="px-3 py-1.5 text-right" uppercase tracking-widest>RX Rate</th>
                            <th className="px-3 py-1.5 text-[10px] uppercase tracking-widest">MAC Address</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {interfaces.map((iface) => (
                            <tr key={iface.id} className="hover:bg-blue-50/20 transition-colors">
                                <td className="px-4 py-1.5 text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${iface.status === 'up' ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`}></div>
                                        {iface.status === 'down' && <span className="text-[8px] font-black text-red-500 bg-red-50 px-1 py-0.5 rounded uppercase tracking-tighter">DIS</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-1.5 text-[11px]">
                                    <div className="font-black text-slate-700 flex items-center gap-2 text-[11px] tracking-tight">
                                        {iface.type === 'ether' ? <Network size={12} className="text-blue-500" /> :
                                            iface.type === 'wlan' ? <Wifi size={12} className="text-purple-500" /> :
                                                <Activity size={12} className="text-slate-500" />}
                                        {iface.name}
                                    </div>
                                    {iface.comment && <div className="text-[9px] text-slate-500 font-medium opacity-60 ml-5">{iface.comment}</div>}
                                </td>
                                <td className="px-4 py-1.5 text-[11px]">
                                    <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                                        {iface.type}
                                    </span>
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono text-[10px] font-bold text-blue-500 uppercase">
                                    {iface.tx_bytes ? (parseInt(iface.tx_bytes) / 1000000).toFixed(1) : '0.0'}M
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono text-[10px] font-bold text-emerald-500 uppercase">
                                    {iface.rx_bytes ? (parseInt(iface.rx_bytes) / 1000000).toFixed(1) : '0.0'}M
                                </td>
                                <td className="px-4 py-1.5 text-[9px] font-mono text-slate-700">
                                    {iface.mac_address || 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

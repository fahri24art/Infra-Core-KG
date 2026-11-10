import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, HardDrive, Wifi, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export default function NetworkDashboard() {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [period, setPeriod] = useState('realtime');
    const [error, setError] = useState(null);

    const MAX_REALTIME = 60;

    useEffect(() => {
        let interval;
        const fetchData = async () => {
            try {
                if (period === 'realtime') {
                    let res;
                    try {
                        res = await fetch('/api/network/dashboard');
                        if (!res.ok) throw new Error('Relative fetch failed');
                    } catch (e) {
                        res = await fetch('/api/network/dashboard');
                    }

                    if (!res.ok) throw new Error('Gagal mengambil data statistik');
                    const json = await res.json();
                    setData(json);

                    const now = new Date().toLocaleTimeString();
                    setHistory(prev => {
                        const iforte = json.traffic.wan.iforte || { rx: 0, tx: 0 };
                        const comnet = json.traffic.wan.comnet || { rx: 0, tx: 0 };

                        const newPoint = {
                            time: now,
                            fullTime: new Date().toString(),
                            rx: parseFloat((json.traffic.wan.rx / 1000000).toFixed(2)),
                            tx: parseFloat((json.traffic.wan.tx / 1000000).toFixed(2)),
                            rx_iforte: parseFloat((iforte.rx / 1000000).toFixed(2)),
                            tx_iforte: parseFloat((iforte.tx / 1000000).toFixed(2)),
                            rx_comnet: parseFloat((comnet.rx / 1000000).toFixed(2)),
                            tx_comnet: parseFloat((comnet.tx / 1000000).toFixed(2)),
                        };
                        const newHistory = [...prev, newPoint];
                        if (newHistory.length > MAX_REALTIME) newHistory.shift();
                        return newHistory;
                    });
                } else {
                    const res = await fetch(`/api/network/history?period=${period}`);
                    if (!res.ok) throw new Error('Gagal mengambil riwayat data');
                    const json = await res.json();

                    setHistory(json.map(d => {
                        let displayTime = d.time;
                        let fullTime = d.time;

                        if (period === 'day') {
                            displayTime = d.time; // "2026-02-16 09:00:00"
                            const date = new Date(d.time.replace(' ', 'T'));
                            fullTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'medium' }).format(date);
                        } else {
                            displayTime = d.time; // "2026-02-16"
                            const date = new Date(d.time + 'T00:00:00');
                            fullTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date);
                        }

                        return {
                            time: displayTime,
                            fullTime: fullTime || displayTime,
                            rx: parseFloat(d.rx).toFixed(2),
                            tx: parseFloat(d.tx).toFixed(2),
                            rx_iforte: parseFloat(d.rx_iforte),
                            tx_iforte: parseFloat(d.tx_iforte),
                            rx_comnet: parseFloat(d.rx_comnet),
                            tx_comnet: parseFloat(d.tx_comnet),
                            is_up: d.is_up,
                            is_up_iforte: d.is_up_iforte,
                            is_up_comnet: d.is_up_comnet
                        };
                    }));
                }
                setError(null);
            } catch (err) {
                console.error(err);
                setError(err.message);
            }
        };

        fetchData();
        if (period === 'realtime') {
            interval = setInterval(fetchData, 2000);
        } else {
            interval = setInterval(fetchData, 30000);
        }
        return () => clearInterval(interval);
    }, [period]);

    if (error) return (
        <div className="p-10 text-center bg-red-50 rounded-3xl border border-red-100 animate-in shake duration-500">
            <h3 className="text-red-700 font-black mb-2 text-lg">📡 Status Koneksi</h3>
            <p className="text-red-600 text-sm font-medium mb-4">{error}</p>
            <div className="bg-white0 p-4 rounded-2xl text-xs text-red-500 text-left max-w-md mx-auto border border-red-100">
                <p className="font-bold mb-1 underline">Langkah Perbaikan:</p>
                <ol className="list-decimal pl-4 space-y-1">
                    <li>Periksa apakah MikroTik dapat dijangkau dari server ini.</li>
                    <li>Verifikasi kredensial di <span className="font-bold">Sistem &gt; Koneksi</span>.</li>
                    <li>Pastikan layanan API MikroTik (8728) aktif.</li>
                </ol>
            </div>
            <button
                onClick={() => setPeriod('realtime')}
                className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
                Coba Koneksi Lagi
            </button>
        </div>
    );

    if (!data && period === 'realtime') return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl"></div>)}
        </div>
    );

    return (
        <div className="space-y-3">
            {/* KPI Cards */}
            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <StatCard
                        title="Beban CPU"
                        value={`${data.system.cpu}%`}
                        icon={Cpu}
                        color="text-purple-600"
                        bg="bg-purple-50"
                        desc={data.system.identity}
                    />
                    <StatCard
                        title="Memori"
                        value={`${(data.system.memory.free / 1024 / 1024).toFixed(0)} MB`}
                        sub={`dari ${(data.system.memory.total / 1024 / 1024).toFixed(0)} MB`}
                        icon={HardDrive}
                        color="text-blue-600"
                        bg="bg-blue-50"
                        desc="Memori Bebas"
                    />
                    <StatCard
                        title="Klien Aktif"
                        value={data.users.activeCount}
                        sub={`WIRELESS: ${data.unifi?.wireless || 0} | WIRED: ${data.unifi?.wired || 0}`}
                        icon={Users}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                        desc={`VPN: ${data.users.wgCount + data.users.pppCount} | LAN (ARP): ${data.users.lanCount} | Hotspot: ${data.users.hotspotCount}`}
                    />
                    <StatCard
                        title="Waktu Aktif"
                        value={data.system.uptime}
                        icon={Activity}
                        color="text-amber-600"
                        bg="bg-amber-50"
                        desc="Waktu Aktif Sistem"
                    />
                </div>
            )}

            {/* Bandwidth Consumption */}
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <CapacityCard
                        title="Provider iForte"
                        current_rx={parseFloat((data.traffic.wan.iforte?.rx || 0) / 1000000)}
                        current_tx={parseFloat((data.traffic.wan.iforte?.tx || 0) / 1000000)}
                        total={data.config?.wan_capacity_iforte || 100}
                        color="bg-emerald-500"
                    />
                    <CapacityCard
                        title="Provider Comnet"
                        current_rx={parseFloat((data.traffic.wan.comnet?.rx || 0) / 1000000)}
                        current_tx={parseFloat((data.traffic.wan.comnet?.tx || 0) / 1000000)}
                        total={data.config?.wan_capacity_comnet || 100}
                        color="bg-blue-500"
                    />
                </div>
            )}

            {/* Traffic Charts */}
            <div className="grid grid-cols-1 gap-4">
                {/* Download Chart */}
                <Card className="p-4 md:p-5 bg-white shadow-xl shadow-slate-100/50 border border-slate-100 rounded-xl md:rounded-2xl">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">Lalu Lintas Download</h2>
                            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wide">Throughput Download Real-time (RX)</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex bg-slate-50 p-1 rounded-lg md:rounded-xl">
                                {[
                                    { id: 'realtime', label: 'REALTIME' },
                                    { id: 'day', label: 'HARI' },
                                    { id: 'month', label: 'BULAN' },
                                    { id: 'year', label: 'TAHUN' }
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setPeriod(p.id)}
                                        className={`px-3 md:px-4 py-1 rounded-md md:rounded-lg text-[9px] md:text-[10px] font-black transition-all ${period === p.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            {data && period === 'realtime' && (
                                <div className="hidden md:flex items-center gap-1.5 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100/50">
                                    <ArrowDown size={12} />
                                    <span>{(data.traffic.wan.rx / 1000000).toFixed(1)} Mbps</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorIForteRx" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorComnetRx" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
                                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} minTickGap={30} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(val) => val >= 1 ? `${val}M` : `${(val * 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area stackId="1" type="monotone" dataKey="rx_iforte" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIForteRx)" name="Download iForte" />
                                <Area stackId="1" type="monotone" dataKey="rx_comnet" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorComnetRx)" name="Download Comnet" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Upload Chart */}
                <Card className="p-4 md:p-5 bg-white shadow-xl shadow-slate-100/50 border border-slate-100 rounded-xl md:rounded-2xl">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">Lalu Lintas Upload</h2>
                            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wide">Throughput Upload Real-time (TX)</p>
                        </div>

                        {data && period === 'realtime' && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100/50">
                                <ArrowUp size={12} />
                                <span>{(data.traffic.wan.tx / 1000000).toFixed(1)} Mbps</span>
                            </div>
                        )}
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorIForteTx" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#059669" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="#059669" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorComnetTx" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
                                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} minTickGap={80} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(val) => val >= 1 ? `${val}M` : `${(val * 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area stackId="1" type="monotone" dataKey="tx_iforte" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorIForteTx)" name="Upload iForte" />
                                <Area stackId="1" type="monotone" dataKey="tx_comnet" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorComnetTx)" name="Upload Comnet" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function StatCard({ title, value, sub, icon: Icon, color, bg, desc }) {
    return (
        <div className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-slate-100 shadow-md shadow-slate-100/30 hover:-translate-y-0.5 transition-all cursor-default group">
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-lg md:rounded-xl ${bg} ${color}`}>
                    <Icon size={18} className="md:w-5 md:h-5" />
                </div>
                {sub && <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">{sub}</span>}
            </div>
            <div>
                <h3 className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mb-1">{title}</h3>
                <div className="text-lg md:text-xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
                    {value}
                </div>
                {desc && <p className="text-[9px] font-bold text-slate-500 mt-1.5 opacity-80">{desc}</p>}
            </div>
        </div>
    );
}

function CapacityCard({ title, current_rx, current_tx, total, color }) {
    const percentage_rx = Math.min(Math.round((current_rx / total) * 100), 100);
    const percentage_tx = Math.min(Math.round((current_tx / total) * 100), 100);

    return (
        <Card className="p-4 md:p-5 bg-white border border-slate-100 rounded-xl md:rounded-2xl shadow-md shadow-slate-100/30">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-slate-500 font-black text-[9px] uppercase tracking-widest mb-1">{title}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mb-2">Kapasitas: {total} Mbps</p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                        <ArrowDown size={10} />
                        <span className="text-xs font-black">{current_rx.toFixed(1)} <span className="text-[8px] opacity-60">Mbps</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-600">
                        <ArrowUp size={10} />
                        <span className="text-xs font-black">{current_tx.toFixed(1)} <span className="text-[8px] opacity-60">Mbps</span></span>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">
                        <span>Download Use</span>
                        <span>{percentage_rx}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                        <div
                            className={`h-full ${color} transition-all duration-1000 ease-out rounded-full`}
                            style={{ width: `${percentage_rx}%` }}
                        ></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">
                        <span>Upload Use</span>
                        <span>{percentage_tx}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                        <div
                            className={`h-full bg-blue-400 transition-all duration-1000 ease-out rounded-full`}
                            style={{ width: `${percentage_tx}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function CustomTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-slate-100 min-w-[240px]">
                <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{d.fullTime || d.time}</p>
                    {d.is_up === false && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-black rounded-lg uppercase">SISTEM DOWN</span>
                    )}
                </div>

                <div className="space-y-3">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Ringkasan Lalu Lintas</p>
                        <div className="flex justify-between gap-5 py-1 border-b border-slate-50">
                            <span className="text-slate-500 font-bold text-xs flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" /> Total Download:
                            </span>
                            <span className="text-slate-700 font-black text-xs">{d.rx} Mbps</span>
                        </div>
                        <div className="flex justify-between gap-5 py-1">
                            <span className="text-blue-500 font-bold text-xs flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500" /> Total Upload:
                            </span>
                            <span className="text-slate-700 font-black text-xs">{d.tx} Mbps</span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Per Provider</p>
                        <div className="p-2 bg-emerald-50/40 rounded-xl border border-emerald-100/50">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-emerald-700 font-black text-[10px] uppercase">iForte</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold">Down</span>
                                    <span className="text-[10px] font-black text-emerald-600">{d.rx_iforte || '0.0'} Mbps</span>
                                </div>
                                <div className="flex flex-col border-l border-emerald-100 pl-2">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold">Up</span>
                                    <span className="text-[10px] font-black text-emerald-600">{d.tx_iforte || '0.0'} Mbps</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-2 bg-blue-50/40 rounded-xl border border-blue-100/50">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-blue-700 font-black text-[10px] uppercase">Comnet / Comtronic</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold">Down</span>
                                    <span className="text-[10px] font-black text-blue-600">{d.rx_comnet || '0.0'} Mbps</span>
                                </div>
                                <div className="flex flex-col border-l border-blue-100 pl-2">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold">Up</span>
                                    <span className="text-[10px] font-black text-blue-600">{d.tx_comnet || '0.0'} Mbps</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

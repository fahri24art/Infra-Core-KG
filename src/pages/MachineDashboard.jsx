import React, { useState, useMemo, useEffect } from 'react';
import { 
    Cpu, Database, ClipboardCheck, AlertTriangle, Activity, Package
} from 'lucide-react';
import { 
    BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

export default function MachineDashboard() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInventory = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/machine/inventory');
                if (!res.ok) throw new Error('Failed to fetch data');
                const json = await res.json();
                if (json.success) {
                    setInventory(json.data);
                }
            } catch (err) {
                console.error('Error fetching Machine inventory:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, []);

    // Static Mock Data for the Dashboard Top Stats
    const stats = [
        { label: 'Total Machines', value: '125', trend: '+2', icon: Cpu, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Total Inventory', value: inventory.length || '...', trend: '+5', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { label: 'PM Completion', value: '95%', trend: 'Good', icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { label: 'Low Stock Alerts', value: inventory.filter(i => i.status !== 'Sufficient').length || '0', trend: '-2', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100' }
    ];

    const assetDistribution = useMemo(() => {
        const counts = { machinery: 0, facility: 0, electrical: 0, utility: 0, fabrication: 0 };
        inventory.forEach(i => {
            if (counts[i.category] !== undefined) counts[i.category] += i.total_stock;
        });
        return [
            { name: 'Machinery', count: counts.machinery || 0 },
            { name: 'Facility', count: counts.facility || 0 },
            { name: 'Electrical', count: counts.electrical || 0 },
            { name: 'Utility', count: counts.utility || 0 },
            { name: 'Pabrikasi', count: counts.fabrication || 0 },
        ];
    }, [inventory]);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance Overview</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Maintenance Machine, Utility, Electrical, & Pabrikasi</p>
                </div>
                <a 
                    href="http://localhost:3000" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition-all gap-2"
                >
                    <Activity size={16} /> Buka Andon Live Monitor
                </a>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl ${s.bg} ${s.color} flex items-center justify-center`}>
                                <s.icon size={24} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                s.trend.startsWith('+') || s.trend === 'Done' ? 'bg-emerald-50 text-emerald-600' : 
                                'bg-rose-50 text-rose-600'
                            }`}>
                                {s.trend}
                            </span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-1">{s.value}</h3>
                        <p className="text-sm font-bold text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Asset Distribution Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <h2 className="text-lg font-black text-slate-900 mb-6">Total Kuantitas Kategori</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={assetDistribution} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} width={90} />
                                <RechartsTooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                                    {assetDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#6366f1', '#10b981', '#f59e0b'][index % 4]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Placeholder for Recent Activity or Checksheets */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-slate-900">Recent Logs & Alerts</h2>
                        <button className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</button>
                    </div>
                    <div className="space-y-3">
                        <div className="flex gap-4 items-start p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <ClipboardCheck size={14} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">PM AIDA 200T Completed</p>
                                <p className="text-xs text-slate-500 mt-1">Oleh: Supri (Mtn Team) - 10 mins ago</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start p-4 bg-rose-50 rounded-xl border border-rose-100">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <AlertTriangle size={14} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">Stock Sensor Omron Low!</p>
                                <p className="text-xs text-slate-500 mt-1">Sisa gudang: 2 unit - 1 hour ago</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

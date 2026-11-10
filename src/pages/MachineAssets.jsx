import React, { useState, useMemo, useEffect } from 'react';
import { 
    Briefcase, Building, Car, ShieldAlert, HardHat,
    Search, Plus, Filter, ClipboardCheck, Activity, Package
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export default function MachineAssets() {
    const navigate = useNavigate();
    const tabs = [
        { id: 'machinery', label: 'Machinery & Equipment', icon: Building },
        { id: 'facility', label: 'Facilities & Infrastructure', icon: Briefcase },
        { id: 'electrical', label: 'Electrical Systems', icon: ShieldAlert },
        { id: 'utility', label: 'Utility Systems', icon: Car },
        { id: 'fabrication', label: 'Pabrikasi', icon: HardHat }
    ];

    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('tab_MachineAssets') || 'machinery');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        localStorage.setItem('tab_MachineAssets', activeTab);
    }, [activeTab]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState([]);
    const [statusLabels, setStatusLabels] = useState([]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ category: activeTab, item_name: '', total_stock: 0, assigned_stock: 0, status: '', location: '' });

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/inventory');
            if (!res.ok) throw new Error('Failed to fetch data');
            const json = await res.json();
            if (json.success) {
                setInventory(json.data);
            }
            const dropRes = await fetch('/api/network/global/dropdowns');
            const dropData = await dropRes.json();
            if (dropData) {
                setLocations(dropData.filter(d => d.category === 'asset_location' && d.is_active));
                setStatusLabels(dropData.filter(d => d.category === 'asset_status' && d.is_active));
            }
        } catch (err) {
            console.error('Error fetching Machine inventory:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            if (res.ok) {
                setIsAddModalOpen(false);
                setNewItem({ category: activeTab, item_name: '', total_stock: 0, assigned_stock: 0, status: '', location: '' });
                fetchInventory();
            }
        } catch (err) {
            console.error('Failed to add item', err);
        }
    };

    const filteredAssets = useMemo(() => {
        return inventory.filter(asset => {
            const matchTab = asset.category === activeTab;
            const matchSearch = asset.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                asset.id.toString().includes(searchQuery);
            return matchTab && matchSearch;
        });
    }, [inventory, activeTab, searchQuery]);

    const getStatusBadge = (stock_status) => {
        if (stock_status === 'Sufficient') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
        if (stock_status === 'Low Stock') return 'bg-amber-50 text-amber-600 border-amber-200';
        return 'bg-rose-50 text-rose-600 border-rose-200';
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventori Maintenance Machine</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Kelola data aset mesin, nomor seri, dan stok suku cadang</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
                        <Filter size={16} /> Filter
                    </button>
                    <button 
                        onClick={() => {
                            setNewItem(prev => ({ ...prev, category: activeTab }));
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        <Plus size={16} /> Add Asset
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:flex-nowrap gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold capitalize transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by label or ID..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200 w-32">Asset Label / ID</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200">Nama Item</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200 text-center">Total Dimiliki</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200 text-center">Terdistribusi</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-blue-600 border-b border-slate-200 text-center">Sisa Gudang</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200">Kondisi Stock</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200">Lokasi</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Activity size={32} className="text-blue-400 mb-2 animate-pulse" />
                                            <p className="font-bold text-slate-600">Loading Inventory...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAssets.length > 0 ? filteredAssets.map((item) => {
                                // Generate a structured Asset ID similar to ICT
                                const catPrefix = item.category.substring(0, 3).toUpperCase();
                                const assetLabel = `MAC-${catPrefix}-${item.id.toString().padStart(4, '0')}`;
                                
                                return (
                                <tr key={item.id} onClick={() => navigate(`/machine/assets/${item.id}`)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200 w-fit">
                                                {assetLabel}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Package size={14} />
                                            </div>
                                            <div className="font-bold text-slate-800">{item.item_name}</div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-center">
                                        <span className="text-sm font-black text-slate-700">{item.total_stock}</span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-center">
                                        <span className="text-sm font-black text-slate-500">{item.assigned_stock}</span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-center">
                                        <span className={`text-sm font-black px-2 py-1 rounded-lg ${
                                            item.available_stock > 5 ? 'text-emerald-600 bg-emerald-50' : 
                                            item.available_stock > 0 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'
                                        }`}>
                                            {item.available_stock}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(item.stock_status)}`}>
                                            {item.stock_status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <span className="font-semibold text-slate-600">{item.location}</span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border bg-purple-50 text-purple-600 border-purple-200">
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            )}) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                                        <p className="font-bold text-slate-600">No assets found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Add Asset */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-900">Add New Machine Asset</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Item Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={newItem.item_name}
                                    onChange={e => setNewItem({...newItem, item_name: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    placeholder="Enter item name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Total Stock</label>
                                    <input 
                                        type="number" 
                                        required
                                        min="0"
                                        value={newItem.total_stock}
                                        onChange={e => setNewItem({...newItem, total_stock: parseInt(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Assigned Stock</label>
                                    <input 
                                        type="number" 
                                        required
                                        min="0"
                                        value={newItem.assigned_stock}
                                        onChange={e => setNewItem({...newItem, assigned_stock: parseInt(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Location</label>
                                    <select
                                        value={newItem.location}
                                        onChange={e => setNewItem({...newItem, location: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    >
                                        <option value="">-- Lokasi --</option>
                                        {locations.map(l => (
                                            <option key={l.id} value={l.value}>{l.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                                    <select
                                        value={newItem.status}
                                        onChange={e => setNewItem({...newItem, status: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    >
                                        <option value="">-- Status --</option>
                                        {statusLabels.map(s => (
                                            <option key={s.id} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                                    Save Asset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

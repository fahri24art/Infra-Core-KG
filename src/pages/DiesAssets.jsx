import React, { useState, useMemo, useEffect } from 'react';
import { 
    Briefcase, Building, Car, ShieldAlert, HardHat,
    Search, Plus, Filter, ClipboardCheck, Activity, Package
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export default function DiesAssets() {
    const navigate = useNavigate();
    const tabs = [
        { id: 'dies', label: 'Maintenance Dies', icon: Building },
        { id: 'tool_making', label: 'Tool Making', icon: Briefcase },
        { id: 'tool_service', label: 'Tool Service', icon: ShieldAlert },
        { id: 'rnd', label: 'Research & Development', icon: Car },
        { id: 'pe', label: 'Production Engineering', icon: HardHat }
    ];

    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('tab_DiesAssets') || 'dies');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        localStorage.setItem('tab_DiesAssets', activeTab);
    }, [activeTab]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ category: activeTab, item_name: '', total_stock: 0, assigned_stock: 0 });

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/dies/inventory');
            if (!res.ok) throw new Error('Failed to fetch data');
            const json = await res.json();
            if (json.success) {
                setInventory(json.data);
            }
        } catch (err) {
            console.error('Error fetching Dies inventory:', err);
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
            const res = await fetch('/api/dies/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            if (res.ok) {
                setIsAddModalOpen(false);
                setNewItem({ category: activeTab, item_name: '', total_stock: 0, assigned_stock: 0 });
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

    const getStatusBadge = (status) => {
        if (status === 'Sufficient') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
        if (status === 'Low Stock') return 'bg-amber-50 text-amber-600 border-amber-200';
        return 'bg-rose-50 text-rose-600 border-rose-200';
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master Inventory Dies & Tool</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Kelola data dies, tooling, tool making, dan tool service</p>
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
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200 w-32">Asset Code</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200">Dies Name / No</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200 text-center">Customer</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200 text-center">Project / Model</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200 text-center">Machine</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Activity size={32} className="text-blue-400 mb-2 animate-pulse" />
                                            <p className="font-bold text-slate-600">Loading Inventory...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAssets.length > 0 ? filteredAssets.map((item) => {
                                // Generate a structured Asset ID similar to ICT
                                const catPrefix = item.category.substring(0, 3).toUpperCase();
                                const defaultAssetLabel = `DIES-${catPrefix}-${item.id.toString().padStart(4, '0')}`;
                                const displayAssetCode = item.asset_code || defaultAssetLabel;
                                
                                return (
                                <tr key={item.id} onClick={() => navigate(`/dies/assets/${item.id}`)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs font-bold text-slate-800 bg-rose-50 px-2 py-1 rounded border border-rose-200 w-fit">
                                                {displayAssetCode}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Package size={14} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{item.item_name}</div>
                                                <div className="text-xs font-medium text-slate-500">{item.dies_number || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-center">
                                        <span className="text-sm font-black text-slate-700">{item.customer || '-'}</span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-center flex flex-col items-center">
                                        <span className="text-sm font-black text-slate-700">{item.project || '-'}</span>
                                        <span className="text-xs font-medium text-slate-500">{item.model || ''}</span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-center">
                                        <span className="text-sm font-black text-slate-600">{item.press_machine || '-'}</span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                            item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                            item.status === 'REPAIR' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                            'bg-rose-50 text-rose-600 border-rose-200'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            )}) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
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
                            <h3 className="font-black text-slate-900">Add New Dies/Tooling Asset</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Asset Code</label>
                                <input 
                                    type="text" 
                                    value={newItem.asset_code || ''}
                                    onChange={e => setNewItem({...newItem, asset_code: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono"
                                    placeholder="e.g. DIES-001"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Dies Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={newItem.item_name}
                                        onChange={e => setNewItem({...newItem, item_name: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                        placeholder="Enter dies name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Dies Number</label>
                                    <input 
                                        type="text" 
                                        value={newItem.dies_number || ''}
                                        onChange={e => setNewItem({...newItem, dies_number: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                        placeholder="e.g. D-12345"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Customer</label>
                                    <input 
                                        type="text" 
                                        value={newItem.customer || ''}
                                        onChange={e => setNewItem({...newItem, customer: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                        placeholder="Enter customer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Project</label>
                                    <input 
                                        type="text" 
                                        value={newItem.project || ''}
                                        onChange={e => setNewItem({...newItem, project: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                        placeholder="Enter project name"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Press Machine Target</label>
                                <input 
                                    type="text" 
                                    value={newItem.press_machine || ''}
                                    onChange={e => setNewItem({...newItem, press_machine: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    placeholder="e.g. Komatsu 500T"
                                />
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

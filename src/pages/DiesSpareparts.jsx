import React, { useState, useEffect, useMemo } from 'react';
import { 
    Package, Search, Plus, Filter, Download, ArrowUpRight, 
    AlertTriangle, CheckCircle2, Box, Cpu, Wrench, X, Save
} from 'lucide-react';
import axios from 'axios';

export default function DiesSpareparts() {
    const [spareparts, setSpareparts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state for new part
    const [newPart, setNewPart] = useState({
        part_name: '',
        specifications: '',
        erp_item_code: '',
        qty_in_stock: 0,
        min_stock_level: 1,
        uom: 'Pcs',
        rack_location: '',
        unit_price: 0,
        life_expectancy_hits: 100000,
        supplier: ''
    });

    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetchSpareparts();
    }, []);

    const fetchSpareparts = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/dies/spareparts');
            if (res.data.success) {
                setSpareparts(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching spareparts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncWarehouse = async () => {
        setIsSyncing(true);
        try {
            const res = await axios.post('http://localhost:5000/api/dies/spareparts/sync');
            if (res.data.success) {
                alert(res.data.message);
                await fetchSpareparts();
            } else {
                alert('Sync failed: ' + res.data.error);
            }
        } catch (error) {
            console.error('Error syncing:', error);
            alert('Failed to connect to Warehouse API');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSavePart = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await axios.post('http://localhost:5000/api/dies/spareparts', newPart);
            if (res.data.success) {
                // Refresh list
                await fetchSpareparts();
                setIsAddModalOpen(false);
                setNewPart({
                    part_name: '', specifications: '', erp_item_code: '', qty_in_stock: 0,
                    min_stock_level: 1, uom: 'Pcs', rack_location: '', unit_price: 0,
                    life_expectancy_hits: 100000, supplier: ''
                });
            }
        } catch (error) {
            console.error('Error saving part:', error);
            alert('Failed to save sparepart.');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredParts = useMemo(() => {
        return spareparts.filter(part => 
            part.part_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (part.erp_item_code && part.erp_item_code.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [spareparts, searchQuery]);

    const totalValue = useMemo(() => {
        return spareparts.reduce((sum, part) => sum + (part.qty_in_stock * part.unit_price), 0);
    }, [spareparts]);

    const lowStockItems = useMemo(() => {
        return spareparts.filter(part => part.qty_in_stock <= part.min_stock_level);
    }, [spareparts]);

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="p-5 max-w-[1600px] mx-auto animate-in fade-in duration-500 relative">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Package className="text-blue-600" size={32} />
                        Engineering Sparepart Warehouse
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Master inventory connected to iDempiere ERP</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleSyncWarehouse}
                        disabled={isSyncing}
                        className="btn-secondary flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl font-bold hover:bg-emerald-100 shadow-sm transition-all disabled:opacity-50"
                    >
                        <Cpu size={18} className={isSyncing ? "animate-spin" : ""} /> 
                        {isSyncing ? 'Syncing...' : 'Sync Warehouse'}
                    </button>
                    <button className="btn-secondary flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 shadow-sm transition-all">
                        <Download size={18} /> Export List
                    </button>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all"
                    >
                        <Plus size={18} /> Add New Part
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Box className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total Items</p>
                        <h4 className="text-2xl font-black text-slate-900">{spareparts.length}</h4>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="text-emerald-600" size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total Asset Value</p>
                        <h4 className="text-2xl font-black text-slate-900">{formatCurrency(totalValue)}</h4>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center shrink-0 relative">
                        <AlertTriangle className="text-rose-600" size={24} />
                        {lowStockItems.length > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full animate-ping"></span>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Low Stock Alerts</p>
                        <h4 className="text-2xl font-black text-rose-600">{lowStockItems.length} Items</h4>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                        <Cpu className="text-purple-600" size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">ERP Sync Status</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-sm font-bold text-slate-700">Connected</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search part name or ERP code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Item Detail</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">ERP Code</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Location</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Stock</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Unit Price</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center text-slate-400 font-medium">Loading inventory...</td>
                                </tr>
                            ) : filteredParts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center text-slate-400 font-medium">No spareparts found.</td>
                                </tr>
                            ) : filteredParts.map(part => {
                                const isLow = part.qty_in_stock <= part.min_stock_level;
                                return (
                                    <tr key={part.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-5 text-[11px]">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                                                    <Wrench size={18} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{part.part_name}</p>
                                                    <p className="text-xs font-medium text-slate-500">{part.specifications}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-[11px]">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
                                                {part.erp_item_code || '-'}
                                            </span>
                                        </td>
                                        <td className="p-5 text-[11px]">
                                            <p className="text-sm font-bold text-slate-700">{part.rack_location || '-'}</p>
                                        </td>
                                        <td className="p-5 text-[11px]">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className={`text-lg font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                                                    {part.qty_in_stock}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">{part.uom}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Min: {part.min_stock_level}</p>
                                        </td>
                                        <td className="p-5 text-[11px]">
                                            <p className="text-sm font-bold text-slate-700">{formatCurrency(part.unit_price)}</p>
                                        </td>
                                        <td className="p-5 text-[11px]">
                                            {isLow ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                                                    <AlertTriangle size={12} /> Restock Needed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                                                    <CheckCircle2 size={12} /> Optimal
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-5 text-right">
                                            <button className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">Manage</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Add New Sparepart</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">Create a new item in the inventory</p>
                            </div>
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSavePart} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Part Name *</label>
                                    <input required type="text" value={newPart.part_name} onChange={e => setNewPart({...newPart, part_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="e.g. Coil Spring Heavy Duty" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">ERP Item Code</label>
                                    <input type="text" value={newPart.erp_item_code} onChange={e => setNewPart({...newPart, erp_item_code: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="SP-XXX-000" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Specifications</label>
                                    <input type="text" value={newPart.specifications} onChange={e => setNewPart({...newPart, specifications: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Material, Dimensions, Hardness..." />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Stock Qty</label>
                                    <div className="flex gap-2">
                                        <input required type="number" min="0" value={newPart.qty_in_stock} onChange={e => setNewPart({...newPart, qty_in_stock: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                        <select value={newPart.uom} onChange={e => setNewPart({...newPart, uom: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500">
                                            <option value="Pcs">Pcs</option>
                                            <option value="Set">Set</option>
                                            <option value="Box">Box</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Min. Stock Level</label>
                                    <input required type="number" min="0" value={newPart.min_stock_level} onChange={e => setNewPart({...newPart, min_stock_level: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Rack Location</label>
                                    <input type="text" value={newPart.rack_location} onChange={e => setNewPart({...newPart, rack_location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="e.g. RACK-A-01" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Unit Price (IDR)</label>
                                    <input required type="number" min="0" value={newPart.unit_price} onChange={e => setNewPart({...newPart, unit_price: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                </div>
                            </div>
                            
                            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving} className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSaving ? 'Saving...' : <><Save size={18} /> Save Sparepart</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

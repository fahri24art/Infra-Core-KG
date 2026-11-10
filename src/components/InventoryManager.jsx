import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, ArrowDownCircle, ArrowUpCircle, History, AlertTriangle, AlertCircle, RefreshCw, Box } from 'lucide-react';

export default function InventoryManager({ department }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [showItemModal, setShowItemModal] = useState(false);
    const [itemForm, setItemForm] = useState({ id: null, item_code: '', name: '', category: '', min_stock_alert: 0, unit: 'Pcs' });
    
    const [showTrxModal, setShowTrxModal] = useState(false);
    const [trxForm, setTrxForm] = useState({ item_id: null, type: 'IN', qty: 1, requestor_name: '', notes: '' });
    
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedItemHistory, setSelectedItemHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    let currentUser = null;
    try {
        const stored = sessionStorage.getItem('user');
        if (stored) currentUser = JSON.parse(stored);
    } catch (e) {}

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/inventory?department=${department}`);
            const result = await res.json();
            if (result.success) {
                setItems(result.data);
            }
        } catch (err) {
            console.error("Failed to fetch inventory", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [department]);

    const handleSaveItem = async (e) => {
        e.preventDefault();
        try {
            const method = itemForm.id ? 'PUT' : 'POST';
            const url = itemForm.id ? `/api/inventory/${itemForm.id}` : '/api/inventory';
            
            const payload = { ...itemForm, department };
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                setShowItemModal(false);
                fetchData();
            } else {
                alert("Error: " + result.error);
            }
        } catch (err) {
            alert("Network error.");
        }
    };

    const handleSaveTrx = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/inventory/${trxForm.item_id}/transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trxForm)
            });
            const result = await res.json();
            if (result.success) {
                setShowTrxModal(false);
                fetchData();
            } else {
                alert("Error: " + result.error);
            }
        } catch (err) {
            alert("Network error.");
        }
    };

    const fetchHistory = async (itemId) => {
        setHistoryLoading(true);
        setShowHistoryModal(true);
        try {
            const res = await fetch(`/api/inventory/${itemId}/history`);
            const result = await res.json();
            if (result.success) {
                setSelectedItemHistory(result.data);
            }
        } catch (err) {
            console.error("Failed to fetch history");
        } finally {
            setHistoryLoading(false);
        }
    };

    const filteredItems = items.filter(item => 
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.item_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const lowStockItems = items.filter(i => i.stock_qty <= i.min_stock_alert);

    return (
        <div className="space-y-3 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Package className={department === 'ICT' ? 'text-blue-600' : 'text-emerald-600'} size={32} />
                        {department} Inventory
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Manage consumable stock and distribution.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={fetchData} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all active:scale-95">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => {
                            setItemForm({ id: null, item_code: '', name: '', category: '', min_stock_alert: 0, unit: 'Pcs' });
                            setShowItemModal(true);
                        }}
                        className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 ${department === 'ICT' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        <Plus size={18} /> Add New Item
                    </button>
                </div>
            </div>

            {lowStockItems.length > 0 && (
                <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-2xl flex items-start gap-3 shadow-sm">
                    <AlertTriangle size={24} className="text-rose-500 shrink-0" />
                    <div>
                        <h3 className="font-bold text-rose-800">Low Stock Alert</h3>
                        <p className="text-sm text-rose-700 mt-1">There are {lowStockItems.length} items that need restocking.</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {lowStockItems.map(i => (
                                <span key={i.id} className="text-[10px] font-bold px-2 py-1 bg-rose-100 text-rose-800 rounded">
                                    {i.name} (Sisa: {i.stock_qty})
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search items by name or code..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-white border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                            <tr>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Item Code</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Item Name</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Category</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-center">Stock</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-5 text-center text-slate-400 font-bold">Loading Inventory...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan={5} className="p-5 text-center text-slate-400 font-bold">No items found.</td></tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-3 py-1.5 text-[11px] font-bold text-slate-800">{item.item_code}</td>
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <div className="font-bold text-slate-700">{item.name}</div>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">{item.category || '-'}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px] text-center">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-sm ${item.stock_qty <= item.min_stock_alert ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {item.stock_qty} <span className="text-[10px] uppercase">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px] text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => { setTrxForm({ item_id: item.id, type: 'IN', qty: 1, requestor_name: '', notes: '' }); setShowTrxModal(true); }}
                                                    className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Stock IN"
                                                >
                                                    <ArrowDownCircle size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => { setTrxForm({ item_id: item.id, type: 'OUT', qty: 1, requestor_name: '', notes: '' }); setShowTrxModal(true); }}
                                                    className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="Stock OUT"
                                                >
                                                    <ArrowUpCircle size={18} />
                                                </button>
                                                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                                <button 
                                                    onClick={() => fetchHistory(item.id)}
                                                    className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" title="History"
                                                >
                                                    <History size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => { setItemForm(item); setShowItemModal(true); }}
                                                    className="text-[10px] font-bold text-blue-600 hover:underline ml-2"
                                                >
                                                    EDIT
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ITEM MODAL */}
            {showItemModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-scale-up">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                <Box className="text-blue-600" size={20} />
                                {itemForm.id ? 'Edit Item' : 'Add New Item'}
                            </h3>
                            <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSaveItem} className="p-5 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Item Code</label>
                                <input required type="text" value={itemForm.item_code} onChange={e => setItemForm({...itemForm, item_code: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl font-bold outline-none focus:border-blue-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Item Name</label>
                                <input required type="text" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl font-bold outline-none focus:border-blue-600" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                                    <input type="text" value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl font-bold outline-none focus:border-blue-600" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unit</label>
                                    <input type="text" value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} placeholder="Pcs, Box, dll" className="w-full border border-slate-200 p-2.5 rounded-xl font-bold outline-none focus:border-blue-600" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Min. Stock Alert</label>
                                <input required type="number" min="0" value={itemForm.min_stock_alert} onChange={e => setItemForm({...itemForm, min_stock_alert: parseInt(e.target.value)})} className="w-full border border-slate-200 p-2.5 rounded-xl font-bold outline-none focus:border-blue-600" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowItemModal(false)} className="flex-1 p-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                                <button type="submit" className={`flex-1 p-3 text-white font-bold rounded-xl transition-colors ${department === 'ICT' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TRANSACTION MODAL */}
            {showTrxModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-scale-up">
                        <div className={`p-5 border-b border-slate-100 flex justify-between items-center ${trxForm.type === 'IN' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <h3 className={`font-black flex items-center gap-2 ${trxForm.type === 'IN' ? 'text-emerald-800' : 'text-rose-800'}`}>
                                {trxForm.type === 'IN' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                Stock {trxForm.type}
                            </h3>
                            <button onClick={() => setShowTrxModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSaveTrx} className="p-5 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                                <input required type="number" min="1" value={trxForm.qty} onChange={e => setTrxForm({...trxForm, qty: parseInt(e.target.value)})} className="w-full border border-slate-200 p-2.5 rounded-xl font-bold text-xl outline-none focus:border-blue-600" />
                            </div>
                            {trxForm.type === 'OUT' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Requestor Name (Penerima)</label>
                                    <input required type="text" value={trxForm.requestor_name} onChange={e => setTrxForm({...trxForm, requestor_name: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl font-bold outline-none focus:border-blue-600" />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes / Remarks</label>
                                <textarea value={trxForm.notes} onChange={e => setTrxForm({...trxForm, notes: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl font-medium outline-none focus:border-blue-600" rows="3"></textarea>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="submit" className={`w-full p-3 text-white font-bold rounded-xl transition-colors ${trxForm.type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                                    Confirm Stock {trxForm.type}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-xl animate-scale-up">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                <History size={20} className="text-blue-600" /> Transaction History
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
                            {historyLoading ? (
                                <div className="p-5 text-center text-slate-400 font-bold">Loading History...</div>
                            ) : selectedItemHistory.length === 0 ? (
                                <div className="p-5 text-center text-slate-400 font-bold">No transactions recorded yet.</div>
                            ) : (
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-3 py-1.5 text-[10px] uppercase">Date</th>
                                            <th className="px-3 py-1.5 text-[10px] uppercase">Type</th>
                                            <th className="px-3 py-1.5 text-[10px] uppercase">Qty</th>
                                            <th className="px-3 py-1.5 text-[10px] uppercase">Requestor</th>
                                            <th className="px-3 py-1.5 text-[10px] uppercase">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedItemHistory.map(trx => (
                                            <tr key={trx.id} className="bg-white">
                                                <td className="px-3 py-1.5 text-[11px] font-medium text-slate-600">{new Date(trx.created_at).toLocaleString('id-ID')}</td>
                                                <td className="px-3 py-1.5 text-[11px]">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${trx.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {trx.type}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-[11px] font-black text-slate-800">{trx.qty}</td>
                                                <td className="px-3 py-1.5 text-[11px] font-bold text-slate-700">{trx.requestor_name || '-'}</td>
                                                <td className="px-3 py-1.5 text-[11px] text-slate-500 text-[11px] truncate max-w-[200px]">{trx.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

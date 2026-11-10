import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit, Trash2, Box, Activity, CheckCircle, Clock, Server, Lock, X } from 'lucide-react';

export default function MasterDataConfigurator() {
    const [categories, setCategories] = useState([]);
    const [stoPeriods, setStoPeriods] = useState([]);
    const [nodeTypes, setNodeTypes] = useState([]);
    const [dropdowns, setDropdowns] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // For Modals
    const [showModal, setShowModal] = useState(null); // 'category', 'sto', 'node'
    const [formData, setFormData] = useState({});

    const org = sessionStorage.getItem('organization') || 'TCF-SG';

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, stoRes, nodeRes, dropRes] = await Promise.all([
                fetch(`/api/network/global/categories?organization=${org}`),
                fetch(`/api/network/global/sto-periods?organization=${org}`),
                fetch(`/api/network/global/node-types?organization=${org}`),
                fetch(`/api/network/global/dropdowns`)
            ]);
            if(catRes.ok) setCategories(await catRes.json());
            if(stoRes.ok) setStoPeriods(await stoRes.json());
            if(nodeRes.ok) setNodeTypes(await nodeRes.json());
            if(dropRes.ok) setDropdowns(await dropRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [org]);

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `/api/network/global/categories/${formData.id}?organization=${org}` : `/api/network/global/categories?organization=${org}`;
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            setShowModal(null);
            fetchData();
        } catch (err) {
            alert('Failed to save category');
        }
    };

    const handleSaveDropdown = async (e) => {
        e.preventDefault();
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `/api/network/global/dropdowns/${formData.id}` : `/api/network/global/dropdowns`;
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            setShowModal(null);
            fetchData();
        } catch (err) {
            alert('Failed to save dropdown option');
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                        <Database size={28} className="text-blue-400" />
                        Global Master Data Configurator
                    </h2>
                    <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
                        Manage dynamic application data here. Changes made will instantly reflect in Fixed Assets, Dashboards, and other modules without requiring code changes.
                    </p>
                </div>
                <div className="absolute top-0 right-0 p-5 opacity-10 pointer-events-none">
                    <Server size={120} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* CATEGORIES MODULE */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Box size={20} /></div>
                            <div>
                                <h3 className="font-bold text-slate-800">Asset Categories</h3>
                                <p className="text-xs text-slate-500">Define primary modules for fixed assets.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => { setFormData({ name: '', icon: 'Box', is_active: true }); setShowModal('category'); }}
                            className="p-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {categories.length === 0 && <div className="text-center py-6 text-slate-400 text-sm">No categories configured.</div>}
                        {categories.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${c.is_active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <Box size={16} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-700 text-sm">{c.name}</div>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{c.is_active ? 'Active' : 'Disabled'}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setFormData(c); setShowModal('category'); }}
                                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    <Edit size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* STO PERIODS MODULE */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Clock size={20} /></div>
                            <div>
                                <h3 className="font-bold text-slate-800">STO Periods</h3>
                                <p className="text-xs text-slate-500">Manage Stock Take / Opname periods.</p>
                            </div>
                        </div>
                        <button className="p-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl transition-colors">
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {stoPeriods.length === 0 && <div className="text-center py-6 text-slate-400 text-sm">No STO periods configured.</div>}
                        {stoPeriods.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                                <div className="font-bold text-slate-700 text-sm">{s.name}</div>
                                <div className={`text-xs px-2 py-1 rounded-full ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {s.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* NODE TYPES MODULE */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-orange-50 rounded-md text-orange-600"><Server size={18} /></div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Node Types</h3>
                                <p className="text-[10px] text-slate-500">Device/Node classification</p>
                            </div>
                        </div>
                        <button className="p-1.5 bg-slate-900 hover:bg-orange-600 text-white rounded-lg transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {nodeTypes.length === 0 && <div className="text-center py-4 text-slate-400 text-xs">No node types.</div>}
                        {nodeTypes.map(n => (
                            <div key={n.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="font-bold text-slate-700 text-xs">{n.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DROPDOWN CONFIG MODULE */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 rounded-md text-blue-600"><Activity size={18} /></div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Dropdown Options</h3>
                                <p className="text-[10px] text-slate-500">Manage all selector values</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => { setFormData({ category: 'asset_status', value: '', label: '', is_active: true, sort_order: 1 }); setShowModal('dropdown'); }}
                            className="p-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {dropdowns.length === 0 && <div className="text-center py-4 text-slate-400 text-xs">No dropdowns configured.</div>}
                        
                        {/* Group by category */}
                        {Array.from(new Set(dropdowns.map(d => d.category))).map(cat => (
                            <div key={cat} className="space-y-2">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white py-1">{cat}</div>
                                {dropdowns.filter(d => d.category === cat).map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-2 border border-slate-100 rounded-lg bg-slate-50/50">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${d.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div className="font-medium text-slate-700 text-xs">{d.label} <span className="text-slate-400 font-normal">({d.value})</span></div>
                                        </div>
                                        <button onClick={() => { setFormData(d); setShowModal('dropdown'); }} className="text-slate-400 hover:text-blue-600">
                                            <Edit size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showModal === 'category' && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800">{formData.id ? 'Edit Category' : 'New Category'}</h3>
                            <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Category Name</label>
                                <input 
                                    type="text" required
                                    value={formData.name || ''}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="e.g. Network, IoT, Servers"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                                <textarea 
                                    value={formData.description || ''}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none h-24"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <input 
                                    type="checkbox" id="isActive"
                                    checked={formData.is_active !== false}
                                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Category is Active</label>
                            </div>
                            
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setShowModal(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Save Category</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showModal === 'dropdown' && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800">{formData.id ? 'Edit Option' : 'New Option'}</h3>
                            <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveDropdown} className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Dropdown Category</label>
                                <select 
                                    value={formData.category || ''}
                                    onChange={e => setFormData({...formData, category: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="asset_status">Asset Status</option>
                                    <option value="asset_location">Asset Location</option>
                                    <option value="ticket_priority">Ticket Priority</option>
                                    <option value="department">Department</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Internal Value</label>
                                    <input 
                                        type="text" required
                                        value={formData.value || ''}
                                        onChange={e => setFormData({...formData, value: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. In Repair"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Display Label</label>
                                    <input 
                                        type="text" required
                                        value={formData.label || ''}
                                        onChange={e => setFormData({...formData, label: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Sedang Diperbaiki"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <input 
                                    type="checkbox" id="isActiveDrop"
                                    checked={formData.is_active !== false}
                                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                                />
                                <label htmlFor="isActiveDrop" className="text-sm font-medium text-slate-700">Option is Active</label>
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setShowModal(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Save Option</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

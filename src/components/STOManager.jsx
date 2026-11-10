import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Download, Upload, RefreshCw, FileSpreadsheet, Box, Edit2, Database } from 'lucide-react';
import MProductIdempiere from './MProductIdempiere';
import * as XLSX from 'xlsx';

export default function STOManager() {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    const isSuperAdmin = user && ['super_user', 'superuser', 'administrator', 'admin'].includes(user.role?.toLowerCase());
    const userOrg = user?.organization || 'TCF-SG';
    const activeOrg = isSuperAdmin ? (sessionStorage.getItem('organization') || userOrg) : userOrg;
    const isKG = activeOrg === 'TCF-KG';
    const isTechnician = Boolean(
        user && (
            ['technician', 'teknisi'].includes(user.role?.toLowerCase()) ||
            user.role?.toLowerCase()?.includes('technician') ||
            user.role?.toLowerCase()?.includes('teknisi') ||
            user.role?.toLowerCase()?.includes('tech') ||
            (isKG && user.username?.toLowerCase() === 'agung')
        )
    );
    const isKGTechnician = isKG && isTechnician;

    const [assets, setAssets] = useState([]);
    const [manualItems, setManualItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editedItems, setEditedItems] = useState({});
    
    // Tab State
    const [activeTab, setActiveTab] = useState('sto');

    useEffect(() => {
        if (isKGTechnician && activeTab === 'idempiere') {
            setActiveTab('sto');
        }
    }, [isKGTechnician, activeTab]);
    
    // Autocomplete state
    const [productQuery, setProductQuery] = useState('');
    const [productSuggestions, setProductSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);
    
    const [form, setForm] = useState({
        name: '', assetservicedate: '', assetdepreciationdate: '', 
        unit_price: 0, isowned: 'Y', isdepreciated: 'N', description: '',
        m_product_id: '', c_bpartner_id: '', c_bpartner_location_id: '',
        m_locator_id: '', ad_user_id: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch assets and idempiere products in parallel
            const fetchPromises = [fetch(`/api/network/assets?organization=${activeOrg}`)];
            if (!isKGTechnician) {
                fetchPromises.push(fetch('/api/network/idempiere/products?limit=5000'));
            }
            const [assetsRes, idempiereRes] = await Promise.all(fetchPromises);
            
            const data = await assetsRes.json();
            let idempiereProducts = [];
            if (idempiereRes && idempiereRes.ok) {
                idempiereProducts = await idempiereRes.json();
            }
            
            // Map Fixed Assets to STO columns
            if (Array.isArray(data)) {
                const mappedAssets = data.map(asset => {
                    let serviceDate = '';
                    if (asset.purchase_date) {
                        serviceDate = new Date(asset.purchase_date).toISOString().split('T')[0];
                    } else {
                        const invNumber = asset.inventory_number || '';
                        const yearMatch = invNumber.match(/20\d{2}/);
                        
                        if (yearMatch) {
                            serviceDate = `${yearMatch[0]}-01-01`;
                        } else if (asset.last_agent_sync) {
                            serviceDate = new Date(asset.last_agent_sync).toISOString().split('T')[0];
                        }
                    }

                    let descParts = [];
                    let specs = asset.specs;
                    if (typeof specs === 'string') {
                        try { specs = JSON.parse(specs); } catch (e) {}
                    }
                    if (specs && typeof specs === 'object') {
                        if (specs.cpu) descParts.push(specs.cpu);
                        
                        if (specs.ram_gb) {
                            descParts.push(`Ram ${specs.ram_gb}Gb`);
                        } else if (specs.ram) {
                            descParts.push(`Ram ${specs.ram}`);
                        }

                        if (specs.storage_info) {
                            let storage = String(specs.storage_info).replace(/GB/i, 'Gb');
                            if (!storage.toLowerCase().includes('gb') && !storage.toLowerCase().includes('tb')) {
                                storage += 'Gb';
                            }
                            descParts.push(`Storage ${storage}`);
                        }

                        if (specs.type && !specs.cpu) {
                            descParts.push(specs.type);
                        }

                        if (descParts.length === 0 && specs.raw_spec) {
                            descParts.push(specs.raw_spec.replace(/\n/g, ', '));
                        }
                    }
                    
                    let desc = descParts.length > 0 ? `(${descParts.join(', ')})` : '';
                    if (asset.status && asset.status !== 'Active') {
                        desc += desc ? ` (${asset.status})` : asset.status;
                    }
                    if (asset.notes) {
                        desc += desc ? ` - ${asset.notes}` : asset.notes;
                    }
                    if (!desc) {
                        desc = asset.status || 'Active';
                    }

                    let matchedProductCode = '';
                    if (asset.model || asset.name) {
                        const searchStr = (asset.model || asset.name).toLowerCase();
                        // Find a product where the idempiere product_name includes our asset model/name, 
                        // or our asset model/name includes the idempiere product_name
                        const match = idempiereProducts.find(p => 
                            p.product_name && (
                                p.product_name.toLowerCase().includes(searchStr) || 
                                searchStr.includes(p.product_name.toLowerCase())
                            )
                        );
                        if (match) {
                            matchedProductCode = match.product_code || '';
                        }
                    }

                    let assetName = [asset.category, asset.manufacturer, asset.model || asset.name].filter(Boolean).join(' ');

                    return {
                        id: `FA-${asset.id}`,
                        category: asset.category || 'Other',
                        name: assetName,
                        assetservicedate: serviceDate,
                        assetdepreciationdate: serviceDate,
                        unit_price: '',
                        isowned: 'Y',
                        isdepreciated: 'Y',
                        description: desc,
                        m_product_id: matchedProductCode,
                        c_bpartner_id: '',
                        c_bpartner_location_id: '',
                        m_locator_id: '',
                        ad_user_id: '',
                        lokasi_perangkat: asset.user_department || asset.location || '',
                        user_pemegang: asset.user_name || asset.contact || ''
                    };
                });
                setAssets(mappedAssets);
            }
        } catch (err) {
            console.error("Failed to fetch assets for STO", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveManual = (e) => {
        e.preventDefault();
        
        if (isEditing) {
            setEditedItems(prev => ({ ...prev, [editingId]: { ...form, id: editingId } }));
            if (editingId.startsWith('MANUAL-')) {
                setManualItems(prev => prev.map(item => item.id === editingId ? { ...form, id: editingId } : item));
            }
        } else {
            const newItem = { ...form, id: `MANUAL-${Date.now()}` };
            setManualItems(prev => [newItem, ...prev]);
        }
        
        setShowAddModal(false);
        setIsEditing(false);
        setEditingId(null);
        setForm({
            name: '', assetservicedate: '', assetdepreciationdate: '', 
            unit_price: 0, isowned: 'Y', isdepreciated: 'N', description: '',
            m_product_id: '', c_bpartner_id: '', c_bpartner_location_id: '',
            m_locator_id: '', ad_user_id: ''
        });
        setProductQuery('');
    };

    // Close suggestions on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const fetchProductSuggestions = async (query) => {
        if (!query) {
            setProductSuggestions([]);
            return;
        }
        try {
            const res = await fetch(`/api/network/idempiere/products?search=${encodeURIComponent(query)}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setProductSuggestions(data);
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error("Failed to fetch product suggestions", err);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (showAddModal) {
                fetchProductSuggestions(productQuery);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [productQuery, showAddModal]);

    const combinedList = [...manualItems, ...assets].map(item => editedItems[item.id] || item);
    
    const filteredList = combinedList.filter(item => {
        const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (item.m_product_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleExportExcel = () => {
        const sortedList = [...combinedList].sort((a, b) => {
            const catA = (a.category || '').toLowerCase();
            const catB = (b.category || '').toLowerCase();
            if (catA < catB) return -1;
            if (catA > catB) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        const dataToExport = sortedList.map(item => ({
            category: item.category || 'Other',
            name: item.name,
            description: item.description,
            product_code: item.m_product_id,
            assetservicedate: item.assetservicedate,
            assetdepreciationdate: item.assetdepreciationdate,
            a_asset_cost: item.unit_price || 0,
            a_salvage_value: 0,
            qty: 1,
            dept: item.lokasi_perangkat || '',
            user: item.user_pemegang || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "STO Data");
        XLSX.writeFile(wb, "M_Product_Idempiere_Export.xlsx");
    };

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <FileSpreadsheet className="text-blue-600" size={32} />
                        Stock Opname (STO)
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Audit and record physical assets according to standard STO columns.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={fetchData} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all active:scale-95" title="Refresh Data">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm transition-all active:scale-95 hover:bg-slate-50" onClick={() => alert("Import STO data from excel feature is in development.")}>
                        <Upload size={18} /> Import STO
                    </button>
                    <button className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 hover:bg-emerald-700" onClick={handleExportExcel}>
                        <Download size={18} /> Export Excel
                    </button>
                    <button 
                        onClick={() => {
                            setForm({
                                name: '', assetservicedate: '', assetdepreciationdate: '', 
                                unit_price: 0, isowned: 'Y', isdepreciated: 'N', description: '',
                                m_product_id: '', c_bpartner_id: '', c_bpartner_location_id: '',
                                m_locator_id: '', ad_user_id: ''
                            });
                            setIsEditing(false);
                            setEditingId(null);
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 hover:bg-blue-700"
                    >
                        <Plus size={18} /> Add Manual
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('sto')}
                    className={`px-6 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'sto' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <FileSpreadsheet size={18} /> STO Entries
                </button>
                {!isKGTechnician && (
                    <button
                        onClick={() => setActiveTab('idempiere')}
                        className={`px-6 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'idempiere' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <Database size={18} /> M_Product_Idempiere
                    </button>
                )}
            </div>

            {activeTab === 'sto' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50">
                    {/* Category Filter Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {['All', 'Desktop', 'Laptop', 'Printer', 'Monitor', 'Mobile', 'Server', 'CCTV'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap ${
                                    selectedCategory === cat 
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name, product ID, or description..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                        />
                    </div>
                    <div className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        Total Items: {filteredList.length}
                    </div>
                </div>
                </div>
                
                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Action</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Name</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Service Date</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Depreciation Date</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Unit Price</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-center">Is Owned</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-center">Is Depreciated</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Description</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Product ID</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Partner ID</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Partner Location ID</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Locator ID</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">User ID</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Lokasi Perangkat</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">User Pemegang</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={12} className="p-5 text-center text-slate-400 font-bold">Auto-loading Fixed Assets...</td></tr>
                            ) : filteredList.length === 0 ? (
                                <tr><td colSpan={12} className="p-5 text-center text-slate-400 font-bold">No STO data found.</td></tr>
                            ) : (
                                filteredList.map(item => (
                                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.id.startsWith('MANUAL') ? 'bg-blue-50/30' : ''}`}>
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <button 
                                                onClick={() => {
                                                    setForm(item);
                                                    setProductQuery(item.m_product_id || '');
                                                    setEditingId(item.id);
                                                    setIsEditing(true);
                                                    setShowAddModal(true);
                                                }} 
                                                className="p-2 bg-slate-100 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                title="Edit Data"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px] font-bold text-slate-800">{item.name}</td>
                                        <td className="px-3 py-1.5 text-[11px] text-slate-500">{item.assetservicedate || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px] text-slate-500">{item.assetdepreciationdate || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px] font-medium">{item.unit_price}</td>
                                        <td className="px-3 py-1.5 text-[11px] text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${item.isowned === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{item.isowned}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px] text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${item.isdepreciated === 'Y' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'}`}>{item.isdepreciated}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px] text-slate-500 truncate max-w-[150px]" title={item.description}>{item.description || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px] font-mono text-[11px]">{item.m_product_id || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px]">{item.c_bpartner_id || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px]">{item.c_bpartner_location_id || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px]">{item.m_locator_id || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px] font-bold text-slate-700">{item.ad_user_id || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px] font-bold text-slate-700">{item.lokasi_perangkat || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px] font-bold text-slate-700">{item.user_pemegang || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
            
            {!isKGTechnician && activeTab === 'idempiere' && (
                <MProductIdempiere />
            )}

            {/* ADD MANUAL MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                            <h3 className="font-black text-slate-800 flex items-center gap-2 text-xl">
                                <Box className="text-blue-600" size={24} />
                                {isEditing ? 'Edit STO Entry' : 'Add Manual STO Entry'}
                            </h3>
                            <button onClick={() => { setShowAddModal(false); setIsEditing(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg shadow-sm border border-slate-200">✕</button>
                        </div>
                        <form onSubmit={handleSaveManual} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Basic Info */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                                        <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all" />
                                    </div>
                                    <div ref={wrapperRef} className="relative">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product ID (m_product_id)</label>
                                        <input 
                                            type="text" 
                                            value={productQuery} 
                                            onChange={e => {
                                                setProductQuery(e.target.value);
                                                setForm({...form, m_product_id: e.target.value});
                                            }} 
                                            onFocus={() => { if (productSuggestions.length > 0) setShowSuggestions(true); }}
                                            className="w-full border border-slate-200 p-3 rounded-xl font-mono text-sm outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all" 
                                            placeholder="Search Idempiere Products..."
                                        />
                                        {showSuggestions && productSuggestions.length > 0 && (
                                            <ul className="absolute z-50 w-full bg-white mt-1 rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                                                {productSuggestions.map(prod => (
                                                    <li 
                                                        key={prod.m_product_id}
                                                        onClick={() => {
                                                            setForm({...form, m_product_id: prod.m_product_id});
                                                            setProductQuery(prod.m_product_id.toString());
                                                            setShowSuggestions(false);
                                                        }}
                                                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                                    >
                                                        <div className="font-bold text-slate-800 text-sm">{prod.product_name}</div>
                                                        <div className="text-xs font-mono text-blue-600">ID: {prod.m_product_id} | Code: {prod.product_code || '-'}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unit Price</label>
                                        <input type="number" min="0" value={form.unit_price} onChange={e => setForm({...form, unit_price: parseInt(e.target.value) || 0})} className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all" />
                                    </div>
                                </div>
                                
                                {/* Dates & Status */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Service Date</label>
                                        <input type="date" value={form.assetservicedate} onChange={e => setForm({...form, assetservicedate: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-medium outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Depreciation Date</label>
                                        <input type="date" value={form.assetdepreciationdate} onChange={e => setForm({...form, assetdepreciationdate: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-medium outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Is Owned</label>
                                            <select value={form.isowned} onChange={e => setForm({...form, isowned: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all">
                                                <option value="Y">Y (Yes)</option>
                                                <option value="N">N (No)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Is Depreciated</label>
                                            <select value={form.isdepreciated} onChange={e => setForm({...form, isdepreciated: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all">
                                                <option value="N">N (No)</option>
                                                <option value="Y">Y (Yes)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Partners & Location */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Partner ID</label>
                                        <input type="text" value={form.c_bpartner_id} onChange={e => setForm({...form, c_bpartner_id: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-medium outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location ID / Locator</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" placeholder="Location ID" value={form.c_bpartner_location_id} onChange={e => setForm({...form, c_bpartner_location_id: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-medium outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all text-xs" />
                                            <input type="text" placeholder="Locator ID" value={form.m_locator_id} onChange={e => setForm({...form, m_locator_id: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-medium outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all text-xs" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">User ID</label>
                                        <input type="text" value={form.ad_user_id} onChange={e => setForm({...form, ad_user_id: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all" />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-medium outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-all" rows="2"></textarea>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => { setShowAddModal(false); setIsEditing(false); setEditingId(null); }} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                                <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Save Entry</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, QrCode, Edit2, ArrowRightLeft, FileText, X, Check, ClipboardCheck } from 'lucide-react';
import AssetLabel from '../components/AssetLabel';
import { Link, useSearchParams } from 'react-router-dom';

export default function HRDAssets() {
    const [searchParams] = useSearchParams();
    const editIdParam = searchParams.get('edit_id');
    const [assets, setAssets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Create New modal state
    const [showCreate, setShowCreate] = useState(false);
    const [models, setModels] = useState([]);
    const [locations, setLocations] = useState([]);
    const [statusLabels, setStatusLabels] = useState([]);
    const [creating, setCreating] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [newAsset, setNewAsset] = useState({
        asset_tag: '', name: '', model_id: '', serial: '', status_id: '', location_id: '', purchase_cost: '', notes: ''
    });
    
    useEffect(() => {
        fetchAssets();
        fetchMeta();
    }, []);
    
    const fetchAssets = async () => {
        try {
            const res = await fetch('/api/hr/assets');
            const data = await res.json();
            if (data.success) {
                setAssets(data.data);
                // Check if we need to auto-open edit modal
                if (editIdParam) {
                    const assetToEdit = data.data.find(a => a.id.toString() === editIdParam);
                    if (assetToEdit) {
                        setEditMode(true);
                        setEditId(assetToEdit.id);
                        setNewAsset({
                            asset_tag: assetToEdit.asset_tag || '',
                            name: assetToEdit.name || '',
                            model_id: assetToEdit.model_id || '',
                            serial: assetToEdit.serial || '',
                            status_id: assetToEdit.status_id || '',
                            location_id: assetToEdit.location_id || '',
                            purchase_cost: assetToEdit.purchase_cost || '',
                            notes: assetToEdit.notes || ''
                        });
                        setShowCreate(true);
                    }
                }
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchMeta = async () => {
        try {
            const [modRes, slRes] = await Promise.all([
                fetch('/api/hr/models'),
                fetch('/api/network/global/dropdowns'),
            ]);
            const [modData, slData] = await Promise.all([modRes.json(), slRes.json()]);
            if (modData.success) setModels(modData.data);
            if (slData) {
                setLocations(slData.filter(d => d.category === 'asset_location' && d.is_active));
                setStatusLabels(slData.filter(d => d.category === 'asset_status' && d.is_active));
            }
        } catch (err) {
            console.error('Failed to fetch meta', err);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!newAsset.asset_tag.trim()) { alert('Asset Tag wajib diisi'); return; }
        setCreating(true);
        try {
            const method = editMode ? 'PUT' : 'POST';
            const url = editMode ? `/api/hr/assets/${editId}` : '/api/hr/assets';
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newAsset,
                    model_id: newAsset.model_id || null,
                    status_id: newAsset.status_id || null,
                    location_id: newAsset.location_id || null,
                    purchase_cost: newAsset.purchase_cost ? Number(newAsset.purchase_cost) : null,
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowCreate(false);
                setEditMode(false);
                setEditId(null);
                setNewAsset({ asset_tag: '', name: '', model_id: '', serial: '', status_id: '', location_id: '', purchase_cost: '', notes: '' });
                await fetchAssets();
            } else {
                alert(data.error || (editMode ? 'Gagal mengubah aset' : 'Gagal membuat aset baru'));
            }
        } finally {
            setCreating(false);
        }
    };
    
    const filteredAssets = assets.filter(a => 
        (a.asset_tag && a.asset_tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.model_name && a.model_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.category_name && a.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredAssets.length / rowsPerPage);
    const currentAssets = filteredAssets.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const getStatusBadge = (status_name, status_type, status_color) => {
        // Snipe-IT typically uses: Deployable, Pending, Archived, Undeployable
        let colorClass = 'bg-slate-100 text-slate-600';
        if (status_type === 'deployable') colorClass = 'bg-blue-50 text-blue-600';
        if (status_type === 'pending') colorClass = 'bg-amber-50 text-amber-600';
        if (status_type === 'archived') colorClass = 'bg-slate-100 text-slate-500';
        if (status_type === 'undeployable') colorClass = 'bg-rose-50 text-rose-600';
        
        return (
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>
                <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5" style={{backgroundColor: status_color || 'currentColor'}}></span>
                {status_name || 'Ready to Deploy'}
            </span>
        );
    };

    return (
        <div className="space-y-3 pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Assets</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">HRGA Asset Management</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors">
                        Custom Export
                    </button>
                    <button
                        onClick={() => {
                            setEditMode(false);
                            setEditId(null);
                            setNewAsset({ asset_tag: '', name: '', model_id: '', serial: '', status_id: '', location_id: '', purchase_cost: '', notes: '' });
                            setShowCreate(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        <Plus size={16} /> Create New
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none">
                            <option>Bulk Actions</option>
                            <option>Edit</option>
                            <option>Delete</option>
                        </select>
                        <button className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-bold text-slate-700 transition-colors">Go</button>
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64 bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-sm font-semibold outline-none focus:border-blue-600" 
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>

                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-100">
                                <th className="px-3 py-1.5 text-[10px] uppercase"><input type="checkbox" className="rounded border-slate-300" /></th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-500 uppercase tracking-wider">Asset Name</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Device Image</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-blue-600">Asset Tag <span className="text-[10px]">▲</span></th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Serial</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-500 uppercase tracking-wider">Model</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-500 uppercase tracking-wider hidden lg:table-cell">Category</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-500 uppercase tracking-wider hidden lg:table-cell">Checked Out To</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="11" className="p-5 text-center text-slate-400 font-bold">Loading assets...</td></tr>
                            ) : currentAssets.length === 0 ? (
                                <tr><td colSpan="11" className="p-5 text-center text-slate-400 font-bold">No assets found.</td></tr>
                            ) : currentAssets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-3 py-1.5 text-[11px]"><input type="checkbox" className="rounded border-slate-300" /></td>
                                    <td className="px-3 py-1.5 text-[11px] whitespace-normal min-w-[120px]">
                                        <Link to={`/hrd/assets/${asset.id}`} className="font-bold text-blue-600 hover:underline">{asset.name || asset.model_name}</Link>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] hidden md:table-cell">
                                        <div className="w-8 h-8 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden">
                                            {asset.image ? <img src={asset.image} alt="" className="w-full h-full object-cover" /> : <Package size={14} className="text-slate-400" />}
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-700 whitespace-nowrap">{asset.asset_tag}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-[11px] text-slate-500 hidden md:table-cell">{asset.serial || '-'}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-[11px] text-slate-600">{asset.model_name}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-[11px] text-slate-600 hidden lg:table-cell">{asset.category_name}</td>
                                    <td className="px-3 py-1.5 text-[11px] whitespace-nowrap">
                                        {getStatusBadge(asset.status_name, asset.status_type, asset.status_color)}
                                        {asset.assigned_to && <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase border border-slate-200 hidden sm:inline-block">Deployed</span>}
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] hidden lg:table-cell">
                                        {asset.assigned_to ? (
                                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 whitespace-nowrap">
                                                <span className="w-4 h-4 bg-purple-100 text-purple-600 rounded flex items-center justify-center text-[8px]">📍</span>
                                                {asset.assigned_to_name || 'Store Room'}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-[11px] text-slate-600 hidden lg:table-cell">{asset.location_name || asset.default_location_name || '-'}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link to={`/hrd/maintenance?tab=inspect&category=${asset.category_name}&asset_id=${asset.id}`} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Eksekusi Inspeksi"><ClipboardCheck size={14} /></Link>
                                            <button 
                                                onClick={() => {
                                                    setEditMode(true);
                                                    setEditId(asset.id);
                                                    setNewAsset({
                                                        asset_tag: asset.asset_tag || '',
                                                        name: asset.name || '',
                                                        model_id: asset.model_id || '',
                                                        serial: asset.serial || '',
                                                        status_id: asset.status_id || '',
                                                        location_id: asset.location_id || '',
                                                        purchase_cost: asset.purchase_cost || '',
                                                        notes: asset.notes || ''
                                                    });
                                                    setShowCreate(true);
                                                }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Clone"><FileText size={14} /></button>
                                            {asset.assigned_to ? (
                                                <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Checkin"><ArrowRightLeft size={14} /></button>
                                            ) : (
                                                <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Checkout"><ArrowRightLeft size={14} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500">
                        Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredAssets.length)} to {Math.min(currentPage * rowsPerPage, filteredAssets.length)} of {filteredAssets.length} rows
                    </span>
                    <div className="flex items-center gap-2">
                        <select 
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={500}>500</option>
                        </select>
                        <span className="text-sm text-slate-500 mx-2">rows per page</span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold"
                            >
                                Previous
                            </button>
                            <button className="px-3 py-1 bg-blue-600 border border-blue-600 text-white rounded-lg text-sm font-bold">
                                {currentPage}
                            </button>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Create New Asset Modal ── */}
            {showCreate && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-900 text-base">{editMode ? 'Edit Aset' : 'Tambah Aset Baru'}</h2>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{editMode ? 'Ubah informasi dasar aset HRGA' : 'Isi informasi dasar aset HRGA'}</p>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="p-4 grid grid-cols-2 gap-4">
                            {/* Asset Tag */}
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Asset Tag <span className="text-red-500">*</span></label>
                                <input
                                    required type="text"
                                    value={newAsset.asset_tag}
                                    onChange={e => setNewAsset({ ...newAsset, asset_tag: e.target.value })}
                                    placeholder="cth. TCFSG-GA-PK-00001"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            {/* Name */}
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Aset (opsional)</label>
                                <input
                                    type="text"
                                    value={newAsset.name}
                                    onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                                    placeholder="cth. APAR Gedung A Lantai 2"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            {/* Model */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Model / Tipe</label>
                                <select
                                    value={newAsset.model_id}
                                    onChange={e => setNewAsset({ ...newAsset, model_id: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                                >
                                    <option value="">-- Pilih Model --</option>
                                    {models.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.category_name})</option>
                                    ))}
                                </select>
                            </div>
                            {/* Serial */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Serial Number</label>
                                <input
                                    type="text"
                                    value={newAsset.serial}
                                    onChange={e => setNewAsset({ ...newAsset, serial: e.target.value })}
                                    placeholder="cth. SN123456"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            {/* Location */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Lokasi Penempatan</label>
                                <select
                                    value={newAsset.location_id}
                                    onChange={e => setNewAsset({ ...newAsset, location_id: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                                >
                                    <option value="">-- Pilih Lokasi --</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.value}>{l.label}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Status */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                                <select
                                    value={newAsset.status_id}
                                    onChange={e => setNewAsset({ ...newAsset, status_id: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                                >
                                    <option value="">-- Pilih Status --</option>
                                    {statusLabels.map(s => (
                                        <option key={s.id} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Purchase Cost */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Harga Beli (Rp)</label>
                                <input
                                    type="number"
                                    value={newAsset.purchase_cost}
                                    onChange={e => setNewAsset({ ...newAsset, purchase_cost: e.target.value })}
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            {/* Notes */}
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Catatan</label>
                                <textarea
                                    rows={2}
                                    value={newAsset.notes}
                                    onChange={e => setNewAsset({ ...newAsset, notes: e.target.value })}
                                    placeholder="Informasi tambahan..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                                />
                            </div>
                            {/* Actions */}
                            <div className="col-span-2 flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Check size={15} />
                                    {creating ? 'Menyimpan...' : 'Simpan Aset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

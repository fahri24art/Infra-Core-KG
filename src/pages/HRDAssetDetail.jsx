import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Edit, Package, Printer, Trash2, ArrowLeft, ArrowRightLeft,
    FileText, CheckCircle, ClipboardList, XCircle, Calendar, User, X, Check
} from 'lucide-react';
import AssetLabel from '../components/AssetLabel';

export default function HRDAssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('tab_HRDAssetDetail') || 'info');

    useEffect(() => {
        localStorage.setItem('tab_HRDAssetDetail', activeTab);
    }, [activeTab]);

    // Maintenance history state
    const [checksheets, setChecksheets] = useState([]);
    const [csLoading, setCsLoading] = useState(false);

    useEffect(() => {
        fetchAssetDetails();
        fetchMeta();
    }, [id]);

    const [models, setModels] = useState([]);
    const [locations, setLocations] = useState([]);
    const [statusLabels, setStatusLabels] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [editForm, setEditForm] = useState({
        asset_tag: '', name: '', model_id: '', serial: '', status_id: '', location_id: '', purchase_cost: '', notes: ''
    });

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

    // Fetch checksheets when tab opens
    useEffect(() => {
        if (activeTab === 'maintenances' && id) {
            fetchChecksheets();
        }
    }, [activeTab, id]);

    const fetchAssetDetails = async () => {
        try {
            const res = await fetch('/api/hr/assets');
            const data = await res.json();
            if (data.success) {
                const found = data.data.find(a => a.id.toString() === id);
                setAsset(found);
                if (found) {
                    setEditForm({
                        asset_tag: found.asset_tag || '',
                        name: found.name || '',
                        model_id: found.model_id || '',
                        serial: found.serial || '',
                        status_id: found.status_id || '',
                        location_id: found.location_id || '',
                        purchase_cost: found.purchase_cost || '',
                        notes: found.notes || ''
                    });
                }
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const res = await fetch(`/api/hr/assets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editForm,
                    model_id: editForm.model_id || null,
                    status_id: editForm.status_id || null,
                    location_id: editForm.location_id || null,
                    purchase_cost: editForm.purchase_cost ? Number(editForm.purchase_cost) : null,
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowEditModal(false);
                fetchAssetDetails(); // Refresh data
            } else {
                alert(data.error || 'Gagal mengubah aset');
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat menyimpan aset');
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Yakin ingin menghapus aset ini? Data tidak dapat dikembalikan.')) return;
        try {
            const res = await fetch(`/api/hr/assets/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                navigate('/hrd/assets');
            } else {
                alert(data.error || 'Gagal menghapus aset');
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan sistem');
        }
    };

    const fetchChecksheets = async () => {
        setCsLoading(true);
        try {
            const res = await fetch(`/api/hr/assets/${id}/checksheets`);
            const data = await res.json();
            if (data.success) setChecksheets(data.data);
        } catch (err) {
            console.error('Failed to fetch checksheets', err);
        } finally {
            setCsLoading(false);
        }
    };

    if (loading) return <div className="p-5 text-slate-500 font-bold">Loading...</div>;
    if (!asset) return <div className="p-5 text-rose-500 font-bold">Asset not found</div>;

    const tabs = [
        { id: 'info', label: 'Info' },
        { id: 'maintenances', label: 'Riwayat Inspeksi' },
        { id: 'history', label: 'History' },
        { id: 'files', label: 'Files' },
    ];

    return (
        <div className="space-y-3 pb-24">
            <div className="flex items-center gap-4">
                <Link to="/hrd/assets" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
                    <ArrowLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        View Asset {asset.asset_tag}
                    </h1>
                    <p className="text-sm text-slate-400 font-medium">{asset.name || asset.model_name} · {asset.category_name}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 sm:flex sm:flex-nowrap gap-x-6 gap-y-2 border-b border-slate-200 px-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 text-[11px] font-black uppercase tracking-widest transition-colors border-b-2 text-center ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Main Content */}
                <div className="lg:col-span-3 space-y-3">

                    {/* ── INFO TAB ── */}
                    {activeTab === 'info' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    {[
                                        ['Asset Tag', asset.asset_tag],
                                        ['Status', <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.status_color || '#94a3b8' }} />{asset.status_name || 'Deployed'}{asset.assigned_to_name && <span className="ml-1 text-xs text-slate-400">→ {asset.assigned_to_name}</span>}</span>],
                                        ['Company', 'HRGA Tri Centrum Fortuna'],
                                        ['Asset Name', asset.name || asset.model_name],
                                        ['Category', asset.category_name],
                                        ['Model', asset.model_name],
                                        ['Serial', asset.serial || '-'],
                                        ['Location', asset.location_name || '-'],
                                        ['Default Location', asset.default_location_name || '-'],
                                        ['Purchase Date', asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('id-ID') : '-'],
                                        ['Purchase Cost', asset.purchase_cost ? `Rp ${parseFloat(asset.purchase_cost).toLocaleString('id-ID')}` : '-'],
                                        ['Notes', asset.notes || '-'],
                                        ['Created At', new Date(asset.created_at).toLocaleString('id-ID')],
                                    ].map(([label, value], i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 w-1/3 text-[10px]">{label}</th>
                                            <td className="px-3 py-1.5 text-[11px] text-slate-600 font-semibold">{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── RIWAYAT INSPEKSI TAB ── */}
                    {activeTab === 'maintenances' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ClipboardList size={18} className="text-blue-600" />
                                    <h2 className="font-black text-slate-800">Riwayat Inspeksi / Checksheet</h2>
                                </div>
                                <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                                    {checksheets.length} records
                                </span>
                            </div>

                            {csLoading ? (
                                <div className="p-5 text-center text-slate-400 font-bold">Memuat riwayat inspeksi...</div>
                            ) : checksheets.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <ClipboardList size={24} className="text-slate-400" />
                                    </div>
                                    <p className="font-black text-slate-500 text-base">Belum Ada Riwayat Inspeksi</p>
                                    <p className="text-slate-400 text-sm mt-1 font-medium">Aset ini belum pernah dilakukan checksheet.</p>
                                    <Link
                                        to="/hrd/maintenance"
                                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                                    >
                                        <ClipboardList size={14} /> Buat Checksheet Sekarang
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {checksheets.map((cs, i) => {
                                        const checkData = typeof cs.check_data === 'string'
                                            ? (() => { try { return JSON.parse(cs.check_data); } catch { return {}; } })()
                                            : (cs.check_data || {});
                                        const checkItems = Object.entries(checkData);

                                        return (
                                            <div key={cs.id || i} className="p-5 hover:bg-slate-50/50 transition-colors">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cs.is_passed ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                                            {cs.is_passed
                                                                ? <CheckCircle size={18} className="text-emerald-500" />
                                                                : <XCircle size={18} className="text-rose-500" />}
                                                        </div>
                                                        <div>
                                                            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${cs.is_passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                {cs.is_passed ? '✓ Normal / OK' : '✗ Perlu Perhatian'}
                                                            </span>
                                                            <p className="text-xs text-slate-400 font-medium mt-1">
                                                                Kategori: <span className="font-bold text-slate-600">{cs.category || '-'}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-xs text-slate-400 font-semibold space-y-1">
                                                        <div className="flex items-center gap-1.5 justify-end">
                                                            <Calendar size={11} />
                                                            {cs.check_date ? new Date(cs.check_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 justify-end">
                                                            <User size={11} />
                                                            {cs.inspector_name || 'Unknown'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Check Items */}
                                                {checkItems.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {checkItems.map(([key, val]) => (
                                                            <span
                                                                key={key}
                                                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${val ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}
                                                            >
                                                                {val ? '✓' : '✗'} {key.replace(/_/g, ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                {cs.notes && (
                                                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-0.5">Catatan Inspektur</p>
                                                        <p className="text-sm text-amber-800 font-medium">{cs.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── OTHER TABS PLACEHOLDER ── */}
                    {(activeTab === 'history' || activeTab === 'files') && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center text-slate-400 font-bold">
                            <Package size={32} className="mx-auto mb-3 opacity-30" />
                            Belum ada data {activeTab} untuk aset ini.
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-3">
                    <button 
                        onClick={() => setShowEditModal(true)}
                        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-sm font-bold transition-colors"
                    >
                        <Edit size={16} /> Edit Asset
                    </button>
                    {asset.assigned_to ? (
                        <button onClick={() => alert('Fitur Checkin akan segera hadir! (Terintegrasi dengan User Management)')} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
                            <ArrowRightLeft size={16} /> Checkin Asset
                        </button>
                    ) : (
                        <button onClick={() => alert('Fitur Checkout akan segera hadir! (Terintegrasi dengan User Management)')} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
                            <ArrowRightLeft size={16} /> Checkout Asset
                        </button>
                    )}
                    <Link
                        to={`/hrd/maintenance?tab=inspect&category=${asset.category_name}&asset_id=${asset.id}`}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors"
                    >
                        <ClipboardList size={16} /> Buat Checksheet
                    </Link>
                    <button onClick={() => alert('Fitur Audit / Stock Opname sedang dalam pengembangan tim IT.')} className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
                        <CheckCircle size={16} /> Audit
                    </button>
                    <button onClick={() => alert('Fitur Duplikasi Aset (Clone) sedang dalam pengembangan.')} className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
                        <FileText size={16} /> Clone Asset
                    </button>
                    <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors mt-4">
                        <Trash2 size={16} /> Delete Asset
                    </button>

                    {/* QR Code */}
                    <div className="mt-6 pt-5 border-t border-slate-200">
                        {asset.assigned_to && (
                            <div className="mb-4">
                                <h4 className="text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">Checked Out To</h4>
                                <p className="text-sm font-semibold text-slate-600 flex items-center gap-2">📍 {asset.assigned_to_name}</p>
                                <p className="text-[11px] font-bold text-slate-400 mt-1">
                                    {new Date(asset.updated_at).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                        )}
                        <div className="bg-white border border-slate-200 p-2 rounded-xl inline-block">
                            <AssetLabel asset={{
                                name: asset.name || asset.model_name,
                                inventory_number: asset.asset_tag,
                                category: asset.category_name,
                                brand: 'TCF',
                                model: asset.model_name,
                                uuid: asset.asset_tag,
                                id: asset.id
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-900 text-base">Edit Aset</h2>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">Ubah informasi aset HRGA</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-4 grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Asset Tag <span className="text-red-500">*</span></label>
                                <input
                                    required type="text"
                                    value={editForm.asset_tag}
                                    onChange={e => setEditForm({ ...editForm, asset_tag: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Aset (opsional)</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Model / Tipe</label>
                                <select
                                    value={editForm.model_id}
                                    onChange={e => setEditForm({ ...editForm, model_id: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                                >
                                    <option value="">-- Pilih Model --</option>
                                    {models.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.category_name})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Serial Number</label>
                                <input
                                    type="text"
                                    value={editForm.serial}
                                    onChange={e => setEditForm({ ...editForm, serial: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Lokasi Penempatan</label>
                                <select
                                    value={editForm.location_id}
                                    onChange={e => setEditForm({ ...editForm, location_id: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                                >
                                    <option value="">-- Pilih Lokasi --</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.value}>{l.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                                <select
                                    value={editForm.status_id}
                                    onChange={e => setEditForm({ ...editForm, status_id: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                                >
                                    <option value="">-- Pilih Status --</option>
                                    {statusLabels.map(s => (
                                        <option key={s.id} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Harga Beli (Rp)</label>
                                <input
                                    type="number"
                                    value={editForm.purchase_cost}
                                    onChange={e => setEditForm({ ...editForm, purchase_cost: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Catatan</label>
                                <textarea
                                    rows={2}
                                    value={editForm.notes}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                                />
                            </div>
                            <div className="col-span-2 flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Check size={15} />
                                    {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

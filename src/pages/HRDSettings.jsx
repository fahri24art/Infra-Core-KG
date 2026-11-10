import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    MapPin, Building2, Layers, Users, Plus, Pencil, Trash2, X, Check, Search, ChevronRight, Settings, Phone, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import QRCode from 'qrcode';

// ────────────────────────────────────────────────────────────
// Reusable Table + CRUD Panel
// ────────────────────────────────────────────────────────────
function CrudPanel({ title, icon: Icon, color, items, loading, fields, onAdd, onEdit, onDelete }) {
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700', ring: 'focus:ring-blue-500/20 focus:border-blue-500', badge: 'bg-blue-100 text-blue-700' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', ring: 'focus:ring-emerald-500/20 focus:border-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
        violet: { bg: 'bg-violet-50', text: 'text-violet-600', btn: 'bg-violet-600 hover:bg-violet-700', ring: 'focus:ring-violet-500/20 focus:border-violet-500', badge: 'bg-violet-100 text-violet-700' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700', ring: 'focus:ring-amber-500/20 focus:border-amber-500', badge: 'bg-amber-100 text-amber-700' },
    };
    const c = colorMap[color] || colorMap.blue;

    const openAdd = () => {
        setEditItem(null);
        const def = {};
        fields.forEach(f => def[f.key] = '');
        setForm(def);
        setShowModal(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        const pre = {};
        fields.forEach(f => pre[f.key] = item[f.key] || '');
        setForm(pre);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editItem) await onEdit(editItem.id, form);
            else await onAdd(form);
            setShowModal(false);
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = items.filter(item =>
        fields.some(f => String(item[f.key] || '').toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                        <Icon size={18} className={c.text} />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-900 text-sm">{title}</h2>
                        <p className="text-xs text-slate-400 font-medium">{items.length} records</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 w-40"
                        />
                    </div>
                    <button
                        onClick={openAdd}
                        className={`flex items-center gap-1.5 px-3 py-1.5 ${c.btn} text-white rounded-lg text-xs font-bold shadow-sm transition-colors`}
                    >
                        <Plus size={13} /> Tambah
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest">
                        <tr>
                            {fields.map(f => (
                                <th key={f.key} className="px-3 py-1.5.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">{f.label}</th>
                            ))}
                            <th className="px-3 py-1.5.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={fields.length + 1} className="p-4 text-center text-slate-400 text-[11px] font-bold">Memuat data...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={fields.length + 1} className="p-4 text-center text-slate-300 text-[11px] font-bold">Belum ada data</td></tr>
                        ) : filtered.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                                {fields.map(f => (
                                    <td key={f.key} className="px-3 py-1.5 text-[11px] text-slate-700 font-medium">
                                        {f.badge ? (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.badge}`}>{item[f.key]}</span>
                                        ) : (item[f.key] || '-')}
                                    </td>
                                ))}
                                <td className="px-3 py-1.5 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Pencil size={13} />
                                        </button>
                                        <button onClick={() => onDelete(item.id, item[fields[0].key])} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-black text-slate-800 text-sm">{editItem ? `Edit ${title}` : `Tambah ${title}`}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-3">
                            {fields.map(f => (
                                <div key={f.key}>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                                    {f.type === 'textarea' ? (
                                        <textarea
                                            required={f.required}
                                            value={form[f.key] || ''}
                                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                            rows={3}
                                            className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 ${c.ring} transition-all resize-none`}
                                            placeholder={f.placeholder || ''}
                                        />
                                    ) : f.type === 'select' ? (
                                        <select
                                            value={form[f.key] || ''}
                                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                            className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 ${c.ring} transition-all`}
                                        >
                                            <option value="">-- Pilih --</option>
                                            {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            required={f.required}
                                            type={f.type || 'text'}
                                            value={form[f.key] || ''}
                                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                            className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 ${c.ring} transition-all`}
                                            placeholder={f.placeholder || ''}
                                        />
                                    )}
                                </div>
                            ))}
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full py-3 ${c.btn} text-white font-black rounded-xl shadow-sm transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2`}
                            >
                                {submitting ? 'Menyimpan...' : <><Check size={15} /> {editItem ? 'Simpan Perubahan' : 'Tambah Data'}</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────
export default function HRDSettings() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'locations';
    const setActiveTab = (tabId) => setSearchParams({ tab: tabId });

    // Locations
    const [locations, setLocations] = useState([]);
    const [locLoading, setLocLoading] = useState(true);

    // Departments
    const [departments, setDepartments] = useState([]);
    const [deptLoading, setDeptLoading] = useState(true);

    // Divisions
    const [divisions, setDivisions] = useState([]);
    const [divLoading, setDivLoading] = useState(true);

    // Users
    const [users, setUsers] = useState([]);
    const [userLoading, setUserLoading] = useState(true);

    // WA Bot Status
    const [waStatus, setWaStatus] = useState({ status: 'OFFLINE', qr: null });
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);

    // ── Fetch all ──────────────────────────────────────────
    const fetchLocations = async () => {
        setLocLoading(true);
        try {
            const r = await fetch('/api/hr/locations');
            const d = await r.json();
            if (d.success) setLocations(d.data);
        } finally { setLocLoading(false); }
    };

    const fetchDepartments = async () => {
        setDeptLoading(true);
        try {
            const r = await fetch('/api/network/departments');
            const d = await r.json();
            setDepartments(Array.isArray(d) ? d : []);
        } finally { setDeptLoading(false); }
    };

    const fetchDivisions = async () => {
        setDivLoading(true);
        try {
            const r = await fetch('/api/network/divisions');
            const d = await r.json();
            setDivisions(Array.isArray(d) ? d : []);
        } finally { setDivLoading(false); }
    };

    const fetchUsers = async () => {
        setUserLoading(true);
        try {
            const r = await fetch('/api/network/users');
            const d = await r.json();
            setUsers(Array.isArray(d) ? d : []);
        } finally { setUserLoading(false); }
    };

    useEffect(() => {
        fetchLocations();
        fetchDepartments();
        fetchDivisions();
        fetchUsers();
    }, []);

    // ── WhatsApp Bot Polling ────────────────────────────────
    useEffect(() => {
        let interval;
        if (activeTab === 'wabot') {
            const fetchWaStatus = async () => {
                try {
                    const res = await fetch('/api/hrga/bot/wa-status');
                    const data = await res.json();
                    setWaStatus(data);
                } catch (err) {
                    console.error("WA Status Error", err);
                }
            };
            fetchWaStatus();
            interval = setInterval(fetchWaStatus, 5000);
        }
        return () => clearInterval(interval);
    }, [activeTab]);

    useEffect(() => {
        if (waStatus.qr) {
            QRCode.toDataURL(waStatus.qr, { width: 160, margin: 2 }, (err, url) => {
                if (!err) setQrCodeDataUrl(url);
            });
        } else {
            setQrCodeDataUrl(null);
        }
    }, [waStatus.qr]);

    // ── Location CRUD ──────────────────────────────────────
    const handleAddLocation = async (form) => {
        const r = await fetch('/api/hr/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (r.ok) { await fetchLocations(); }
        else { const d = await r.json(); alert(d.error || 'Gagal menambahkan'); }
    };
    const handleEditLocation = async (id, form) => {
        const r = await fetch(`/api/hr/locations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (r.ok) await fetchLocations();
        else alert('Gagal menyimpan');
    };
    const handleDeleteLocation = async (id, name) => {
        if (!window.confirm(`Hapus lokasi "${name}"?`)) return;
        await fetch(`/api/hr/locations/${id}`, { method: 'DELETE' });
        await fetchLocations();
    };

    // ── Department CRUD ────────────────────────────────────
    const handleAddDept = async (form) => {
        const r = await fetch('/api/network/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (r.ok) await fetchDepartments();
        else { const d = await r.json(); alert(d.error || 'Gagal menambahkan'); }
    };
    const handleEditDept = async (id, form) => {
        const r = await fetch(`/api/network/departments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (r.ok) await fetchDepartments();
        else alert('Gagal menyimpan');
    };
    const handleDeleteDept = async (id, name) => {
        if (!window.confirm(`Hapus departemen "${name}"?`)) return;
        await fetch(`/api/network/departments/${id}`, { method: 'DELETE' });
        await fetchDepartments();
    };

    // ── Division CRUD ──────────────────────────────────────
    const handleAddDiv = async (form) => {
        const r = await fetch('/api/network/divisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (r.ok) await fetchDivisions();
        else { const d = await r.json(); alert(d.error || 'Gagal menambahkan'); }
    };
    const handleEditDiv = async (id, form) => {
        const r = await fetch(`/api/network/divisions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (r.ok) await fetchDivisions();
        else alert('Gagal menyimpan');
    };
    const handleDeleteDiv = async (id, name) => {
        if (!window.confirm(`Hapus divisi "${name}"?`)) return;
        await fetch(`/api/network/divisions/${id}`, { method: 'DELETE' });
        await fetchDivisions();
    };

    // ── User CRUD ──────────────────────────────────────────
    const handleAddUser = async (form) => {
        const r = await fetch('/api/network/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (r.ok) await fetchUsers();
        else { const d = await r.json(); alert(d.error || 'Gagal menambahkan'); }
    };
    const handleEditUser = async (id, form) => {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        const r = await fetch(`/api/network/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (r.ok) await fetchUsers();
        else alert('Gagal menyimpan');
    };
    const handleDeleteUser = async (id, name) => {
        if (!window.confirm(`Hapus user "${name}"?`)) return;
        await fetch(`/api/network/users/${id}`, { method: 'DELETE' });
        await fetchUsers();
    };

    const tabs = [
        { id: 'locations', label: 'Lokasi', icon: MapPin, color: 'blue', count: locations.length },
        { id: 'departments', label: 'Departemen', icon: Building2, color: 'emerald', count: departments.length },
        { id: 'divisions', label: 'Divisi', icon: Layers, color: 'violet', count: divisions.length },
        { id: 'users', label: 'Karyawan / User', icon: Users, color: 'amber', count: users.length },
        { id: 'wabot', label: 'WA Bot', icon: Phone, color: 'emerald', count: waStatus.status === 'CONNECTED' ? 'ON' : 'OFF' },
    ];

    return (
        <div className="space-y-3 pb-24">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master Data Configuration</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Kelola data referensi utama sistem HRGA</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Settings size={20} className="text-slate-500" />
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tabs.map(t => {
                    const colorBg = { blue: 'bg-blue-50', emerald: 'bg-emerald-50', violet: 'bg-violet-50', amber: 'bg-amber-50' };
                    const colorText = { blue: 'text-blue-600', emerald: 'text-emerald-600', violet: 'text-violet-600', amber: 'text-amber-600' };
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${activeTab === t.id ? 'border-blue-500 shadow-md shadow-blue-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl ${colorBg[t.color]} flex items-center justify-center shrink-0`}>
                                <t.icon size={18} className={colorText[t.color]} />
                            </div>
                            <div className="text-left">
                                <p className="text-xl font-black text-slate-900 leading-none">{t.count}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{t.label}</p>
                            </div>
                            <ChevronRight size={14} className={`ml-auto ${activeTab === t.id ? 'text-blue-500' : 'text-slate-300'}`} />
                        </button>
                    );
                })}
            </div>

            {/* Tab Nav */}
            <div className="grid grid-cols-2 sm:flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit animate-slide-up">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <t.icon size={13} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Active Panel */}
            {activeTab === 'locations' && (
                <CrudPanel
                    title="Lokasi & Area"
                    icon={MapPin}
                    color="blue"
                    items={locations}
                    loading={locLoading}
                    fields={[
                        { key: 'name', label: 'Nama Lokasi', required: true, placeholder: 'cth. Gedung A - Lantai 2' },
                    ]}
                    onAdd={handleAddLocation}
                    onEdit={handleEditLocation}
                    onDelete={handleDeleteLocation}
                />
            )}

            {activeTab === 'departments' && (
                <CrudPanel
                    title="Departemen"
                    icon={Building2}
                    color="emerald"
                    items={departments}
                    loading={deptLoading}
                    fields={[
                        { key: 'name', label: 'Nama Departemen', required: true, placeholder: 'cth. Human Resources & GA' },
                        { key: 'description', label: 'Deskripsi', type: 'textarea', placeholder: 'Deskripsi departemen (opsional)' },
                    ]}
                    onAdd={handleAddDept}
                    onEdit={handleEditDept}
                    onDelete={handleDeleteDept}
                />
            )}

            {activeTab === 'divisions' && (
                <CrudPanel
                    title="Divisi"
                    icon={Layers}
                    color="violet"
                    items={divisions}
                    loading={divLoading}
                    fields={[
                        { key: 'name', label: 'Nama Divisi', required: true, placeholder: 'cth. Divisi Kearsipan' },
                        { key: 'description', label: 'Deskripsi', type: 'textarea', placeholder: 'Deskripsi divisi (opsional)' },
                    ]}
                    onAdd={handleAddDiv}
                    onEdit={handleEditDiv}
                    onDelete={handleDeleteDiv}
                />
            )}

            {activeTab === 'users' && (
                <CrudPanel
                    title="Karyawan / User Sistem"
                    icon={Users}
                    color="amber"
                    items={users}
                    loading={userLoading}
                    fields={[
                        { key: 'name', label: 'Nama Lengkap', required: true, placeholder: 'cth. Budi Santoso' },
                        { key: 'email', label: 'Email', required: true, type: 'email', placeholder: 'user@tricentrumfortuna.com' },
                        { key: 'password', label: 'Password (kosongkan jika tidak diubah)', type: 'password', placeholder: '••••••••' },
                        {
                            key: 'role', label: 'Role Akses', type: 'select',
                            options: [
                                { value: 'user', label: 'User Biasa' },
                                { value: 'hrd', label: 'HRD / GA' },
                                { value: 'machine', label: 'Machine Operator' },
                                { value: 'admin', label: 'Administrator' },
                            ]
                        },
                        { key: 'department', label: 'Departemen', placeholder: 'cth. HRGA' },
                    ]}
                    onAdd={handleAddUser}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                />
            )}

            {activeTab === 'wabot' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="font-black text-slate-900 text-lg">WhatsApp Bot HRGA</h2>
                            <p className="text-xs font-semibold text-slate-400 mt-1">Konfigurasi sesi WhatsApp untuk Helpdesk HRGA</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Koneksi</h3>
                                <div className={`p-4 rounded-xl border font-black text-[10px] uppercase tracking-widest text-center transition-all ${
                                    waStatus.status === 'CONNECTED' 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' 
                                    : waStatus.status === 'WAITING_QR'
                                    ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse'
                                    : waStatus.status === 'RECONNECTING'
                                    ? 'bg-sky-50 text-sky-600 border-sky-100 animate-pulse'
                                    : waStatus.status === 'LOGGED_OUT'
                                    ? 'bg-slate-50 text-slate-600 border-slate-100'
                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                    Status: {waStatus.status}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kontrol Sesi</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await fetch('/api/hrga/bot/restart', { method: 'POST' });
                                            } catch (err) {
                                                console.error('Error restarting WhatsApp bot:', err);
                                            }
                                        }}
                                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-sm transition-all active:scale-95 text-xs text-center flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={14} /> Restart Bot
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm("Apakah Anda yakin ingin mereset sesi WhatsApp? Anda harus men-scan ulang QR Code.")) {
                                                try {
                                                    await fetch('/api/hrga/bot/reset', { method: 'POST' });
                                                } catch (err) {
                                                    console.error('Error resetting WhatsApp bot:', err);
                                                }
                                            }
                                        }}
                                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-sm transition-all active:scale-95 text-xs text-center"
                                    >
                                        Reset Session
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* QR Code Display Area */}
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 flex flex-col items-center justify-center space-y-3 shadow-inner">
                            {waStatus.status === 'CONNECTED' ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                        <CheckCircle size={32} />
                                    </div>
                                    <p className="text-slate-600 font-black text-sm">Nomor Terhubung!</p>
                                </div>
                            ) : waStatus.qr ? (
                                <>
                                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                                        {qrCodeDataUrl ? (
                                            <img 
                                                src={qrCodeDataUrl} 
                                                alt="WhatsApp QR Code" 
                                                className="w-48 h-48"
                                            />
                                        ) : (
                                            <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-xl">
                                                <p className="text-xs font-semibold text-slate-400">Loading QR...</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-black uppercase tracking-wide text-center px-4">
                                        Scan QR dengan WhatsApp HP Anda
                                    </p>
                                </>
                            ) : waStatus.status === 'OFFLINE' ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                        <AlertCircle size={32} />
                                    </div>
                                    <p className="text-red-600 font-black text-sm mb-2">WhatsApp Offline</p>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{waStatus.error || 'Connection failed'}</p>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                        <RefreshCw size={32} className="animate-spin" />
                                    </div>
                                    <p className="text-slate-400 font-bold text-xs">Initializing...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

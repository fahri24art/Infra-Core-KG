import React, { useState, useEffect } from 'react';
import { Shield, Plus, X, Search, MapPin, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export default function HSEPatrols() {
    const [patrols, setPatrols] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        patrol_date: new Date().toISOString().split('T')[0],
        area: '',
        inspector_name: '',
        finding_type: 'Unsafe Condition',
        description: ''
    });

    useEffect(() => {
        fetchPatrols();
    }, []);

    const fetchPatrols = async () => {
        try {
            const res = await fetch('/api/hse/patrols');
            const data = await res.json();
            if (data.success) {
                setPatrols(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/hse/patrols', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                fetchPatrols();
                setForm({
                    patrol_date: new Date().toISOString().split('T')[0],
                    area: '',
                    inspector_name: '',
                    finding_type: 'Unsafe Condition',
                    description: ''
                });
            }
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan patroli.');
        }
    };

    const toggleStatus = async (item) => {
        const newStatus = item.status === 'Open' ? 'Addressed' : 'Open';
        try {
            const res = await fetch(`/api/hse/patrols/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchPatrols();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus temuan patroli ini?')) return;
        try {
            const res = await fetch(`/api/hse/patrols/${id}`, { method: 'DELETE' });
            if (res.ok) fetchPatrols();
        } catch (err) {
            console.error(err);
        }
    };

    const filtered = patrols.filter(p => 
        p.area.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Shield className="text-blue-500" /> Safety Patrols
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Inspeksi rutin K3 dan pencatatan temuan</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all"
                >
                    <Plus size={16} /> Catat Temuan
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <Search size={16} className="text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cari berdasarkan area atau deskripsi..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full text-sm font-semibold outline-none bg-transparent"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu & Lokasi</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Temuan</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Deskripsi</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspektur</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center p-5 text-[11px] text-slate-400 font-bold">Memuat data...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="6" className="text-center p-5 text-[11px] text-slate-400 font-bold">Tidak ada temuan patroli.</td></tr>
                            ) : filtered.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <div className="flex items-center gap-1 text-sm font-semibold text-slate-900 mb-1"><MapPin size={14} className="text-slate-400"/> {item.area}</div>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium"><Calendar size={12}/> {new Date(item.patrol_date).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${item.finding_type === 'Unsafe Act' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {item.finding_type}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <p className="text-sm text-slate-700 font-medium line-clamp-2 max-w-xs">{item.description}</p>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <p className="text-sm font-semibold text-slate-900">{item.inspector_name}</p>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <button onClick={() => toggleStatus(item)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${item.status === 'Open' ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                            {item.status === 'Open' ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}
                                            {item.status}
                                        </button>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-right">
                                        <button onClick={() => handleDelete(item.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors font-bold text-xs">Hapus</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h2 className="font-black text-slate-900">Catat Temuan Patroli</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Patroli</label>
                                    <input required type="date" value={form.patrol_date} onChange={e => setForm({...form, patrol_date: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tipe Temuan</label>
                                    <select value={form.finding_type} onChange={e => setForm({...form, finding_type: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none">
                                        <option value="Unsafe Condition">Unsafe Condition</option>
                                        <option value="Unsafe Act">Unsafe Act</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Area / Lokasi</label>
                                    <input required type="text" value={form.area} onChange={e => setForm({...form, area: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Inspektur</label>
                                    <input required type="text" value={form.inspector_name} onChange={e => setForm({...form, inspector_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi Temuan</label>
                                <textarea required rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"></textarea>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors">Simpan Temuan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

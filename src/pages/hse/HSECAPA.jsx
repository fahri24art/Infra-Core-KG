import React, { useState, useEffect } from 'react';
import { CheckCircle, Plus, X, Search, User, Calendar, PlayCircle } from 'lucide-react';

export default function HSECAPA() {
    const [capas, setCapas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        source: 'Patrol',
        action_plan: '',
        pic: '',
        due_date: new Date().toISOString().split('T')[0],
        status: 'Open'
    });

    useEffect(() => {
        fetchCapa();
    }, []);

    const fetchCapa = async () => {
        try {
            const res = await fetch('/api/hse/capa');
            const data = await res.json();
            if (data.success) {
                setCapas(data.data);
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
            const res = await fetch('/api/hse/capa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                fetchCapa();
                setForm({
                    source: 'Patrol',
                    action_plan: '',
                    pic: '',
                    due_date: new Date().toISOString().split('T')[0],
                    status: 'Open'
                });
            }
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan CAPA.');
        }
    };

    const updateStatus = async (item, newStatus) => {
        try {
            const res = await fetch(`/api/hse/capa/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchCapa();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus CAPA ini?')) return;
        try {
            const res = await fetch(`/api/hse/capa/${id}`, { method: 'DELETE' });
            if (res.ok) fetchCapa();
        } catch (err) {
            console.error(err);
        }
    };

    const filtered = capas.filter(c => 
        c.action_plan.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.pic.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusStyle = (status) => {
        switch(status) {
            case 'Open': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'In Progress': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Closed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <CheckCircle className="text-amber-500" /> CAPA Tracker
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Corrective Action & Preventive Action</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all"
                >
                    <Plus size={16} /> Buat CAPA
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <Search size={16} className="text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cari berdasarkan rencana aksi atau PIC..." 
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
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Rencana Tindakan</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Sumber</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">PIC & Tenggat</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-5 text-[11px] text-slate-400 font-bold">Memuat data...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="5" className="text-center p-5 text-[11px] text-slate-400 font-bold">Tidak ada CAPA.</td></tr>
                            ) : filtered.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <p className="text-sm text-slate-900 font-medium max-w-sm line-clamp-3">{item.action_plan}</p>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <span className="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-600 uppercase">
                                            {item.source}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 mb-1"><User size={14} className="text-slate-400"/> {item.pic}</div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium"><Calendar size={14} className="text-slate-400"/> {new Date(item.due_date).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${getStatusStyle(item.status)}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Open' ? 'bg-rose-500' : item.status === 'In Progress' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                            {item.status}
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-right">
                                        <div className="flex justify-end gap-2">
                                            {item.status === 'Open' && (
                                                <button onClick={() => updateStatus(item, 'In Progress')} className="text-amber-600 bg-amber-50 hover:bg-amber-100 p-1.5 rounded transition-colors" title="Start Progress"><PlayCircle size={16}/></button>
                                            )}
                                            {item.status === 'In Progress' && (
                                                <button onClick={() => updateStatus(item, 'Closed')} className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded transition-colors" title="Mark as Closed"><CheckCircle size={16}/></button>
                                            )}
                                            <button onClick={() => handleDelete(item.id)} className="text-rose-500 bg-rose-50 hover:bg-rose-100 p-1.5 rounded transition-colors" title="Delete"><X size={16}/></button>
                                        </div>
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
                            <h2 className="font-black text-slate-900">Buat Tindakan Perbaikan (CAPA)</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Rencana Tindakan</label>
                                <textarea required rows="3" value={form.action_plan} onChange={e => setForm({...form, action_plan: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Person In Charge (PIC)</label>
                                    <input required type="text" value={form.pic} onChange={e => setForm({...form, pic: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tenggat Waktu</label>
                                    <input required type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Sumber Temuan</label>
                                <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none">
                                    <option value="Patrol">Safety Patrol</option>
                                    <option value="Incident">Incident Report</option>
                                    <option value="Audit">Audit K3</option>
                                </select>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors">Simpan CAPA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

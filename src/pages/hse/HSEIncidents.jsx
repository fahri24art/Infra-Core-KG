import React, { useState, useEffect } from 'react';
import { Shield, Plus, X, Search, AlertTriangle, Calendar, MapPin, List } from 'lucide-react';

export default function HSEIncidents() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        title: '',
        incident_date: new Date().toISOString().split('T')[0],
        location: '',
        category: 'Near Miss',
        description: '',
        reporter_name: '',
        victim_name: '',
        lost_work_days: 0
    });
    const [editId, setEditId] = useState(null);

    useEffect(() => {
        fetchIncidents();
    }, []);

    const fetchIncidents = async () => {
        try {
            const res = await fetch('/api/hse/incidents');
            const data = await res.json();
            if (data.success) {
                setIncidents(data.data);
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
            const url = editId ? `/api/hse/incidents/${editId}` : '/api/hse/incidents';
            const method = editId ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    lost_work_days: parseInt(form.lost_work_days) || 0
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                fetchIncidents();
                resetForm();
            }
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan laporan.');
        }
    };

    const resetForm = () => {
        setForm({
            title: '',
            incident_date: new Date().toISOString().split('T')[0],
            location: '',
            category: 'Near Miss',
            description: '',
            reporter_name: '',
            victim_name: '',
            lost_work_days: 0
        });
        setEditId(null);
    };

    const handleEdit = (item) => {
        setForm({
            title: item.title || '',
            incident_date: new Date(item.incident_date).toISOString().split('T')[0],
            location: item.location || '',
            category: item.category || 'Near Miss',
            description: item.description || '',
            reporter_name: item.reporter_name || '',
            victim_name: item.victim_name || '',
            lost_work_days: item.lost_work_days || 0
        });
        setEditId(item.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus laporan insiden ini?')) return;
        try {
            const res = await fetch(`/api/hse/incidents/${id}`, { method: 'DELETE' });
            if (res.ok) fetchIncidents();
        } catch (err) {
            console.error(err);
        }
    };

    const filtered = incidents.filter(i => 
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCategoryStyle = (cat) => {
        switch(cat) {
            case 'Fatality': return 'bg-rose-100 text-rose-700';
            case 'Loss Time Injury': return 'bg-orange-100 text-orange-700';
            case 'Medical Treatment': return 'bg-amber-100 text-amber-700';
            case 'First Aid': return 'bg-blue-100 text-blue-700';
            case 'Near Miss': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="text-rose-500" /> Incident Reports
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Daftar laporan kecelakaan dan near miss</p>
                </div>
                <button 
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all"
                >
                    <Plus size={16} /> Lapor Insiden
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <Search size={16} className="text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cari berdasarkan judul atau lokasi..." 
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
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Insiden</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu & Lokasi</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelapor</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center p-5 text-[11px] text-slate-400 font-bold">Memuat data...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="6" className="text-center p-5 text-[11px] text-slate-400 font-bold">Tidak ada laporan insiden.</td></tr>
                            ) : filtered.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                                        {item.victim_name && <p className="text-xs text-rose-600 font-semibold mt-1">Korban: {item.victim_name}</p>}
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${getCategoryStyle(item.category)}`}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <div className="flex items-center gap-1 text-xs text-slate-700 font-medium mb-1"><Calendar size={12}/> {new Date(item.incident_date).toLocaleDateString()}</div>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium"><MapPin size={12}/> {item.location}</div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <p className="text-sm font-semibold text-slate-900">{item.reporter_name}</p>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-right space-x-2">
                                        <button onClick={() => handleEdit(item)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors font-bold text-xs">Edit</button>
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
                            <h2 className="font-black text-slate-900">Lapor Insiden</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Judul Insiden</label>
                                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tanggal</label>
                                    <input required type="date" value={form.incident_date} onChange={e => setForm({...form, incident_date: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Kategori</label>
                                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none">
                                        <option value="Near Miss">Near Miss</option>
                                        <option value="First Aid">First Aid</option>
                                        <option value="Medical Treatment">Medical Treatment</option>
                                        <option value="Loss Time Injury">Loss Time Injury</option>
                                        <option value="Fatality">Fatality</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Lokasi Kejadian</label>
                                    <input required type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Pelapor</label>
                                    <input required type="text" value={form.reporter_name} onChange={e => setForm({...form, reporter_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Karyawan Terkena Insiden</label>
                                    <input type="text" placeholder="Kosongkan jika tidak ada" value={form.victim_name} onChange={e => setForm({...form, victim_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Hilang Hari Kerja (Jika Ada)</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" min="0" value={form.lost_work_days} onChange={e => setForm({...form, lost_work_days: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                        <span className="text-xs font-bold text-slate-500">Hari</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi Lengkap</label>
                                <textarea required rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"></textarea>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors">Simpan Laporan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

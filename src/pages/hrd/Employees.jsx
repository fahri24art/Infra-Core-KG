import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, FileText, Printer, Check, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Employees() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [form, setForm] = useState({
        nik: '', name: '', position: '', department: '',
        blood_type: '', address: '', phone: '', join_date: '', status: 'Active', photo_url: ''
    });

    const handleNikChange = (e) => {
        const value = e.target.value;
        const newForm = { ...form, nik: value };
        
        const digits = value.replace(/\D/g, '');
        if (digits.length >= 6) {
            const dateStr = digits.slice(-6);
            const dd = parseInt(dateStr.substring(0, 2), 10);
            const mm = parseInt(dateStr.substring(2, 4), 10);
            const yy = parseInt(dateStr.substring(4, 6), 10);
            
            if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
                const year = 2000 + yy;
                newForm.join_date = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
            }
        }
        setForm(newForm);
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            const res = await fetch('/api/hr/employees', {
                headers: { 'x-organization': user.organization || 'TCF-SG' }
            });
            const data = await res.json();
            if (data.success) {
                setEmployees(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch employees', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setForm(prev => ({...prev, photo_url: data.url}));
            }
        } catch (err) {
            console.error('Upload failed', err);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            const url = editData ? `/api/hr/employees/${editData.id}` : '/api/hr/employees';
            const method = editData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'x-organization': user.organization || 'TCF-SG'
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                setForm({ nik: '', name: '', position: '', department: '', blood_type: '', address: '', phone: '', join_date: '', status: 'Active' });
                setEditData(null);
                fetchEmployees();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus data karyawan ini?')) return;
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            await fetch(`/api/hr/employees/${id}`, { 
                method: 'DELETE',
                headers: { 'x-organization': user.organization || 'TCF-SG' }
            });
            fetchEmployees();
        } catch (err) {
            console.error(err);
        }
    };

    const openEdit = (emp) => {
        let localJoinDate = '';
        if (emp.join_date) {
            const d = new Date(emp.join_date);
            d.setUTCHours(d.getUTCHours() + 7);
            localJoinDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        }
        
        setEditData(emp);
        setForm({
            nik: emp.nik || '',
            name: emp.name || '',
            position: emp.position || '',
            department: emp.department || '',
            blood_type: emp.blood_type || '',
            address: emp.address || '',
            phone: emp.phone || '',
            join_date: localJoinDate,
            status: emp.status || 'Active',
            photo_url: emp.photo_url || ''
        });
        setShowModal(true);
    };

    const filtered = employees.filter(e => 
        e.name.toLowerCase().includes(search.toLowerCase()) || 
        e.nik.toLowerCase().includes(search.toLowerCase()) ||
        (e.department && e.department.toLowerCase().includes(search.toLowerCase()))
    );

    const navigate = useNavigate();

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Master Data Karyawan</h1>
                    <p className="text-sm text-slate-500 font-medium">Kelola data personil & cetak ID Card</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigate('/hrd/employees/print-batch')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-2"
                    >
                        <Printer size={18} /> Batch Print ID
                    </button>
                    <button 
                        onClick={() => {
                            setEditData(null);
                            setForm({ nik: '', name: '', position: '', department: '', blood_type: '', address: '', phone: '', join_date: '', status: 'Active' });
                            setShowModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/30"
                    >
                        <Plus size={18} /> Tambah Karyawan
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="mb-6 flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 ring-blue-500/20 transition-all">
                    <Search className="text-slate-400 ml-2" size={20} />
                    <input 
                        type="text" 
                        placeholder="Cari nama, NIK, atau departemen..." 
                        className="bg-transparent border-none outline-none w-full text-slate-700 font-medium placeholder-slate-400"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                                <th className="p-3 pl-4 text-[10px] uppercase tracking-widest">Karyawan</th>
                                <th className="p-3 text-[10px] uppercase tracking-widest">Posisi</th>
                                <th className="p-3 text-[10px] uppercase tracking-widest">Kontak / Darah</th>
                                <th className="p-3 text-[10px] uppercase tracking-widest">Status</th>
                                <th className="p-3 text-right pr-4" uppercase tracking-widest>Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-5 text-slate-400 font-bold">Memuat data...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="5" className="text-center p-5 text-slate-400 font-bold">Tidak ada data karyawan</td></tr>
                            ) : (
                                filtered.map(emp => (
                                    <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-3 pl-4 text-[11px]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center font-black text-slate-500 overflow-hidden">
                                                    {emp.photo_url ? <img src={emp.photo_url} alt="Profile" className="w-full h-full object-cover" /> : emp.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800">{emp.name}</p>
                                                    <p className="text-xs font-bold text-blue-600">{emp.nik}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-[11px]">
                                            <p className="font-bold text-slate-700">{emp.position || '-'}</p>
                                            <p className="text-xs text-slate-500">{emp.department || '-'}</p>
                                        </td>
                                        <td className="p-3 text-[11px]">
                                            <p className="font-bold text-slate-700">{emp.phone || '-'}</p>
                                            <p className="text-xs text-rose-500 font-black">Gol: {emp.blood_type || '?'}</p>
                                        </td>
                                        <td className="p-3 text-[11px]">
                                            <span className={`px-2 py-1 rounded-md text-xs font-black ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td className="p-3 pr-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => navigate(`/hrd/employees/print/${emp.id}`)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Print ID Card">
                                                    <Printer size={16} />
                                                </button>
                                                <button onClick={() => openEdit(emp)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(emp.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
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

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-lg font-black text-slate-800">{editData ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="mb-6 flex flex-col items-center">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-4xl font-black text-slate-400">
                                        {form.photo_url ? <img src={form.photo_url} alt="Preview" className="w-full h-full object-cover" /> : (form.name ? form.name.charAt(0) : '?')}
                                    </div>
                                    <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg transition-transform hover:scale-110">
                                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                                        {uploading ? <span className="animate-spin text-xs">↻</span> : <Plus size={16} />}
                                    </label>
                                </div>
                                <span className="text-xs font-bold text-slate-400 mt-2">Foto Karyawan</span>
                            </div>
                            <form id="empForm" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">NIK</label>
                                    <input type="text" required value={form.nik} onChange={handleNikChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Mis: 12345678" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
                                    <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nama..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Posisi / Jabatan</label>
                                    <input type="text" value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Staff, Manager, dll" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departemen</label>
                                    <input type="text" value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="IT, HRGA, dll" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">No. HP</label>
                                    <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="08..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Golongan Darah</label>
                                    <select value={form.blood_type} onChange={e => setForm({...form, blood_type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="">-- Pilih --</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="AB">AB</option>
                                        <option value="O">O</option>
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alamat</label>
                                    <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none h-24" placeholder="Alamat lengkap..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tgl Masuk</label>
                                    <input type="date" value={form.join_date} onChange={e => setForm({...form, join_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="Active">Active</option>
                                        <option value="Resigned">Resigned</option>
                                        <option value="On Leave">On Leave</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                                Batal
                            </button>
                            <button type="submit" form="empForm" className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95">
                                <Check size={18} /> Simpan Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Flame, Plus, QrCode, ClipboardCheck, History, CheckCircle, XCircle, Camera, Save, ArrowLeft, Search, Edit } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const CHECKLIST_CONFIG = [
    { key: 'is_box_good', label: '1. Kondisi Box & Pintu', desc: 'Box tidak penyok, pintu bisa dibuka/tutup dengan mudah.' },
    { key: 'is_hose_good', label: '2. Selang (Hose)', desc: 'Selang utuh, tidak sobek, tergulung rapi.' },
    { key: 'is_nozzle_good', label: '3. Nozzle', desc: 'Nozzle terpasang, tidak hilang, drat dalam kondisi baik.' },
    { key: 'is_valve_good', label: '4. Valve / Keran', desc: 'Valve bisa diputar, tidak macet / karatan.' }
];

export default function HSEHydrant() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const scanParam = searchParams.get('scan');

    const [hydrants, setHydrants] = useState([]);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(scanParam ? 'scan' : 'dashboard');

    const [scannedHydrant, setScannedHydrant] = useState(null);
    const [showMasterModal, setShowMasterModal] = useState(false);
    const [masterForm, setMasterForm] = useState({ id: null, code: '', location: '', type: 'Indoor Box' });

    let currentUser = null;
    try {
        const stored = sessionStorage.getItem('user');
        if (stored) currentUser = JSON.parse(stored);
    } catch (e) {}

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/hr/hydrants/dashboard');
            const data = await res.json();
            if (data.success) {
                setDashboardData(data.data);
                setHydrants(data.data.monitoringMatrix);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (scanParam && hydrants.length > 0) {
            const h = hydrants.find(x => x.code === scanParam);
            if (h) {
                setScannedHydrant(h);
                setActiveTab('check');
            } else {
                alert('QR Code tidak valid / Hydrant tidak terdaftar!');
            }
        }
    }, [scanParam, hydrants]);

    const handleSaveMaster = async (e) => {
        e.preventDefault();
        try {
            const method = masterForm.id ? 'PUT' : 'POST';
            const url = masterForm.id ? `/api/hr/hydrants/master/${masterForm.id}` : '/api/hr/hydrants/master';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(masterForm)
            });
            const result = await res.json();
            if (result.success) {
                setShowMasterModal(false);
                fetchData();
            }
        } catch (err) {
            alert('Error saving master data');
        }
    };

    return (
        <div className="space-y-3 pb-20 animate-fade-in max-w-7xl mx-auto p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => navigate('/hse/apar')} className="px-5 py-2 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl font-bold transition-all">Tipe: APAR</button>
                        <button className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold shadow-md shadow-red-200">Tipe: Hydrant</button>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <Flame className="text-red-500" size={32} /> Pemadam Api (Hydrant)
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Enterprise Fire Hydrant System Monitoring</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-red-600 text-white' : 'bg-white text-slate-400 hover:text-red-600 border border-slate-200'}`}>
                        Dashboard
                    </button>
                    <button onClick={() => setActiveTab('master')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'master' ? 'bg-red-600 text-white' : 'bg-white text-slate-400 hover:text-red-600 border border-slate-200'}`}>
                        Master Data
                    </button>
                    <button onClick={() => { setScannedHydrant(null); setActiveTab('scan'); }} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'scan' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-white hover:bg-slate-900'}`}>
                        <QrCode size={18} /> Scan QR
                    </button>
                </div>
            </div>

            {activeTab === 'dashboard' && dashboardData && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Hydrant</p>
                            <p className="text-4xl font-black text-slate-800">{dashboardData.totalHydrant}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-[2rem] border border-emerald-100 shadow-sm">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Kondisi OK</p>
                            <p className="text-4xl font-black text-emerald-700">{dashboardData.goodCount}</p>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-[2rem] border border-rose-100 shadow-sm">
                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Kondisi Rusak</p>
                            <p className="text-4xl font-black text-rose-700">{dashboardData.badCount}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-[2rem] border border-blue-100 shadow-sm">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Inspeksi</p>
                            <p className="text-4xl font-black text-blue-700">{dashboardData.totalChecks}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-800">Monitoring Matrix ({new Date().getFullYear()})</h3>
                        </div>
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                        <th className="pb-4 text-[10px] uppercase tracking-widest">Hydrant Code</th>
                                        <th className="pb-4 text-[10px] uppercase tracking-widest">Location</th>
                                        <th className="pb-4 text-[10px] uppercase tracking-widest">Status</th>
                                        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                                            <th key={i} className="pb-4 text-center" uppercase tracking-widest>{m}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {hydrants.map(h => (
                                        <tr key={h.id} className="border-t border-slate-50">
                                            <td className="py-4 font-bold text-slate-800">{h.code}</td>
                                            <td className="py-4 text-slate-500 font-medium text-[11px]">{h.location}</td>
                                            <td className="py-4 text-[11px]">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${h.latestStatus === 'OK' ? 'bg-emerald-100 text-emerald-700' : h.latestStatus === 'RUSAK' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {h.latestStatus}
                                                </span>
                                            </td>
                                            {h.months.map((m, i) => (
                                                <td key={i} className="py-4 text-center">
                                                    {m ? (
                                                        <div className={`w-4 h-4 rounded-full mx-auto ${m.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} title={m.check_date}></div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full mx-auto bg-slate-100 border border-slate-200"></div>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'master' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-black text-slate-800">Master Data Hydrant</h3>
                        <button 
                            onClick={() => { setMasterForm({ id: null, code: '', location: '', type: 'Indoor Box' }); setShowMasterModal(true); }}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-700"
                        >
                            <Plus size={16} /> Add Hydrant
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                <tr>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Code</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Location</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Type</th>
                                    <th className="p-4 text-right" uppercase tracking-widest>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {hydrants.map(h => (
                                    <tr key={h.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-800">{h.code}</td>
                                        <td className="p-4 text-slate-600">{h.location}</td>
                                        <td className="p-4 text-slate-500 text-[11px]">{h.type}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => { setMasterForm(h); setShowMasterModal(true); }} className="text-blue-600 hover:underline text-xs font-bold mr-4">EDIT</button>
                                            <Link to={`/hse/hydrant/print/${h.id}`} className="text-red-600 hover:underline text-xs font-bold">PRINT QR</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showMasterModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scale-up">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-black text-slate-800">{masterForm.id ? 'Edit' : 'Add'} Hydrant</h3>
                        </div>
                        <form onSubmit={handleSaveMaster} className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Code / ID</label>
                                <input required type="text" value={masterForm.code} onChange={e => setMasterForm({...masterForm, code: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-red-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                                <input required type="text" value={masterForm.location} onChange={e => setMasterForm({...masterForm, location: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-red-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                                <select value={masterForm.type} onChange={e => setMasterForm({...masterForm, type: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-red-600">
                                    <option>Indoor Box</option>
                                    <option>Outdoor Pillar</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowMasterModal(false)} className="flex-1 p-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
                                <button type="submit" className="flex-1 p-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SCANNER VIEW */}
            {activeTab === 'scan' && (
                <div className="max-w-md mx-auto mt-10">
                    <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-lg text-center">
                        <QrCode className="mx-auto text-slate-300 mb-4" size={64} />
                        <h3 className="text-xl font-black text-slate-800 mb-2">Scan Hydrant QR</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6">Gunakan kamera HP untuk scan QR pada Kotak Hydrant untuk memulai inspeksi.</p>
                        
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Atau ketik kode manual..." 
                                className="flex-1 border border-slate-200 p-3 rounded-xl outline-none font-bold text-center"
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') {
                                        navigate(`/hse/hydrant?scan=${e.target.value}`);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* CHECKSHEET VIEW */}
            {activeTab === 'check' && scannedHydrant && (
                <HydrantChecksheetForm hydrant={scannedHydrant} currentUser={currentUser} onBack={() => setActiveTab('dashboard')} />
            )}
        </div>
    );
}

function HydrantChecksheetForm({ hydrant, currentUser, onBack }) {
    const [form, setForm] = useState({
        is_box_good: true,
        is_hose_good: true,
        is_nozzle_good: true,
        is_valve_good: true,
        water_pressure: 'Normal',
        status: 'OK',
        notes: '',
        photos: []
    });
    
    const fileInputRef = useRef(null);

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setForm(prev => ({ ...prev, photos: [...prev.photos, ev.target.result] }));
        };
        reader.readAsDataURL(file);
    };

    const submitChecksheet = async () => {
        try {
            const payload = {
                hydrant_id: hydrant.id,
                check_date: new Date().toISOString().split('T')[0],
                inspector_name: currentUser?.name || 'HSE Admin',
                ...form
            };
            const res = await fetch('/api/hr/hydrants/checksheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Inspeksi Hydrant Berhasil Disimpan!');
                onBack();
            }
        } catch (err) {
            alert('Gagal menyimpan inspeksi.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-red-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><ArrowLeft size={24} /></button>
                    <div>
                        <h2 className="text-2xl font-black">Inspeksi Hydrant</h2>
                        <p className="opacity-80 font-medium text-sm">{hydrant.code} - {hydrant.location}</p>
                    </div>
                </div>
            </div>
            
            <div className="p-4 space-y-3">
                <div className="space-y-3">
                    {CHECKLIST_CONFIG.map(item => (
                        <div key={item.key} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">{item.label}</h4>
                                <p className="text-[10px] font-medium text-slate-500 mt-0.5">{item.desc}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setForm({...form, [item.key]: true})} className={`p-2 rounded-xl transition-all ${form[item.key] ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-white text-slate-300 border border-slate-200'}`}>
                                    <CheckCircle size={20} />
                                </button>
                                <button onClick={() => setForm({...form, [item.key]: false})} className={`p-2 rounded-xl transition-all ${!form[item.key] ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-white text-slate-300 border border-slate-200'}`}>
                                    <XCircle size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pressure & Overall Status</label>
                    <div className="grid grid-cols-2 gap-4">
                        <select value={form.water_pressure} onChange={e => setForm({...form, water_pressure: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-red-600">
                            <option>Normal</option>
                            <option>Low Pressure</option>
                            <option>No Pressure</option>
                        </select>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={`w-full border border-slate-200 p-3 rounded-xl font-bold outline-none ${form.status === 'OK' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            <option value="OK">KONDISI BAIK</option>
                            <option value="RUSAK">PERLU PERBAIKAN</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catatan Temuan</label>
                    <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-medium outline-none focus:border-red-600" rows="3" placeholder="Tuliskan jika ada temuan khusus..."></textarea>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bukti Foto</label>
                    <div className="flex flex-wrap gap-4">
                        {form.photos.map((src, i) => (
                            <img key={i} src={src} className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm" alt="Foto Temuan" />
                        ))}
                        <button onClick={() => fileInputRef.current.click()} className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-400 hover:bg-red-50 transition-all">
                            <Camera size={24} />
                            <span className="text-[10px] font-bold mt-1">Tambah</span>
                        </button>
                        <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                    </div>
                </div>

                <button onClick={submitChecksheet} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Save size={24} /> SIMPAN INSPEKSI
                </button>
            </div>
        </div>
    );
}

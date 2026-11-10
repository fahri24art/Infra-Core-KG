import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, Plus, QrCode, ClipboardCheck, History, CheckCircle, XCircle, Camera, Save, ArrowRight, Edit, ArrowLeft, Search } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const CHECKLIST_CONFIG = [
    { key: 'pin_status', label: '1. Pin Pengaman (Safety Pin)', desc: 'Pin pengaman terpasang dengan baik.' },
    { key: 'pin_seal_status', label: '2. Segel Pin (Pin Seal)', desc: 'Segel dalam kondisi utuh dan tidak rusak.' },
    { key: 'handle_status', label: '3. Handle / Tuas', desc: 'Handle dalam kondisi baik, tidak retak, patah, atau longgar.' },
    { key: 'pressure_status', label: '4. Tekanan (Pressure)', desc: 'Jarum indikator berada pada area hijau (kondisi normal).' },
    { key: 'hose_status', label: '5. Selang (Hose)', desc: 'Tidak terdapat retakan, pecah, atau sumbatan.' },
    { key: 'sticker_status', label: '6. Sticker / Label', desc: 'Sticker informasi terpasang jelas dan terbaca.' },
    { key: 'body_status', label: '7. Tabung (Body)', desc: 'Bebas karat, penyok, serta cat kondisi baik.' }
];

export default function HSEApar() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const scanParam = searchParams.get('scan');
    const editParam = searchParams.get('edit');
    const [activeTab, setActiveTab] = useState(() => {
        if (scanParam) return 'inspect';
        if (editParam) return 'master';
        return localStorage.getItem('apar_active_tab') || 'master';
    });

    useEffect(() => {
        localStorage.setItem('apar_active_tab', activeTab);
    }, [activeTab]);
    
    // Data states
    const [apars, setApars] = useState([]);
    const [checksheets, setChecksheets] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'expired_date', order: 'asc' });
    const [historySortConfig, setHistorySortConfig] = useState({ key: 'check_date', order: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [historySearchTerm, setHistorySearchTerm] = useState('');

    const requestSort = (key, isHistory = false) => {
        if (isHistory) {
            let order = 'desc';
            if (historySortConfig.key === key && historySortConfig.order === 'desc') order = 'asc';
            setHistorySortConfig({ key, order });
        } else {
            let order = 'asc';
            if (sortConfig.key === key && sortConfig.order === 'asc') order = 'desc';
            setSortConfig({ key, order });
        }
    };

    const SortableHeader = ({ label, sortKey, isHistory = false, align = 'left' }) => {
        const config = isHistory ? historySortConfig : sortConfig;
        return (
            <th className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-[10px] uppercase cursor-pointer hover:text-indigo-600 transition-colors group text-${align}`} onClick={() => requestSort(sortKey, isHistory)}>
                <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
                    {label}
                    {config.key === sortKey ? (
                        <span className="text-[10px] text-indigo-500 font-black">{config.order === 'asc' ? '↑' : '↓'}</span>
                    ) : (
                        <span className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100">↕</span>
                    )}
                </div>
            </th>
        );
    };
    
    // UI States
    const [scannerActive, setScannerActive] = useState(false);
    const [scanError, setScanError] = useState('');
    const [selectedAparCode, setSelectedAparCode] = useState(scanParam || '');
    
    // Form States
    const [form, setForm] = useState({
        apar_id: '',
        inspector_name: '',
        check_date: new Date().toISOString().split('T')[0],
        notes: '',
        check_data: {}
    });

    const [photos, setPhotos] = useState([]);
    const qrScannerRef = useRef(null);
    const [showAddAparModal, setShowAddAparModal] = useState(false);
    const [newApar, setNewApar] = useState({ code: '', location: '', type: 'Dry Chemical', weight: 3, expired_date: '', photo: null });
    
    const [showEditAparModal, setShowEditAparModal] = useState(false);
    const [editAparData, setEditAparData] = useState(null);

    // New States for Edit Inspeksi & Log
    const [showEditCheckModal, setShowEditCheckModal] = useState(false);
    const [editCheckData, setEditCheckData] = useState(null);
    const [showLogModal, setShowLogModal] = useState(false);
    const [logData, setLogData] = useState([]);

    useEffect(() => {
        return () => {
            if (qrScannerRef.current) {
                qrScannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    useEffect(() => {
        fetchApars();
        fetchChecksheets();
        resetForm();
    }, []);

    const fetchApars = async () => {
        try {
            const res = await fetch('/api/hr/apars/master');
            const data = await res.json();
            if (data.success) {
                setApars(data.data);
                
                // If edit param exists, open edit modal
                if (editParam) {
                    const apar = data.data.find(a => a.code === editParam);
                    if (apar) {
                        setEditAparData({
                            id: apar.id,
                            code: apar.code,
                            location: apar.location,
                            type: apar.type,
                            weight: apar.weight,
                            expired_date: new Date(apar.expired_date).toISOString().split('T')[0],
                            photo: null
                        });
                        setShowEditAparModal(true);
                        // Clear the edit param so it doesn't stay stuck
                        setSearchParams(new URLSearchParams());
                    }
                }
                if (scanParam) {
                    const apar = data.data.find(a => a.code === scanParam);
                    if (apar) {
                        setForm(prev => ({...prev, apar_id: apar.id}));
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch APARs', err);
        }
    };

    const fetchChecksheets = async () => {
        try {
            const res = await fetch('/api/hr/apars/checksheets');
            const data = await res.json();
            if (data.success) setChecksheets(data.data);
        } catch (err) {
            console.error('Failed to fetch checksheets', err);
        }
    };

    const resetForm = () => {
        const initData = {};
        CHECKLIST_CONFIG.forEach(c => initData[c.key] = '');
        setForm({
            apar_id: '',
            inspector_name: '',
            check_date: new Date().toISOString().split('T')[0],
            notes: '',
            check_data: initData
        });
        setPhotos([]);
        setSelectedAparCode('');
    };

    const startScanner = () => {
        setScannerActive(true);
        setScanError('');
        setTimeout(() => {
            const html5QrcodeScanner = new Html5Qrcode("reader");
            qrScannerRef.current = html5QrcodeScanner;
            html5QrcodeScanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    const apar = apars.find(a => a.code === decodedText);
                    if (apar) {
                        setForm({...form, apar_id: apar.id});
                        setSelectedAparCode(apar.code);
                        stopScanner();
                    } else {
                        setScanError(`APAR dengan kode ${decodedText} tidak ditemukan!`);
                    }
                },
                (err) => {}
            ).catch(err => {
                setScanError("Kamera tidak dapat diakses.");
            });
        }, 300);
    };

    const stopScanner = () => {
        if (qrScannerRef.current) {
            qrScannerRef.current.stop().then(() => {
                setScannerActive(false);
            }).catch(err => console.log(err));
        } else {
            setScannerActive(false);
        }
    };

    const handleFileChange = (e) => {
        setPhotos([...photos, ...Array.from(e.target.files)]);
    };

    
    const fetchLogs = async (checkId) => {
        try {
            const res = await fetch(`/api/hr/apars/checksheets/${checkId}/logs`);
            const data = await res.json();
            if (data.success) {
                setLogData(data.data);
                setShowLogModal(true);
            }
        } catch (err) {
            console.error('Failed to fetch logs', err);
        }
    };
    
    const submitEditCheck = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('is_passed', editCheckData.is_passed);
            formData.append('notes', editCheckData.notes);
            formData.append('inspector_name', editCheckData.inspector_name);
            formData.append('check_date', editCheckData.check_date);
            if (editCheckData.newPhoto) {
                formData.append('photos', editCheckData.newPhoto);
            }
            const res = await fetch(`/api/hr/apars/checksheets/${editCheckData.id}`, {
                method: 'PUT',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert("Data Inspeksi berhasil diupdate!");
                setShowEditCheckModal(false);
                fetchChecksheets();
            } else {
                alert("Gagal update: " + data.error);
            }
        } catch (err) {
            alert("Terjadi kesalahan jaringan.");
        }
    };

    const submitInspection = async (e) => {
        e.preventDefault();
        if (!form.apar_id) return alert("Pilih APAR terlebih dahulu!");
        if (!form.inspector_name) return alert("Nama Inspektor wajib diisi!");
        
        let isPassed = true;
        let allSelected = true;
        CHECKLIST_CONFIG.forEach(c => {
            if (form.check_data[c.key] === undefined || form.check_data[c.key] === '') allSelected = false;
            if (form.check_data[c.key] === false || form.check_data[c.key] === 'TIDAK_ADA') isPassed = false;
        });
        
        if (!allSelected) return alert("Semua item pemeriksaan wajib diisi!");
        if (photos.length === 0) return alert("Wajib melampirkan foto bukti inspeksi!");
        
        try {
            const formData = new FormData();
            formData.append('apar_id', form.apar_id);
            formData.append('inspector_name', form.inspector_name);
            formData.append('check_date', form.check_date);
            formData.append('notes', form.notes);
            formData.append('is_passed', isPassed);
            
            CHECKLIST_CONFIG.forEach(c => {
                formData.append(c.key, form.check_data[c.key]);
            });

            photos.forEach((file) => {
                formData.append('photos', file);
            });

            const res = await fetch('/api/hr/apars/checksheets', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert("Checksheet APAR berhasil disimpan!");
                setActiveTab('history');
                fetchChecksheets();
                resetForm();
            } else {
                alert("Gagal menyimpan: " + data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan jaringan.");
        }
    };

    const handleAddApar = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('code', newApar.code);
            formData.append('location', newApar.location);
            formData.append('type', newApar.type);
            formData.append('weight', newApar.weight);
            formData.append('expired_date', newApar.expired_date);
            if (newApar.photo) formData.append('photo', newApar.photo);

            const res = await fetch('/api/hr/apars/master', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert("APAR baru berhasil ditambahkan!");
                fetchApars();
                setShowAddAparModal(false);
                setNewApar({ code: '', location: '', type: 'Dry Chemical', weight: 3, expired_date: '', photo: null });
            } else {
                alert("Gagal menambahkan APAR: " + data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan.");
        }
    };

    const handleUpdateApar = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('code', editAparData.code);
            formData.append('location', editAparData.location);
            formData.append('type', editAparData.type);
            formData.append('weight', editAparData.weight);
            formData.append('expired_date', editAparData.expired_date);
            if (editAparData.photo) formData.append('photo', editAparData.photo);

            const res = await fetch(`/api/hr/apars/master/${editAparData.id}`, {
                method: 'PUT',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert("Data APAR berhasil diperbarui!");
                fetchApars();
                setShowEditAparModal(false);
                setEditAparData(null);
            } else {
                alert("Gagal memperbarui APAR: " + data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan.");
        }
    };

    const handleDeleteApar = async (id) => {
        if (!confirm('Hapus master data APAR ini? Semua history pengecekan akan ikut terhapus!')) return;
        try {
            const res = await fetch(`/api/hr/apars/master/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchApars();
                alert('APAR berhasil dihapus.');
            } else {
                alert('Gagal menghapus APAR.');
            }
        } catch (err) {
            console.error(err);
            alert('Kesalahan jaringan.');
        }
    };

    const renderRadioGroup = (c) => (
        <div key={c.key} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors gap-4 md:gap-0">
            <div>
                <span className="block text-sm font-black text-slate-800">{c.label}</span>
                <span className="text-xs font-bold text-slate-500 mt-1">{c.desc}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm shrink-0">
                <label className="inline-flex items-center cursor-pointer group">
                    <input type="radio" 
                        name={c.key} 
                        checked={form.check_data[c.key] === true}
                        onChange={() => setForm({...form, check_data: {...form.check_data, [c.key]: true}})}
                        className="w-4 h-4 text-emerald-500 border-slate-300 focus:ring-emerald-500 focus:ring-2" 
                    />
                    <span className="ml-2 text-xs font-black text-slate-600 group-hover:text-emerald-600 transition-colors">ADA / BAIK</span>
                </label>
                <label className="inline-flex items-center cursor-pointer group">
                    <input type="radio" 
                        name={c.key} 
                        checked={form.check_data[c.key] === false}
                        onChange={() => setForm({...form, check_data: {...form.check_data, [c.key]: false}})}
                        className="w-4 h-4 text-rose-500 border-slate-300 focus:ring-rose-500 focus:ring-2" 
                    />
                    <span className="ml-2 text-xs font-black text-slate-600 group-hover:text-rose-600 transition-colors">RUSAK</span>
                </label>
                <label className="inline-flex items-center cursor-pointer group">
                    <input type="radio" 
                        name={c.key} 
                        checked={form.check_data[c.key] === 'TIDAK_ADA'}
                        onChange={() => setForm({...form, check_data: {...form.check_data, [c.key]: 'TIDAK_ADA'}})}
                        className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500 focus:ring-2" 
                    />
                    <span className="ml-2 text-xs font-black text-slate-600 group-hover:text-amber-600 transition-colors">TDK ADA</span>
                </label>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F6F7F9] pb-10">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/hse/dashboard')} 
                        className="bg-white border border-slate-200 p-2.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-500 hover:text-slate-800"
                        title="Kembali ke Dashboard"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1 ml-4">
                        <div className="flex items-center gap-2 mb-2">
                            <button className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-200">Tipe: APAR</button>
                            <button onClick={() => navigate('/hse/hydrant')} className="px-5 py-2 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl font-bold transition-all">Tipe: Hydrant</button>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                            <ShieldAlert className="text-rose-500" size={32} /> Pemadam Api (APAR)
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">Manajemen Alat Pemadam Api Ringan (HSE)</p>
                    </div>
                </div>
                {activeTab === 'master' && (
                    <button 
                        onClick={() => setShowAddAparModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        <Plus size={16} /> Tambah APAR
                    </button>
                )}
            </div>

            {/* TABS & Search */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-max overflow-x-auto scrollbar-hide">
                    <button 
                        onClick={() => setActiveTab('master')} 
                        className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'master' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Master Data APAR
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')} 
                        className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Riwayat Inspeksi
                    </button>
                    <button 
                        onClick={() => { setActiveTab('inspect'); resetForm(); }} 
                        className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'inspect' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        <ClipboardCheck size={16} /> Inspeksi Baru
                    </button>
                </div>
                {(activeTab === 'master' || activeTab === 'history') && (
                    <div className="relative w-full md:w-64 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder={activeTab === 'master' ? "Cari Kode / Lokasi..." : "Cari APAR / Inspektur..."} 
                            value={activeTab === 'master' ? searchTerm : historySearchTerm}
                            onChange={e => activeTab === 'master' ? setSearchTerm(e.target.value) : setHistorySearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2.5 font-semibold outline-none shadow-sm transition-all"
                        />
                    </div>
                )}
            </div>

            {/* CONTENT TABS */}
            <div className="mt-6">
                {activeTab === 'master' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-[10px] uppercase">Foto</th>
                                        <SortableHeader label="Kode APAR" sortKey="code" />
                                        <SortableHeader label="Lokasi" sortKey="location" />
                                        <SortableHeader label="Tipe" sortKey="type" />
                                        <SortableHeader label="Tgl Expired" sortKey="expired_date" />
                                        <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-[10px] uppercase text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {apars.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-10 text-slate-400 font-bold">Tidak ada data APAR.</td></tr>
                                    ) : [...apars]
                                        .filter(a => 
                                            a.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                            a.location.toLowerCase().includes(searchTerm.toLowerCase())
                                        )
                                        .sort((a, b) => {
                                        let aVal = a[sortConfig.key] || '';
                                        let bVal = b[sortConfig.key] || '';
                                        if (sortConfig.key === 'expired_date') {
                                            aVal = new Date(aVal).getTime() || 0;
                                            bVal = new Date(bVal).getTime() || 0;
                                        }
                                        if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
                                        if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
                                        return 0;
                                    }).map(a => (
                                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-3 py-1.5 text-[11px]">
                                                {a.photo_path ? (
                                                    <a href={`/api${a.photo_path}`} target="_blank" rel="noreferrer">
                                                        <img src={`/api${a.photo_path}`} alt={a.code} className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                                                    </a>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                        <Camera size={16} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-1.5 text-[11px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                        <ShieldAlert size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800">{a.code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-[11px] font-bold text-slate-600">{a.location}</td>
                                            <td className="px-3 py-1.5 text-[11px]">
                                                <p className="font-bold text-slate-800">{a.type}</p>
                                                <p className="text-xs text-slate-500 font-medium">{a.weight} Kg</p>
                                            </td>
                                            <td className="px-3 py-1.5 text-[11px] font-bold text-slate-600">
                                                {new Date(a.expired_date).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="px-3 py-1.5 text-[11px] text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setActiveTab('inspect');
                                                            resetForm();
                                                            setForm(f => ({...f, apar_id: a.id}));
                                                            setSelectedAparCode(a.code);
                                                        }}
                                                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                        title="Inspeksi"
                                                    >
                                                        <ClipboardCheck size={14} /> Inspeksi
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setEditAparData({
                                                                id: a.id,
                                                                code: a.code,
                                                                location: a.location,
                                                                type: a.type,
                                                                weight: a.weight,
                                                                expired_date: new Date(a.expired_date).toISOString().split('T')[0],
                                                                photo: null
                                                            });
                                                            setShowEditAparModal(true);
                                                        }}
                                                        className="bg-amber-50 text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                        title="Edit Data"
                                                    >
                                                        <Edit size={14} /> Edit
                                                    </button>
                                                    <a 
                                                        href={`/hse/apar/print/${a.id}`} 
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                        title="Cetak Kartu"
                                                    >
                                                        <QrCode size={14} /> Cetak
                                                    </a>
                                                    <button 
                                                        onClick={() => handleDeleteApar(a.id)}
                                                        className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                                        title="Hapus Master"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View for Master APAR */}
                        <div className="block md:hidden p-4 space-y-3 bg-slate-50">
                            {apars.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 font-bold">Tidak ada data APAR.</div>
                            ) : [...apars]
                                .filter(a => 
                                    a.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    a.location.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .sort((a, b) => {
                                let aVal = a[sortConfig.key] || '';
                                let bVal = b[sortConfig.key] || '';
                                if (sortConfig.key === 'expired_date') {
                                    aVal = new Date(aVal).getTime() || 0;
                                    bVal = new Date(bVal).getTime() || 0;
                                }
                                if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
                                if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
                                return 0;
                            }).map(a => (
                                <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-4 mb-4">
                                        {a.photo_path ? (
                                            <a href={`/api${a.photo_path}`} target="_blank" rel="noreferrer">
                                                <img src={`/api${a.photo_path}`} alt={a.code} className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
                                            </a>
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
                                                <Camera size={20} />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-black text-slate-900 text-lg">{a.code}</h4>
                                            <p className="text-sm font-bold text-slate-500">{a.location}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div>
                                            <div className="text-[10px] uppercase font-black text-slate-400">Tipe</div>
                                            <div className="text-sm font-bold text-slate-800">{a.type} ({a.weight} Kg)</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase font-black text-slate-400">Tgl Expired</div>
                                            <div className="text-sm font-bold text-slate-800">{new Date(a.expired_date).toLocaleDateString('id-ID')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                        <button onClick={() => { setActiveTab('inspect'); setForm({...form, apar_id: a.id}); }} className="flex-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-2 rounded-lg text-xs font-black transition-colors flex items-center justify-center gap-1">
                                            <ClipboardCheck size={14} /> Inspeksi
                                        </button>
                                        <button onClick={() => { setEditAparData({ id: a.id, code: a.code, location: a.location, type: a.type, weight: a.weight, expired_date: new Date(a.expired_date).toISOString().split('T')[0], photo: null }); setShowEditAparModal(true); }} className="bg-amber-50 text-amber-600 hover:bg-amber-100 p-2 rounded-lg text-xs transition-colors flex items-center justify-center" title="Edit">
                                            <Edit size={16} />
                                        </button>
                                        <a href={`/hse/apar/print/${a.id}`} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg text-xs transition-colors flex items-center justify-center" title="Cetak Kartu">
                                            <QrCode size={16} />
                                        </a>
                                        <button onClick={() => handleDeleteApar(a.id)} className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-lg text-xs transition-colors flex items-center justify-center" title="Hapus">
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-widest">
                                    <tr>
                                        <SortableHeader label="Tanggal" sortKey="check_date" isHistory={true} />
                                        <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-[10px] uppercase">Foto</th>
                                        <SortableHeader label="Kode APAR" sortKey="asset_code" isHistory={true} />
                                        <SortableHeader label="Lokasi" sortKey="location_name" isHistory={true} />
                                        <SortableHeader label="Tipe / Kapasitas" sortKey="type" isHistory={true} />
                                        <SortableHeader label="Inspektur" sortKey="inspector_name" isHistory={true} />
                                        <SortableHeader label="Status" sortKey="is_passed" isHistory={true} />
                                        <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-[10px] uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {checksheets.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-10 text-slate-400 font-bold">Belum ada history inspeksi.</td></tr>
                                    ) : checksheets
                                        .filter(c => 
                                            (c.asset_code || '').toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                                            c.inspector_name.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                                            (c.notes || '').toLowerCase().includes(historySearchTerm.toLowerCase())
                                        )
                                        .sort((a, b) => {
                                            let aVal = a[historySortConfig.key];
                                            let bVal = b[historySortConfig.key];
                                            if (historySortConfig.key === 'asset_code') {
                                                aVal = a.asset_code || '';
                                                bVal = b.asset_code || '';
                                            } else if (historySortConfig.key === 'check_date') {
                                                aVal = new Date(aVal).getTime() || 0;
                                                bVal = new Date(bVal).getTime() || 0;
                                            }
                                            if (aVal < bVal) return historySortConfig.order === 'asc' ? -1 : 1;
                                            if (aVal > bVal) return historySortConfig.order === 'asc' ? 1 : -1;
                                            return 0;
                                        })
                                        .map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-3 py-1.5 text-[11px] font-bold text-slate-700">{new Date(c.check_date).toLocaleDateString('id-ID')}</td>
                                            <td className="px-3 py-1.5 text-[11px]">
                                                {c.photos && c.photos.length > 0 ? (
                                                    <a href={`/api${c.photos[0]}`} target="_blank" rel="noreferrer">
                                                        <img src={`/api${c.photos[0]}`} alt="Proof" className="w-10 h-10 object-cover rounded-lg border border-slate-200" onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23e2e8f0"/><text x="50%" y="50%" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle" dy=".3em">N/A</text></svg>'; }} />
                                                    </a>
                                                ) : <span className="text-xs text-slate-400">-</span>}
                                            </td>
                                            <td className="px-3 py-1.5 text-[11px] font-black text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => fetchLogs(c.id)} title="Klik untuk lihat riwayat edit">{c.asset_code}</td>
                                            <td className="px-3 py-1.5 text-[11px] font-bold text-slate-600">{c.location_name}</td>
                                            <td className="px-3 py-1.5 text-[11px] font-bold text-slate-600">{c.type} ({c.weight} Kg)</td>
                                            <td className="px-3 py-1.5 text-[11px] font-bold text-slate-600">{c.inspector_name}</td>
                                            <td className="px-3 py-1.5 text-[11px]">
                                                {c.is_passed ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-black tracking-widest text-emerald-600"><CheckCircle size={14} /> LULUS UJI</span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-xs font-black tracking-widest text-rose-600"><XCircle size={14} /> GAGAL UJI</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-1.5 text-[11px] flex gap-2">
                                                <button onClick={() => { setEditCheckData({...c, newPhoto: null}); setShowEditCheckModal(true); }} className="bg-amber-50 text-amber-600 hover:bg-amber-100 p-2 rounded-lg text-xs transition-colors flex items-center justify-center" title="Edit Inspeksi">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => fetchLogs(c.id)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg text-xs transition-colors flex items-center justify-center" title="Log Perubahan">
                                                    <History size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View for History */}
                        <div className="block md:hidden p-4 space-y-3 bg-slate-50">
                            {checksheets.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 font-bold">Belum ada history inspeksi.</div>
                            ) : checksheets
                                .filter(c => 
                                    (c.asset_code || '').toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                                    c.inspector_name.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                                    (c.notes || '').toLowerCase().includes(historySearchTerm.toLowerCase())
                                )
                                .sort((a, b) => {
                                    let aVal = a[historySortConfig.key];
                                    let bVal = b[historySortConfig.key];
                                    if (historySortConfig.key === 'asset_code') {
                                        aVal = a.asset_code || '';
                                        bVal = b.asset_code || '';
                                    } else if (historySortConfig.key === 'check_date') {
                                        aVal = new Date(aVal).getTime() || 0;
                                        bVal = new Date(bVal).getTime() || 0;
                                    }
                                    if (aVal < bVal) return historySortConfig.order === 'asc' ? -1 : 1;
                                    if (aVal > bVal) return historySortConfig.order === 'asc' ? 1 : -1;
                                    return 0;
                                })
                                .map(c => (
                                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                                        <div className="font-black text-slate-800 text-lg">{c.asset_code}</div>
                                        <div>
                                            {c.is_passed ? (
                                                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black tracking-widest border border-emerald-200 shadow-sm">LULUS</span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 text-[10px] font-black tracking-widest border border-rose-200 shadow-sm">GAGAL</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 cursor-pointer" onClick={() => fetchLogs(c.id)}>
                                        <div>
                                            <div className="text-[10px] uppercase font-black text-slate-400">Lokasi</div>
                                            <div className="text-sm font-bold text-slate-800">{c.location_name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase font-black text-slate-400">Tipe</div>
                                            <div className="text-sm font-bold text-slate-800">{c.type} ({c.weight} Kg)</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        {c.photos && c.photos.length > 0 ? (
                                            <a href={`/api${c.photos[0]}`} target="_blank" rel="noreferrer" className="shrink-0">
                                                <img src={`/api${c.photos[0]}`} alt="Proof" className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm" onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23e2e8f0"/><text x="50%" y="50%" fill="%2394a3b8" font-size="12" font-family="sans-serif" text-anchor="middle" dy=".3em">N/A</text></svg>'; }} />
                                            </a>
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 text-xs shrink-0">No Pic</div>
                                        )}
                                        <div className="flex-1">
                                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Tgl Inspeksi</div>
                                            <div className="text-sm font-bold text-slate-700">{new Date(c.check_date).toLocaleDateString('id-ID')}</div>
                                            
                                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-2">Inspektur</div>
                                            <div className="text-sm font-bold text-slate-700">{c.inspector_name}</div>
                                        </div>
                                    </div>
                                    {c.notes && (
                                        <div className="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Catatan:</span>
                                            <p className="text-sm font-medium text-slate-600 mt-0.5">{c.notes}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-3">
                                        <button onClick={() => { setEditCheckData({...c, newPhoto: null}); setShowEditCheckModal(true); }} className="flex-1 bg-amber-50 text-amber-600 hover:bg-amber-100 p-2 rounded-lg text-xs font-black transition-colors flex items-center justify-center gap-1">
                                            <Edit size={14} /> Edit Inspeksi
                                        </button>
                                        <button onClick={() => fetchLogs(c.id)} className="flex-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg text-xs font-black transition-colors flex items-center justify-center gap-1">
                                            <History size={14} /> Log Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'inspect' && (
                    <div className="max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Form Inspeksi APAR</h2>
                                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Sesuai standar HSE</p>
                            </div>
                        </div>
                        <form onSubmit={submitInspection} className="p-5 space-y-5">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih / Scan APAR</label>
                                    <div className="flex gap-2">
                                        <select 
                                            value={form.apar_id} 
                                            onChange={(e) => {
                                                setForm({...form, apar_id: e.target.value});
                                                const f = apars.find(a => a.id.toString() === e.target.value);
                                                if (f) setSelectedAparCode(f.code);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
                                        >
                                            <option value="">-- Pilih Manual --</option>
                                            {apars.map(a => <option key={a.id} value={a.id}>{a.code} - {a.location}</option>)}
                                        </select>
                                        <button type="button" onClick={startScanner} className="px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center transition-colors">
                                            <QrCode size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Inspektur</label>
                                    <input type="text" required value={form.inspector_name} onChange={(e) => setForm({...form, inspector_name: e.target.value})} placeholder="Masukkan Nama..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Inspeksi</label>
                                    <input type="date" value={form.check_date} onChange={(e) => setForm({...form, check_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all" />
                                </div>
                            </div>

                            {/* Scanner UI */}
                            {scannerActive && (
                                <div className="bg-slate-900 rounded-xl p-4 overflow-hidden relative">
                                    <div className="absolute top-4 right-4 z-10">
                                        <button type="button" onClick={stopScanner} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2"><XCircle size={20} /></button>
                                    </div>
                                    <div id="reader" className="w-full bg-black rounded-lg overflow-hidden"></div>
                                    {scanError && <p className="text-rose-500 text-sm mt-2 text-center font-bold">{scanError}</p>}
                                </div>
                            )}

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="text-sm font-black text-slate-900 tracking-tight mb-4 flex items-center gap-2">
                                    <ClipboardCheck size={18} className="text-indigo-500" /> Item Pemeriksaan
                                </h3>
                                <div className="space-y-3">
                                    {CHECKLIST_CONFIG.map(renderRadioGroup)}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="text-sm font-black text-slate-900 tracking-tight mb-4 flex items-center gap-2">
                                    <Camera size={18} className="text-indigo-500" /> Lampiran Foto Bukti <span className="text-rose-500">*</span>
                                </h3>
                                
                                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-5 text-center hover:bg-slate-100/50 transition-colors">
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*" 
                                        capture="environment"
                                        onChange={handleFileChange}
                                        className="hidden" 
                                        id="photo-upload"
                                    />
                                    <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                                        <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center text-indigo-500 mb-3 group-hover:scale-110 transition-transform">
                                            <Camera size={24} />
                                        </div>
                                        <span className="text-sm font-bold text-indigo-600">Ambil Foto atau Pilih dari Galeri (Wajib)</span>
                                        <span className="text-xs text-slate-400 mt-1 font-medium">Bisa pilih beberapa foto sekaligus</span>
                                    </label>
                                </div>
                                {photos.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {photos.map((file, i) => (
                                            <div key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 flex items-center gap-2">
                                                {file.name}
                                                <button type="button" onClick={() => setPhotos(photos.filter((_, index) => index !== i))} className="hover:text-rose-500"><XCircle size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan Tambahan (Opsional)</label>
                                <textarea 
                                    rows="3" 
                                    value={form.notes} 
                                    onChange={(e) => setForm({...form, notes: e.target.value})}
                                    placeholder="Tuliskan catatan detail jika ada temuan rusak..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                                    <Save size={18} /> Simpan Hasil Inspeksi
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Modal Tambah APAR */}
            {showAddAparModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-slate-900">Tambah APAR Baru</h3>
                            <button onClick={() => setShowAddAparModal(false)} className="text-slate-400 hover:text-rose-500"><XCircle size={20}/></button>
                        </div>
                        <form onSubmit={handleAddApar} className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kode APAR</label>
                                <input type="text" required value={newApar.code} onChange={e => setNewApar({...newApar, code: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Contoh: AP-001"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi</label>
                                <input type="text" required value={newApar.location} onChange={e => setNewApar({...newApar, location: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Contoh: Area Produksi"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipe</label>
                                    <select value={newApar.type} onChange={e => setNewApar({...newApar, type: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                        <option>Dry Chemical</option>
                                        <option>CO2</option>
                                        <option>Foam</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Berat (Kg)</label>
                                    <input type="number" step="0.1" required value={newApar.weight} onChange={e => setNewApar({...newApar, weight: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tgl Kadaluarsa</label>
                                <input type="date" required value={newApar.expired_date} onChange={e => setNewApar({...newApar, expired_date: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Foto Fisik APAR (Opsional)</label>
                                <input type="file" accept="image/*" onChange={e => setNewApar({...newApar, photo: e.target.files[0]})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50"/>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700">Simpan APAR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit APAR */}
            {showEditAparModal && editAparData && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-slate-100 bg-amber-50 flex justify-between items-center">
                            <h3 className="font-black text-amber-900">Perbarui Master Data APAR</h3>
                            <button onClick={() => setShowEditAparModal(false)} className="text-amber-400 hover:text-amber-600"><XCircle size={20}/></button>
                        </div>
                        <form onSubmit={handleUpdateApar} className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kode APAR</label>
                                <input type="text" required value={editAparData.code} onChange={e => setEditAparData({...editAparData, code: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Contoh: AP-001"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi</label>
                                <input type="text" required value={editAparData.location} onChange={e => setEditAparData({...editAparData, location: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Contoh: Area Produksi"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipe</label>
                                    <select value={editAparData.type} onChange={e => setEditAparData({...editAparData, type: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                        <option>Dry Chemical</option>
                                        <option>CO2</option>
                                        <option>Foam</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Berat (Kg)</label>
                                    <input type="number" step="0.1" required value={editAparData.weight} onChange={e => setEditAparData({...editAparData, weight: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Perpanjang Tgl Kadaluarsa</label>
                                <input type="date" required value={editAparData.expired_date} onChange={e => setEditAparData({...editAparData, expired_date: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Perbarui Foto Fisik (Opsional)</label>
                                <input type="file" accept="image/*" onChange={e => setEditAparData({...editAparData, photo: e.target.files[0]})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50"/>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button type="submit" className="bg-amber-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-600">Simpan Perubahan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Modal Edit Inspeksi */}
            {showEditCheckModal && editCheckData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <Edit size={24} className="text-amber-500" /> Edit Inspeksi {editCheckData.asset_code}
                                </h3>
                                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Update Data & Status</p>
                            </div>
                            <button onClick={() => setShowEditCheckModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto custom-scrollbar">
                            <form id="editCheckForm" onSubmit={submitEditCheck} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tanggal Inspeksi</label>
                                    <input type="date" required value={editCheckData.check_date.split('T')[0]} onChange={e => setEditCheckData({...editCheckData, check_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Inspektur</label>
                                    <input type="text" required value={editCheckData.inspector_name} onChange={e => setEditCheckData({...editCheckData, inspector_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Status Inspeksi</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl cursor-pointer transition-all border ${editCheckData.is_passed === true || editCheckData.is_passed === 'true' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                                            <input type="radio" name="is_passed" value="true" checked={editCheckData.is_passed === true || editCheckData.is_passed === 'true'} onChange={() => setEditCheckData({...editCheckData, is_passed: true})} className="hidden" />
                                            <CheckCircle size={18} /> <span className="font-bold">OK / LULUS</span>
                                        </label>
                                        <label className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl cursor-pointer transition-all border ${editCheckData.is_passed === false || editCheckData.is_passed === 'false' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                                            <input type="radio" name="is_passed" value="false" checked={editCheckData.is_passed === false || editCheckData.is_passed === 'false'} onChange={() => setEditCheckData({...editCheckData, is_passed: false})} className="hidden" />
                                            <XCircle size={18} /> <span className="font-bold">RUSAK / GAGAL</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Catatan</label>
                                    <textarea value={editCheckData.notes} onChange={e => setEditCheckData({...editCheckData, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" rows="3" placeholder="Masukkan catatan inspeksi..."></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Ganti Foto Bukti (Opsional)</label>
                                    <input type="file" accept="image/*" onChange={e => setEditCheckData({...editCheckData, newPhoto: e.target.files[0]})} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer" />
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowEditCheckModal(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Batal</button>
                            <button type="submit" form="editCheckForm" className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all flex items-center gap-2">
                                <Save size={18} /> Update Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Log Viewer */}
            {showLogModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <History size={24} className="text-indigo-500" /> Riwayat Perubahan (Audit Log)
                                </h3>
                                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Catatan Edit Inspeksi (Immutable)</p>
                            </div>
                            <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                            {logData.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 font-bold">Belum ada riwayat edit untuk inspeksi ini.</div>
                            ) : (
                                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                    {logData.map((log, idx) => (
                                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-50 text-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                <Edit size={16} />
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="font-bold text-slate-800 text-sm">{log.edited_by}</div>
                                                    <time className="text-[10px] font-black text-slate-400 uppercase">{new Date(log.edited_at).toLocaleString('id-ID', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                                                </div>
                                                <div className="space-y-2 mt-3 text-xs">
                                                    {Object.entries(typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes).map(([key, vals]) => (
                                                        <div key={key} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                            <div className="text-[10px] font-black uppercase text-indigo-600 mb-1">{key}</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-rose-500 line-through truncate flex-1">{String(vals.old)}</span>
                                                                <ArrowRight size={12} className="text-slate-400 shrink-0" />
                                                                <span className="text-emerald-600 font-bold truncate flex-1">{String(vals.new)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldAlert, Plus, QrCode, ClipboardCheck, History, CheckCircle, XCircle, Camera, Save, ArrowRight, Car, Building } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import AssetLabel from '../components/AssetLabel';
import AparDashboard from '../components/AparDashboard';

const FACILITY_CATEGORIES = [
    { id: 'Kendaraan', label: 'Kendaraan', icon: <Car size={16} /> },
    { id: 'Fasilitas Gedung', label: 'Gedung', icon: <Building size={16} /> },
    { id: 'Fasilitas Kantor', label: 'Fasilitas Kantor', icon: <ShieldAlert size={16} /> }
];

const CHECKLIST_CONFIGS = {
    'Kendaraan': [
        { key: 'oli', label: '1. Oli Mesin', desc: 'Level oli normal dan tidak ada kebocoran.' },
        { key: 'ban', label: '2. Tekanan & Kondisi Ban', desc: 'Tekanan ban sesuai standar, kembang ban masih tebal.' },
        { key: 'rem', label: '3. Rem & Kampas', desc: 'Fungsi pengereman optimal, tidak ada bunyi gesekan.' },
        { key: 'lampu', label: '4. Lampu & Kelistrikan', desc: 'Semua lampu menyala, klakson berfungsi normal.' },
        { key: 'aki', label: '5. Air Radiator & Aki', desc: 'Air radiator cukup, tegangan aki normal.' },
        { key: 'bersih', label: '6. Kebersihan Kendaraan', desc: 'Interior dan eksterior bersih dari kotoran/sampah.' }
    ],
    'Fasilitas Gedung': [
        { key: 'struktur', label: '1. Struktur Bangunan', desc: 'Dinding, lantai, tiang tidak retak/rusak.' },
        { key: 'listrik', label: '2. Kelistrikan / Penerangan', desc: 'Lampu ruangan menyala, stop kontak berfungsi aman.' },
        { key: 'atap', label: '3. Plafon & Atap', desc: 'Plafon tidak bocor, tidak berjamur, atau lepas.' },
        { key: 'sanitasi', label: '4. Sanitasi / Toilet', desc: 'Air mengalir lancar, kloset & wastafel bersih/berfungsi.' },
        { key: 'bersih', label: '5. Kebersihan Area', desc: 'Koridor dan ruangan terawat rapi dan bersih.' }
    ],
    'Fasilitas Kantor': [
        { key: 'fisik', label: '1. Kondisi Fisik Furniture', desc: 'Meja/kursi/lemari tidak patah, retak, atau sobek.' },
        { key: 'fungsi', label: '2. Fungsi Engsel / Laci', desc: 'Laci bisa ditarik lancar, pintu lemari/engsel kursi berfungsi baik.' },
        { key: 'bersih', label: '3. Kebersihan', desc: 'Permukaan fasilitas bersih dari noda dan debu tebal.' }
    ]
};

export default function HRDMaintenance() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'master';
    const selectedCategory = searchParams.get('category') || 'Kendaraan';
    const prefillAssetId = searchParams.get('asset_id');
    const setActiveTab = (tabId) => setSearchParams({ tab: tabId, category: selectedCategory });
    const setSelectedCategory = (catId) => setSearchParams({ tab: activeTab, category: catId });
    
    // Data states
    const [items, setItems] = useState([]); // Can be APARs or Inventory
    const [checksheets, setChecksheets] = useState([]);
    
    // UI States
    const [scannerActive, setScannerActive] = useState(false);
    const [scanError, setScanError] = useState('');
    const [selectedItemCode, setSelectedItemCode] = useState('');
    
    // Form States
    const [form, setForm] = useState({
        item_id: '',
        check_date: new Date().toISOString().split('T')[0],
        notes: '',
        check_data: {}
    });

    const [showLabelModal, setShowLabelModal] = useState(false);
    const [labelItem, setLabelItem] = useState(null);
    const qrScannerRef = useRef(null);

    // Release camera on unmount
    useEffect(() => {
        return () => {
            if (qrScannerRef.current) {
                qrScannerRef.current.stop().catch(() => {});
            }
        };
    }, []);
    const [showAddAparModal, setShowAddAparModal] = useState(false);
    const [newApar, setNewApar] = useState({ code: '', location: '', type: 'Dry Chemical', weight: 3, expired_date: '' });

    useEffect(() => {
        fetchData();
        fetchChecksheets();
        resetForm();
    }, [selectedCategory]);

    let actualCategory = 'Fasilitas Kantor';
    const catSearch = selectedCategory.toLowerCase();
    if (catSearch.includes('kendaraan') || catSearch.includes('motor') || catSearch.includes('mobil')) actualCategory = 'Kendaraan';
    else if (catSearch.includes('gedung') || catSearch.includes('bangunan') || catSearch.includes('ac')) actualCategory = 'Fasilitas Gedung';
    
    const categoryLabel = FACILITY_CATEGORIES.find(c => c.id === actualCategory)?.label || actualCategory;
    const currentChecklist = CHECKLIST_CONFIGS[actualCategory];

    const resetForm = () => {
        const defaultChecks = {};
        currentChecklist.forEach(c => defaultChecks[c.key] = true);
        
        setForm({
            item_id: prefillAssetId || '',
            check_date: new Date().toISOString().split('T')[0],
            notes: '',
            check_data: defaultChecks
        });
        
        // Only set the selectedItemCode if we have a prefill ID and items are loaded
        if (prefillAssetId && items.length > 0) {
            const f = items.find(a => a.id.toString() === prefillAssetId);
            if (f) setSelectedItemCode(f.asset_tag || f.name || f.model_name);
        } else {
            setSelectedItemCode('');
        }
    };

    const fetchData = async () => {
        try {
            if (selectedCategory === 'apar') {
                const res = await fetch('/api/hr/apars/master');
                const data = await res.json();
                if (data.success) {
                    setItems(data.data.map(a => ({
                        id: a.id,
                        asset_tag: a.code,
                        name: a.type,
                        model_name: `${a.weight} Kg`,
                        category_name: 'APAR',
                        location_name: a.location,
                        ...a
                    })));
                }
            } else {
                const res = await fetch('/api/hr/assets');
                const data = await res.json();
                if (data.success) {
                    const assets = data.data;
                    let filtered = [];
                    if (selectedCategory === 'Kendaraan') {
                        filtered = assets.filter(a => a.category_name && (a.category_name.toLowerCase().includes('kendaraan') || a.category_name.toLowerCase().includes('motor') || a.category_name.toLowerCase().includes('mobil')));
                    } else if (selectedCategory === 'Fasilitas Gedung') {
                        filtered = assets.filter(a => a.category_name && (a.category_name.toLowerCase().includes('gedung') || a.category_name.toLowerCase().includes('ac') || a.category_name.toLowerCase().includes('bangunan')));
                    } else if (selectedCategory === 'Fasilitas Kantor') {
                        filtered = assets.filter(a => a.category_name && (a.category_name.toLowerCase().includes('meja') || a.category_name.toLowerCase().includes('kursi') || a.category_name.toLowerCase().includes('lemari') || a.category_name.toLowerCase().includes('peralatan')));
                    } else {
                        filtered = assets;
                    }
                    setItems(filtered);
                }
            }
            
            // Set initial prefill after items are loaded
            if (prefillAssetId) {
                // ... timeout to ensure state update
                setTimeout(() => {
                    setForm(prev => ({ ...prev, item_id: prefillAssetId }));
                }, 100);
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        }
    };

    const fetchChecksheets = async () => {
        try {
            const res = await fetch(`/api/hr/maintenance/checksheets?category=${selectedCategory}`);
            const data = await res.json();
            if (data.success) setChecksheets(data.data);
        } catch (err) {
            console.error('Failed to fetch checksheets', err);
        }
    };

    const startScanner = () => {
        setScannerActive(true);
        setScanError('');
        setTimeout(() => {
            try {
                if (!qrScannerRef.current) {
                    qrScannerRef.current = new Html5Qrcode("reader");
                }
                
                const startCamera = (cameraConfig) => {
                    qrScannerRef.current.start(
                        cameraConfig,
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        (decodedText) => {
                            let extractedId = decodedText;
                            
                            // Check if it's a URL (from Google Lens compatible labels)
                            if (decodedText.includes('asset_id=')) {
                                try {
                                    const urlParams = new URLSearchParams(decodedText.split('?')[1]);
                                    if (urlParams.has('asset_id')) {
                                        extractedId = urlParams.get('asset_id');
                                    }
                                } catch (e) {}
                            } else if (decodedText.includes('/assets/')) {
                                extractedId = decodedText.split('/').pop();
                            }
                            
                            const code = extractedId.replace('HR-', ''); 
                            let found = items.find(a => a.asset_tag === decodedText || a.id.toString() === code);
                            
                            if (found) {
                                setForm(f => ({ ...f, item_id: found.id }));
                                setSelectedItemCode(found.asset_tag || found.name || found.model_name);
                                stopScanner();
                                alert(`Berhasil mendeteksi: ${found.asset_tag || found.name}`);
                            } else {
                                setScanError(`Item ${decodedText} tidak ditemukan di kategori ${selectedCategory}.`);
                            }
                        },
                        (errorMessage) => {
                            // ignore constant scanning failures
                        }
                    ).catch(err => {
                        console.error("Camera start failed with config", cameraConfig, ":", err);
                        if (cameraConfig.facingMode === "environment") {
                            // Fallback to front camera or default
                            startCamera(true); // true means any default camera in html5-qrcode
                        } else {
                            setScanError(`Kamera gagal dibuka. Pastikan PC/HP memiliki kamera, dan izin browser diberikan.`);
                        }
                    });
                };

                startCamera({ facingMode: "environment" });
            } catch (e) {
                console.error("Error creating QR scanner:", e);
                setScanError("Gagal menginisialisasi kamera.");
            }
        }, 300);
    };

    const stopScanner = () => {
        if (qrScannerRef.current) {
            qrScannerRef.current.stop().then(() => {
                qrScannerRef.current = null;
                setScannerActive(false);
            }).catch(err => {
                console.error("Failed to stop QR scanner:", err);
                qrScannerRef.current = null;
                setScannerActive(false);
            });
        } else {
            setScannerActive(false);
        }
    };

    const submitInspection = async (e) => {
        e.preventDefault();
        if (!form.item_id) return alert("Pilih item terlebih dahulu!");
        
        try {
            const config = CHECKLIST_CONFIGS[actualCategory];
            let isPassed = true;
            config.forEach(c => {
                if (form.check_data[c.key] === false) isPassed = false;
            });
            
            const payload = {
                asset_id: form.item_id,
                category: actualCategory,
                inspector_name: JSON.parse(sessionStorage.getItem('user'))?.name || 'Admin',
                check_date: form.check_date,
                notes: form.notes,
                is_passed: isPassed,
                check_data: form.check_data
            };

            const res = await fetch('/api/hr/maintenance/checksheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert("Checksheet berhasil disimpan!");
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

    const renderRadioGroup = (c) => (
        <div key={c.key} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
            <div>
                <span className="block text-sm font-bold text-slate-700">{c.label}</span>
                <span className="text-xs font-semibold text-slate-400">{c.desc}</span>
            </div>
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" checked={form.check_data[c.key] === true} onChange={() => setForm({ ...form, check_data: {...form.check_data, [c.key]: true} })} className="w-4 h-4 text-emerald-600 focus:ring-emerald-600 border-slate-300" />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-600 transition-colors">Baik</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" checked={form.check_data[c.key] === false} onChange={() => setForm({ ...form, check_data: {...form.check_data, [c.key]: false} })} className="w-4 h-4 text-rose-600 focus:ring-rose-600 border-slate-300" />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-rose-600 transition-colors">Rusak</span>
                </label>
            </div>
        </div>
    );

    return (
        <div className="space-y-3 pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Maintenance Hub</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Sistem Inspeksi & Perawatan Terpadu Fasilitas HRGA</p>
                </div>
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-2 md:flex md:flex-nowrap gap-2 pb-2 border-b border-slate-200 w-full">
                {FACILITY_CATEGORIES.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all border-b-2 ${selectedCategory === cat.id ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-400 border-transparent hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* Custom Tabs */}
            <div className="grid grid-cols-3 md:flex gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-fit">
                <button onClick={() => setActiveTab('master')} className={`flex-1 md:flex-initial text-center justify-center px-4 py-2.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'master' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Master Data</button>
                <button onClick={() => setActiveTab('inspect')} className={`flex-1 md:flex-initial text-center justify-center px-4 py-2.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'inspect' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <ClipboardCheck size={14} /> Inspeksi Baru
                </button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-initial text-center justify-center px-4 py-2.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Riwayat Inspeksi</button>
            </div>

            {/* TAB: Master Data */}
            {activeTab === 'master' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-max md:min-w-0">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-4 md:px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Tag</th>
                                <th className="px-4 md:px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                                <th className="px-4 md:px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Kategori</th>
                                <th className="px-4 md:px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Lokasi</th>
                                <th className="px-4 md:px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-bold">Tidak ada data di kategori ini.</td>
                                </tr>
                            )}
                            {items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-1.5 text-[11px] font-bold text-slate-700">{item.asset_tag}</td>
                                    <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-900 whitespace-normal min-w-[120px]">{item.name || item.model_name}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-[11px] text-slate-500 hidden md:table-cell">{item.category_name}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-[11px] text-slate-500 hidden sm:table-cell">{item.location_name || item.default_location_name || '-'}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setSearchParams({ tab: 'inspect', category: selectedCategory, asset_id: item.id });
                                                }}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title="Eksekusi Inspeksi"
                                            >
                                                <ClipboardCheck size={18} />
                                            </button>
                                            <button onClick={() => { 
                                                setLabelItem({
                                                    name: item.name || item.model_name,
                                                    inventory_number: item.asset_tag,
                                                    category: item.category_name,
                                                    brand: 'TCF',
                                                    model: item.model_name,
                                                    uuid: item.asset_tag,
                                                    id: item.id
                                                }); 
                                                setShowLabelModal(true); 
                                            }} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Print QR Label">
                                                <QrCode size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB: Inspeksi Baru */}
            {activeTab === 'inspect' && (
                <div className="max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">Form Pengecekan - {categoryLabel}</h2>
                            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Sesuai standar operasional</p>
                        </div>
                    </div>
                    <form onSubmit={submitInspection} className="p-5 space-y-5">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih / Scan Item</label>
                                <div className="flex gap-2">
                                    <select 
                                        value={form.item_id} 
                                        onChange={(e) => {
                                            setForm({...form, item_id: e.target.value});
                                            const f = items.find(a => a.id.toString() === e.target.value);
                                            if (f) setSelectedItemCode(f.asset_tag || f.name || f.model_name);
                                        }}
                                        disabled={!!prefillAssetId}
                                        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all appearance-none ${prefillAssetId ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">-- Pilih Manual --</option>
                                        {items.map(a => <option key={a.id} value={a.id}>{a.asset_tag} - {a.name || a.model_name}</option>)}
                                    </select>
                                    {!prefillAssetId && (
                                        <button type="button" onClick={startScanner} className="px-4 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center transition-colors">
                                            <QrCode size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Inspeksi</label>
                                <input type="date" value={form.check_date} onChange={(e) => setForm({...form, check_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 outline-none transition-all" />
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

                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 mb-4">Item Pemeriksaan Fisik</h3>
                            {currentChecklist.map(c => renderRadioGroup(c))}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Tambahan (Opsional)</label>
                            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 outline-none transition-all" placeholder="Ada temuan khusus?"></textarea>
                        </div>

                        {selectedCategory === 'apar' && (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto Bukti Inspeksi (Opsional)</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                        <Camera size={18} className="text-slate-400" />
                                        <span className="text-sm font-semibold text-slate-600">Ambil Foto / Pilih File</span>
                                        <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setPhotos([...photos, ...Array.from(e.target.files)])} className="hidden" />
                                    </label>
                                    <span className="text-xs text-slate-400">{photos.length} foto terpilih</span>
                                </div>
                                {photos.length > 0 && (
                                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                                        {photos.map((p, i) => (
                                            <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                                                <img src={URL.createObjectURL(p)} alt="Preview" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><XCircle size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20 transition-all flex items-center gap-2">
                                <Save size={18} /> Simpan Hasil Inspeksi
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB: History */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Code</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest">Lokasi</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {checksheets.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-bold">Belum ada riwayat inspeksi di kategori ini.</td>
                                </tr>
                            )}
                            {checksheets.map(cs => (
                                <tr key={cs.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-1.5 text-[11px] text-[11px] text-slate-500 font-medium">{new Date(cs.check_date).toLocaleDateString()}</td>
                                    <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-700">{cs.asset_code}</td>
                                    <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-900">{cs.asset_name}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-[11px] text-slate-500">{cs.location_name || '-'}</td>
                                    <td className="px-3 py-1.5 text-[11px] text-right">
                                        {cs.is_passed ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600"><CheckCircle size={14} /> Normal</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600"><XCircle size={14} /> Defect</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] text-right text-[11px] font-semibold text-slate-500">{cs.notes || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Label Modal */}
            {showLabelModal && labelItem && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-900">Print Label QR</h3>
                            <button onClick={() => setShowLabelModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
                        </div>
                        <div className="p-5 bg-slate-50 flex justify-center">
                            <div className="scale-90 origin-top">
                                <AssetLabel asset={{
                                    name: selectedCategory === 'apar' ? 'Fire Extinguisher' : labelItem.item_name,
                                    inventory_number: selectedCategory === 'apar' ? labelItem.code : `HR-${labelItem.id}`,
                                    category: selectedCategory === 'apar' ? 'APAR' : selectedCategory,
                                    brand: selectedCategory === 'apar' ? labelItem.type : labelItem.brand,
                                    model: selectedCategory === 'apar' ? `${labelItem.weight}kg` : labelItem.model,
                                    uuid: selectedCategory === 'apar' ? labelItem.code : labelItem.id, // The scanner checks this
                                    id: labelItem.id
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add APAR Modal - Disabled/Hidden because it's now managed in Snipe-IT */}
        </div>
    );
}

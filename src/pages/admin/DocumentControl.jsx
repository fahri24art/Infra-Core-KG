import React, { useState, useEffect } from 'react';
import { 
    FileText, Upload, Search, Trash2, CheckCircle, X, Eye, FileDown, 
    ArrowRight, MonitorSpeaker, Wrench, Package, Shield, Folder, 
    ChevronDown, ChevronRight, Layers, ExternalLink, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

const getProcedures = (plantCode = 'TCFSG') => [
    { id: 'ALL', label: 'Semua Prosedur', icon: Layers, color: 'slate' },
    { id: 'SOP-01', label: 'SOP-01: Pemeliharaan', code: `${plantCode}-SOP-ICT-01`, title: 'Pemeliharaan Perangkat ICT', icon: MonitorSpeaker, color: 'blue' },
    { id: 'SOP-02', label: 'SOP-02: Perbaikan', code: `${plantCode}-SOP-ICT-02`, title: 'Perbaikan Perangkat ICT', icon: Wrench, color: 'amber' },
    { id: 'SOP-03', label: 'SOP-03: Permintaan', code: `${plantCode}-SOP-ICT-03`, title: 'Permintaan Fasilitas ICT', icon: Package, color: 'indigo' },
    { id: 'SOP-04', label: 'SOP-04: Cyber Security', code: `${plantCode}-SOP-ICT-04`, title: 'Cyber Attack Prevention', icon: Shield, color: 'rose' },
    { id: 'QMR', label: 'Master QMR & Audit', code: 'QMR', title: 'Master Dokumen & Audit QMR', icon: FileText, color: 'emerald' },
];

export default function DocumentControl() {
    const org = (typeof window !== 'undefined' && sessionStorage.getItem('organization')) || 'TCF-SG';
    const isKG = org.toUpperCase().includes('KG');
    const plantCode = isKG ? 'TCFKG' : 'TCFSG';
    const PROCEDURES = getProcedures(plantCode);

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProc, setSelectedProc] = useState('ALL');
    const [filterType, setFilterType] = useState('All');
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Upload Form State
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [docType, setDocType] = useState('SOP');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/network/documents');
            const data = await res.json();
            setDocuments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch documents", err);
        } finally {
            setLoading(false);
        }
    };

    const getDocProcedureId = (doc) => {
        const full = `${doc.title || ''} ${doc.description || ''}`.toLowerCase();
        if (full.includes('sop-01') || full.includes('ict-01') || full.includes('pemeliharaan')) return 'SOP-01';
        if (full.includes('sop-02') || full.includes('ict-02') || full.includes('perbaikan')) return 'SOP-02';
        if (full.includes('sop-03') || full.includes('ict-03') || full.includes('permintaan')) return 'SOP-03';
        if (full.includes('sop-04') || full.includes('ict-04') || full.includes('cyber') || full.includes('security')) return 'SOP-04';
        if (full.includes('qmr') || full.includes('master') || full.includes('risiko') || full.includes('audit')) return 'QMR';
        return 'OTHER';
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert('Silahkan pilih file terlebih dahulu!');
        
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title || file.name);
        formData.append('type', docType);
        formData.append('description', description);
        formData.append('uploaded_by', 'Admin ICT');

        try {
            const res = await fetch('/api/network/documents/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setShowUploadModal(false);
                setFile(null);
                setTitle('');
                setDescription('');
                fetchDocuments();
            } else {
                alert(data.error || 'Gagal mengupload dokumen.');
            }
        } catch (err) {
            console.error('Upload error', err);
            alert('Terjadi kesalahan saat mengupload dokumen.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id, docTitle) => {
        if (!window.confirm(`Yakin ingin menghapus dokumen "${docTitle}"?`)) return;
        try {
            const res = await fetch(`/api/network/documents/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchDocuments();
            }
        } catch (err) {
            console.error('Delete error', err);
            alert('Gagal menghapus dokumen.');
        }
    };

    // Filter documents
    const filteredDocs = documents.filter(doc => {
        const matchesSearch = (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (doc.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const procId = getDocProcedureId(doc);
        const matchesProc = selectedProc === 'ALL' || procId === selectedProc;
        const matchesType = filterType === 'All' || doc.type === filterType;
        return matchesSearch && matchesProc && matchesType;
    });

    // Counts per procedure
    const getProcCount = (procId) => {
        if (procId === 'ALL') return documents.length;
        return documents.filter(d => getDocProcedureId(d) === procId).length;
    };

    // Grouping by Sub-Types inside a Procedure
    const groupDocsByType = (docs) => {
        return {
            sop: docs.filter(d => d.type === 'SOP'),
            ik: docs.filter(d => d.type === 'IK'),
            form: docs.filter(d => d.type === 'Form'),
            other: docs.filter(d => !['SOP', 'IK', 'Form'].includes(d.type))
        };
    };

    const renderDocumentRow = (doc) => (
        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 group">
            <td className="px-4 py-3">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                    <span>{doc.title}</span>
                </div>
                {doc.description && (
                    <div className="text-xs text-slate-500 mt-0.5 ml-6">{doc.description}</div>
                )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-rose-50 text-rose-600 border border-rose-200/80">
                        PDF
                    </span>
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-lg ${
                        doc.type === 'SOP' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' :
                        doc.type === 'IK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                        doc.type === 'Form' ? 'bg-purple-50 text-purple-700 border border-purple-200/60' :
                        doc.type === 'Audit' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                        'bg-slate-100 text-slate-700'
                    }`}>
                        {doc.type}
                    </span>
                </div>
            </td>
            <td className="px-4 py-3 text-xs text-slate-500 font-medium whitespace-nowrap">
                {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </td>
            <td className="px-4 py-3 text-right whitespace-nowrap">
                <div className="flex justify-end items-center gap-1.5">
                    <a 
                        href={`/api/uploads/${doc.filename}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                        title="Lihat / Preview"
                    >
                        <Eye size={15} />
                    </a>
                    <a 
                        href={`/api/uploads/${doc.filename}`}
                        download={doc.original_filename || doc.filename}
                        className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                        title="Download Dokumen Asli"
                    >
                        <FileDown size={15} />
                    </a>
                    <button 
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors"
                        title="Hapus"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </td>
        </tr>
    );

    const renderGroupTable = (title, docs, badgeBg, badgeText) => {
        if (!docs || docs.length === 0) return null;
        return (
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${badgeBg}`} />
                        <h4 className="font-black text-slate-900 text-sm tracking-wide">{title}</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        {docs.length} Dokumen
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-100 text-[11px] font-black tracking-wider uppercase text-slate-400">
                                <th className="px-4 py-2">Nama & Nomor Dokumen</th>
                                <th className="px-4 py-2">Tipe</th>
                                <th className="px-4 py-2">Tanggal Terbit</th>
                                <th className="px-4 py-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.map(renderDocumentRow)}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white p-6 rounded-3xl shadow-lg border border-slate-800">
                <div>
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                            <FileText size={22} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                                Document Control
                                <span className="text-xs bg-blue-500/20 text-blue-300 font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
                                    ISO & QMR
                                </span>
                            </h1>
                            <p className="text-slate-300 text-xs md:text-sm font-medium mt-0.5">
                                Softcopy Dokumen Resmi Berstempel QMR (Format PDF) untuk keperluan Audit & Manajemen.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Link 
                        to="/ict/document-studio"
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                    >
                        <Layers size={15} /> Buka Document Studio
                    </Link>
                    <Link 
                        to="/ict/documents"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 rounded-xl font-bold text-xs transition-all active:scale-95"
                    >
                        <Folder size={15} /> Draft & Mentahan
                    </Link>
                    <button 
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95"
                    >
                        <Upload size={15} /> Upload Dokumen
                    </button>
                </div>
            </div>

            {/* Navigasi Kategori Prosedur (Tabs Utama) */}
            <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex overflow-x-auto gap-1.5 scrollbar-none pb-1 md:pb-0">
                    {PROCEDURES.map((p) => {
                        const IconComponent = p.icon;
                        const count = getProcCount(p.id);
                        const isSelected = selectedProc === p.id;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProc(p.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                                    isSelected 
                                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20 scale-[1.02]' 
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <IconComponent size={14} className={isSelected ? 'text-amber-400' : 'text-slate-400'} />
                                <span>{p.label}</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[240px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                        type="text" 
                        placeholder="Cari nama atau nomor dokumen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-medium"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Sub-Filter Tipe Dokumen */}
            <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter Tipe:</span>
                {['All', 'SOP', 'IK', 'Form', 'Audit'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            filterType === type 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {type === 'All' ? 'Semua Tipe' : type}
                    </button>
                ))}
            </div>

            {/* Content Display: Render by Procedure / Group */}
            {loading ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-medium">
                    Memuat daftar dokumen resmi...
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                    <FileText size={36} className="text-slate-300 mx-auto mb-2" />
                    <h3 className="font-bold text-slate-700 text-sm">Tidak ada dokumen ditemukan</h3>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau ganti filter prosedur.</p>
                </div>
            ) : selectedProc !== 'ALL' ? (
                // Single Procedure View
                <div>
                    {(() => {
                        const groups = groupDocsByType(filteredDocs);
                        return (
                            <>
                                {renderGroupTable("1. Standar Operasional Prosedur (SOP)", groups.sop, "bg-blue-500")}
                                {renderGroupTable("2. Instruksi Kerja & Standard (IK & STD)", groups.ik, "bg-emerald-500")}
                                {renderGroupTable("3. Formulir & Checksheet Operasional (Form)", groups.form, "bg-purple-500")}
                                {renderGroupTable("4. Dokumen & Data Pendukung", groups.other, "bg-amber-500")}
                            </>
                        );
                    })()}
                </div>
            ) : (
                // All Procedures Grouped View
                <div className="space-y-6">
                    {PROCEDURES.filter(p => p.id !== 'ALL').map(proc => {
                        const procDocs = filteredDocs.filter(d => getDocProcedureId(d) === proc.id);
                        if (procDocs.length === 0) return null;
                        const groups = groupDocsByType(procDocs);
                        const IconComponent = proc.icon;

                        return (
                            <div key={proc.id} className="bg-slate-50/60 p-4 rounded-3xl border border-slate-200/80">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                                            <IconComponent size={16} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 text-base">{proc.title}</h3>
                                            <span className="text-[11px] font-bold text-slate-500">{proc.code}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedProc(proc.id)}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        Buka Folder Ini <ArrowRight size={13} />
                                    </button>
                                </div>

                                {renderGroupTable("Prosedur Utama (SOP)", groups.sop, "bg-blue-500")}
                                {renderGroupTable("Instruksi Kerja & Standard (IK & STD)", groups.ik, "bg-emerald-500")}
                                {renderGroupTable("Formulir Operasional (Form)", groups.form, "bg-purple-500")}
                                {renderGroupTable("Dokumen Terkait Lainnya", groups.other, "bg-amber-500")}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-black text-slate-900 text-base">Upload Dokumen Resmi</h3>
                            <button onClick={() => setShowUploadModal(false)} className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700">
                                <X size={14} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleUpload} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Dokumen</label>
                                <input 
                                    type="text" 
                                    placeholder="Contoh: TCFSG-SOP-ICT-03 Prosedur..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Dokumen</label>
                                <select 
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 bg-white"
                                >
                                    <option value="SOP">SOP (Standar Operasional Prosedur)</option>
                                    <option value="IK">IK (Instruksi Kerja & Standard)</option>
                                    <option value="Form">Form (Formulir Operasional)</option>
                                    <option value="Audit">Audit (Master QMR / Dokumen Audit)</option>
                                    <option value="Other">Lainnya</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">File Dokumen (Excel / Word / PDF)</label>
                                <input 
                                    type="file" 
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Prosedur</label>
                                <textarea 
                                    rows="2"
                                    placeholder="Deskripsi singkat..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-600 resize-none"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {uploading ? 'Mengupload...' : 'Upload Dokumen'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

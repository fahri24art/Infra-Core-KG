import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
    FileText, FileSpreadsheet, FileDown, ArrowLeft, Send, CheckCircle2,
    Building2, Calendar, User, ShieldCheck, Sparkles, Layers,
    Search, Clock, AlertCircle, HelpCircle, Download, Check, Paperclip, FileCheck
} from 'lucide-react';
import logo from '../assets/Logo_TCF_Sec_Processed.png';
import { generateDeptBudgetRequestPdf } from '../utils/generateDeptBudgetRequestPdf';
import { exportDeptBudgetExcel } from '../utils/generateDeptBudgetRequestExcel';
import { DEPARTMENTS_LIST, REQUEST_CATEGORIES } from './ict/BudgetingCenter';

const MONTH_NAMES = [
    { key: 'jan', label: 'Januari' },
    { key: 'feb', label: 'Februari' },
    { key: 'mar', label: 'Maret' },
    { key: 'apr', label: 'April' },
    { key: 'may', label: 'Mei' },
    { key: 'jun', label: 'Juni' },
    { key: 'jul', label: 'Juli' },
    { key: 'aug', label: 'Agustus' },
    { key: 'sep', label: 'September' },
    { key: 'oct', label: 'Oktober' },
    { key: 'nov', label: 'November' },
    { key: 'dec', label: 'Desember' }
];

export default function PublicBudgetRequest() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear, currentYear + 1, currentYear + 2];

    const initialPlant = (searchParams.get('plant')?.toUpperCase() === 'KG' || searchParams.get('org')?.toUpperCase().includes('KG')) ? 'KG' : 'SG';

    const [formData, setFormData] = useState({
        plant: initialPlant,
        department: 'Engineering & New Project',
        requester_name: '',
        requester_title: 'Staff',
        dept_head_name: '',
        dept_head_title: '',
        category: 'NEW_DEVICE',
        item_name: '',
        qty: 1,
        unit: 'Unit',
        estimated_unit_price: 0,
        estimated_total_cost: 0,
        target_year: currentYear + 1,
        target_month: 'jan',
        target_form: 'I-1',
        technical_specs: '',
        justification: ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [downloadingBlank, setDownloadingBlank] = useState(false);
    const [submittedReq, setSubmittedReq] = useState(null);

    // Tracking state
    const [trackQuery, setTrackQuery] = useState('');
    const [trackResult, setTrackResult] = useState(null);
    const [trackLoading, setTrackLoading] = useState(false);

    const isKG = formData.plant === 'KG';
    const formDocNo = isKG ? 'TCFKG-FM-ICT-03-04' : 'TCFSG-FM-ICT-03-04';

    const formatIDR = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
    };

    // Calculate total cost
    const handleQtyOrPriceChange = (qtyVal, priceVal) => {
        const q = Number(qtyVal) || 0;
        const p = Number(priceVal) || 0;
        setFormData(prev => ({
            ...prev,
            qty: q,
            estimated_unit_price: p,
            estimated_total_cost: q * p
        }));
    };

    // Download Blank Form PDF
    const handleDownloadBlankPdf = async () => {
        setDownloadingBlank(true);
        try {
            await generateDeptBudgetRequestPdf({
                isBlank: true,
                plant: formData.plant,
                action: 'download'
            });
            Swal.fire({
                icon: 'success',
                title: 'Formulir Kosong Berhasil Di-Download',
                text: `Formulir resmi ${formDocNo} (PDF) siap dicetak untuk tanda tangan manual departemen.`,
                timer: 3000,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire('Error PDF', err.message || 'Gagal membuat file formulir PDF kosong', 'error');
        } finally {
            setDownloadingBlank(false);
        }
    };

    // Download Blank Form Excel
    const handleDownloadBlankExcel = async () => {
        setDownloadingBlank(true);
        try {
            await exportDeptBudgetExcel({
                isBlank: true,
                plant: formData.plant
            });
            Swal.fire({
                icon: 'success',
                title: 'Formulir Kosong Excel Berhasil Di-Download',
                text: `File template resmi ${formDocNo}.xlsx siap diedit dan diisi oleh departemen.`,
                timer: 3000,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire('Error Excel', err.message || 'Gagal membuat file template Excel', 'error');
        } finally {
            setDownloadingBlank(false);
        }
    };

    // Submit Request (No Login Required)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.item_name.trim()) {
            Swal.fire('Validasi', 'Nama perangkat atau software wajib diisi!', 'warning');
            return;
        }

        if (!formData.requester_name.trim()) {
            Swal.fire('Validasi', 'Nama lengkap pemohon wajib diisi!', 'warning');
            return;
        }

        if (!formData.justification.trim()) {
            Swal.fire('Validasi', 'Alasan / justifikasi kebutuhan wajib diisi!', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post('/api/budgeting/department-requests', {
                ...formData,
                date: new Date().toISOString().slice(0, 10),
                status: 'SUBMITTED'
            });

            const newReq = res.data.request;
            setSubmittedReq(newReq);

            // Pop up success modal with options to download PDF/Excel right away
            Swal.fire({
                icon: 'success',
                title: 'Pengajuan Berhasil Dikirimkan!',
                html: `
                    <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
                        <p style="margin-bottom: 8px;">Permintaan fasilitas & usulan budget ICT telah berhasil tercatat di sistem dengan nomor registrasi:</p>
                        <div style="background: #f1f5f9; padding: 10px 14px; border-radius: 12px; font-weight: 800; font-family: monospace; font-size: 15px; color: #0f172a; text-align: center; border: 1px solid #cbd5e1; margin-bottom: 12px;">
                            ${newReq.req_no}
                        </div>
                        <p style="font-size: 11.5px; color: #64748b;">
                            Simpan nomor registrasi ini untuk melacak status verifikasi tim ICT. Anda dapat langsung mengunduh formulir resmi yang sudah terisi di bawah ini.
                        </p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Download PDF Resmi',
                cancelButtonText: 'Download Excel (.xlsx)',
                confirmButtonColor: '#e11d48',
                cancelButtonColor: '#0d9488',
                showDenyButton: true,
                denyButtonText: 'Tutup & Selesai',
                denyButtonColor: '#64748b',
                allowOutsideClick: false
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await generateDeptBudgetRequestPdf({ request: newReq, plant: newReq.plant, isBlank: false, action: 'download' });
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    await exportDeptBudgetExcel({ request: newReq, plant: newReq.plant, isBlank: false });
                }
            });

            // Reset form for next submission
            setFormData(prev => ({
                ...prev,
                item_name: '',
                qty: 1,
                estimated_unit_price: 0,
                estimated_total_cost: 0,
                technical_specs: '',
                justification: ''
            }));

        } catch (err) {
            Swal.fire('Error Pengajuan', err.response?.data?.error || err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Track existing request
    const handleTrackRequest = async (e) => {
        e.preventDefault();
        if (!trackQuery.trim()) return;

        setTrackLoading(true);
        setTrackResult(null);
        try {
            const res = await axios.get(`/api/budgeting/department-requests?search=${encodeURIComponent(trackQuery.trim())}`);
            const matches = res.data.requests || [];
            if (matches.length > 0) {
                setTrackResult(matches[0]);
            } else {
                Swal.fire('Tidak Ditemukan', `Tidak ada pengajuan dengan nomor atau nama "${trackQuery}".`, 'info');
            }
        } catch (err) {
            Swal.fire('Error Pencarian', err.message, 'error');
        } finally {
            setTrackLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-10 relative overflow-x-hidden">
            {/* Background Accent Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10 space-y-6">

                {/* Top Navigation Bar: Back to Login & Quick Download Form Kosong */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-xl">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                        <span>Kembali ke Halaman Login</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline-block">Format Kosong:</span>
                        <button
                            disabled={downloadingBlank}
                            onClick={handleDownloadBlankPdf}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                            title="Download formulir resmi kosong versi PDF siap cetak"
                        >
                            <FileDown size={14} />
                            <span>Form Kosong (PDF)</span>
                        </button>
                        <button
                            disabled={downloadingBlank}
                            onClick={handleDownloadBlankExcel}
                            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-600/30 transition-all cursor-pointer"
                            title="Download template resmi kosong versi Excel (.xlsx) dengan rumus otomatis"
                        >
                            <FileSpreadsheet size={14} />
                            <span>Form Kosong (Excel)</span>
                        </button>
                    </div>
                </div>

                {/* Main Header Card with Corporate ISO Branding */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start sm:items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
                                <img src={logo} alt="TCF Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        {formDocNo} (Rev 01)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        SOP TCFSG-SOP-ICT-03
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Public Portal (Tanpa Login)
                                    </span>
                                </div>
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                                    Formulir Permintaan Fasilitas & Budget ICT
                                </h1>
                                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                                    Pengajuan kebutuhan komputer baru, penggantian (replacement), upgrade spesifikasi hardware, lisensi software, atau infrastruktur jaringan dari seluruh departemen PT. Tri Centrum Fortuna.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Step Breadcrumb / Approval Flow Banner */}
                    <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-300">Alur Otorisasi:</span>
                            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-200 font-semibold">1. Pemohon</span>
                            <span>→</span>
                            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-200 font-semibold">2. Dept Head Pemohon</span>
                            <span>→</span>
                            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-200 font-semibold">3. Teknisi ICT</span>
                            <span>→</span>
                            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-200 font-semibold">4. SPV ICT</span>
                            <span>→</span>
                            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-200 font-semibold">5. Dept Head ICT</span>
                        </div>
                        <span className="text-[10px] italic text-slate-500">*Otorisasi Direksi berlaku pada form PR saat realisasi</span>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-slate-100">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* SECTION 1: IDENTITAS PEMOHON & UNIT KERJA */}
                        <div>
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <Building2 size={18} className="text-rose-600" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                    I. Data Pemohon & Unit Kerja
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Departemen Pemohon <span className="text-rose-600">*</span></label>
                                    <select
                                        required
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    >
                                        {DEPARTMENTS_LIST.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Plant / Lokasi Pabrik <span className="text-rose-600">*</span></label>
                                    <select
                                        value={formData.plant}
                                        onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    >
                                        <option value="SG">Sadang Plant (SG) - TCFSG-FM-ICT-03-04</option>
                                        <option value="KG">Karawang Plant (KG) - TCFKG-FM-ICT-03-04</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Nama Lengkap Pemohon <span className="text-rose-600">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nama staf / penanggung jawab pengajuan"
                                        value={formData.requester_name}
                                        onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Jabatan / NIK Pemohon</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Staff, Section Head, CAD Engineer, NIK: 2104..."
                                        value={formData.requester_title}
                                        onChange={(e) => setFormData({ ...formData, requester_title: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                        <span>Nama Atasan yang Mengetahui</span>
                                        <span className="text-[10px] text-slate-400 font-normal">(Direktur / Dept Head)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Nama Direktur / Atasan Langsung"
                                        value={formData.dept_head_name}
                                        onChange={(e) => setFormData({ ...formData, dept_head_name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                        <span>Jabatan Atasan yang Mengetahui</span>
                                        <span className="text-[10px] text-rose-500 font-bold">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        list="public-superior-titles"
                                        placeholder="Contoh: Direktur, Director, Plant Manager, Dept Head"
                                        value={formData.dept_head_title}
                                        onChange={(e) => setFormData({ ...formData, dept_head_title: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    />
                                    <datalist id="public-superior-titles">
                                        <option value="Direktur" />
                                        <option value="Director" />
                                        <option value="Plant Manager" />
                                        <option value="General Manager" />
                                        <option value="Departement Head" />
                                        <option value="Section Head" />
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: KLASIFIKASI KEBUTUHAN */}
                        <div>
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <Layers size={18} className="text-rose-600" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                    II. Klasifikasi Kebutuhan ICT (Kategori SOP)
                                </h3>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700">Pilih Kategori Kebutuhan <span className="text-rose-600">*</span></label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => {
                                        const c = e.target.value;
                                        let defaultF = 'I-1';
                                        if (c === 'UPGRADE_HARDWARE') defaultF = 'F2';
                                        if (c === 'SOFTWARE_LICENSE') defaultF = 'F1';
                                        setFormData({ ...formData, category: c, target_form: defaultF });
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                >
                                    {REQUEST_CATEGORIES.map(c => (
                                        <option key={c.key} value={c.key}>{c.label} - {c.desc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* SECTION 3: RINCIAN PERANGKAT & ESTIMASI BIAYA */}
                        <div>
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <FileText size={18} className="text-rose-600" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                    III. Rincian Perangkat / Software & Estimasi Biaya
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Nama Perangkat / Software / Komponen <span className="text-rose-600">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Workstation CAD Core i7, RAM 16GB DDR4, Lisensi SolidWorks Standard, Laptop Business..."
                                        value={formData.item_name}
                                        onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Jumlah (Qty) <span className="text-rose-600">*</span></label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={formData.qty}
                                            onChange={(e) => handleQtyOrPriceChange(e.target.value, formData.estimated_unit_price)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Satuan</label>
                                        <input
                                            type="text"
                                            placeholder="Unit, Lisensi, Pcs..."
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Harga Satuan (IDR)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.estimated_unit_price}
                                            onChange={(e) => handleQtyOrPriceChange(formData.qty, e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Total Biaya (IDR)</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={formatIDR(formData.estimated_total_cost)}
                                            className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black text-emerald-800 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Target Tahun Anggaran</label>
                                        <select
                                            value={formData.target_year}
                                            onChange={(e) => setFormData({ ...formData, target_year: Number(e.target.value) })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                        >
                                            {availableYears.map(yr => (
                                                <option key={yr} value={yr}>Tahun {yr}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Bulan Kebutuhan</label>
                                        <select
                                            value={formData.target_month}
                                            onChange={(e) => setFormData({ ...formData, target_month: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                        >
                                            {MONTH_NAMES.map(m => (
                                                <option key={m.key} value={m.key}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Rekomendasi Formulir</label>
                                        <select
                                            value={formData.target_form}
                                            onChange={(e) => setFormData({ ...formData, target_form: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                        >
                                            <option value="I-1">I-1: Investment Asset (CAPEX)</option>
                                            <option value="F1">F1: Repair & Mtc / Lisensi (OPEX)</option>
                                            <option value="F2">F2: Sparepart IT & Upgrade</option>
                                            <option value="H2">H2: Centralize Telco & IT</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Spesifikasi Teknis yang Diperlukan</label>
                                    <textarea
                                        rows="2"
                                        placeholder="Contoh: Processor Core i7 gen 14, RAM 32GB DDR5, SSD 1TB NVMe, Dual Display 24 inch IPS, Windows 11 Pro 64-bit..."
                                        value={formData.technical_specs}
                                        onChange={(e) => setFormData({ ...formData, technical_specs: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: JUSTIFIKASI & DAMPAK OPERASIONAL */}
                        <div>
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <AlertCircle size={18} className="text-rose-600" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                    IV. Justifikasi Kebutuhan & Dampak Operasional
                                </h3>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Alasan Pengadaan & Dampak Bila Tidak Dipenuhi <span className="text-rose-600">*</span></label>
                                <textarea
                                    rows="3"
                                    required
                                    placeholder="Jelaskan tujuan penggunaan, user/line terkait, software yang dijalankan, dan kendala operasional yang timbul bila kebutuhan ini tidak dipenuhi..."
                                    value={formData.justification}
                                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-[11px] text-slate-500 italic">
                                *Dengan mengirimkan form ini, data akan langsung diteruskan ke tim ICT untuk diverifikasi kelayakan teknis dan anggarannya.
                            </p>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Mengirim Pengajuan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        <span>Kirim Pengajuan Kebutuhan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Tracking Section: Cek Status Pengajuan */}
                <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Search size={18} className="text-blue-400" />
                            <h3 className="text-sm font-black text-white">Lacak Status Pengajuan Kebutuhan</h3>
                        </div>
                        <span className="text-[11px] text-slate-400">Masukkan No. Registrasi Dokumen (Contoh: ICT-TCFSG-REQ-20261021-007)</span>
                    </div>

                    <form onSubmit={handleTrackRequest} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Ketik Nomor Registrasi atau Nama Item..."
                            value={trackQuery}
                            onChange={(e) => setTrackQuery(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={trackLoading}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                        >
                            <Search size={14} />
                            <span>{trackLoading ? 'Mencari...' : 'Lacak Status'}</span>
                        </button>
                    </form>

                    {/* Track Result Card */}
                    {trackResult && (
                        <div className="mt-4 p-5 rounded-2xl bg-white/10 border border-white/15 space-y-3 animate-in fade-in">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-blue-400 font-mono block">{trackResult.req_no}</span>
                                    <h4 className="text-sm font-black text-white">{trackResult.item_name}</h4>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                    trackResult.status === 'APPROVED_TO_BUDGET' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                    trackResult.status === 'VERIFIED_ICT' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                    trackResult.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                    {trackResult.status === 'APPROVED_TO_BUDGET' ? '✓ Disetujui Masuk Anggaran' :
                                     trackResult.status === 'VERIFIED_ICT' ? '✓ Diverifikasi Tim ICT' :
                                     trackResult.status === 'REJECTED' ? '✕ Ditolak' : '⏳ Menunggu Review ICT'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Departemen:</span>
                                    <span className="font-bold text-slate-200">{trackResult.department}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Pemohon:</span>
                                    <span className="font-bold text-slate-200">{trackResult.requester_name}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Target Periode:</span>
                                    <span className="font-bold text-slate-200">Thn {trackResult.target_year} ({trackResult.target_month?.toUpperCase()})</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Total Biaya:</span>
                                    <span className="font-black text-emerald-400">{formatIDR(trackResult.estimated_total_cost)}</span>
                                </div>
                            </div>

                            {trackResult.review_notes && (
                                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
                                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Catatan Verifikasi Tim ICT:</span>
                                    <p className="text-slate-300 italic">"{trackResult.review_notes}"</p>
                                </div>
                            )}

                            {trackResult.signed_attachment && (
                                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <FileCheck size={16} className="text-emerald-400" />
                                        <div>
                                            <span className="text-xs font-bold text-emerald-300 block">Formulir Tertandatangan Lengkap Tersedia</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{trackResult.signed_attachment_name || 'Lampiran_TTD_SOP.pdf'}</span>
                                        </div>
                                    </div>
                                    <a
                                        href={trackResult.signed_attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                    >
                                        <Paperclip size={13} />
                                        <span>Buka / Unduh Lampiran TTD</span>
                                    </a>
                                </div>
                            )}

                            <div className="pt-2 flex flex-wrap gap-2">
                                <button
                                    onClick={() => generateDeptBudgetRequestPdf({ request: trackResult, plant: trackResult.plant, isBlank: false, action: 'download' })}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <FileDown size={14} /> Download PDF Resmi
                                </button>
                                <button
                                    onClick={() => exportDeptBudgetExcel({ request: trackResult, plant: trackResult.plant, isBlank: false })}
                                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <FileSpreadsheet size={14} /> Download Excel Resmi (.xlsx)
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Notice */}
                <div className="text-center text-[10px] text-slate-500 py-4">
                    © 2026 PT. Tri Centrum Fortuna - ICT Department. Standar Operasional Prosedur TCFSG-SOP-ICT-03 (IATF 16949:2016).
                </div>
            </div>
        </div>
    );
}

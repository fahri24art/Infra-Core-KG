import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import Swal from 'sweetalert2';
import {
    TrendingDown, Plus, Edit2, Trash2, Search, Printer, Cpu, KeyRound,
    Wifi, Package, Sparkles, Download, FileSpreadsheet, Calendar, CheckCircle2,
    Clock, AlertTriangle, X, Save, BarChart3, RefreshCw, DollarSign, Layers
} from 'lucide-react';
import { generateCrPdf } from '../../utils/generateCrPdf';

export const CR_CATEGORIES = [
    { key: 'PHOTOCOPY_PRINT', label: 'Photocopy & Print (Ricoh)', badge: 'Photocopy & Print', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Printer },
    { key: 'SOFTWARE_LICENSE', label: 'Software, Lisensi & SaaS', badge: 'Software & Lisensi', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: KeyRound },
    { key: 'NETWORK_ISP', label: 'Internet, Bandwidth & Jaringan', badge: 'Network & ISP', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Wifi },
    { key: 'HARDWARE_INFRA', label: 'Hardware, Server & Listrik', badge: 'Hardware & Infra', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Cpu },
    { key: 'CONSUMABLES', label: 'Toner, Kertas & Consumables', badge: 'Consumables', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Package },
    { key: 'OTHER', label: 'Efisiensi Operasional Lainnya', badge: 'Lainnya', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: Layers }
];

const CR_STATUSES = [
    { key: 'PROPOSED', label: 'Proposed', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
    { key: 'APPROVED', label: 'Approved', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'IN_PROGRESS', label: 'In Progress', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
    { key: 'ACHIEVED', label: 'Achieved', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { key: 'ON_HOLD', label: 'On Hold', badge: 'bg-rose-100 text-rose-800 border-rose-200' }
];

const MONTHS = [
    { key: 'jan', label: 'Jan' }, { key: 'feb', label: 'Feb' }, { key: 'mar', label: 'Mar' },
    { key: 'apr', label: 'Apr' }, { key: 'may', label: 'Mei' }, { key: 'jun', label: 'Jun' },
    { key: 'jul', label: 'Jul' }, { key: 'aug', label: 'Agu' }, { key: 'sep', label: 'Sep' },
    { key: 'oct', label: 'Okt' }, { key: 'nov', label: 'Nov' }, { key: 'dec', label: 'Des' }
];

const defaultFmtRp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

export default function CostReductionSection({
    year = 2027,
    selectedPlant = 'SG',
    defaultPlant = 'SG',
    formatIDR = defaultFmtRp
}) {
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState({
        total_items: 0,
        total_baseline_annual: 0,
        total_target_annual: 0,
        total_saving_monthly: 0,
        total_saving_annual: 0,
        total_investment: 0,
        net_saving_annual: 0,
        avg_reduction_pct: 0,
        actual_saving_ytd: 0,
        achieved_count: 0,
        in_progress_count: 0
    });
    const [ricohBaseline, setRicohBaseline] = useState({ hasData: false });
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);

    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Add/Edit Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [savingForm, setSavingForm] = useState(false);
    const [formData, setFormData] = useState({
        cr_code: 'CR-01',
        category: 'PHOTOCOPY_PRINT',
        title: '',
        target_dept: 'PPIC, QC, Produksi',
        problem_statement: '',
        action_plan: '',
        pic: 'ICT Infrastructure',
        priority: 'HIGH',
        status: 'PROPOSED',
        baseline_monthly: 0,
        target_monthly: 0,
        active_months: 12,
        start_month: 'jan',
        end_month: 'dec',
        investment_cost: 0,
        kpi_metric: '',
        notes: ''
    });

    // Monthly Tracking Modal
    const [trackItem, setTrackItem] = useState(null);
    const [trackBaseline, setTrackBaseline] = useState({});
    const [trackActual, setTrackActual] = useState({});
    const [savingTrack, setSavingTrack] = useState(false);

    const plantParam = selectedPlant && selectedPlant !== 'ALL' ? selectedPlant : defaultPlant;

    const fetchCrData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/budgeting/cost-reductions?year=${year}&plant=${plantParam}&category=${filterCategory}&status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`);
            setItems(res.data?.items || []);
            if (res.data?.summary) setSummary(res.data.summary);
            if (res.data?.ricohBaseline) setRicohBaseline(res.data.ricohBaseline);
        } catch (err) {
            console.error('Failed loading CR data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCrData();
    }, [year, plantParam, filterCategory, filterStatus, searchQuery]);

    const handleSeedRicoh = async () => {
        setSeeding(true);
        try {
            const res = await axios.post('/api/budgeting/cost-reductions/seed-ricoh-2027', {
                year,
                plant: plantParam
            });
            Swal.fire({
                icon: 'success',
                title: 'Template CR Photocopy Dimuat!',
                text: res.data?.message || `4 program CR Photocopy ${year} berhasil disiapkan dari data Ricoh aktual.`,
                timer: 2600,
                showConfirmButton: false
            });
            fetchCrData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.error || err.message, 'error');
        } finally {
            setSeeding(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingItem(null);
        const nextNum = items.length + 1;
        setFormData({
            cr_code: `CR-${String(nextNum).padStart(2, '0')}`,
            category: 'PHOTOCOPY_PRINT',
            title: '',
            target_dept: 'All Departemen',
            problem_statement: '',
            action_plan: '',
            pic: 'ICT Infrastructure',
            priority: 'HIGH',
            status: 'PROPOSED',
            baseline_monthly: 0,
            target_monthly: 0,
            active_months: 12,
            start_month: 'jan',
            end_month: 'dec',
            investment_cost: 0,
            kpi_metric: '',
            notes: ''
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setFormData({
            cr_code: item.cr_code || 'CR-01',
            category: item.category || 'PHOTOCOPY_PRINT',
            title: item.title || '',
            target_dept: item.target_dept || '',
            problem_statement: item.problem_statement || '',
            action_plan: item.action_plan || '',
            pic: item.pic || 'ICT',
            priority: item.priority || 'HIGH',
            status: item.status || 'PROPOSED',
            baseline_monthly: Number(item.baseline_monthly) || 0,
            target_monthly: Number(item.target_monthly) || 0,
            active_months: Number(item.active_months) || 12,
            start_month: item.start_month || 'jan',
            end_month: item.end_month || 'dec',
            investment_cost: Number(item.investment_cost) || 0,
            kpi_metric: item.kpi_metric || '',
            notes: item.notes || ''
        });
        setModalOpen(true);
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        setSavingForm(true);
        try {
            const payload = { ...formData, year, plant: plantParam };
            if (editingItem) {
                await axios.put(`/api/budgeting/cost-reductions/${editingItem.id}`, payload);
            } else {
                await axios.post('/api/budgeting/cost-reductions', payload);
            }
            setModalOpen(false);
            Swal.fire({ icon: 'success', title: editingItem ? 'CR Diperbarui' : 'Program CR Ditambahkan', timer: 1600, showConfirmButton: false });
            fetchCrData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        } finally {
            setSavingForm(false);
        }
    };

    const handleDelete = async (item) => {
        const confirm = await Swal.fire({
            title: `Hapus ${item.cr_code}?`,
            text: item.title,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });
        if (!confirm.isConfirmed) return;
        try {
            await axios.delete(`/api/budgeting/cost-reductions/${item.id}`);
            fetchCrData();
        } catch (err) {
            Swal.fire('Gagal', err.message, 'error');
        }
    };

    const openTracking = (item) => {
        setTrackItem(item);
        setTrackBaseline({ ...(item.monthly_baseline || {}) });
        const initAct = {};
        MONTHS.forEach(m => {
            const v = item.monthly_actual?.[m.key];
            initAct[m.key] = v != null ? String(v) : '';
        });
        setTrackActual(initAct);
    };

    const handleSaveTracking = async () => {
        if (!trackItem) return;
        setSavingTrack(true);
        try {
            const cleanActual = {};
            MONTHS.forEach(m => {
                const raw = trackActual[m.key];
                if (raw !== '' && raw !== null && raw !== undefined && !isNaN(Number(raw))) {
                    cleanActual[m.key] = Number(raw);
                }
            });
            await axios.put(`/api/budgeting/cost-reductions/${trackItem.id}`, {
                monthly_baseline: trackBaseline,
                monthly_actual: cleanActual
            });
            setTrackItem(null);
            Swal.fire({ icon: 'success', title: 'Realisasi Bulanan Tersimpan', timer: 1500, showConfirmButton: false });
            fetchCrData();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setSavingTrack(false);
        }
    };

    const handleExportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws1 = wb.addWorksheet(`CR ICT ${year}`);
        ws1.columns = [
            { header: 'Kode', key: 'code', width: 12 },
            { header: 'Kategori', key: 'cat', width: 22 },
            { header: 'Program Inisiatif CR', key: 'title', width: 42 },
            { header: 'Dept Sasaran', key: 'dept', width: 24 },
            { header: 'Baseline/Bln (Rp)', key: 'baseMo', width: 18 },
            { header: 'Target/Bln (Rp)', key: 'tgtMo', width: 18 },
            { header: 'Hemat/Bln (Rp)', key: 'savMo', width: 18 },
            { header: 'Durasi (Bln)', key: 'mos', width: 12 },
            { header: 'Hemat/Thn (Rp)', key: 'savYr', width: 20 },
            { header: 'Reduksi (%)', key: 'pct', width: 12 },
            { header: 'Investasi (Rp)', key: 'inv', width: 16 },
            { header: 'Net Saving/Thn (Rp)', key: 'netYr', width: 20 },
            { header: 'Realisasi YTD (Rp)', key: 'actYtd', width: 18 },
            { header: 'PIC', key: 'pic', width: 20 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Analisa Masalah', key: 'prob', width: 40 },
            { header: 'Rencana Aksi', key: 'act', width: 45 },
            { header: 'Target KPI', key: 'kpi', width: 32 }
        ];
        ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

        items.forEach(it => {
            ws1.addRow({
                code: it.cr_code,
                cat: CR_CATEGORIES.find(c => c.key === it.category)?.badge || it.category,
                title: it.title,
                dept: it.target_dept,
                baseMo: it.baseline_monthly,
                tgtMo: it.target_monthly,
                savMo: it.saving_monthly,
                mos: it.active_months,
                savYr: it.saving_annual,
                pct: it.reduction_pct,
                inv: it.investment_cost,
                netYr: it.net_saving_annual,
                actYtd: it.actual_saving_ytd,
                pic: it.pic,
                status: it.status,
                prob: it.problem_statement,
                act: it.action_plan,
                kpi: it.kpi_metric
            });
        });

        const ws2 = wb.addWorksheet('Tracking Bulanan');
        ws2.columns = [
            { header: 'Kode CR', key: 'code', width: 12 },
            { header: 'Program', key: 'title', width: 35 },
            { header: 'Tipe', key: 'type', width: 18 },
            ...MONTHS.map(m => ({ header: m.label, key: m.key, width: 14 })),
            { header: 'Total Setahun', key: 'total', width: 18 }
        ];
        ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };

        items.forEach(it => {
            const baseRow = { code: it.cr_code, title: it.title, type: 'Baseline (Rp)' };
            const actRow = { code: it.cr_code, title: it.title, type: 'Aktual (Rp)' };
            const savRow = { code: it.cr_code, title: it.title, type: 'Saving Aktual (Rp)' };
            let bTot = 0, aTot = 0, sTot = 0;
            MONTHS.forEach(m => {
                const bv = Number(it.monthly_baseline?.[m.key] ?? it.baseline_monthly) || 0;
                const av = it.monthly_actual?.[m.key] != null ? Number(it.monthly_actual[m.key]) : null;
                baseRow[m.key] = bv;
                bTot += bv;
                actRow[m.key] = av != null ? av : '';
                if (av != null) aTot += av;
                savRow[m.key] = av != null ? (bv - av) : '';
                if (av != null) sTot += (bv - av);
            });
            baseRow.total = bTot;
            actRow.total = aTot || '';
            savRow.total = sTot;
            ws2.addRow(baseRow);
            ws2.addRow(actRow);
            ws2.addRow(savRow);
        });

        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CR_ICT_${plantParam}_${year}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formPreview = useMemo(() => {
        const b = Number(formData.baseline_monthly) || 0;
        const t = Number(formData.target_monthly) || 0;
        const m = Math.max(1, Math.min(12, parseInt(formData.active_months, 10) || 12));
        const inv = Number(formData.investment_cost) || 0;
        const savMo = Math.max(0, b - t);
        const savYr = savMo * m;
        const pct = b > 0 ? ((savMo / b) * 100).toFixed(1) : '0.0';
        const netYr = savYr - inv;
        const payback = savMo > 0 && inv > 0 ? (inv / savMo).toFixed(1) : '0';
        return { savMo, savYr, pct, netYr, payback };
    }, [formData]);

    return (
        <div className="space-y-6">
            {/* Header & Quick Ricoh Seeder Banner */}
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 rounded-3xl p-5 md:p-6 border border-emerald-500/30 shadow-xl text-white">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                                <TrendingDown size={12} /> Cost Reduction Program {year}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                                Plant: {plantParam}
                            </span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight">
                            Modul Cost Reduction (CR) ICT — Tahun {year}
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                            Kelola proposal penghematan biaya ICT (Photocopy/Print Ricoh, Software, Bandwidth, Hardware & Consumables), bandingkan Baseline vs Target, pantau realisasi bulanan, dan export PDF siap presentasi ke Manajemen.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={handleSeedRicoh}
                            disabled={seeding}
                            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                        >
                            {seeding ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                            <span>Muat Template CR Photocopy {year} (Data Ricoh)</span>
                        </button>

                        <button
                            onClick={handleOpenAdd}
                            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                        >
                            <Plus size={15} /> Tambah Program CR
                        </button>
                    </div>
                </div>

                {/* Live Ricoh Telemetry Strip */}
                {ricohBaseline?.hasData && (
                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Basis Data Ricoh ({(ricohBaseline.monthsAnalyzed || []).join(', ')})</p>
                            <p className="text-sm font-black text-white mt-0.5">{Number(ricohBaseline.avgTotalSheets || 0).toLocaleString('id-ID')} <span className="text-[11px] font-normal text-slate-300">lbr/bln</span></p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Rata2 Klik Color (Rp 1.400/lbr)</p>
                            <p className="text-sm font-black text-purple-300 mt-0.5">{formatIDR(ricohBaseline.avgCostColorAll)}<span className="text-[10px] font-normal text-slate-400">/bln</span></p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Rata2 Copy B/W (Rp 100/lbr)</p>
                            <p className="text-sm font-black text-amber-300 mt-0.5">{formatIDR(ricohBaseline.avgCostCopyBw)}<span className="text-[10px] font-normal text-slate-400">/bln</span></p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Est. Tagihan + Sewa/Bln</p>
                            <p className="text-sm font-black text-emerald-300 mt-0.5">{formatIDR(ricohBaseline.avgTotalWithRent)}<span className="text-[10px] font-normal text-slate-400">/bln</span></p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Top 3 Pareto Dept</p>
                            <p className="text-[11px] font-bold text-slate-200 mt-0.5 truncate">
                                {(ricohBaseline.topDepartments || []).slice(0, 3).map(d => d.department).join(', ') || '-'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Baseline Biaya / Tahun</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatIDR(summary.total_baseline_annual)}</p>
                    <p className="text-xs text-slate-500 mt-1">Proyeksi biaya tanpa program CR ({summary.total_items} item)</p>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">Target Biaya Setelah CR ({year})</p>
                    <p className="text-2xl font-black text-blue-700 mt-1">{formatIDR(summary.total_target_annual)}</p>
                    <p className="text-xs text-slate-500 mt-1">Anggaran operasional yang ditargetkan tercapai</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-5 border border-emerald-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Target Penghematan / Tahun</p>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white">
                            -{summary.avg_reduction_pct || 0}%
                        </span>
                    </div>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{formatIDR(summary.total_saving_annual)}</p>
                    <p className="text-xs text-emerald-800/80 mt-1">Rata-rata {formatIDR(summary.total_saving_monthly)} / bulan</p>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">Net Saving & Realisasi YTD</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatIDR(summary.net_saving_annual)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        Investasi: {formatIDR(summary.total_investment)} • Realisasi YTD: <b className="text-emerald-700">{formatIDR(summary.actual_saving_ytd)}</b>
                    </p>
                </div>
            </div>

            {/* Filter & Export Toolbar */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    <div className="relative min-w-[220px] flex-1 max-w-xs">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari program CR, dept, atau PIC..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 outline-none"
                    >
                        <option value="ALL">Semua Kategori</option>
                        {CR_CATEGORIES.map(c => (
                            <option key={c.key} value={c.key}>{c.badge}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 outline-none"
                    >
                        <option value="ALL">Semua Status</option>
                        {CR_STATUSES.map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => generateCrPdf({ year, plant: plantParam, items, summary, ricohBaseline })}
                        disabled={items.length === 0}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                        <Download size={14} /> Export PDF Proposal CR
                    </button>

                    <button
                        onClick={handleExportExcel}
                        disabled={items.length === 0}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                        <FileSpreadsheet size={14} /> Export Excel CR
                    </button>
                </div>
            </div>

            {/* CR Items Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-bold">
                        <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-emerald-500" />
                        Memuat data Cost Reduction ICT {year}...
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <TrendingDown size={36} className="mx-auto text-slate-300" />
                        <p className="text-sm font-black text-slate-700">Belum Ada Program Cost Reduction (CR) Tahun {year}</p>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Klik <b>"Muat Template CR Photocopy {year} (Data Ricoh)"</b> di atas untuk langsung mengisi 4 inisiatif CR Photocopy/Print berbasis data Ricoh aktual, atau tambah inisiatif manual.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                                    <th className="p-3.5 w-20">Kode</th>
                                    <th className="p-3.5 min-w-[260px]">Inisiatif CR & Masalah Utama</th>
                                    <th className="p-3.5">Kategori & Dept</th>
                                    <th className="p-3.5 text-right">Baseline / Bln</th>
                                    <th className="p-3.5 text-right">Target / Bln</th>
                                    <th className="p-3.5 text-right">Hemat / Thn</th>
                                    <th className="p-3.5 text-center">Reduksi</th>
                                    <th className="p-3.5 text-right">Aktual YTD</th>
                                    <th className="p-3.5">Status & PIC</th>
                                    <th className="p-3.5 text-center w-36">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {items.map((item) => {
                                    const catObj = CR_CATEGORIES.find(c => c.key === item.category) || CR_CATEGORIES[5];
                                    const stObj = CR_STATUSES.find(s => s.key === item.status) || CR_STATUSES[0];
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors align-top">
                                            <td className="p-3.5 font-black text-slate-900 whitespace-nowrap">
                                                {item.cr_code}
                                                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{item.active_months} bln</div>
                                            </td>
                                            <td className="p-3.5">
                                                <p className="font-black text-slate-900 leading-snug">{item.title}</p>
                                                {item.problem_statement && (
                                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.problem_statement}</p>
                                                )}
                                                {item.kpi_metric && (
                                                    <p className="text-[10px] font-bold text-indigo-600 mt-1">KPI: {item.kpi_metric}</p>
                                                )}
                                            </td>
                                            <td className="p-3.5 space-y-1.5">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${catObj.color}`}>
                                                    {catObj.badge}
                                                </span>
                                                <p className="text-[11px] font-semibold text-slate-600">{item.target_dept || '-'}</p>
                                            </td>
                                            <td className="p-3.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                                                {formatIDR(item.baseline_monthly)}
                                            </td>
                                            <td className="p-3.5 text-right font-semibold text-blue-700 whitespace-nowrap">
                                                {formatIDR(item.target_monthly)}
                                            </td>
                                            <td className="p-3.5 text-right whitespace-nowrap">
                                                <span className="font-black text-emerald-700 block">{formatIDR(item.saving_annual)}</span>
                                                <span className="text-[10px] text-emerald-600">{formatIDR(item.saving_monthly)}/bln</span>
                                            </td>
                                            <td className="p-3.5 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                                                    -{item.reduction_pct}%
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-right whitespace-nowrap">
                                                <span className="font-bold text-slate-800 block">{formatIDR(item.actual_saving_ytd)}</span>
                                                <span className="text-[10px] text-slate-400">{item.actual_recorded_months || 0}/12 bln</span>
                                            </td>
                                            <td className="p-3.5 space-y-1">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${stObj.badge}`}>
                                                    {stObj.label}
                                                </span>
                                                <p className="text-[11px] text-slate-600 font-semibold">{item.pic}</p>
                                            </td>
                                            <td className="p-3.5">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openTracking(item)}
                                                        title="Input Realisasi Bulanan (Jan-Des)"
                                                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                                    >
                                                        <BarChart3 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEdit(item)}
                                                        title="Edit Program CR"
                                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        title="Hapus"
                                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
                        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black">{editingItem ? `Edit Program ${editingItem.cr_code}` : `Tambah Program CR ICT (${year})`}</h3>
                                <p className="text-[11px] text-slate-400">Hitung otomatis target penghematan bulanan, tahunan, & ROI</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Kode CR</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.cr_code}
                                        onChange={e => setFormData({ ...formData, cr_code: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                                    >
                                        {CR_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                                    >
                                        {CR_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Nama Program / Inisiatif CR *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Default Driver Grayscale & Lock Color Ricoh"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Departemen Sasaran</label>
                                    <input
                                        type="text"
                                        placeholder="PPIC, QC, Produksi"
                                        value={formData.target_dept}
                                        onChange={e => setFormData({ ...formData, target_dept: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Biaya Baseline / Bln (Rp)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.baseline_monthly}
                                        onChange={e => setFormData({ ...formData, baseline_monthly: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Target Biaya / Bln (Rp)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.target_monthly}
                                        onChange={e => setFormData({ ...formData, target_monthly: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-blue-700 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Durasi Efektif (Bln)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={formData.active_months}
                                        onChange={e => setFormData({ ...formData, active_months: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Biaya Investasi (Rp)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.investment_cost}
                                        onChange={e => setFormData({ ...formData, investment_cost: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-4 flex flex-wrap items-center gap-4 pt-1 text-[11px] font-bold text-emerald-900">
                                    <span>Hemat/Bln: <b>{formatIDR(formPreview.savMo)}</b></span>
                                    <span>Hemat/Thn: <b>{formatIDR(formPreview.savYr)}</b></span>
                                    <span>Reduksi: <b>-{formPreview.pct}%</b></span>
                                    <span>Net Saving: <b>{formatIDR(formPreview.netYr)}</b></span>
                                    {Number(formData.investment_cost) > 0 && <span>Payback: <b>{formPreview.payback} bln</b></span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Analisa Masalah / Root Cause</label>
                                    <textarea
                                        rows={3}
                                        value={formData.problem_statement}
                                        onChange={e => setFormData({ ...formData, problem_statement: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                                        placeholder="Jelaskan sumber pemborosan biaya saat ini..."
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Rencana Aksi (Countermeasure)</label>
                                    <textarea
                                        rows={3}
                                        value={formData.action_plan}
                                        onChange={e => setFormData({ ...formData, action_plan: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                                        placeholder="Langkah konkret pengurangan biaya..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">PIC</label>
                                    <input
                                        type="text"
                                        value={formData.pic}
                                        onChange={e => setFormData({ ...formData, pic: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Target KPI Deliverable</label>
                                    <input
                                        type="text"
                                        value={formData.kpi_metric}
                                        onChange={e => setFormData({ ...formData, kpi_metric: e.target.value })}
                                        placeholder="Misal: Klik Color turun >= 45%"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold">
                                    Batal
                                </button>
                                <button type="submit" disabled={savingForm} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5">
                                    <Save size={14} /> {savingForm ? 'Menyimpan...' : 'Simpan Program CR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Monthly Actual vs Baseline Tracking Modal */}
            {trackItem && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-8">
                        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black">Tracking Realisasi Bulanan: {trackItem.cr_code} — {trackItem.title}</h3>
                                <p className="text-[11px] text-emerald-200">Input biaya aktual per bulan untuk menghitung penghematan nyata (Baseline - Aktual)</p>
                            </div>
                            <button onClick={() => setTrackItem(null)} className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[75vh] overflow-y-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                                {MONTHS.map(m => {
                                    const baseVal = Number(trackBaseline[m.key] ?? trackItem.baseline_monthly) || 0;
                                    const rawAct = trackActual[m.key];
                                    const hasAct = rawAct !== '' && rawAct !== undefined && !isNaN(Number(rawAct));
                                    const saving = hasAct ? baseVal - Number(rawAct) : null;
                                    return (
                                        <div key={m.key} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="font-black text-slate-900">{m.label} {year}</span>
                                                <span className="text-[10px] text-slate-500">Target: {formatIDR(trackItem.target_monthly)}</span>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block">Baseline (Rp)</label>
                                                <input
                                                    type="number"
                                                    value={trackBaseline[m.key] ?? trackItem.baseline_monthly}
                                                    onChange={e => setTrackBaseline({ ...trackBaseline, [m.key]: Number(e.target.value) || 0 })}
                                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 text-[11px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-700 block">Biaya Aktual (Rp)</label>
                                                <input
                                                    type="number"
                                                    placeholder="Kosong = belum input"
                                                    value={trackActual[m.key] ?? ''}
                                                    onChange={e => setTrackActual({ ...trackActual, [m.key]: e.target.value })}
                                                    className="w-full px-2 py-1 rounded-lg border border-emerald-300 bg-white font-bold text-slate-900 text-[11px]"
                                                />
                                            </div>
                                            <div className={`text-[11px] font-black ${saving == null ? 'text-slate-400' : saving >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                Hemat: {saving == null ? '—' : formatIDR(saving)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
                                <button onClick={() => setTrackItem(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                                    Tutup
                                </button>
                                <button onClick={handleSaveTracking} disabled={savingTrack} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5">
                                    <Save size={14} /> {savingTrack ? 'Menyimpan...' : 'Simpan Realisasi'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


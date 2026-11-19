import React, { useState, useEffect } from 'react';
import {
    Edit2, Save, X, Download, Printer, RefreshCw,
    CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, ShieldCheck, Sparkles, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { KpiIncidentModal } from './KPILocalTab';

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

export default function KPIScorecardTable({ 
    year, 
    uptimeData = [], 
    ispData = [], 
    maintenanceData = [], 
    ticketsData = [], 
    digitalizationData = [], 
    reviewIkData = [],
    onSaveOverride,
    onRefresh,
    onToggleExcludeTicket
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [modalCtx, setModalCtx] = useState(null);
    const [metaMatrix, setMetaMatrix] = useState({});

    // Initial definition of the 6 KPIs based on the ICT Management Matrix
    const initialKpis = [
        {
            id: 'digitalization',
            no: 1,
            title: 'Program Digitalization',
            formula: 'Plan Digital / Actual Implementasi',
            target: 100,
            targetDisplay: '100%',
            unit: 'Prog',
            type: 'digitalization',
            planKey: 'plan',
            actualKey: 'actual',
            planLabel: 'Plan Digital',
            actualLabel: 'Actual Impl.'
        },
        {
            id: 'uptime_server',
            no: 2,
            title: 'Uptime Server',
            formula: '(Total Menit - Downtime) / Total Menit',
            target: 90,
            targetDisplay: '90%',
            unit: 'Menit',
            type: 'uptime',
            planKey: 'total_minutes',
            actualKey: 'uptime_minutes',
            planLabel: 'Total Menit',
            actualLabel: 'Uptime Menit'
        },
        {
            id: 'uptime_network',
            no: 3,
            title: 'Uptime Jaringan Internet',
            formula: '(Total Menit - Downtime) / Total Menit',
            target: 90,
            targetDisplay: '90%',
            unit: 'Menit',
            type: 'isp',
            planKey: 'total_minutes',
            actualKey: 'uptime_minutes',
            planLabel: 'Total Menit',
            actualLabel: 'Uptime Menit'
        },
        {
            id: 'preventive',
            no: 4,
            title: 'Preventive Perangkat (Hardware & Software)',
            formula: 'Jumlah perangkat dipelihara / Seluruh perangkat',
            target: 100,
            targetDisplay: '100% / 6 bln',
            unit: 'Unit',
            type: 'maintenance',
            planKey: 'target',
            actualKey: 'actual',
            planLabel: 'Target Pemeliharaan',
            actualLabel: 'Realisasi'
        },
        {
            id: 'tickets',
            no: 5,
            title: 'Menyelesaikan IT Helpdesk Ticket (HW & SW)',
            formula: 'Total Tiket selesai / Total tiket diterima',
            target: 100,
            targetDisplay: '100%',
            unit: 'Tiket',
            type: 'tickets',
            planKey: 'total_tickets',
            actualKey: 'resolved_tickets',
            planLabel: 'Tiket Diterima',
            actualLabel: 'Tiket Selesai'
        },
        {
            id: 'review_ik',
            no: 6,
            title: 'Review IK',
            formula: 'Follow by schedule (Min 4x / bulan)',
            target: 100,
            targetDisplay: 'Min 4x/bln',
            unit: 'Kali',
            type: 'review_ik',
            planKey: 'plan',
            actualKey: 'actual',
            planLabel: 'Target Review',
            actualLabel: 'Realisasi'
        }
    ];

    // Local matrix state for editing: { [kpiId]: { plan: [12 values], actual: [12 values] } }
    const [matrixState, setMatrixState] = useState({});

    // Populate matrixState from props
    useEffect(() => {
        const buildInitialMatrix = () => {
            const nextState = {};
            const nextMeta = {};
            const now = new Date();
            const curYear = now.getFullYear();
            const curMonth = now.getMonth() + 1;

            initialKpis.forEach(kpi => {
                const planArr = Array(12).fill(0);
                const actualArr = Array(12).fill(0);
                const metaArr = Array.from({ length: 12 }, (_, m) => ({
                    isFuture: year > curYear || (year === curYear && (m + 1) > curMonth),
                    isCurrent: year === curYear && (m + 1) === curMonth,
                    incidents: [],
                    downtime_minutes: 0,
                    incident_count: 0,
                    source: 'auto',
                }));

                let sourceData = [];
                if (kpi.id === 'digitalization') sourceData = digitalizationData;
                else if (kpi.id === 'uptime_server') sourceData = uptimeData;
                else if (kpi.id === 'uptime_network') {
                    sourceData = ispData.map(d => ({
                        ...d,
                        uptime_minutes: d.uptime_minutes !== undefined
                            ? d.uptime_minutes
                            : Math.round(((d.iforte_uptime || 0) + (d.comnet_uptime || 0)) / 2)
                    }));
                }
                else if (kpi.id === 'preventive') sourceData = maintenanceData;
                else if (kpi.id === 'tickets') sourceData = ticketsData;
                else if (kpi.id === 'review_ik') sourceData = reviewIkData;

                // Fill from source
                if (Array.isArray(sourceData)) {
                    sourceData.forEach(item => {
                        const mIdx = (item.month || 1) - 1;
                        if (mIdx >= 0 && mIdx < 12) {
                            planArr[mIdx] = item[kpi.planKey] !== undefined ? Number(item[kpi.planKey]) : 0;
                            actualArr[mIdx] = item[kpi.actualKey] !== undefined ? Number(item[kpi.actualKey]) : 0;
                            metaArr[mIdx] = {
                                ...metaArr[mIdx],
                                isFuture: item.isFuture !== undefined ? Boolean(item.isFuture) : metaArr[mIdx].isFuture,
                                isCurrent: item.isCurrent !== undefined ? Boolean(item.isCurrent) : metaArr[mIdx].isCurrent,
                                incidents: item.incidents || [],
                                downtime_minutes: item.downtime_minutes || 0,
                                incident_count: item.incident_count || 0,
                                total_minutes: item.total_minutes ?? planArr[mIdx],
                                percentage: item.percentage || '0.00',
                                source: item.source || 'auto',
                            };
                        }
                    });
                }

                // Default plan values ONLY for non-future months that lack explicit plans
                if (kpi.id === 'review_ik') {
                    for (let m = 0; m < 12; m++) {
                        if (!metaArr[m].isFuture && planArr[m] === 0) planArr[m] = 4;
                    }
                }
                if (kpi.id === 'digitalization') {
                    for (let m = 0; m < 12; m++) {
                        if (!metaArr[m].isFuture && planArr[m] === 0) planArr[m] = 1;
                    }
                }

                nextState[kpi.id] = {
                    plan: planArr,
                    actual: actualArr
                };
                nextMeta[kpi.id] = metaArr;
            });

            return { nextState, nextMeta };
        };

        const { nextState, nextMeta } = buildInitialMatrix();
        setMatrixState(nextState);
        setMetaMatrix(nextMeta);
    }, [year, uptimeData, ispData, maintenanceData, ticketsData, digitalizationData, reviewIkData]);

    // Handle inline input change
    const handleCellChange = (kpiId, rowType, monthIdx, value) => {
        const numVal = value === '' ? '' : Number(value);
        setMatrixState(prev => {
            const kpiData = prev[kpiId] || { plan: Array(12).fill(0), actual: Array(12).fill(0) };
            const nextRow = [...kpiData[rowType]];
            nextRow[monthIdx] = numVal;
            return {
                ...prev,
                [kpiId]: {
                    ...kpiData,
                    [rowType]: nextRow
                }
            };
        });
    };

    // Calculate percentage for a month
    const calcPercentage = (planVal, actualVal) => {
        const p = Number(planVal) || 0;
        const a = Number(actualVal) || 0;
        if (p <= 0) return a > 0 ? 100 : 0;
        const pct = (a / p) * 100;
        return Number(pct.toFixed(2));
    };

    // Calculate YTD Average % for a KPI (excludes future months)
    const calcYtdPct = (kpiId) => {
        const kpi = matrixState[kpiId];
        const meta = metaMatrix[kpiId] || [];
        if (!kpi) return 0;
        let totalPlan = 0;
        let totalActual = 0;

        for (let i = 0; i < 12; i++) {
            if (meta[i]?.isFuture) continue;
            const p = Number(kpi.plan[i]) || 0;
            const a = Number(kpi.actual[i]) || 0;
            if (p > 0 || a > 0) {
                totalPlan += p;
                totalActual += a;
            }
        }
        if (totalPlan <= 0) return 0;
        return Number(((totalActual / totalPlan) * 100).toFixed(2));
    };

    // Overall Average KPI Score
    const overallScore = () => {
        const scores = initialKpis.map(k => calcYtdPct(k.id)).filter(s => s > 0);
        if (scores.length === 0) return 0;
        const sum = scores.reduce((a, b) => a + b, 0);
        return Number((sum / scores.length).toFixed(2));
    };

    // Save changes to backend (skip future months & skip 0s for auto-computed metrics)
    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            for (const kpi of initialKpis) {
                const kpiData = matrixState[kpi.id];
                const meta = metaMatrix[kpi.id] || [];
                if (!kpiData) continue;

                const isAutoMetric = ['uptime_server', 'uptime_network', 'preventive', 'tickets'].includes(kpi.id);
                const payload = [];
                for (let m = 0; m < 12; m++) {
                    if (meta[m]?.isFuture) continue;
                    const monthNum = m + 1;
                    const pVal = Number(kpiData.plan[m]) || 0;
                    const aVal = Number(kpiData.actual[m]) || 0;
                    if (isAutoMetric && aVal === 0 && pVal === 0) continue;

                    // Do not accidentally lock live Kuma/ticket actuals as manual overrides if unchanged
                    if (isAutoMetric && meta[m]?.source !== 'manual_override' && aVal === Number(meta[m]?.total_minutes ? (meta[m].total_minutes - meta[m].downtime_minutes) : aVal)) {
                        continue;
                    }

                    const rowObj = {
                        month: monthNum,
                        [kpi.planKey]: pVal,
                        [kpi.actualKey]: aVal
                    };
                    payload.push(rowObj);
                }

                if (payload.length > 0 && onSaveOverride) {
                    await onSaveOverride(kpi.type, payload);
                }
            }
            setIsEditing(false);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Failed to save KPI scorecard:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Export to Excel
    const handleExportExcel = () => {
        const rows = [];
        
        // Header Info
        rows.push(['DEPARTEMEN ICT - KEY PERFORMANCE INDICATORS (SCORECARD)']);
        rows.push([`Tahun: ${year}`, `Generated: ${new Date().toLocaleDateString('id-ID')}`]);
        rows.push([]);

        // Table Header
        const headerRow = [
            'No', 'Key Performance Indicator', 'Formula / Rumus', 'Target', 'Satuan', 'Tipe',
            ...MONTH_NAMES, 'YTD Total / Avg', 'Status'
        ];
        rows.push(headerRow);

        initialKpis.forEach(kpi => {
            const kpiData = matrixState[kpi.id] || { plan: Array(12).fill(0), actual: Array(12).fill(0) };
            const ytd = calcYtdPct(kpi.id);
            const statusStr = ytd >= kpi.target ? 'Achieved' : (ytd >= (kpi.target * 0.85) ? 'On Track' : 'At Risk');

            // Plan row
            rows.push([
                kpi.no, kpi.title, kpi.formula, kpi.targetDisplay, kpi.unit, 'Plan (P)',
                ...kpiData.plan.map(v => Number(v) || 0),
                kpiData.plan.reduce((a, b) => Number(a) + Number(b), 0),
                ''
            ]);

            // Actual row
            rows.push([
                '', '', '', '', '', 'Actual (A)',
                ...kpiData.actual.map(v => Number(v) || 0),
                kpiData.actual.reduce((a, b) => Number(a) + Number(b), 0),
                ''
            ]);

            // % row
            const pctRow = [
                '', '', '', '', '', 'Capaian (%)'
            ];
            for (let m = 0; m < 12; m++) {
                const pct = calcPercentage(kpiData.plan[m], kpiData.actual[m]);
                pctRow.push(`${pct}%`);
            }
            pctRow.push(`${ytd}%`);
            pctRow.push(statusStr);
            rows.push(pctRow);
        });

        // Summary row
        rows.push([]);
        rows.push(['', 'OVERALL ICT PERFORMANCE SCORE', '', '', '', 'Rata-rata', '', '', '', '', '', '', '', '', '', '', '', `${overallScore()}%`, overallScore() >= 95 ? 'EXCELLENT' : 'GOOD']);

        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Column widths
        ws['!cols'] = [
            { wch: 5 },  // No
            { wch: 40 }, // KPI
            { wch: 35 }, // Formula
            { wch: 12 }, // Target
            { wch: 8 },  // Unit
            { wch: 14 }, // Tipe
            ...MONTH_NAMES.map(() => ({ wch: 9 })),
            { wch: 15 }, // YTD
            { wch: 12 }  // Status
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `KPI_Scorecard_${year}`);
        XLSX.writeFile(wb, `KPI_Scorecard_ICT_${year}.xlsx`);
    };

    // Print
    const handlePrint = () => {
        window.print();
    };

    const avgScore = overallScore();

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
            {/* Top Toolbar */}
            <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 via-white to-blue-50/20">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
                        <FileSpreadsheet size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">ICT Key Performance Indicators</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-700 tracking-wider">
                                {year} SCORECARD
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Matriks evaluasi pencapaian bulanan sesuai lembar kerja standar manajemen ICT
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Overall Performance Badge */}
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-xs mr-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rata-rata Capaian:</span>
                        <span className={`text-sm font-black ${
                            avgScore >= 90 ? 'text-emerald-600' : avgScore >= 75 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                            {avgScore}%
                        </span>
                        {avgScore >= 90 ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                            <AlertTriangle size={16} className="text-amber-500" />
                        )}
                    </div>

                    {/* Action Buttons */}
                    <button
                        onClick={onRefresh}
                        className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
                        title="Muat Ulang Data"
                    >
                        <RefreshCw size={16} />
                    </button>

                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                        <Download size={15} />
                        Export Excel
                    </button>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                        <Printer size={15} />
                        Cetak PDF
                    </button>

                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                            <Edit2 size={15} />
                            Edit Nilai
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                <X size={15} />
                                Batal
                            </button>
                            <button
                                onClick={handleSaveAll}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                            >
                                <Save size={15} />
                                {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Matrix Table - 1-Page Compact Responsive Fit */}
            <div className="kpi-scroll-wrap overflow-x-auto w-full custom-scrollbar">
                <table className="kpi-compact-table w-full border-collapse text-left font-sans text-[11px]">
                    <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-tight whitespace-nowrap">
                            <th className="py-2.5 px-1.5 w-7 text-center border-r border-slate-200">No</th>
                            <th className="py-2.5 px-2.5 w-[170px] border-r border-slate-200">Key Performance Indicator</th>
                            <th className="py-2.5 px-1.5 text-center border-r border-slate-200">Target</th>
                            <th className="py-2.5 px-1.5 border-r border-slate-200">Row</th>
                            {MONTH_NAMES.map(m => (
                                <th key={m} className="py-2.5 px-0.5 text-center border-r border-slate-200">
                                    {m}
                                </th>
                            ))}
                            <th className="py-2.5 px-1.5 text-center border-r border-slate-200">YTD</th>
                            <th className="py-2.5 px-2 text-center min-w-[76px]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {initialKpis.map(kpi => {
                            const kpiData = matrixState[kpi.id] || { plan: Array(12).fill(0), actual: Array(12).fill(0) };
                            const ytdPct = calcYtdPct(kpi.id);
                            const isMet = ytdPct >= kpi.target;
                            const isWarning = ytdPct < kpi.target && ytdPct >= (kpi.target * 0.85);

                            return (
                                <React.Fragment key={kpi.id}>
                                    {/* Row 1: Plan (P) */}
                                    <tr className="hover:bg-slate-50/60 transition-colors">
                                        <td rowSpan={3} className="py-2 px-1 text-center font-bold text-slate-700 border-r border-b border-slate-200 bg-slate-50/30 align-top pt-3">
                                            {kpi.no}
                                        </td>
                                        <td rowSpan={3} className="py-2 px-2 border-r border-b border-slate-200 bg-slate-50/30 align-top pt-3 max-w-[180px]">
                                            <div className="font-bold text-slate-900 leading-tight text-[11px]">{kpi.title}</div>
                                            <div className="text-[9px] text-slate-400 mt-0.5 font-mono leading-tight">{kpi.formula}</div>
                                        </td>
                                        <td rowSpan={3} className="py-2 px-1 text-center font-bold text-slate-700 border-r border-b border-slate-200 bg-slate-50/30 align-middle whitespace-nowrap">
                                            <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-black text-[10px] border border-blue-200/60">
                                                {kpi.targetDisplay}
                                            </span>
                                            <div className="text-[9px] text-slate-400 font-medium mt-0.5">{kpi.unit}</div>
                                        </td>
                                        <td className="py-1.5 px-1.5 font-bold text-[10px] text-slate-600 border-r border-slate-200 bg-slate-50/50 whitespace-nowrap">
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Plan</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                                            </div>
                                        </td>
                                        {MONTH_NAMES.map((_, mIdx) => {
                                            const mMeta = (metaMatrix[kpi.id] || [])[mIdx] || {};
                                            return (
                                            <td key={`p-${mIdx}`} className="py-1.5 px-0.5 text-center font-mono tabular-nums text-[10px] border-r border-slate-200 text-slate-600 whitespace-nowrap">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={kpiData.plan[mIdx] !== undefined ? kpiData.plan[mIdx] : ''}
                                                        onChange={(e) => handleCellChange(kpi.id, 'plan', mIdx, e.target.value)}
                                                        className="w-11 px-0.5 py-0.5 text-center font-bold font-mono text-slate-800 bg-blue-50/50 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[10px]"
                                                    />
                                                ) : mMeta.isFuture ? (
                                                    <span className="text-slate-300">-</span>
                                                ) : (
                                                    typeof kpiData.plan[mIdx] === 'number' ? kpiData.plan[mIdx].toLocaleString() : kpiData.plan[mIdx]
                                                )}
                                            </td>
                                            );
                                        })}
                                        <td className="py-1.5 px-1 text-center font-bold font-mono tabular-nums text-[10px] text-slate-700 border-r border-slate-200 bg-slate-50/30 whitespace-nowrap">
                                            {kpiData.plan.reduce((a, b, idx) => (metaMatrix[kpi.id]?.[idx]?.isFuture ? a : a + (Number(b) || 0)), 0).toLocaleString()}
                                        </td>
                                        <td rowSpan={3} className="py-2 px-1 text-center border-b border-slate-200 align-middle whitespace-nowrap">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight whitespace-nowrap ${
                                                isMet ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                isWarning ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                                {isMet ? 'Tercapai' : isWarning ? 'Mendekati' : 'Belum'}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* Row 2: Actual (A) */}
                                    <tr className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-1.5 px-1.5 font-bold text-[10px] text-slate-600 border-r border-slate-200 bg-slate-50/50 whitespace-nowrap">
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Actual</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                                            </div>
                                        </td>
                                        {MONTH_NAMES.map((_, mIdx) => {
                                            const mMeta = (metaMatrix[kpi.id] || [])[mIdx] || {};
                                            const hasAuditDrilldown = (kpi.id === 'uptime_server' || kpi.id === 'uptime_network') && !mMeta.isFuture;
                                            return (
                                            <td key={`a-${mIdx}`} className="py-1.5 px-0.5 text-center font-mono tabular-nums text-[10px] border-r border-slate-200 text-blue-700 font-bold whitespace-nowrap">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={kpiData.actual[mIdx] !== undefined ? kpiData.actual[mIdx] : ''}
                                                        onChange={(e) => handleCellChange(kpi.id, 'actual', mIdx, e.target.value)}
                                                        className="w-11 px-0.5 py-0.5 text-center font-bold font-mono text-blue-800 bg-blue-50/50 border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 outline-none text-[10px]"
                                                    />
                                                ) : mMeta.isFuture ? (
                                                    <span className="text-slate-300">-</span>
                                                ) : hasAuditDrilldown ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setModalCtx({
                                                            title: kpi.title,
                                                            monthIdx: mIdx,
                                                            row: mMeta,
                                                            incidents: mMeta.incidents || [],
                                                        })}
                                                        title={`Klik untuk audit tiket downtime (${mMeta.incident_count || 0} insiden)`}
                                                        className="hover:underline decoration-dotted hover:text-blue-900 transition"
                                                    >
                                                        {typeof kpiData.actual[mIdx] === 'number' ? kpiData.actual[mIdx].toLocaleString() : kpiData.actual[mIdx]}
                                                    </button>
                                                ) : (
                                                    typeof kpiData.actual[mIdx] === 'number' ? kpiData.actual[mIdx].toLocaleString() : kpiData.actual[mIdx]
                                                )}
                                            </td>
                                            );
                                        })}
                                        <td className="py-1.5 px-1 text-center font-black font-mono tabular-nums text-[10px] text-blue-700 border-r border-slate-200 bg-slate-50/30 whitespace-nowrap">
                                            {kpiData.actual.reduce((a, b, idx) => (metaMatrix[kpi.id]?.[idx]?.isFuture ? a : a + (Number(b) || 0)), 0).toLocaleString()}
                                        </td>
                                    </tr>

                                    {/* Row 3: Persentase (%) */}
                                    <tr className="bg-slate-50/80 font-bold border-b border-slate-200">
                                        <td className="py-1.5 px-1.5 text-[10px] font-black text-slate-800 border-r border-slate-200 bg-slate-100/60 whitespace-nowrap">
                                            Capaian
                                        </td>
                                        {MONTH_NAMES.map((_, mIdx) => {
                                            const mMeta = (metaMatrix[kpi.id] || [])[mIdx] || {};
                                            const pct = calcPercentage(kpiData.plan[mIdx], kpiData.actual[mIdx]);
                                            const cellMet = pct >= kpi.target;
                                            const cellWarn = pct < kpi.target && pct >= (kpi.target * 0.85);
                                            const isZero = Number(kpiData.plan[mIdx]) === 0 && Number(kpiData.actual[mIdx]) === 0;

                                            return (
                                                <td key={`pct-${mIdx}`} className="py-1.5 px-0.5 text-center font-mono tabular-nums text-[9.5px] border-r border-slate-200 whitespace-nowrap">
                                                    {mMeta.isFuture || isZero ? (
                                                        <span className="text-slate-300">-</span>
                                                    ) : (
                                                        <span className={`inline-block px-1 py-0.5 rounded font-black whitespace-nowrap ${
                                                            cellMet ? 'text-emerald-700 bg-emerald-100/60' :
                                                            cellWarn ? 'text-amber-700 bg-amber-100/60' :
                                                            'text-rose-700 bg-rose-100/60'
                                                        }`}>
                                                            {pct}%
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="py-1.5 px-1 text-center font-mono tabular-nums text-[10px] border-r border-slate-200 bg-slate-100/60 whitespace-nowrap">
                                            <span className={`inline-block px-1.5 py-0.5 rounded font-black whitespace-nowrap ${
                                                isMet ? 'bg-emerald-600 text-white' :
                                                isWarning ? 'bg-amber-600 text-white' :
                                                'bg-rose-600 text-white'
                                            }`}>
                                                {ytdPct}%
                                            </span>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    {/* Overall Summary Footer */}
                    <tfoot>
                        <tr className="bg-slate-900 text-white font-black text-[10px]">
                            <td colSpan={4} className="py-3 px-3 text-left uppercase tracking-wider">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-amber-400 shrink-0" />
                                    <span>Rata-Rata Capaian KPI (YTD)</span>
                                </div>
                            </td>
                            {MONTH_NAMES.map((_, mIdx) => {
                                const monthScores = initialKpis.map(k => {
                                    const d = matrixState[k.id];
                                    const mMeta = (metaMatrix[k.id] || [])[mIdx] || {};
                                    if (!d || mMeta.isFuture) return 0;
                                    return calcPercentage(d.plan[mIdx], d.actual[mIdx]);
                                }).filter(s => s > 0);

                                const mAvg = monthScores.length > 0 ? (monthScores.reduce((a, b) => a + b, 0) / monthScores.length).toFixed(1) : '-';
                                return (
                                    <td key={`foot-${mIdx}`} className="py-2.5 px-0.5 text-center font-mono tabular-nums border-r border-slate-800 whitespace-nowrap">
                                        {mAvg !== '-' ? `${mAvg}%` : '-'}
                                    </td>
                                );
                            })}
                            <td className="py-2.5 px-1 text-center font-mono tabular-nums text-xs border-r border-slate-800 text-amber-400 whitespace-nowrap">
                                {avgScore}%
                            </td>
                            <td className="py-2.5 px-1 text-center text-[9px] tracking-wider uppercase text-emerald-400 whitespace-nowrap">
                                {avgScore >= 90 ? 'EXCELLENT' : avgScore >= 75 ? 'GOOD' : 'ACTION'}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Bottom Legend */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="font-bold text-slate-700">Keterangan:</span>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>Tercapai (≥ Target)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span>Mendekati (85% – 99%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        <span>Di Bawah Target (&lt; 85%)</span>
                    </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                    *Uptime dihitung mulai tgl 1 tiap bulan dari tiket Uptime Kuma (Server Global / ISP) & Infra Guard. Klik angka Actual untuk audit tiket.
                </div>
            </div>

            <KpiIncidentModal
                context={modalCtx}
                year={year}
                onClose={() => setModalCtx(null)}
                onToggleExclude={onToggleExcludeTicket ? async (ticketNum, excluded) => {
                    await onToggleExcludeTicket(ticketNum, excluded);
                    setModalCtx(null);
                } : null}
            />
        </div>
    );
}

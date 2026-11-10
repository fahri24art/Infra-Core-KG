import React, { useState, useEffect } from 'react';
import { 
    Edit2, Save, X, Download, Printer, RefreshCw, 
    CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, ShieldCheck, Sparkles 
} from 'lucide-react';
import * as XLSX from 'xlsx';

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
    onRefresh
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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

            initialKpis.forEach(kpi => {
                const planArr = Array(12).fill(0);
                const actualArr = Array(12).fill(0);

                let sourceData = [];
                if (kpi.id === 'digitalization') sourceData = digitalizationData;
                else if (kpi.id === 'uptime_server') sourceData = uptimeData;
                else if (kpi.id === 'uptime_network') {
                    // Combine iforte + comnet or uptime_minutes
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
                        }
                    });
                }

                // Default fallbacks for fresh months if 0
                if (kpi.id === 'uptime_server' || kpi.id === 'uptime_network') {
                    // standard month working minutes: days * 1440
                    for (let m = 0; m < 12; m++) {
                        if (planArr[m] === 0) {
                            const days = new Date(year, m + 1, 0).getDate();
                            planArr[m] = days * 24 * 60;
                        }
                    }
                }
                if (kpi.id === 'review_ik') {
                    for (let m = 0; m < 12; m++) {
                        if (planArr[m] === 0) planArr[m] = 4;
                    }
                }
                if (kpi.id === 'digitalization') {
                    for (let m = 0; m < 12; m++) {
                        if (planArr[m] === 0) planArr[m] = 1;
                    }
                }

                nextState[kpi.id] = {
                    plan: planArr,
                    actual: actualArr
                };
            });

            return nextState;
        };

        setMatrixState(buildInitialMatrix());
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

    // Calculate YTD Average % for a KPI
    const calcYtdPct = (kpiId) => {
        const kpi = matrixState[kpiId];
        if (!kpi) return 0;
        let totalPlan = 0;
        let totalActual = 0;
        let activeMonths = 0;

        for (let i = 0; i < 12; i++) {
            const p = Number(kpi.plan[i]) || 0;
            const a = Number(kpi.actual[i]) || 0;
            if (p > 0 || a > 0) {
                totalPlan += p;
                totalActual += a;
                activeMonths++;
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

    // Save changes to backend
    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            for (const kpi of initialKpis) {
                const kpiData = matrixState[kpi.id];
                if (!kpiData) continue;

                const payload = [];
                for (let m = 0; m < 12; m++) {
                    const monthNum = m + 1;
                    const pVal = Number(kpiData.plan[m]) || 0;
                    const aVal = Number(kpiData.actual[m]) || 0;

                    const rowObj = {
                        month: monthNum,
                        [kpi.planKey]: pVal,
                        [kpi.actualKey]: aVal
                    };
                    payload.push(rowObj);
                }

                if (onSaveOverride) {
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

            {/* Matrix Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left font-sans text-xs">
                    <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-wider">
                            <th className="py-3 px-3 w-10 text-center border-r border-slate-200">No</th>
                            <th className="py-3 px-4 min-w-[240px] border-r border-slate-200">Key Performance Indicator</th>
                            <th className="py-3 px-3 w-28 text-center border-r border-slate-200">Target</th>
                            <th className="py-3 px-3 w-16 text-center border-r border-slate-200">Satuan</th>
                            <th className="py-3 px-3 w-24 border-r border-slate-200">Row</th>
                            {MONTH_NAMES.map(m => (
                                <th key={m} className="py-3 px-2 text-center w-14 border-r border-slate-200">
                                    {m}
                                </th>
                            ))}
                            <th className="py-3 px-3 text-center w-24 border-r border-slate-200">YTD / Avg</th>
                            <th className="py-3 px-3 text-center w-24">Status</th>
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
                                        <td rowSpan={3} className="py-3 px-3 text-center font-bold text-slate-700 border-r border-b border-slate-200 bg-slate-50/30 align-top pt-4">
                                            {kpi.no}
                                        </td>
                                        <td rowSpan={3} className="py-3 px-4 border-r border-b border-slate-200 bg-slate-50/30 align-top pt-4">
                                            <div className="font-bold text-slate-900 leading-snug">{kpi.title}</div>
                                            <div className="text-[10px] text-slate-400 mt-1 font-mono">{kpi.formula}</div>
                                        </td>
                                        <td rowSpan={3} className="py-3 px-3 text-center font-bold text-slate-700 border-r border-b border-slate-200 bg-slate-50/30 align-middle">
                                            <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-black text-[11px] border border-blue-200/60">
                                                {kpi.targetDisplay}
                                            </span>
                                        </td>
                                        <td rowSpan={3} className="py-3 px-3 text-center text-slate-500 font-medium border-r border-b border-slate-200 bg-slate-50/30 align-middle">
                                            {kpi.unit}
                                        </td>
                                        <td className="py-2.5 px-3 font-bold text-slate-600 border-r border-slate-200 bg-slate-50/50 flex items-center justify-between">
                                            <span>Plan (P)</span>
                                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                        </td>
                                        {MONTH_NAMES.map((_, mIdx) => (
                                            <td key={`p-${mIdx}`} className="py-2 px-1 text-center font-mono border-r border-slate-200 text-slate-600">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={kpiData.plan[mIdx] !== undefined ? kpiData.plan[mIdx] : ''}
                                                        onChange={(e) => handleCellChange(kpi.id, 'plan', mIdx, e.target.value)}
                                                        className="w-12 px-1 py-1 text-center font-bold font-mono text-slate-800 bg-blue-50/50 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                                    />
                                                ) : (
                                                    typeof kpiData.plan[mIdx] === 'number' ? kpiData.plan[mIdx].toLocaleString() : kpiData.plan[mIdx]
                                                )}
                                            </td>
                                        ))}
                                        <td className="py-2.5 px-2 text-center font-bold font-mono text-slate-700 border-r border-slate-200 bg-slate-50/30">
                                            {kpiData.plan.reduce((a, b) => Number(a) + Number(b), 0).toLocaleString()}
                                        </td>
                                        <td rowSpan={3} className="py-3 px-3 text-center border-b border-slate-200 align-middle">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
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
                                        <td className="py-2.5 px-3 font-bold text-slate-600 border-r border-slate-200 bg-slate-50/50 flex items-center justify-between">
                                            <span>Actual (A)</span>
                                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                        </td>
                                        {MONTH_NAMES.map((_, mIdx) => (
                                            <td key={`a-${mIdx}`} className="py-2 px-1 text-center font-mono border-r border-slate-200 text-blue-700 font-bold">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={kpiData.actual[mIdx] !== undefined ? kpiData.actual[mIdx] : ''}
                                                        onChange={(e) => handleCellChange(kpi.id, 'actual', mIdx, e.target.value)}
                                                        className="w-12 px-1 py-1 text-center font-bold font-mono text-blue-800 bg-blue-50/50 border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                                    />
                                                ) : (
                                                    typeof kpiData.actual[mIdx] === 'number' ? kpiData.actual[mIdx].toLocaleString() : kpiData.actual[mIdx]
                                                )}
                                            </td>
                                        ))}
                                        <td className="py-2.5 px-2 text-center font-black font-mono text-blue-700 border-r border-slate-200 bg-slate-50/30">
                                            {kpiData.actual.reduce((a, b) => Number(a) + Number(b), 0).toLocaleString()}
                                        </td>
                                    </tr>

                                    {/* Row 3: Persentase (%) */}
                                    <tr className="bg-slate-50/80 font-bold border-b border-slate-200">
                                        <td className="py-2 px-3 text-[11px] font-black text-slate-800 border-r border-slate-200 bg-slate-100/60">
                                            Capaian (%)
                                        </td>
                                        {MONTH_NAMES.map((_, mIdx) => {
                                            const pct = calcPercentage(kpiData.plan[mIdx], kpiData.actual[mIdx]);
                                            const cellMet = pct >= kpi.target;
                                            const cellWarn = pct < kpi.target && pct >= (kpi.target * 0.85);
                                            const isZero = Number(kpiData.plan[mIdx]) === 0 && Number(kpiData.actual[mIdx]) === 0;

                                            return (
                                                <td key={`pct-${mIdx}`} className="py-2 px-1 text-center font-mono text-[11px] border-r border-slate-200">
                                                    {isZero ? (
                                                        <span className="text-slate-300">-</span>
                                                    ) : (
                                                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
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
                                        <td className="py-2 px-2 text-center font-mono text-xs border-r border-slate-200 bg-slate-100/60">
                                            <span className={`px-2 py-0.5 rounded-md font-black ${
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
                        <tr className="bg-slate-900 text-white font-black text-xs">
                            <td colSpan={5} className="py-4 px-4 text-left uppercase tracking-wider text-[11px]">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-amber-400" />
                                    <span>Rata-Rata Capaian Key Performance Indicators (YTD)</span>
                                </div>
                            </td>
                            {MONTH_NAMES.map((_, mIdx) => {
                                // Average across 6 KPIs for that month
                                const monthScores = initialKpis.map(k => {
                                    const d = matrixState[k.id];
                                    if (!d) return 0;
                                    return calcPercentage(d.plan[mIdx], d.actual[mIdx]);
                                }).filter(s => s > 0);

                                const mAvg = monthScores.length > 0 ? (monthScores.reduce((a, b) => a + b, 0) / monthScores.length).toFixed(1) : '-';
                                return (
                                    <td key={`foot-${mIdx}`} className="py-3 px-1 text-center font-mono text-[11px] border-r border-slate-800">
                                        {mAvg !== '-' ? `${mAvg}%` : '-'}
                                    </td>
                                );
                            })}
                            <td className="py-3 px-3 text-center font-mono text-sm border-r border-slate-800 text-amber-400">
                                {avgScore}%
                            </td>
                            <td className="py-3 px-3 text-center text-[10px] tracking-wider uppercase text-emerald-400">
                                {avgScore >= 90 ? 'EXCELLENT' : avgScore >= 75 ? 'GOOD' : 'NEEDS ACTION'}
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
                    *Formula dihitung otomatis secara realtime dari sistem Ticketing, Monitoring Kuma, dan Preventive Schedule.
                </div>
            </div>
        </div>
    );
}

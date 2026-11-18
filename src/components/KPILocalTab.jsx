import React, { useState } from 'react';
import {
    Printer,
    Wifi,
    Server,
    Clock,
    AlertTriangle,
    CheckCircle2,
    X,
    Eye,
    EyeOff,
    RefreshCw,
} from 'lucide-react';

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

const CATEGORY_ICON = {
    local_ricoh: Printer,
    local_ap: Wifi,
    local_network: Server,
};

const formatDateTimeWIB = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }) + ' WIB';
};

/**
 * Reusable Modal showing Uptime Kuma & Infra Guard incident tickets counted in a month's uptime KPI,
 * with toggle to exclude false alarms or stale unclosed bugs.
 */
export function KpiIncidentModal({ context, year, onClose, onToggleExclude }) {
    const [busyTicket, setBusyTicket] = useState(null);
    if (!context) return null;

    const { title, monthIdx, row, incidents = [] } = context;

    const handleToggle = async (ticketNumber, nextExcluded) => {
        if (!onToggleExclude) return;
        setBusyTicket(ticketNumber);
        try {
            await onToggleExclude(ticketNumber, nextExcluded);
        } finally {
            setBusyTicket(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-base font-black text-slate-900">
                            Audit Detail Downtime: {title} ({MONTH_NAMES[monthIdx]} {year})
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                            Menit Kalender (dr Tgl 1): <strong>{Number(row?.total_minutes || 0).toLocaleString()}</strong> mnt •
                            Downtime: <strong className="text-rose-600">{Number(row?.downtime_minutes || 0).toLocaleString()}</strong> mnt •
                            Uptime: <strong className="text-emerald-600">{row?.percentage || 0}%</strong>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-3">
                    {incidents.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
                            <p className="font-bold text-slate-600">Tidak ada tiket gangguan tercatat di bulan ini (100% Up).</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                                        <th className="py-2.5 px-3">No. Tiket</th>
                                        <th className="py-2.5 px-3">Monitor / Target</th>
                                        <th className="py-2.5 px-3">Mulai (WIB)</th>
                                        <th className="py-2.5 px-3">Pulih / Update</th>
                                        <th className="py-2.5 px-3 text-center">Status</th>
                                        <th className="py-2.5 px-3 text-right">Durasi</th>
                                        {onToggleExclude && <th className="py-2.5 px-3 text-center">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {incidents.map((inc) => (
                                        <tr
                                            key={inc.number || inc.id}
                                            className={inc.excluded ? 'bg-slate-50/60 opacity-55 line-through' : 'hover:bg-blue-50/30'}
                                        >
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                                {inc.number}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-800">
                                                <div className="font-bold capitalize">{inc.target || '-'}</div>
                                                <div className="text-[10px] text-slate-400 truncate max-w-[230px]">{inc.subject}</div>
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                                {formatDateTimeWIB(inc.created_at)}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                                {formatDateTimeWIB(inc.updated_at)}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    String(inc.status).toLowerCase() === 'closed'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                    {inc.status}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600 whitespace-nowrap">
                                                {inc.clipped_minutes} mnt
                                            </td>
                                            {onToggleExclude && (
                                                <td className="py-2.5 px-3 text-center">
                                                    <button
                                                        type="button"
                                                        disabled={busyTicket === inc.number}
                                                        onClick={() => handleToggle(inc.number, !inc.excluded)}
                                                        title={inc.excluded ? 'Hitung lagi dalam KPI' : 'Abaikan (False Alarm / Stale)'}
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                                            inc.excluded
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                                                        }`}
                                                    >
                                                        {inc.excluded ? <Eye size={12} /> : <EyeOff size={12} />}
                                                        {inc.excluded ? 'Pulihkan' : 'Abaikan'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>*Interval downtime yang waktunya bertumpukan (overlap) otomatis digabung agar tidak terhitung ganda.</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function KPILocalTab({
    year,
    localKpiData = [],
    onRefresh,
    onToggleExcludeTicket,
}) {
    const [modalCtx, setModalCtx] = useState(null);

    const calcYtdStats = (monthly = []) => {
        let totalMin = 0;
        let upMin = 0;
        let downMin = 0;
        let totalIncidents = 0;
        monthly.forEach((m) => {
            if (!m.isFuture && m.total_minutes > 0) {
                totalMin += Number(m.total_minutes) || 0;
                upMin += Number(m.uptime_minutes) || 0;
                downMin += Number(m.downtime_minutes) || 0;
                totalIncidents += Number(m.incident_count) || 0;
            }
        });
        const pct = totalMin > 0 ? ((upMin / totalMin) * 100).toFixed(2) : '0.00';
        return { totalMin, upMin, downMin, totalIncidents, pct };
    };

    const handleToggleExcludeAndRefresh = async (ticketNumber, excluded) => {
        if (onToggleExcludeTicket) {
            await onToggleExcludeTicket(ticketNumber, excluded);
            setModalCtx(null);
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Banner Header */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            KPI Local Infrastructure ({year})
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                            INTERNAL ICT MONITORING
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Monitoring perangkat lokal pabrik (Mesin Fotokopi Ricoh, Access Point Wi-Fi, Switch/Router/Server Lokal) terpisah dari Scorecard Meeting Manajemen.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors shrink-0"
                >
                    <RefreshCw size={14} />
                    Refresh Telemetry
                </button>
            </div>

            {/* Category Cards */}
            {localKpiData.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400">
                    Memuat data KPI Local dari Uptime Kuma tickets...
                </div>
            ) : (
                localKpiData.map((cat) => {
                    const Icon = CATEGORY_ICON[cat.id] || Server;
                    const ytd = calcYtdStats(cat.monthly || []);
                    return (
                        <div key={cat.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="p-2.5 rounded-2xl bg-slate-900 text-white">
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-sm">{cat.title}</h3>
                                        <p className="text-[11px] text-slate-500">{cat.subtitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                    <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200">
                                        <span className="text-slate-400 mr-1.5">Total Insiden:</span>
                                        <strong className="text-slate-800">{ytd.totalIncidents}x</strong>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200">
                                        <span className="text-slate-400 mr-1.5">Total Downtime:</span>
                                        <strong className="text-rose-600">{ytd.downMin.toLocaleString()} mnt</strong>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-xl font-black ${
                                        Number(ytd.pct) >= 95
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : Number(ytd.pct) >= 85
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}>
                                        YTD: {ytd.pct}%
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto w-full custom-scrollbar">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase whitespace-nowrap">
                                            <th className="py-2 px-3 w-32 border-r border-slate-200">Metrik</th>
                                            {MONTH_NAMES.map((m) => (
                                                <th key={m} className="py-2 px-1 text-center border-r border-slate-200">
                                                    {m}
                                                </th>
                                            ))}
                                            <th className="py-2 px-2 text-center w-20">YTD Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[10px] whitespace-nowrap">
                                        <tr>
                                            <td className="py-1.5 px-3 font-sans font-bold text-slate-600 border-r border-slate-200 bg-slate-50/40">
                                                Menit (dr Tgl 1)
                                            </td>
                                            {(cat.monthly || []).map((row, mIdx) => (
                                                <td key={mIdx} className="py-1.5 px-1 text-center border-r border-slate-100 text-slate-500">
                                                    {row.isFuture ? '-' : row.total_minutes.toLocaleString()}
                                                </td>
                                            ))}
                                            <td className="py-1.5 px-2 text-center font-bold text-slate-700">
                                                {ytd.totalMin.toLocaleString()}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-4 font-sans font-bold text-rose-600 border-r border-slate-200 bg-slate-50/40">
                                                Downtime (Mnt)
                                            </td>
                                            {(cat.monthly || []).map((row, mIdx) => (
                                                <td key={mIdx} className="py-2 px-2 text-center border-r border-slate-100">
                                                    {row.isFuture ? (
                                                        <span className="text-slate-300">-</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setModalCtx({
                                                                title: cat.title,
                                                                monthIdx: mIdx,
                                                                row,
                                                                incidents: row.incidents || [],
                                                            })}
                                                            className={`px-1.5 py-0.5 rounded transition ${
                                                                row.downtime_minutes > 0
                                                                    ? 'font-bold text-rose-600 hover:bg-rose-50 underline decoration-dotted'
                                                                    : 'text-slate-400 hover:bg-slate-100'
                                                            }`}
                                                            title="Klik untuk lihat daftar tiket gangguan"
                                                        >
                                                            {row.downtime_minutes.toLocaleString()}
                                                        </button>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="py-2 px-3 text-center font-bold text-rose-600">
                                                {ytd.downMin.toLocaleString()}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-4 font-sans font-bold text-slate-700 border-r border-slate-200 bg-slate-50/40">
                                                Tiket Insiden
                                            </td>
                                            {(cat.monthly || []).map((row, mIdx) => (
                                                <td key={mIdx} className="py-2 px-2 text-center border-r border-slate-100">
                                                    {row.isFuture ? (
                                                        <span className="text-slate-300">-</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setModalCtx({
                                                                title: cat.title,
                                                                monthIdx: mIdx,
                                                                row,
                                                                incidents: row.incidents || [],
                                                            })}
                                                            className="text-slate-600 hover:text-blue-600 font-bold"
                                                        >
                                                            {row.incident_count}x
                                                        </button>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="py-2 px-3 text-center font-bold text-slate-800">
                                                {ytd.totalIncidents}x
                                            </td>
                                        </tr>
                                        <tr className="bg-slate-50/70">
                                            <td className="py-2 px-4 font-sans font-black text-slate-800 border-r border-slate-200">
                                                Uptime (%)
                                            </td>
                                            {(cat.monthly || []).map((row, mIdx) => {
                                                const p = Number(row.percentage || 0);
                                                return (
                                                    <td key={mIdx} className="py-2 px-2 text-center border-r border-slate-100">
                                                        {row.isFuture ? (
                                                            <span className="text-slate-300">-</span>
                                                        ) : (
                                                            <span className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                                                                p >= 95
                                                                    ? 'bg-emerald-100/70 text-emerald-700'
                                                                    : p >= 85
                                                                    ? 'bg-amber-100/70 text-amber-700'
                                                                    : 'bg-rose-100/70 text-rose-700'
                                                            }`}>
                                                                {p.toFixed(2)}%
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-2 px-3 text-center font-black text-slate-900">
                                                {ytd.pct}%
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })
            )}

            <KpiIncidentModal
                context={modalCtx}
                year={year}
                onClose={() => setModalCtx(null)}
                onToggleExclude={handleToggleExcludeAndRefresh}
            />
        </div>
    );
}


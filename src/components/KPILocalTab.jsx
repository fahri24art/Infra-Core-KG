import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
    Printer,
    Wifi,
    Server,
    Globe,
    Network,
    Wrench,
    Activity,
    CheckCircle2,
    X,
    Eye,
    EyeOff,
    RefreshCw,
    Download,
    Search,
    Layers,
    Database,
    Factory,
    Users,
    Building2,
} from 'lucide-react';

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

const MODULE_ICON = {
    net_isp: Globe,
    net_ap: Wifi,
    net_core: Network,
    srv_idempiere: Database,
    srv_shopfloor: Factory,
    srv_hris: Users,
    srv_vendor: Building2,
    srv_factoryhub: Layers,
    srv_portal_local: Server,
    tools_ricoh: Printer,
    tools_other: Wrench,
    // Legacy fallbacks
    local_ricoh: Printer,
    local_ap: Wifi,
    local_network: Server,
};

const GROUP_CONFIG = {
    network: {
        id: 'network',
        label: 'Network',
        fullTitle: 'Network Infrastructure',
        desc: 'ISP WAN (iForte & Comtronic), Core Switch, Router MikroTik & Access Point Wi-Fi',
        icon: Network,
        accentBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        heroBorder: 'border-cyan-200 hover:border-cyan-400',
        heroActive: 'ring-2 ring-cyan-500 border-cyan-500 bg-cyan-50/40',
        iconBox: 'bg-cyan-600 text-white shadow-cyan-500/20',
    },
    server: {
        id: 'server',
        label: 'Server',
        fullTitle: 'Server & Core Applications (Global & Lokal)',
        desc: 'iDempiere ERP, Shopfloor MES, HRIS Center, Vendor Portal, FactoryHub, Compro & Local Server',
        icon: Server,
        accentBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        heroBorder: 'border-indigo-200 hover:border-indigo-400',
        heroActive: 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/40',
        iconBox: 'bg-indigo-600 text-white shadow-indigo-500/20',
    },
    tools: {
        id: 'tools',
        label: 'Tools',
        fullTitle: 'Tools & Peripherals',
        desc: 'Mesin Fotokopi / Printer Ricoh, CCTV / NVR & Perangkat Penunjang Operasional',
        icon: Wrench,
        accentBg: 'bg-amber-50 text-amber-800 border-amber-200',
        heroBorder: 'border-amber-200 hover:border-amber-400',
        heroActive: 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/40',
        iconBox: 'bg-amber-600 text-white shadow-amber-500/20',
    },
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

const getSlaBadge = (pctNum) => {
    const p = Number(pctNum) || 0;
    if (p >= 99) return { label: 'Healthy', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' };
    if (p >= 95) return { label: 'Warning', cls: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' };
    return { label: 'Critical', cls: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500' };
};

/**
 * Reusable Modal showing Uptime Kuma & Infra Guard incident tickets counted in a month's uptime KPI,
 * with Down vs Latency filtering and toggle to exclude false alarms or stale unclosed tickets.
 */
export function KpiIncidentModal({ context, year, onClose, onToggleExclude }) {
    const [busyTicket, setBusyTicket] = useState(null);
    const [kindFilter, setKindFilter] = useState('all'); // 'all' | 'down' | 'latency'
    if (!context) return null;

    const { title, monthIdx, row, incidents = [] } = context;

    const filteredIncidents = incidents.filter((inc) => {
        if (kindFilter === 'all') return true;
        const kind = inc.alert_kind || (/\[LATENCY-ALERT\]/i.test(String(inc.subject || '')) ? 'latency' : 'down');
        return kind === kindFilter;
    });

    const handleToggle = async (ticketNumber, nextExcluded) => {
        if (!onToggleExclude) return;
        setBusyTicket(ticketNumber);
        try {
            await onToggleExclude(ticketNumber, nextExcluded);
        } finally {
            setBusyTicket(null);
        }
    };

    const downTotal = incidents.filter((x) => (x.alert_kind || (/\[LATENCY-ALERT\]/i.test(String(x.subject || '')) ? 'latency' : 'down')) === 'down').length;
    const latTotal = incidents.length - downTotal;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
                    <div>
                        <h3 className="text-base font-black text-slate-900">
                            Audit Detail Downtime: {title} ({MONTH_NAMES[monthIdx]} {year})
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                            Menit Kalender: <strong>{Number(row?.total_minutes || 0).toLocaleString()}</strong> mnt •
                            Downtime: <strong className="text-rose-600">{Number(row?.downtime_minutes || 0).toLocaleString()}</strong> mnt •
                            Uptime: <strong className="text-emerald-600">{row?.percentage || 0}%</strong>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {incidents.length > 0 && (
                            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-[11px] font-bold">
                                <button
                                    type="button"
                                    onClick={() => setKindFilter('all')}
                                    className={`px-2.5 py-1 rounded-lg transition ${kindFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                                >
                                    Semua ({incidents.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setKindFilter('down')}
                                    className={`px-2.5 py-1 rounded-lg transition ${kindFilter === 'down' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}
                                >
                                    Down ({downTotal})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setKindFilter('latency')}
                                    className={`px-2.5 py-1 rounded-lg transition ${kindFilter === 'latency' ? 'bg-amber-600 text-white' : 'text-slate-500'}`}
                                >
                                    Latency ({latTotal})
                                </button>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-3">
                    {filteredIncidents.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
                            <p className="font-bold text-slate-600">Tidak ada tiket gangguan tercatat di kategori ini (100% Up).</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                                        <th className="py-2.5 px-3">No. Tiket</th>
                                        <th className="py-2.5 px-3">Tipe</th>
                                        <th className="py-2.5 px-3">Monitor / Target</th>
                                        <th className="py-2.5 px-3">Mulai (WIB)</th>
                                        <th className="py-2.5 px-3">Pulih / Update</th>
                                        <th className="py-2.5 px-3 text-center">Status</th>
                                        <th className="py-2.5 px-3 text-right">Durasi</th>
                                        {onToggleExclude && <th className="py-2.5 px-3 text-center">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredIncidents.map((inc) => {
                                        const kind = inc.alert_kind || (/\[LATENCY-ALERT\]/i.test(String(inc.subject || '')) ? 'latency' : 'down');
                                        return (
                                            <tr
                                                key={inc.number || inc.id}
                                                className={inc.excluded ? 'bg-slate-50/60 opacity-55 line-through' : 'hover:bg-blue-50/30'}
                                            >
                                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                                    {inc.number}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                        kind === 'latency'
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                                                    }`}>
                                                        {kind === 'latency' ? 'Latency' : 'Down'}
                                                    </span>
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
                                        );
                                    })}
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

function calcYtdStats(monthly = []) {
    let totalMin = 0;
    let upMin = 0;
    let downMin = 0;
    let totalIncidents = 0;
    let downCount = 0;
    let latencyCount = 0;
    monthly.forEach((m) => {
        if (!m.isFuture && m.total_minutes > 0) {
            totalMin += Number(m.total_minutes) || 0;
            upMin += Number(m.uptime_minutes) || 0;
            downMin += Number(m.downtime_minutes) || 0;
            totalIncidents += Number(m.incident_count) || 0;
            downCount += Number(m.down_count) || 0;
            latencyCount += Number(m.latency_count) || 0;
        }
    });
    const pct = totalMin > 0 ? ((upMin / totalMin) * 100).toFixed(2) : '0.00';
    const mttr = totalIncidents > 0 ? Math.round(downMin / totalIncidents) : 0;
    return { totalMin, upMin, downMin, totalIncidents, downCount, latencyCount, mttr, pct };
}

function MonthlyHeatStrip({ monthly = [] }) {
    return (
        <div className="flex items-center gap-1" title="Status Uptime 12 Bulan (Jan - Des)">
            {Array.from({ length: 12 }, (_, idx) => {
                const row = monthly[idx] || { isFuture: true };
                const p = Number(row.percentage || 0);
                let colorCls = 'bg-slate-200';
                if (!row.isFuture && row.total_minutes > 0) {
                    if (p >= 99) colorCls = 'bg-emerald-500';
                    else if (p >= 95) colorCls = 'bg-amber-400';
                    else colorCls = 'bg-rose-500';
                }
                const title = row.isFuture
                    ? `${MONTH_NAMES[idx]}: Belum berjalan`
                    : `${MONTH_NAMES[idx]}: ${p.toFixed(2)}% (${row.incident_count || 0} insiden, ${row.downtime_minutes || 0} mnt)`;
                return (
                    <span
                        key={idx}
                        title={title}
                        className={`w-2.5 h-4 rounded-xs ${colorCls} transition-transform hover:scale-125`}
                    />
                );
            })}
        </div>
    );
}

export default function KPILocalTab({
    year,
    localKpiData = [],
    localKpiGroups = {},
    onRefresh,
    onToggleExcludeTicket,
}) {
    const [modalCtx, setModalCtx] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState('all'); // 'all' | 'network' | 'server' | 'tools'
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('default'); // 'default' | 'downtime_desc' | 'incidents_desc'

    const handleToggleExcludeAndRefresh = async (ticketNumber, excluded) => {
        if (onToggleExcludeTicket) {
            await onToggleExcludeTicket(ticketNumber, excluded);
            setModalCtx(null);
        }
    };

    const computedGroups = useMemo(() => {
        const out = {};
        for (const key of ['network', 'server', 'tools']) {
            if (localKpiGroups[key]) {
                out[key] = localKpiGroups[key];
            } else {
                const mods = localKpiData.filter((c) => (c.group || 'network') === key);
                const stats = mods.map((m) => calcYtdStats(m.monthly || []));
                const avgPct = stats.length > 0
                    ? Number((stats.reduce((s, x) => s + Number(x.pct), 0) / stats.length).toFixed(2))
                    : 0;
                const totalInc = stats.reduce((s, x) => s + x.totalIncidents, 0);
                const downCount = stats.reduce((s, x) => s + x.downCount, 0);
                const latencyCount = stats.reduce((s, x) => s + x.latencyCount, 0);
                const downMin = stats.reduce((s, x) => s + x.downMin, 0);
                out[key] = {
                    id: key,
                    moduleCount: mods.length,
                    avgPct,
                    incidentCount: totalInc,
                    downCount,
                    latencyCount,
                    downtimeMinutes: downMin,
                    mttrMinutes: totalInc > 0 ? Math.round(downMin / totalInc) : 0,
                    monthly: mods[0]?.monthly || [],
                };
            }
        }
        return out;
    }, [localKpiData, localKpiGroups]);

    const visibleModules = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = localKpiData.filter((cat) => {
            const g = cat.group || 'network';
            if (selectedGroup !== 'all' && g !== selectedGroup) return false;
            if (!q) return true;
            return (
                (cat.title || '').toLowerCase().includes(q) ||
                (cat.subtitle || '').toLowerCase().includes(q) ||
                (cat.groupLabel || g).toLowerCase().includes(q)
            );
        });

        if (sortBy === 'downtime_desc') {
            list = [...list].sort((a, b) => calcYtdStats(b.monthly).downMin - calcYtdStats(a.monthly).downMin);
        } else if (sortBy === 'incidents_desc') {
            list = [...list].sort((a, b) => calcYtdStats(b.monthly).totalIncidents - calcYtdStats(a.monthly).totalIncidents);
        }
        return list;
    }, [localKpiData, selectedGroup, searchQuery, sortBy]);

    const groupedSections = useMemo(() => {
        if (sortBy !== 'default') {
            return [{ id: 'sorted', title: 'Hasil Urutan Berdasarkan Gangguan / Downtime', items: visibleModules }];
        }
        const sections = [];
        for (const grpKey of ['network', 'server', 'tools']) {
            const items = visibleModules.filter((m) => (m.group || 'network') === grpKey);
            if (items.length > 0) {
                sections.push({
                    id: grpKey,
                    title: GROUP_CONFIG[grpKey].fullTitle,
                    desc: GROUP_CONFIG[grpKey].desc,
                    items,
                });
            }
        }
        return sections;
    }, [visibleModules, sortBy]);

    const handleExportExcel = () => {
        const rows = [];
        rows.push([`ICT INFRASTRUCTURE TELEMETRY & SLA (${year})`]);
        rows.push([`Generated: ${new Date().toLocaleDateString('id-ID')}`, `Filter: ${selectedGroup.toUpperCase()}`]);
        rows.push([]);
        rows.push(['Kategori', 'Modul / Monitor', 'Metrik', ...MONTH_NAMES, 'YTD Total / Avg', 'MTTR (mnt)']);

        visibleModules.forEach((cat) => {
            const ytd = calcYtdStats(cat.monthly || []);
            const grpLabel = (cat.groupLabel || cat.group || 'INFRA').toUpperCase();
            rows.push([
                grpLabel,
                cat.title,
                'Menit Kalender',
                ...(cat.monthly || []).map((m) => (m.isFuture ? '-' : m.total_minutes)),
                ytd.totalMin,
                '',
            ]);
            rows.push([
                '',
                '',
                'Downtime (Mnt)',
                ...(cat.monthly || []).map((m) => (m.isFuture ? '-' : m.downtime_minutes)),
                ytd.downMin,
                ytd.mttr,
            ]);
            rows.push([
                '',
                '',
                'Tiket Insiden',
                ...(cat.monthly || []).map((m) => (m.isFuture ? '-' : m.incident_count)),
                ytd.totalIncidents,
                '',
            ]);
            rows.push([
                '',
                '',
                'Uptime (%)',
                ...(cat.monthly || []).map((m) => (m.isFuture ? '-' : `${Number(m.percentage || 0).toFixed(2)}%`)),
                `${ytd.pct}%`,
                '',
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [
            { wch: 12 }, { wch: 36 }, { wch: 16 },
            ...MONTH_NAMES.map(() => ({ wch: 10 })),
            { wch: 15 }, { wch: 12 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Infra_SLA_${year}`);
        XLSX.writeFile(wb, `KPI_Infrastructure_ICT_${year}.xlsx`);
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Banner Header */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            Infrastructure Telemetry &amp; SLA ({year})
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                            NETWORK • SERVER • TOOLS
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            LIVE MULTI-YEAR
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Rekap menyeluruh ketersediaan Network (ISP, Switch, Wi-Fi), Server (iDempiere, Shopfloor, HRIS, Vendor, FactoryHub, Local), &amp; Tools (Ricoh, NVR/Tools) dari tiket monitoring real-time.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={visibleModules.length === 0}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                    >
                        <Download size={14} />
                        Export Excel
                    </button>
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors"
                    >
                        <RefreshCw size={14} />
                        Refresh Telemetry
                    </button>
                </div>
            </div>

            {/* 3 Interactive Category Hero Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
                {['network', 'server', 'tools'].map((grpKey) => {
                    const cfg = GROUP_CONFIG[grpKey];
                    const gData = computedGroups[grpKey] || {};
                    const Icon = cfg.icon;
                    const isActive = selectedGroup === grpKey;
                    const sla = getSlaBadge(gData.avgPct || 0);

                    return (
                        <button
                            key={grpKey}
                            type="button"
                            onClick={() => setSelectedGroup(isActive ? 'all' : grpKey)}
                            className={`text-left bg-white rounded-3xl border p-5 shadow-xs transition-all hover:shadow-md ${
                                isActive ? cfg.heroActive : cfg.heroBorder
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-2xl shadow-sm ${cfg.iconBox}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Kategori {cfg.label} • {gData.moduleCount || 0} Modul
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 mt-0.5">{cfg.label} Infrastructure</h3>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${sla.cls}`}>
                                    {sla.label}
                                </span>
                            </div>

                            <div className="mt-4 flex items-end justify-between gap-3">
                                <div>
                                    <div className="text-2xl font-black font-mono tabular-nums text-slate-900 leading-none">
                                        {(gData.avgPct || 0).toFixed(2)}%
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-1">
                                        Rata² SLA YTD ({year})
                                    </div>
                                </div>
                                <MonthlyHeatStrip monthly={gData.monthly || []} />
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-600">
                                <span>
                                    Down: <strong className="text-rose-600">{gData.downCount || 0}x</strong>
                                    {(gData.latencyCount || 0) > 0 && (
                                        <> • Latency: <strong className="text-amber-600">{gData.latencyCount}x</strong></>
                                    )}
                                </span>
                                <span>
                                    MTTR: <strong className="text-slate-900">{gData.mttrMinutes || 0} mnt</strong>
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Category Filter Pills + Search + Sort Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs print:hidden">
                <div className="flex flex-wrap items-center gap-1.5">
                    {[
                        { id: 'all', label: `Semua (${localKpiData.length})` },
                        { id: 'network', label: `Network (${computedGroups.network?.moduleCount || 0})` },
                        { id: 'server', label: `Server (${computedGroups.server?.moduleCount || 0})` },
                        { id: 'tools', label: `Tools (${computedGroups.tools?.moduleCount || 0})` },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedGroup(tab.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                                selectedGroup === tab.id
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari server, AP, ISP..."
                            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-slate-700 w-48"
                        />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 cursor-pointer"
                    >
                        <option value="default">Urutkan: per Kategori</option>
                        <option value="downtime_desc">Top Offenders (Downtime Terbesar)</option>
                        <option value="incidents_desc">Insiden Terbanyak</option>
                    </select>
                </div>
            </div>

            {/* Category Cards */}
            {visibleModules.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400">
                    {localKpiData.length === 0
                        ? 'Memuat data Infrastructure Telemetry dari tiket monitoring...'
                        : 'Tidak ada modul yang cocok dengan filter pencarian.'}
                </div>
            ) : (
                groupedSections.map((sec) => (
                    <div key={sec.id} className="space-y-4">
                        <div className="flex items-center justify-between px-1 pt-2">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 flex items-center gap-2">
                                    <Activity size={14} className="text-blue-600" />
                                    {sec.title}
                                </h3>
                                {sec.desc && <p className="text-[11px] text-slate-400 mt-0.5">{sec.desc}</p>}
                            </div>
                            <span className="text-[11px] font-bold text-slate-400">{sec.items.length} modul</span>
                        </div>

                        {sec.items.map((cat) => {
                            const Icon = MODULE_ICON[cat.id] || Server;
                            const ytd = calcYtdStats(cat.monthly || []);
                            const grpMeta = GROUP_CONFIG[cat.group || 'network'] || GROUP_CONFIG.network;
                            const sla = getSlaBadge(ytd.pct);

                            return (
                                <div key={cat.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="p-2.5 rounded-2xl bg-slate-900 text-white shrink-0">
                                                <Icon size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${grpMeta.accentBg}`}>
                                                        {grpMeta.label}
                                                    </span>
                                                    <h4 className="font-black text-slate-900 text-sm truncate">{cat.title}</h4>
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate">{cat.subtitle}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                                            <div className="hidden sm:flex items-center px-2.5 py-1.5 rounded-xl bg-white border border-slate-200">
                                                <MonthlyHeatStrip monthly={cat.monthly || []} />
                                            </div>
                                            <div className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200">
                                                <span className="text-slate-400 mr-1">Down:</span>
                                                <strong className="text-slate-800">{ytd.downCount}x</strong>
                                                {ytd.latencyCount > 0 && (
                                                    <>
                                                        <span className="text-slate-300 mx-1">|</span>
                                                        <span className="text-slate-400 mr-1">Lat:</span>
                                                        <strong className="text-amber-600">{ytd.latencyCount}x</strong>
                                                    </>
                                                )}
                                            </div>
                                            <div className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200">
                                                <span className="text-slate-400 mr-1">Downtime:</span>
                                                <strong className="text-rose-600">{ytd.downMin.toLocaleString()} mnt</strong>
                                            </div>
                                            <div className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200">
                                                <span className="text-slate-400 mr-1">MTTR:</span>
                                                <strong className="text-slate-800">{ytd.mttr} mnt</strong>
                                            </div>
                                            <div className={`px-3 py-1.5 rounded-xl font-black border ${sla.cls}`}>
                                                YTD: {ytd.pct}%
                                            </div>
                                        </div>
                                    </div>

                                    <div className="kpi-scroll-wrap overflow-x-auto w-full custom-scrollbar">
                                        <table className="kpi-compact-table w-full text-left text-xs border-collapse">
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
                                                    <td className="py-1.5 px-3 font-sans font-bold text-rose-600 border-r border-slate-200 bg-slate-50/40">
                                                        Downtime (Mnt)
                                                    </td>
                                                    {(cat.monthly || []).map((row, mIdx) => (
                                                        <td key={mIdx} className="py-1.5 px-1 text-center border-r border-slate-100">
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
                                                    <td className="py-1.5 px-2 text-center font-bold text-rose-600">
                                                        {ytd.downMin.toLocaleString()}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1.5 px-3 font-sans font-bold text-slate-700 border-r border-slate-200 bg-slate-50/40">
                                                        Tiket Insiden
                                                    </td>
                                                    {(cat.monthly || []).map((row, mIdx) => (
                                                        <td key={mIdx} className="py-1.5 px-1 text-center border-r border-slate-100">
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
                                                                    title={`Down: ${row.down_count || 0}x | Latency: ${row.latency_count || 0}x`}
                                                                >
                                                                    {row.incident_count}x
                                                                    {(row.latency_count || 0) > 0 && (
                                                                        <span className="text-[9px] text-amber-600 ml-0.5">({row.latency_count}L)</span>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="py-1.5 px-2 text-center font-bold text-slate-800">
                                                        {ytd.totalIncidents}x
                                                    </td>
                                                </tr>
                                                <tr className="bg-slate-50/70">
                                                    <td className="py-1.5 px-3 font-sans font-black text-slate-800 border-r border-slate-200">
                                                        Uptime (%)
                                                    </td>
                                                    {(cat.monthly || []).map((row, mIdx) => {
                                                        const p = Number(row.percentage || 0);
                                                        return (
                                                            <td key={mIdx} className="py-1.5 px-1 text-center border-r border-slate-100">
                                                                {row.isFuture ? (
                                                                    <span className="text-slate-300">-</span>
                                                                ) : (
                                                                    <span className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                                                                        p >= 99
                                                                            ? 'bg-emerald-100/70 text-emerald-700'
                                                                            : p >= 95
                                                                            ? 'bg-amber-100/70 text-amber-700'
                                                                            : 'bg-rose-100/70 text-rose-700'
                                                                    }`}>
                                                                        {p.toFixed(2)}%
                                                                    </span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-1.5 px-2 text-center font-black text-slate-900">
                                                        {ytd.pct}%
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))
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

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { db } from '../services/mockDatabase';
import { FileText, BarChart2, Target, Monitor, AlertTriangle, Network, ShieldCheck, Clock, AlertCircle, FileSpreadsheet, Layers } from 'lucide-react';
import { formatDate } from '../utils/scheduler';
import KPIGraph from '../components/KPIGraph';
import KPIScorecardTable from '../components/KPIScorecardTable';
import axios from 'axios';

export default function Reports() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard' | 'charts'
    const [checksheets, setChecksheets] = useState([]);
    const [assets, setAssets] = useState([]);
    const [networkStats, setNetworkStats] = useState(null);
    const [securityIntel, setSecurityIntel] = useState(null);
    const [loading, setLoading] = useState(true);

    const [year, setYear] = useState(new Date().getFullYear());
    const [monthlyMaintKpi, setMonthlyMaintKpi] = useState([]);
    const [totalAssets, setTotalAssets] = useState(0);
    const [monthlyUptimeKpi, setMonthlyUptimeKpi] = useState([]);
    const [monthlyUptimeKgKpi, setMonthlyUptimeKgKpi] = useState([]);
    const [monthlyIspKpi, setMonthlyIspKpi] = useState([]);
    const [monthlyTicketsKpi, setMonthlyTicketsKpi] = useState([]);
    const [digitalizationData, setDigitalizationData] = useState([]);
    const [reviewIkData, setReviewIkData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const org = JSON.parse(sessionStorage.getItem('user') || '{}')?.organization || 'TCF-SG';
                const [assetsRes, netRes, secRes, maintRes] = await Promise.all([
                    axios.get(`/api/assets?organization=${org}`),
                    axios.get(`/api/network/dashboard?organization=${org}`),
                    axios.get(`/api/security/intelligence?organization=${org}`),
                    axios.get(`/api/maintenance?organization=${org}`)
                ]);

                setAssets(assetsRes.data || []);
                setNetworkStats(netRes.data);
                setSecurityIntel(secRes.data);
                setChecksheets(maintRes.data || []);
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        fetchKpiData();
    }, [year]);

    const fetchKpiData = async () => {
        try {
            const org = JSON.parse(sessionStorage.getItem('user') || '{}')?.organization || 'TCF-SG';
            const [maintRes, uptimeRes, uptimeKgRes, ispRes, ticketsRes, overridesRes] = await Promise.all([
                fetch(`/api/network/maintenance/monthly-kpi?year=${year}&organization=${org}`),
                fetch(`/api/network/uptime-monthly?year=${year}&organization=${org}`),
                fetch(`/api/network/uptime-monthly?year=${year}&type=uptime_kg&organization=${org}`),
                fetch(`/api/network/isp-bandwidth-monthly?year=${year}&organization=${org}`),
                fetch(`/api/network/tickets/monthly-kpi?year=${year}&organization=${org}`),
                fetch(`/api/network/kpi-overrides?year=${year}`)
            ]);
            const maintData = await maintRes.json();
            setMonthlyMaintKpi(maintData.monthly || []);
            setTotalAssets(maintData.totalAssetsQualified || 0);

            const uptimeData = await uptimeRes.json();
            setMonthlyUptimeKpi(Array.isArray(uptimeData) ? uptimeData : (uptimeData.monthly || []));

            const uptimeKgData = await uptimeKgRes.json();
            setMonthlyUptimeKgKpi(Array.isArray(uptimeKgData) ? uptimeKgData : (uptimeKgData.monthly || []));

            const ispData = await ispRes.json();
            setMonthlyIspKpi(Array.isArray(ispData) ? ispData : (ispData.monthly || []));

            const ticketsData = await ticketsRes.json();
            setMonthlyTicketsKpi(Array.isArray(ticketsData) ? ticketsData : (ticketsData.monthly || []));

            // Populate Digitalization & Review IK from overrides
            if (overridesRes.ok) {
                const allOverrides = await overridesRes.json();
                const digiArr = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, plan: 1, actual: 0 }));
                const revArr = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, plan: 4, actual: 0 }));

                if (Array.isArray(allOverrides)) {
                    allOverrides.forEach(ov => {
                        const m = ov.month - 1;
                        if (m >= 0 && m < 12) {
                            if (ov.type === 'digitalization') {
                                digiArr[m][ov.metric] = Number(ov.value);
                            } else if (ov.type === 'review_ik') {
                                revArr[m][ov.metric] = Number(ov.value);
                            }
                        }
                    });
                }
                setDigitalizationData(digiArr);
                setReviewIkData(revArr);
            }
        } catch (err) {
            console.error('Failed to fetch KPI data', err);
        }
    };

    const handleKpiSave = async (kpiType, data) => {
        try {
            const res = await fetch('/api/network/kpi-overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: kpiType, year, data })
            });
            if (res.ok) {
                await fetchKpiData();
            } else {
                console.error("Failed to save KPI override");
            }
        } catch (err) {
            console.error('Error saving KPI:', err);
        }
    };

    const offlineThreshold = 14 * 24 * 60 * 60 * 1000; // 2 weeks in ms
    const offlineAssets = assets.filter(a => {
        if (!a.last_agent_sync) return true;
        const lastSync = new Date(a.last_agent_sync).getTime();
        return (Date.now() - lastSync) > offlineThreshold;
    });

    // Use real API data for execution log
    const executionData = checksheets.map(cs => ({
        id: cs.id,
        asset: cs.asset_name || 'Unknown Asset',
        planDate: cs.next_due ? new Date(cs.next_due).toLocaleDateString() : '-',
        actualDate: cs.updated_at ? new Date(cs.updated_at).toLocaleDateString() : 'Pending',
        tech: 'System', // Pic is usually system or tech in DB
        user: cs.user_name || '-',
        status: cs.next_due ? (new Date(cs.next_due) < new Date() ? 'Overdue' : 'Scheduled') : 'Scheduled'
    }));

    // Transform for Monthly Matrix
    // Transform for Monthly Matrix
    const monthlyDataMatrix = checksheets.slice(0, 20).map(cs => {
        let row = { name: cs.asset_name, jan: '-', feb: '-', mar: '-', apr: '-', may: '-', jun: '-', jul: '-', aug: '-', sep: '-', oct: '-', nov: '-', dec: '-' };
        if (cs.next_due) {
            const date = new Date(cs.next_due);
            const month = date.toLocaleString('default', { month: 'short' }).toLowerCase();
            if (row[month] !== undefined) row[month] = 'PLN';
        }
        return row;
    });

    // If empty (no checksheets yet), show placeholder
    const displayExecutionData = executionData.length > 0 ? executionData : [
        { id: 101, asset: 'No Data', planDate: '-', actualDate: '-', tech: '-', user: '-', status: '-' }
    ];

    const displayMonthlyData = monthlyDataMatrix.length > 0 ? monthlyDataMatrix : [
        { name: 'No Data', jan: '-', feb: '-', mar: '-', apr: '-', may: '-', jun: '-' },
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-5 pb-20">
            {/* Header and Mode Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl">
                        <BarChart2 size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Modul <span className="text-blue-600 italic">KPI ICT</span></h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 px-1">Key Performance Indicators & Scorecard Analytics</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs">
                        <button
                            onClick={() => setActiveTab('scorecard')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                activeTab === 'scorecard'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <FileSpreadsheet size={15} />
                            Scorecard Matriks (Format Excel)
                        </button>
                        <button
                            onClick={() => setActiveTab('charts')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                activeTab === 'charts'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <BarChart2 size={15} />
                            Grafik Analitik (Visual Charts)
                        </button>
                    </div>

                    {/* Statistical Period Year Selector */}
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-[#E1E1E1] shadow-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode:</span>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-transparent border-none text-slate-900 font-black text-sm outline-none cursor-pointer focus:ring-0"
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="card-unifi p-32 flex flex-col items-center justify-center gap-4 min-h-[600px]">
                    <div className="relative w-12 h-12">
                        <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Processing Analytics...</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'scorecard' ? (
                        <KPIScorecardTable
                            year={year}
                            uptimeData={monthlyUptimeKpi}
                            ispData={monthlyIspKpi}
                            maintenanceData={monthlyMaintKpi}
                            ticketsData={monthlyTicketsKpi}
                            digitalizationData={digitalizationData}
                            reviewIkData={reviewIkData}
                            onSaveOverride={handleKpiSave}
                            onRefresh={fetchKpiData}
                        />
                    ) : (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-5">
                                <KPIGraph
                                    kpiType="uptime"
                                    title="Uptime Server (Sadang)"
                                    data={monthlyUptimeKpi}
                                    dataKeys={['uptime_minutes', 'total_minutes']}
                                    colors={['#006FFF', '#94A3B8']}
                                    tableLabels={['Uptime Min', 'Total Min']}
                                    onSave={handleKpiSave}
                                />
                                <KPIGraph
                                    kpiType="uptime_kg"
                                    title="Uptime Server (Karawang)"
                                    data={monthlyUptimeKgKpi}
                                    dataKeys={['uptime_minutes', 'total_minutes']}
                                    colors={['#F59E0B', '#94A3B8']}
                                    tableLabels={['Uptime Min', 'Total Min']}
                                    onSave={handleKpiSave}
                                />
                                <KPIGraph
                                    kpiType="isp"
                                    title="Uptime Jaringan Internet"
                                    data={monthlyIspKpi}
                                    dataKeys={['iforte_uptime', 'comnet_uptime', 'total_minutes']}
                                    colors={['#10B981', '#3B82F6', '#94A3B8']}
                                    tableLabels={['iForte (Min)', 'Comnet (Min)', 'Total (Min)']}
                                    onSave={handleKpiSave}
                                />
                                <KPIGraph
                                    kpiType="maintenance"
                                    title="Preventive Perangkat (Hardware & Software)"
                                    data={(monthlyMaintKpi || []).map(d => ({ ...d, 'Total Perangkat': totalAssets }))}
                                    dataKeys={['Total Perangkat', 'target', 'actual']}
                                    colors={['#CBD5E1', '#64748B', '#006FFF']}
                                    tableLabels={['Seluruh Perangkat', 'Target', 'Pemeliharaan']}
                                    onSave={handleKpiSave}
                                />
                                <KPIGraph
                                    kpiType="tickets"
                                    title="Penyelesaian IT Helpdesk Ticket"
                                    data={monthlyTicketsKpi}
                                    dataKeys={['total_tickets', 'resolved_tickets']}
                                    colors={['#94A3B8', '#10B981']}
                                    tableLabels={['Tiket Diterima', 'Tiket Selesai']}
                                    onSave={handleKpiSave}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

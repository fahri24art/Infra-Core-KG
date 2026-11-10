import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { 
    Target, Compass, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, 
    Search, Filter, ArrowUpRight, BarChart3, Calendar, Building2, 
    Sparkles, Check, X, FileText, ChevronRight, HelpCircle, ChevronDown,
    Cpu, HardDrive, Laptop, Monitor, Clock, ShieldCheck, KeyRound, ArrowRight,
    BookOpen, CheckSquare, Zap, AlertTriangle, Layers, Coins, TrendingUp,
    RefreshCw, Download, FileSpreadsheet, Send, UserCheck, Sliders, ExternalLink,
    Server, Wrench, Eye
} from 'lucide-react';
import Swal from 'sweetalert2';

export const ACTIVITY_CATEGORIES = [
    { key: 'NETWORK_INFRA', label: '1. Network & Infrastructure', badge: 'Network & Infra', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Cpu, desc: 'CCTV IP, Fiber Optic, Switch PoE, Server Proxmox, Wi-Fi Enterprise' },
    { key: 'SMART_FACTORY', label: '2. Smart Factory & Shopfloor', badge: 'Smart Factory', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Zap, desc: 'Barcode Kanban, Tablet QC, Andon System, IoT Mesin Produksi' },
    { key: 'CYBERSECURITY', label: '3. Cybersecurity & Compliance', badge: 'Cybersecurity', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: ShieldCheck, desc: 'Wazuh XDR/SIEM, Firewall FortiGate/MikroTik, Offsite Backup DR, ISO 27001' },
    { key: 'HARDWARE_REFRESH', label: '4. Hardware Refresh & PC Modernization', badge: 'Hardware Refresh', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Laptop, desc: 'Replacement PC/Laptop afkir > 5 tahun sesuai IK-03-02, Upgrade RAM/SSD' },
    { key: 'SOFTWARE_ERP', label: '5. Enterprise Software, License & AMC', badge: 'Software & AMC', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: KeyRound, desc: 'SolidWorks AMC, Microsoft 365, ZWCAD, iDempiere ERP Customization' },
    { key: 'GOVERNANCE_SOP', label: '6. IT Governance, SOP & Training', badge: 'Governance & SOP', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: BookOpen, desc: 'Security Awareness Training, Audit Kepatuhan Aset, Pembaruan IK/SOP' }
];

export const CONTROL_ITEMS_LIST = [
    'Moral',
    'Productivity',
    'Infrastructure',
    'Cybersecurity',
    'Hardware & Asset',
    'Software & License',
    'Cost',
    'Delivery',
    'Safety',
    'Quality'
];

const QUARTERS = [
    { key: 'Q1', label: 'Q1 (Jan - Mar)', desc: 'Kuartal I: Perencanaan, Audit & Standardisasi' },
    { key: 'Q2', label: 'Q2 (Apr - Jun)', desc: 'Kuartal II: Pengadaan & Eksekusi Lapangan' },
    { key: 'Q3', label: 'Q3 (Jul - Sep)', desc: 'Kuartal III: Implementasi Lanjutan & Virtualisasi' },
    { key: 'Q4', label: 'Q4 (Okt - Des)', desc: 'Kuartal IV: Renewal Lisensi & Review Akhir' }
];

export const MONTHS_LIST = [
    { key: 'jan', label: 'Jan', fullLabel: 'Januari', monthIdx: 0 },
    { key: 'feb', label: 'Feb', fullLabel: 'Februari', monthIdx: 1 },
    { key: 'mar', label: 'Mar', fullLabel: 'Maret', monthIdx: 2 },
    { key: 'apr', label: 'Apr', fullLabel: 'April', monthIdx: 3 },
    { key: 'may', label: 'May', fullLabel: 'Mei', monthIdx: 4 },
    { key: 'jun', label: 'Jun', fullLabel: 'Juni', monthIdx: 5 },
    { key: 'jul', label: 'Jul', fullLabel: 'Juli', monthIdx: 6 },
    { key: 'aug', label: 'Aug', fullLabel: 'Agustus', monthIdx: 7 },
    { key: 'sep', label: 'Sep', fullLabel: 'September', monthIdx: 8 },
    { key: 'oct', label: 'Oct', fullLabel: 'Oktober', monthIdx: 9 },
    { key: 'nov', label: 'Nov', fullLabel: 'November', monthIdx: 10 },
    { key: 'dec', label: 'Dec', fullLabel: 'Desember', monthIdx: 11 }
];

function getMonthsRange(start, end) {
    if (!start || !end) return [];
    const keys = MONTHS_LIST.map(m => m.key);
    const sIdx = keys.indexOf(start.toLowerCase());
    const eIdx = keys.indexOf(end.toLowerCase());
    if (sIdx === -1 || eIdx === -1) return [];
    if (sIdx <= eIdx) return keys.slice(sIdx, eIdx + 1);
    return [keys[sIdx]];
}

// TCF Gear Logo SVG Component
function TCFGearLogo({ className = "w-10 h-10" }) {
    return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer gear circle */}
            <circle cx="50" cy="50" r="44" stroke="#475569" strokeWidth="4" fill="#f8fafc" />
            {/* Gear teeth */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                <rect 
                    key={deg} 
                    x="46" 
                    y="2" 
                    width="8" 
                    height="10" 
                    rx="2" 
                    fill="#64748b" 
                    transform={`rotate(${deg} 50 50)`} 
                />
            ))}
            {/* Inner ring */}
            <circle cx="50" cy="50" r="30" stroke="#0f172a" strokeWidth="3" fill="#ffffff" />
            {/* 3 Letter Circles: T, C, F */}
            {/* Top: T */}
            <circle cx="50" cy="36" r="9" fill="#0f172a" />
            <text x="50" y="40" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif">T</text>
            {/* Bottom-left: C */}
            <circle cx="39" cy="58" r="9" fill="#0f172a" />
            <text x="39" y="62" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif">C</text>
            {/* Bottom-right: F */}
            <circle cx="61" cy="58" r="9" fill="#0f172a" />
            <text x="61" y="62" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif">F</text>
        </svg>
    );
}

export default function ActivityPlanSection({
    year = 2027,
    selectedPlant = 'ALL',
    defaultPlant = 'SG',
    formatIDR,
    onBudgetSyncSuccess
}) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        total_activities: 0,
        total_capex: 0,
        total_opex: 0,
        total_budget: 0,
        completed_count: 0,
        in_progress_count: 0,
        planned_count: 0,
        avg_progress: 0
    });

    // Filters - default to 'ALL' to show the enterprise-wide Improvement Activity Plan
    const [filterPlant, setFilterPlant] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterControlItem, setFilterControlItem] = useState('ALL');
    const [filterQuarter, setFilterQuarter] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    
    // View mode: 'GANTT_TCF' (Official TCF Kaizen Excel layout) | 'ROADMAP' (Quarter cards) | 'TABLE' (Data grid)
    const [viewMode, setViewMode] = useState('GANTT_TCF');

    // Modal state for Add/Edit Activity
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        year,
        plant: selectedPlant !== 'ALL' ? selectedPlant : defaultPlant,
        control_item: 'Infrastructure',
        item_no: '1.1',
        category: 'NETWORK_INFRA',
        title: '',
        description: '',
        quarter: 'Q2',
        target_month: 'apr',
        plan_start_month: 'apr',
        plan_end_month: 'jun',
        actual_start_month: '',
        actual_end_month: '',
        plan_months: ['apr', 'may', 'jun'],
        actual_months: [],
        budget_type: 'CAPEX_I1',
        capex_amount: 0,
        opex_amount: 0,
        total_amount: 0,
        pic: 'Hery (ICT Specialist)',
        priority: 'HIGH',
        status: 'PLANNED',
        progress_pct: 0,
        kpi_deliverable: '',
        milestones: []
    });

    const [newMilestoneText, setNewMilestoneText] = useState('');

    // Fetch Activity Plans from API
    const fetchActivities = async () => {
        setLoading(true);
        try {
            const plantParam = filterPlant;
            const res = await axios.get(`/api/budgeting/activity-plans?year=${year}&plant=${plantParam}&category=${filterCategory}&quarter=${filterQuarter}&status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`);
            if (res.data) {
                setActivities(res.data.activities || []);
                if (res.data.summary) setSummary(res.data.summary);
            }
        } catch (err) {
            console.error('Failed to fetch activity plans:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, [year, filterPlant, filterCategory, filterQuarter, filterStatus, searchQuery]);

    // Group activities by control_item for TCF Gantt Matrix
    const groupedActivities = useMemo(() => {
        const groups = {};
        activities.forEach(act => {
            const ctrl = act.control_item || 'Infrastructure';
            if (!groups[ctrl]) groups[ctrl] = [];
            groups[ctrl].push(act);
        });
        return groups;
    }, [activities]);

    // Distinct list of control items for filter dropdown
    const availableControlItems = useMemo(() => {
        const set = new Set();
        activities.forEach(a => { if (a.control_item) set.add(a.control_item); });
        CONTROL_ITEMS_LIST.forEach(c => set.add(c));
        return Array.from(set);
    }, [activities]);

    // Open Add Modal
    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormData({
            year,
            plant: filterPlant !== 'ALL' ? filterPlant : defaultPlant,
            control_item: 'Infrastructure',
            item_no: `${activities.length + 1}.1`,
            category: 'NETWORK_INFRA',
            title: '',
            description: '',
            quarter: 'Q2',
            target_month: 'apr',
            plan_start_month: 'apr',
            plan_end_month: 'jun',
            actual_start_month: '',
            actual_end_month: '',
            plan_months: ['apr', 'may', 'jun'],
            actual_months: [],
            budget_type: 'CAPEX_I1',
            capex_amount: 0,
            opex_amount: 0,
            total_amount: 0,
            pic: 'Hery (ICT Specialist)',
            priority: 'HIGH',
            status: 'PLANNED',
            progress_pct: 0,
            kpi_deliverable: '',
            milestones: [
                { id: 1, text: 'Site survey & perencanaan teknis', done: false },
                { id: 2, text: 'Pengajuan form formulir budget Capex/Opex ke FAT', done: false },
                { id: 3, text: 'Eksekusi pengadaan / instalasi perangkat', done: false },
                { id: 4, text: 'Testing, commissioning & serah terima BAST', done: false }
            ]
        });
        setNewMilestoneText('');
        setModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (item) => {
        setEditingItem(item);
        const pMonths = Array.isArray(item.plan_months) ? item.plan_months : getMonthsRange(item.plan_start_month || 'jan', item.plan_end_month || 'mar');
        const aMonths = Array.isArray(item.actual_months) ? item.actual_months : (item.actual_start_month && item.actual_end_month ? getMonthsRange(item.actual_start_month, item.actual_end_month) : []);

        setFormData({
            year: item.year || year,
            plant: item.plant || defaultPlant,
            control_item: item.control_item || 'Infrastructure',
            item_no: item.item_no || '1.1',
            category: item.category || 'NETWORK_INFRA',
            title: item.title || '',
            description: item.description || '',
            quarter: item.quarter || 'Q1',
            target_month: item.target_month || 'jan',
            plan_start_month: item.plan_start_month || 'jan',
            plan_end_month: item.plan_end_month || 'mar',
            actual_start_month: item.actual_start_month || '',
            actual_end_month: item.actual_end_month || '',
            plan_months: pMonths,
            actual_months: aMonths,
            budget_type: item.budget_type || 'CAPEX_I1',
            capex_amount: item.capex_amount || 0,
            opex_amount: item.opex_amount || 0,
            total_amount: item.total_amount || 0,
            pic: item.pic || 'Hery (ICT Specialist)',
            priority: item.priority || 'MEDIUM',
            status: item.status || 'PLANNED',
            progress_pct: item.progress_pct || 0,
            kpi_deliverable: item.kpi_deliverable || '',
            milestones: item.milestones ? [...item.milestones] : []
        });
        setNewMilestoneText('');
        setModalOpen(true);
    };

    // Interactive Toggle Month in Gantt Row
    const handleToggleMonthCell = async (act, type, monthKey) => {
        try {
            const field = type === 'plan' ? 'plan_months' : 'actual_months';
            let cur = Array.isArray(act[field]) ? [...act[field]] : [];
            if (cur.includes(monthKey)) {
                cur = cur.filter(m => m !== monthKey);
            } else {
                cur.push(monthKey);
                cur.sort((a, b) => MONTHS_LIST.findIndex(m => m.key === a) - MONTHS_LIST.findIndex(m => m.key === b));
            }

            // Optimistic update
            setActivities(prev => prev.map(a => 
                a.id === act.id ? { ...a, [field]: cur } : a
            ));

            await axios.post(`/api/budgeting/activity-plans/${act.id}/toggle-month`, {
                type,
                month: monthKey
            });
        } catch (err) {
            console.error('Failed to toggle month cell:', err);
            fetchActivities();
        }
    };

    // Add milestone subtask to form
    const handleAddMilestone = (e) => {
        e?.preventDefault();
        if (!newMilestoneText.trim()) return;
        const newMs = {
            id: Date.now(),
            text: newMilestoneText.trim(),
            done: false
        };
        setFormData({
            ...formData,
            milestones: [...formData.milestones, newMs]
        });
        setNewMilestoneText('');
    };

    // Remove milestone from form
    const handleRemoveMilestone = (id) => {
        setFormData({
            ...formData,
            milestones: formData.milestones.filter(m => m.id !== id)
        });
    };

    // Toggle milestone directly from card/row
    const handleToggleMilestone = async (act, milestoneId) => {
        try {
            const updatedMilestones = act.milestones.map(m => 
                m.id === milestoneId ? { ...m, done: !m.done } : m
            );
            const doneCount = updatedMilestones.filter(m => m.done).length;
            const newProgress = updatedMilestones.length > 0 
                ? Math.round((doneCount / updatedMilestones.length) * 100) 
                : act.progress_pct;

            let newStatus = act.status;
            if (newProgress === 100) newStatus = 'COMPLETED';
            else if (newProgress > 0 && act.status === 'PLANNED') newStatus = 'IN_PROGRESS';

            // Optimistic update
            setActivities(prev => prev.map(a => 
                a.id === act.id ? { ...a, milestones: updatedMilestones, progress_pct: newProgress, status: newStatus } : a
            ));

            await axios.put(`/api/budgeting/activity-plans/${act.id}`, {
                milestones: updatedMilestones,
                progress_pct: newProgress,
                status: newStatus
            });
            fetchActivities();
        } catch (err) {
            console.error('Failed to toggle milestone:', err);
            fetchActivities();
        }
    };

    // Save Activity Form
    const handleSaveActivity = async (e) => {
        e.preventDefault();
        try {
            const capex = Number(formData.capex_amount) || 0;
            const opex = Number(formData.opex_amount) || 0;
            const total = capex + opex;

            const payload = {
                ...formData,
                year,
                capex_amount: capex,
                opex_amount: opex,
                total_amount: total
            };

            if (editingItem) {
                await axios.put(`/api/budgeting/activity-plans/${editingItem.id}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Aktivitas Diperbarui',
                    text: `Program kerja "${formData.title}" berhasil disimpan!`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await axios.post('/api/budgeting/activity-plans', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Aktivitas Ditambahkan',
                    text: `Program kerja baru berhasil didaftarkan ke Tahun ${year}!`,
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            setModalOpen(false);
            fetchActivities();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        }
    };

    // Delete Activity
    const handleDeleteActivity = async (act) => {
        const result = await Swal.fire({
            title: `Hapus Program Kerja?`,
            html: `
                <div style="text-align: left; font-size: 13px; color: #334155;">
                    <p><b>Judul:</b> ${act.title}</p>
                    <p><b>Item No:</b> ${act.control_item} - ${act.item_no || '-'}</p>
                    <p><b>Estimasi Biaya:</b> ${formatIDR(act.total_amount)}</p>
                    <p style="color: #ef4444; margin-top: 8px;">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/budgeting/activity-plans/${act.id}`);
                Swal.fire('Terhapus', 'Aktivitas berhasil dihapus.', 'success');
                fetchActivities();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // 1-Click Sync Activity to Budget Items
    const handleSyncToBudget = async (act) => {
        const confirmResult = await Swal.fire({
            title: `Sinkronkan ke Sheet Budget ${act.year || year}?`,
            html: `
                <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
                    <p><b>Aktivitas:</b> ${act.title}</p>
                    <p><b>Control Item:</b> ${act.control_item} (${act.item_no || '-'})</p>
                    <p><b>Target Plant:</b> ${act.plant === 'ALL' ? 'Sadang & Karawang (Konsolidasi TCF)' : act.plant === 'KG' ? 'Plant Karawang (KG)' : 'Plant Sadang (SG)'}</p>
                    <p><b>Target Eksekusi:</b> ${act.quarter} - Bulan ${(act.target_month || 'apr').toUpperCase()}</p>
                    <hr style="margin: 8px 0; border: 0; border-top: 1px solid #e2e8f0;" />
                    <p><b>Rincian Komitmen Anggaran:</b></p>
                    <ul style="padding-left: 18px; margin: 4px 0;">
                        ${act.capex_amount > 0 ? `<li><b style="color: #2563eb;">CAPEX Form I-1:</b> ${formatIDR(act.capex_amount)} (Investasi Perangkat)</li>` : ''}
                        ${act.opex_amount > 0 ? `<li><b style="color: #059669;">OPEX Form ${act.category === 'SOFTWARE_ERP' ? 'F1' : 'F2'}:</b> ${formatIDR(act.opex_amount)} (${act.category === 'SOFTWARE_ERP' ? 'Lisensi/Maintenance' : 'Sparepart/Material/Jasa'})</li>` : ''}
                        ${act.total_amount === 0 ? `<li><b style="color: #64748b;">Zero Budget (In-house Optimization)</b></li>` : ''}
                    </ul>
                    <p style="font-size: 11px; color: #64748b; margin-top: 6px;">
                        *Item akan otomatis didaftarkan ke sheet resmi <b>Formulir FAT TCF</b> tahun anggaran ${act.year || year}.
                    </p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Ya, Daftarkan ke Anggaran ${act.year || year}`,
            cancelButtonText: 'Batal',
            confirmButtonColor: '#4f46e5'
        });

        if (confirmResult.isConfirmed) {
            try {
                Swal.fire({
                    title: 'Menyinkronkan ke Anggaran...',
                    text: 'Membuat baris formulir Capex/Opex...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const res = await axios.post(`/api/budgeting/activity-plans/${act.id}/sync-to-budget`);
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Disinkronkan!',
                    text: res.data.message || 'Item anggaran berhasil didaftarkan.',
                    timer: 2500,
                    showConfirmButton: false
                });

                fetchActivities();
                if (onBudgetSyncSuccess) onBudgetSyncSuccess();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // Seed Standard Templates
    const handleSeedTemplates = async () => {
        const confirmResult = await Swal.fire({
            title: `Muat Template Standar TCF ${year}?`,
            text: `Sistem akan memuat daftar Improvement Activity Plan resmi PT TCF (Moral, Productivity, Infrastructure CCTV, Wazuh XDR, Offsite Proxmox Backup, Replacement PC >5thn, dll).`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Ya, Muat Template',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#f59e0b'
        });

        if (confirmResult.isConfirmed) {
            try {
                const res = await axios.post('/api/budgeting/activity-plans/seed-templates', { year });
                Swal.fire({
                    icon: 'success',
                    title: 'Template Berhasil Dimuat!',
                    text: res.data.message || 'Daftar aktivitas standar berhasil dimuat.',
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchActivities();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // Clone to Next Year
    const handleCloneYear = async () => {
        const targetYr = year + 1;
        const confirmResult = await Swal.fire({
            title: `Duplikasi ke Tahun ${targetYr}?`,
            text: `Seluruh program kerja tahun ${year} akan diduplikasi ke Tahun Anggaran ${targetYr} dengan status reset (Planned 0%).`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Ya, Duplikasi ke ${targetYr}`,
            cancelButtonText: 'Batal',
            confirmButtonColor: '#10b981'
        });

        if (confirmResult.isConfirmed) {
            try {
                const res = await axios.post('/api/budgeting/activity-plans/clone-year', {
                    sourceYear: year,
                    targetYear: targetYr
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Diduplikasi!',
                    text: res.data.message || `Aktivitas berhasil disalin ke Tahun ${targetYr}`,
                    timer: 2500,
                    showConfirmButton: false
                });
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // Export Official TCF Excel
    const handleExportExcel = async () => {
        try {
            Swal.fire({
                title: 'Menyiapkan Excel Resmi...',
                text: 'Memformat layout Improvement Activity Plan TCF...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const wb = new ExcelJS.Workbook();
            wb.creator = 'PT. Tri Centrum Fortuna - PowerAsset';
            const ws = wb.addWorksheet('Activity Plan');

            // Set column widths
            ws.columns = [
                { width: 18 }, // A: CONTROL ITEM
                { width: 8 },  // B: No
                { width: 44 }, // C: ACTION PLAN
                { width: 10 }, // D: P/A
                { width: 7 },  // E: Jan
                { width: 7 },  // F: Feb
                { width: 7 },  // G: Mar
                { width: 7 },  // H: Apr
                { width: 7 },  // I: May
                { width: 7 },  // J: Jun
                { width: 7 },  // K: Jul
                { width: 7 },  // L: Aug
                { width: 7 },  // M: Sep
                { width: 7 },  // N: Oct
                { width: 7 },  // O: Nov
                { width: 7 },  // P: Dec
                { width: 22 }  // Q: BUDGET (IDR)
            ];

            // Row 1: Company Header
            ws.mergeCells('C1:P1');
            const compCell = ws.getCell('C1');
            compCell.value = 'PT. Tri Centrum Fortuna';
            compCell.alignment = { horizontal: 'center', vertical: 'middle' };
            compCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF334155' } };

            // Row 2: Title Banner
            ws.mergeCells('C2:P2');
            const titleCell = ws.getCell('C2');
            titleCell.value = `Improvement Activity Plan ${year}`;
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF0F172A' } };

            ws.getRow(1).height = 20;
            ws.getRow(2).height = 30;

            // Row 4: Column Headers
            ws.mergeCells('A4:A5');
            ws.getCell('A4').value = 'CONTROL ITEM';
            ws.mergeCells('B4:B5');
            ws.getCell('B4').value = 'No';
            ws.mergeCells('C4:C5');
            ws.getCell('C4').value = 'ACTION PLAN';
            ws.mergeCells('D4:D5');
            ws.getCell('D4').value = 'P/A';
            ws.mergeCells('E4:P4');
            ws.getCell('E4').value = `SCHEDULE ${year}`;
            ws.mergeCells('Q4:Q5');
            ws.getCell('Q4').value = 'TOTAL BUDGET';

            // Month sub-headers in row 5
            const monthCols = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
            MONTHS_LIST.forEach((m, idx) => {
                ws.getCell(`${monthCols[idx]}5`).value = m.label;
            });

            // Style headers
            const headerFill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFBDD7EE' } // Authentic TCF Excel soft blue
            };
            const thinBorder = {
                top: { style: 'thin', color: { argb: 'FF64748B' } },
                left: { style: 'thin', color: { argb: 'FF64748B' } },
                bottom: { style: 'thin', color: { argb: 'FF64748B' } },
                right: { style: 'thin', color: { argb: 'FF64748B' } }
            };

            for (let r = 4; r <= 5; r++) {
                const row = ws.getRow(r);
                row.height = 22;
                for (let c = 1; c <= 17; c++) {
                    const cell = row.getCell(c);
                    cell.fill = headerFill;
                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = thinBorder;
                }
            }

            let currentRow = 6;

            // Data Rows
            Object.keys(groupedActivities).forEach(ctrlItem => {
                const acts = groupedActivities[ctrlItem];
                const startRow = currentRow;

                acts.forEach(act => {
                    const planRow = currentRow;
                    const actualRow = currentRow + 1;

                    // Action Plan & Number
                    ws.mergeCells(`B${planRow}:B${actualRow}`);
                    ws.getCell(`B${planRow}`).value = act.item_no || '-';
                    ws.getCell(`B${planRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

                    ws.mergeCells(`C${planRow}:C${actualRow}`);
                    ws.getCell(`C${planRow}`).value = act.title;
                    ws.getCell(`C${planRow}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

                    // P/A labels
                    ws.getCell(`D${planRow}`).value = 'Plan';
                    ws.getCell(`D${planRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                    ws.getCell(`D${actualRow}`).value = 'Actual';
                    ws.getCell(`D${actualRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

                    // Budget
                    ws.mergeCells(`Q${planRow}:Q${actualRow}`);
                    ws.getCell(`Q${planRow}`).value = act.total_amount || 0;
                    ws.getCell(`Q${planRow}`).numFmt = '"Rp" #,##0';
                    ws.getCell(`Q${planRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

                    const pMonths = Array.isArray(act.plan_months) ? act.plan_months : getMonthsRange(act.plan_start_month || 'jan', act.plan_end_month || 'mar');
                    const aMonths = Array.isArray(act.actual_months) ? act.actual_months : (act.actual_start_month && act.actual_end_month ? getMonthsRange(act.actual_start_month, act.actual_end_month) : []);

                    // Color Month cells: Yellow for Plan (#FFFF00), Green for Actual (#00B050)
                    MONTHS_LIST.forEach((m, idx) => {
                        const colLetter = monthCols[idx];
                        const planCell = ws.getCell(`${colLetter}${planRow}`);
                        const actualCell = ws.getCell(`${colLetter}${actualRow}`);

                        if (pMonths.includes(m.key)) {
                            planCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFFF00' } // Bright Yellow
                            };
                        }
                        if (aMonths.includes(m.key)) {
                            actualCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FF00B050' } // Bright Green
                            };
                        }

                        planCell.border = thinBorder;
                        actualCell.border = thinBorder;
                    });

                    // Set borders for metadata cells
                    for (let c = 1; c <= 4; c++) {
                        ws.getRow(planRow).getCell(c).border = thinBorder;
                        ws.getRow(actualRow).getCell(c).border = thinBorder;
                    }
                    ws.getCell(`Q${planRow}`).border = thinBorder;
                    ws.getCell(`Q${actualRow}`).border = thinBorder;

                    ws.getRow(planRow).height = 20;
                    ws.getRow(actualRow).height = 20;

                    currentRow += 2;
                });

                // Merge Control Item column for this group
                const endRow = currentRow - 1;
                ws.mergeCells(`A${startRow}:A${endRow}`);
                const ctrlCell = ws.getCell(`A${startRow}`);
                ctrlCell.value = ctrlItem;
                ctrlCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                ctrlCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
                ctrlCell.border = thinBorder;
            });

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `TCF_Improvement_Activity_Plan_${year}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Excel Berhasil Diunduh!',
                text: `File TCF_Improvement_Activity_Plan_${year}.xlsx telah di-generate sesuai format resmi.`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Export Excel failed:', err);
            Swal.fire('Error', 'Gagal membuat file Excel: ' + err.message, 'error');
        }
    };

    // Filtered activities grouped by Quarter for Kanban view
    const activitiesByQuarter = useMemo(() => {
        const grouped = { Q1: [], Q2: [], Q3: [], Q4: [] };
        activities.forEach(a => {
            const q = a.quarter || 'Q1';
            if (grouped[q]) grouped[q].push(a);
            else grouped.Q1.push(a);
        });
        return grouped;
    }, [activities]);

    const getPriorityBadge = (p) => {
        switch (p) {
            case 'CRITICAL':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 animate-pulse"><AlertTriangle size={10} /> Critical</span>;
            case 'HIGH':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">High</span>;
            case 'MEDIUM':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">Medium</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/20 text-slate-300 border border-slate-500/30">Low</span>;
        }
    };

    const getStatusBadge = (s) => {
        switch (s) {
            case 'COMPLETED':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 size={10} /> Selesai</span>;
            case 'IN_PROGRESS':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1"><Clock size={10} className="animate-spin" /> In Progress</span>;
            case 'POSTPONED':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">Ditunda</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/20 text-slate-300 border border-slate-500/30">Planned</span>;
        }
    };

    const getCategoryMeta = (catKey) => {
        return ACTIVITY_CATEGORIES.find(c => c.key === catKey) || {
            label: catKey,
            badge: catKey,
            color: 'bg-slate-100 text-slate-800 border-slate-200',
            icon: Compass
        };
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Top Control & Action Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 md:p-6 text-white border border-slate-700/60 shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow-md">
                                <Target size={14} /> Improvement Activity Plan & Strategic Roadmap
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1.5">
                                <Calendar size={13} className="text-amber-400" />
                                Tahun Anggaran: <b className="text-white">{year}</b>
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                <Building2 size={13} />
                                {filterPlant === 'SG' ? 'Sadang (SG) Focus' : filterPlant === 'KG' ? 'Karawang (KG) Focus' : 'Semua Plant TCF (SG + KG)'}
                            </span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            Rencana Kerja & Proyek Strategis Plant {year}
                        </h2>
                        <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
                            Peta jalan aktivitas operasional, Kaizen & investasi ICT PT Tri Centrum Fortuna. Terhubung langsung dengan formulir anggaran resmi (Capex Form I-1 & Opex Form F1/F2) serta penelusuran tahapan proyek hingga integrasi nomor aset di PowerAsset.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={handleOpenAdd}
                            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all active:scale-95"
                        >
                            <Plus size={16} /> Tambah Program Kerja
                        </button>
                        <button
                            onClick={handleExportExcel}
                            title="Export Excel resmi PT Tri Centrum Fortuna dengan format Control Item & P/A Gantt"
                            className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                        >
                            <Download size={15} /> Export Excel Resmi TCF
                        </button>
                        <button
                            onClick={handleSeedTemplates}
                            title="Muat template standar Kaizen & ICT TCF"
                            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                        >
                            <Sparkles size={15} /> Muat Template TCF
                        </button>
                        <button
                            onClick={handleCloneYear}
                            title="Duplikasi seluruh aktivitas ke tahun anggaran berikutnya"
                            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                        >
                            <Calendar size={15} /> Duplikasi ke {year + 1}
                        </button>
                        <button
                            onClick={fetchActivities}
                            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
                            title="Segarkan Data"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Executive KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Activities Card */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Program Kerja {year}</span>
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                            <Target size={20} />
                        </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        {summary.total_activities} <span className="text-sm font-semibold text-slate-400">Kegiatan</span>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 size={12} /> {summary.completed_count} Selesai
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            • {summary.in_progress_count} On-Track
                        </span>
                    </div>
                </div>

                {/* Avg Execution Progress */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pencapaian Realisasi</span>
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        {summary.avg_progress}% <span className="text-sm font-semibold text-slate-400">Progress Rata-rata</span>
                    </p>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${summary.avg_progress}%` }} 
                        />
                    </div>
                </div>

                {/* Total Capex Required */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Alokasi Investasi (CAPEX)</span>
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                            <Server size={20} />
                        </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight text-blue-600">
                        {formatIDR(summary.total_capex)}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            Form I-1 Aset Baru
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                            {summary.total_budget > 0 ? ((summary.total_capex / summary.total_budget) * 100).toFixed(0) : 0}% Share
                        </span>
                    </div>
                </div>

                {/* Total Opex Required */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Biaya Operasional (OPEX)</span>
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                            <Wrench size={20} />
                        </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight text-emerald-600">
                        {formatIDR(summary.total_opex)}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Perawatan, Lisensi & Jasa
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                            {summary.total_budget > 0 ? ((summary.total_opex / summary.total_budget) * 100).toFixed(0) : 0}% Share
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter Controls & View Switcher */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1 max-w-xs">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari program kerja, nomor, PIC..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Plant Filter */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                        <button
                            onClick={() => setFilterPlant('ALL')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${filterPlant === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Semua Plant
                        </button>
                        <button
                            onClick={() => setFilterPlant('SG')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${filterPlant === 'SG' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Sadang (SG)
                        </button>
                        <button
                            onClick={() => setFilterPlant('KG')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${filterPlant === 'KG' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Karawang (KG)
                        </button>
                    </div>

                    {/* Control Item Filter */}
                    <select
                        value={filterControlItem}
                        onChange={(e) => setFilterControlItem(e.target.value)}
                        className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">Semua Control Item</option>
                        {availableControlItems.map(ci => (
                            <option key={ci} value={ci}>{ci}</option>
                        ))}
                    </select>

                    {/* Category Filter */}
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">Semua 6 Pilar ICT</option>
                        {ACTIVITY_CATEGORIES.map(cat => (
                            <option key={cat.key} value={cat.key}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                {/* View Switcher: TCF Kaizen Gantt vs Roadmap Kanban vs Table Matrix */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                    <button
                        onClick={() => setViewMode('GANTT_TCF')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${viewMode === 'GANTT_TCF' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        title="Tampilan Kaizen Excel Resmi TCF (Plan vs Actual)"
                    >
                        <BarChart3 size={14} /> Format Resmi TCF
                    </button>
                    <button
                        onClick={() => setViewMode('ROADMAP')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${viewMode === 'ROADMAP' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        title="Tampilan Kartu Kuartal (Q1 - Q4)"
                    >
                        <Calendar size={14} /> Roadmap Q1-Q4
                    </button>
                    <button
                        onClick={() => setViewMode('TABLE')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${viewMode === 'TABLE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        title="Tampilan Data Matrix Tabel Lengkap"
                    >
                        <FileSpreadsheet size={14} /> Table Matrix
                    </button>
                </div>
            </div>

            {/* VIEW 1: TCF OFFICIAL IMPROVEMENT ACTIVITY PLAN GANTT (Plan vs Actual) */}
            {viewMode === 'GANTT_TCF' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden animate-fadeIn">
                    {/* Header matching TCF Kaizen template */}
                    <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <TCFGearLogo className="w-12 h-12 shrink-0 drop-shadow-sm" />
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">PT. Tri Centrum Fortuna</p>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    Improvement Activity Plan <span className="text-indigo-600">{year}</span>
                                </h3>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap items-center gap-3 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 text-xs shadow-xs">
                            <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">Keterangan:</span>
                            <div className="flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-md bg-yellow-400 border border-yellow-500 shadow-xs inline-block" />
                                <span className="font-bold text-slate-800">Plan (Rencana)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-md bg-emerald-500 border border-emerald-600 shadow-xs inline-block" />
                                <span className="font-bold text-slate-800">Actual (Realisasi)</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <span className="text-[11px] text-slate-500 italic">*Klik sel bulan untuk toggle bar</span>
                        </div>
                    </div>

                    {/* The Gantt Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-[#bdd7ee] text-slate-900 font-black text-[11px] border-b border-slate-300">
                                    <th className="px-4 py-3 border-r border-slate-300 text-center w-36 uppercase tracking-wider">
                                        CONTROL ITEM
                                    </th>
                                    <th className="px-2 py-3 border-r border-slate-300 text-center w-12 uppercase">
                                        No
                                    </th>
                                    <th className="px-4 py-3 border-r border-slate-300 uppercase tracking-wider min-w-[280px]">
                                        ACTION PLAN
                                    </th>
                                    <th className="px-2 py-3 border-r border-slate-300 text-center w-14 uppercase">
                                        P/A
                                    </th>
                                    {/* 12 Months Header */}
                                    {MONTHS_LIST.map(m => (
                                        <th key={m.key} className="px-1 py-3 border-r border-slate-300 text-center w-12 uppercase font-black text-[11px]">
                                            {m.label}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-right min-w-[190px] uppercase tracking-wider">
                                        BUDGET & AKSI
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(groupedActivities).length === 0 ? (
                                    <tr>
                                        <td colSpan={17} className="px-6 py-16 text-center text-slate-400">
                                            <Target size={36} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm font-bold text-slate-600">Belum ada program kerja yang terdaftar.</p>
                                            <p className="text-xs text-slate-400 mt-1">Klik tombol "Muat Template TCF" atau "Tambah Program Kerja" di atas.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    Object.keys(groupedActivities)
                                        .filter(ctrl => filterControlItem === 'ALL' || ctrl === filterControlItem)
                                        .map((ctrlItem, groupIdx) => {
                                            const acts = groupedActivities[ctrlItem];

                                            return acts.map((act, actIdx) => {
                                                const catMeta = getCategoryMeta(act.category);
                                                const pMonths = Array.isArray(act.plan_months) ? act.plan_months : getMonthsRange(act.plan_start_month || 'jan', act.plan_end_month || 'mar');
                                                const aMonths = Array.isArray(act.actual_months) ? act.actual_months : (act.actual_start_month && act.actual_end_month ? getMonthsRange(act.actual_start_month, act.actual_end_month) : []);

                                                const isFirstInGroup = actIdx === 0;
                                                const groupTotalRows = acts.length * 2;

                                                return (
                                                    <React.Fragment key={act.id}>
                                                        {/* SUBROW 1: PLAN */}
                                                        <tr className="hover:bg-slate-50/80 transition-colors border-t border-slate-200">
                                                            {/* Control item column with rowspan for entire group */}
                                                            {isFirstInGroup && (
                                                                <td 
                                                                    rowSpan={groupTotalRows}
                                                                    className="px-4 py-4 text-center font-black text-slate-900 border-r border-b border-slate-300 bg-slate-50/70 align-middle text-sm"
                                                                >
                                                                    <div className="sticky top-4">
                                                                        <span>{ctrlItem}</span>
                                                                        <span className="block text-[10px] text-slate-400 font-semibold mt-1">
                                                                            ({acts.length} Action)
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            )}

                                                            {/* No column */}
                                                            <td rowSpan={2} className="px-2 py-3 text-center font-bold text-slate-700 border-r border-b border-slate-300 bg-slate-50/30 align-middle">
                                                                {act.item_no || `${groupIdx + 1}.${actIdx + 1}`}
                                                            </td>

                                                            {/* Action Plan title & scope */}
                                                            <td rowSpan={2} className="px-4 py-3 border-r border-b border-slate-300 align-middle">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catMeta.color}`}>
                                                                            {catMeta.badge}
                                                                        </span>
                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                                                            act.plant === 'SG' ? 'bg-indigo-100 text-indigo-800' : act.plant === 'KG' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                                                                        }`}>
                                                                            {act.plant}
                                                                        </span>
                                                                        {getPriorityBadge(act.priority)}
                                                                    </div>
                                                                    <h4 className="font-extrabold text-slate-900 text-xs leading-snug">
                                                                        {act.title}
                                                                    </h4>
                                                                    {act.description && (
                                                                        <p className="text-[11px] text-slate-500 line-clamp-2">
                                                                            {act.description}
                                                                        </p>
                                                                    )}
                                                                    {act.kpi_deliverable && (
                                                                        <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1 pt-0.5">
                                                                            <CheckCircle2 size={11} className="shrink-0" />
                                                                            <span>KPI: {act.kpi_deliverable}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* P/A: Plan row label */}
                                                            <td className="px-2 py-1.5 text-center font-black text-slate-700 border-r border-slate-200 bg-amber-50/40 text-[11px]">
                                                                Plan
                                                            </td>

                                                            {/* 12 Months cells for PLAN */}
                                                            {MONTHS_LIST.map(m => {
                                                                const isPlanned = pMonths.includes(m.key);
                                                                return (
                                                                    <td 
                                                                        key={`plan-${m.key}`} 
                                                                        onClick={() => handleToggleMonthCell(act, 'plan', m.key)}
                                                                        title={`Plan ${m.fullLabel}: Klik untuk ${isPlanned ? 'hapus' : 'tambahkan'}`}
                                                                        className="px-1 py-1.5 border-r border-slate-200 text-center cursor-pointer transition-colors hover:bg-amber-100/60"
                                                                    >
                                                                        {isPlanned ? (
                                                                            <div className="w-full h-5 rounded-md bg-yellow-400 border border-yellow-500 shadow-xs flex items-center justify-center animate-fadeIn">
                                                                                <span className="text-[9px] font-black text-slate-950 uppercase">{m.label}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-full h-5 rounded-md hover:border hover:border-dashed hover:border-amber-300" />
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}

                                                            {/* Budget & Action column */}
                                                            <td rowSpan={2} className="px-4 py-3 border-b border-slate-300 text-right align-middle whitespace-nowrap bg-slate-50/30">
                                                                <div className="space-y-1.5">
                                                                    <div>
                                                                        <p className="font-black text-slate-900 text-xs">
                                                                            {formatIDR(act.total_amount)}
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-400">
                                                                            {act.capex_amount > 0 ? `Capex: ${formatIDR(act.capex_amount)}` : ''}
                                                                            {act.capex_amount > 0 && act.opex_amount > 0 ? ' • ' : ''}
                                                                            {act.opex_amount > 0 ? `Opex: ${formatIDR(act.opex_amount)}` : ''}
                                                                            {act.total_amount === 0 ? 'Zero Budget Kaizen' : ''}
                                                                        </p>
                                                                    </div>

                                                                    <div className="flex items-center justify-end gap-1.5 pt-1">
                                                                        {!act.is_budget_synced ? (
                                                                            <button
                                                                                onClick={() => handleSyncToBudget(act)}
                                                                                className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-xs transition-colors flex items-center gap-1"
                                                                                title="Daftarkan ke Sheet Budget FAT Form I-1 / F2"
                                                                            >
                                                                                <Zap size={11} className="text-amber-500 fill-amber-500" />
                                                                                Sync Budget
                                                                            </button>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                                                <Check size={11} /> Synced FAT
                                                                            </span>
                                                                        )}

                                                                        <button
                                                                            onClick={() => handleOpenEdit(act)}
                                                                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors"
                                                                            title="Edit Program Kerja"
                                                                        >
                                                                            <Edit2 size={13} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteActivity(act)}
                                                                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                                                                            title="Hapus Program Kerja"
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {/* SUBROW 2: ACTUAL */}
                                                        <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-300">
                                                            {/* P/A: Actual row label */}
                                                            <td className="px-2 py-1.5 text-center font-black text-slate-700 border-r border-slate-200 bg-emerald-50/40 text-[11px]">
                                                                Actual
                                                            </td>

                                                            {/* 12 Months cells for ACTUAL */}
                                                            {MONTHS_LIST.map(m => {
                                                                const isActual = aMonths.includes(m.key);
                                                                return (
                                                                    <td 
                                                                        key={`actual-${m.key}`} 
                                                                        onClick={() => handleToggleMonthCell(act, 'actual', m.key)}
                                                                        title={`Actual ${m.fullLabel}: Klik untuk ${isActual ? 'hapus' : 'tambahkan'}`}
                                                                        className="px-1 py-1.5 border-r border-slate-200 text-center cursor-pointer transition-colors hover:bg-emerald-100/60"
                                                                    >
                                                                        {isActual ? (
                                                                            <div className="w-full h-5 rounded-md bg-emerald-500 border border-emerald-600 shadow-xs flex items-center justify-center animate-fadeIn">
                                                                                <span className="text-[9px] font-black text-white uppercase">{m.label}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-full h-5 rounded-md hover:border hover:border-dashed hover:border-emerald-300" />
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            });
                                        })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VIEW 2: ROADMAP KANBAN (Q1, Q2, Q3, Q4) */}
            {viewMode === 'ROADMAP' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {QUARTERS.map(q => {
                        const qActivities = activitiesByQuarter[q.key] || [];
                        const qTotalCost = qActivities.reduce((sum, a) => sum + (Number(a.total_amount) || 0), 0);

                        return (
                            <div key={q.key} className="bg-slate-50/80 rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col space-y-3">
                                {/* Quarter Header */}
                                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                                    <div>
                                        <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                            {q.label}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-medium">{q.desc}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                            {qActivities.length} Proyek
                                        </span>
                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{formatIDR(qTotalCost)}</p>
                                    </div>
                                </div>

                                {/* Activity Cards */}
                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[850px] pr-1">
                                    {qActivities.length === 0 ? (
                                        <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400">
                                            <Clock size={24} className="mx-auto mb-2 opacity-40" />
                                            <p className="text-xs font-semibold">Belum ada program kerja di {q.key}</p>
                                            <button
                                                onClick={() => {
                                                    setEditingItem(null);
                                                    setFormData({
                                                        ...formData,
                                                        quarter: q.key,
                                                        target_month: q.key === 'Q1' ? 'jan' : q.key === 'Q2' ? 'apr' : q.key === 'Q3' ? 'jul' : 'oct'
                                                    });
                                                    setModalOpen(true);
                                                }}
                                                className="mt-2 text-[11px] font-bold text-indigo-600 hover:underline"
                                            >
                                                + Tambah ke {q.key}
                                            </button>
                                        </div>
                                    ) : (
                                        qActivities.map(act => {
                                            const catMeta = getCategoryMeta(act.category);
                                            const CatIcon = catMeta.icon;

                                            return (
                                                <div 
                                                    key={act.id} 
                                                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3 relative group"
                                                >
                                                    {/* Card Header */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                                                act.plant === 'SG' ? 'bg-indigo-100 text-indigo-800' : act.plant === 'KG' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                                                            }`}>
                                                                {act.plant}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                                {act.control_item || 'General'} #{act.item_no || ''}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catMeta.color} flex items-center gap-1`}>
                                                                <CatIcon size={11} /> {catMeta.badge}
                                                            </span>
                                                        </div>
                                                        <div>{getPriorityBadge(act.priority)}</div>
                                                    </div>

                                                    {/* Title & Scope */}
                                                    <div>
                                                        <h4 className="font-black text-slate-900 text-sm leading-snug">
                                                            {act.title}
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                            {act.description}
                                                        </p>
                                                    </div>

                                                    {/* Financial Badge */}
                                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                                                        <div className="space-y-0.5">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Komitmen Biaya:</span>
                                                            <p className="font-black text-slate-900">{formatIDR(act.total_amount)}</p>
                                                        </div>
                                                        <div className="text-right space-y-0.5">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulan Target:</span>
                                                            <p className="font-bold text-indigo-600 uppercase">{(act.target_month || 'jan')}</p>
                                                        </div>
                                                    </div>

                                                    {/* Progress & Milestones */}
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-bold text-slate-600 flex items-center gap-1 text-[11px]">
                                                                <CheckSquare size={12} className="text-indigo-600" />
                                                                Milestones ({act.milestones?.filter(m => m.done).length || 0}/{act.milestones?.length || 0})
                                                            </span>
                                                            <span className="font-black text-slate-800 text-[11px]">{act.progress_pct || 0}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-300 ${act.progress_pct === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                                                                style={{ width: `${act.progress_pct || 0}%` }} 
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Card Footer Actions */}
                                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                        <div>{getStatusBadge(act.status)}</div>
                                                        <div className="flex items-center gap-1">
                                                            {!act.is_budget_synced ? (
                                                                <button
                                                                    onClick={() => handleSyncToBudget(act)}
                                                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1"
                                                                    title="Sinkronkan ke Sheet Budget FAT"
                                                                >
                                                                    <Zap size={11} className="text-amber-500 fill-amber-500" /> Sync Budget
                                                                </button>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    Synced
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => handleOpenEdit(act)}
                                                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                            >
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteActivity(act)}
                                                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEW 3: TABLE MATRIX */}
            {viewMode === 'TABLE' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                                <tr>
                                    <th className="px-4 py-3.5">Control Item & No</th>
                                    <th className="px-4 py-3.5">Program Kerja & Ruang Lingkup</th>
                                    <th className="px-4 py-3.5">Pilar ICT</th>
                                    <th className="px-4 py-3.5">Schedule</th>
                                    <th className="px-4 py-3.5">Estimasi Biaya</th>
                                    <th className="px-4 py-3.5">PIC & Prioritas</th>
                                    <th className="px-4 py-3.5">Progress & Status</th>
                                    <th className="px-4 py-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activities.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                                            Tidak ada aktivitas yang sesuai dengan filter pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    activities.map(act => {
                                        const catMeta = getCategoryMeta(act.category);
                                        return (
                                            <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="font-black text-slate-900 block">{act.control_item || 'General'}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">No. {act.item_no || '-'} • {act.plant}</span>
                                                </td>
                                                <td className="px-4 py-3.5 max-w-sm">
                                                    <h5 className="font-bold text-slate-900 leading-snug">{act.title}</h5>
                                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{act.description}</p>
                                                    {act.kpi_deliverable && (
                                                        <p className="text-[10px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                                                            <CheckCircle2 size={11} /> KPI: {act.kpi_deliverable}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${catMeta.color}`}>
                                                        {catMeta.badge}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="font-bold text-slate-900">{act.quarter}</span>
                                                    <span className="text-slate-400 text-[10px] ml-1">({(act.plan_start_month || act.target_month || 'jan').toUpperCase()} - {(act.plan_end_month || 'mar').toUpperCase()})</span>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <p className="font-black text-slate-900">{formatIDR(act.total_amount)}</p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {act.capex_amount > 0 ? `Capex: ${formatIDR(act.capex_amount)}` : 'Zero Capex'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <p className="font-semibold text-slate-800">{act.pic || '-'}</p>
                                                    <div className="mt-1">{getPriorityBadge(act.priority)}</div>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${act.progress_pct || 0}%` }} />
                                                        </div>
                                                        <span className="font-bold text-[10px] text-slate-600">{act.progress_pct || 0}%</span>
                                                    </div>
                                                    <div className="mt-1">{getStatusBadge(act.status)}</div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {!act.is_budget_synced ? (
                                                            <button
                                                                onClick={() => handleSyncToBudget(act)}
                                                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                                                title="Sinkronkan ke Sheet Budget FAT"
                                                            >
                                                                <Zap size={11} className="inline mr-1 text-amber-500 fill-amber-500" /> Sync Budget
                                                            </button>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Synced
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenEdit(act)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteActivity(act)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL: TAMBAH / EDIT ACTIVITY PLAN */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <Target className="text-indigo-600" size={20} />
                                    {editingItem ? 'Edit Improvement Activity Plan' : `Tambah Activity Plan Baru (${year})`}
                                </h3>
                                <p className="text-xs text-slate-500">Definisikan rencana proyek, Control Item Kaizen, timeline Gantt, dan alokasi anggaran</p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
                            {/* Row 1: Control Item, No, & Plant */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">CONTROL ITEM *</label>
                                    <input
                                        type="text"
                                        list="control-items-datalist"
                                        required
                                        placeholder="Moral, Productivity, Infrastructure..."
                                        value={formData.control_item}
                                        onChange={(e) => setFormData({ ...formData, control_item: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold bg-white"
                                    />
                                    <datalist id="control-items-datalist">
                                        {CONTROL_ITEMS_LIST.map(ci => (
                                            <option key={ci} value={ci} />
                                        ))}
                                    </datalist>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">No. Urut (Item No) *</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: 5.1, 5.2, 6.1..."
                                        value={formData.item_no}
                                        onChange={(e) => setFormData({ ...formData, item_no: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold bg-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Plant Target *</label>
                                    <select
                                        value={formData.plant}
                                        onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-semibold bg-white"
                                    >
                                        <option value="SG">Plant Sadang (SG)</option>
                                        <option value="KG">Plant Karawang (KG)</option>
                                        <option value="ALL">ALL (Konsolidasi TCF)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Title & Category */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Nama Action Plan / Program Kerja *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Implementasi Kamera CCTV IP Gedung Baru Karawang"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Pilar Kategori ICT *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-semibold"
                                    >
                                        {ACTIVITY_CATEGORIES.map(cat => (
                                            <option key={cat.key} value={cat.key}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 3: PIC & Description */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Person in Charge (PIC)</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Hery (ICT Specialist)"
                                        value={formData.pic}
                                        onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Deskripsi & Ruang Lingkup Proyek</label>
                                    <input
                                        type="text"
                                        placeholder="Jelaskan spesifikasi teknis, titik pemasangan, atau sasaran..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                    />
                                </div>
                            </div>

                            {/* Row 4: Gantt Month Selection (Plan vs Actual) */}
                            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                                <div>
                                    <h5 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                                        <BarChart3 size={15} className="text-amber-600" />
                                        Jadwal Gantt (Plan vs Actual Schedule {year})
                                    </h5>
                                    <p className="text-[11px] text-amber-800/80">Pilih bulan rencana (Kuning) dan bulan realisasi fisik (Hijau):</p>
                                </div>

                                {/* Plan Months Selector */}
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded bg-yellow-400 border border-yellow-500 inline-block" />
                                        Bulan Rencana (Plan)
                                    </span>
                                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                                        {MONTHS_LIST.map(m => {
                                            const isSelected = formData.plan_months?.includes(m.key);
                                            return (
                                                <button
                                                    key={`btn-plan-${m.key}`}
                                                    type="button"
                                                    onClick={() => {
                                                        const cur = formData.plan_months ? [...formData.plan_months] : [];
                                                        const updated = cur.includes(m.key) ? cur.filter(x => x !== m.key) : [...cur, m.key];
                                                        setFormData({ ...formData, plan_months: updated });
                                                    }}
                                                    className={`py-1.5 rounded-lg text-xs font-black transition-all border ${
                                                        isSelected 
                                                            ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-xs scale-105' 
                                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {m.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Actual Months Selector */}
                                <div className="space-y-1.5 pt-2">
                                    <span className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600 inline-block" />
                                        Bulan Realisasi (Actual)
                                    </span>
                                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                                        {MONTHS_LIST.map(m => {
                                            const isSelected = formData.actual_months?.includes(m.key);
                                            return (
                                                <button
                                                    key={`btn-act-${m.key}`}
                                                    type="button"
                                                    onClick={() => {
                                                        const cur = formData.actual_months ? [...formData.actual_months] : [];
                                                        const updated = cur.includes(m.key) ? cur.filter(x => x !== m.key) : [...cur, m.key];
                                                        setFormData({ ...formData, actual_months: updated });
                                                    }}
                                                    className={`py-1.5 rounded-lg text-xs font-black transition-all border ${
                                                        isSelected 
                                                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs scale-105' 
                                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {m.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Row 5: Financial & Budget Linkage */}
                            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                                        <Coins size={14} className="text-indigo-600" />
                                        Alokasi Anggaran (Budget Linkage)
                                    </span>
                                    <span className="text-xs font-black text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                                        Total: {formatIDR((Number(formData.capex_amount) || 0) + (Number(formData.opex_amount) || 0))}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-blue-900">
                                            Komponen CAPEX (Form I-1 Aset Baru)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="50000"
                                                placeholder="0"
                                                value={formData.capex_amount}
                                                onChange={(e) => setFormData({ ...formData, capex_amount: e.target.value })}
                                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500">Unit NVR, Kamera IP, PC, Switch, Rack Server</p>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-emerald-900">
                                            Komponen OPEX (Form F1/F2 Sparepart/Jasa)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="50000"
                                                placeholder="0"
                                                value={formData.opex_amount}
                                                onChange={(e) => setFormData({ ...formData, opex_amount: e.target.value })}
                                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500">Kabel Cat6, Pipa, Jasa Tarik, AMC Lisensi Software</p>
                                    </div>
                                </div>
                            </div>

                            {/* Row 6: KPI & Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Target Output / KPI Deliverable</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: 16 Kamera online di PowerAsset & Pos Security, Retensi rekaman 30 hari"
                                        value={formData.kpi_deliverable}
                                        onChange={(e) => setFormData({ ...formData, kpi_deliverable: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                                    >
                                        <option value="PLANNED">Direncanakan (Planned)</option>
                                        <option value="IN_PROGRESS">Sedang Berjalan</option>
                                        <option value="COMPLETED">Selesai (Completed)</option>
                                        <option value="POSTPONED">Ditunda (Postponed)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 7: Milestone Checklist Sub-tasks */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Tahapan Milestone / Checklist Sub-Task</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Progress otomatis dihitung dari tahapan yang selesai</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Tambah tahapan baru (misal: Bidding vendor CCTV)..."
                                        value={newMilestoneText}
                                        onChange={(e) => setNewMilestoneText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddMilestone(e); }}
                                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddMilestone}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                                    >
                                        Tambah
                                    </button>
                                </div>

                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 mt-2">
                                    {formData.milestones.map((m, idx) => (
                                        <div key={m.id || idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={m.done}
                                                    onChange={() => {
                                                        const updated = formData.milestones.map((item, i) => 
                                                            i === idx ? { ...item, done: !item.done } : item
                                                        );
                                                        setFormData({ ...formData, milestones: updated });
                                                    }}
                                                    className="w-4 h-4 rounded text-indigo-600"
                                                />
                                                <span className={m.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                                                    {m.text}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMilestone(m.id)}
                                                className="text-slate-400 hover:text-rose-500 p-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                                >
                                    {editingItem ? 'Simpan Perubahan' : 'Daftarkan Program Kerja'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

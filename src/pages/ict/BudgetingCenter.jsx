import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Coins, TrendingUp, TrendingDown, Layers, Server, Wrench, Package, Printer, 
    FileSpreadsheet, Download, RefreshCw, Plus, Edit2, Trash2, CheckCircle2, 
    AlertCircle, Search, Filter, ArrowUpRight, BarChart3, Calendar, Building2, 
    ShieldAlert, Sparkles, Check, X, FileText, ChevronRight, HelpCircle, ChevronDown, CalendarPlus,
    Cpu, HardDrive, Laptop, Monitor, Clock, ShieldCheck, KeyRound, ArrowRight, BookOpen, CheckSquare, Zap, AlertTriangle,
    FileDown, Send, Eye, UserCheck, FileCheck, Upload, Paperclip, Target
} from 'lucide-react';
import Swal from 'sweetalert2';
import ActivityPlanSection from './ActivityPlanSection';
import { generateDeptBudgetRequestPdf } from '../../utils/generateDeptBudgetRequestPdf';
import { exportDeptBudgetExcel, exportDeptBudgetRekapExcel } from '../../utils/generateDeptBudgetRequestExcel';

const MONTH_NAMES = [
    { key: 'jan', label: 'Jan' },
    { key: 'feb', label: 'Feb' },
    { key: 'mar', label: 'Mar' },
    { key: 'apr', label: 'Apr' },
    { key: 'may', label: 'Mei' },
    { key: 'jun', label: 'Jun' },
    { key: 'jul', label: 'Jul' },
    { key: 'aug', label: 'Ags' },
    { key: 'sep', label: 'Sep' },
    { key: 'oct', label: 'Okt' },
    { key: 'nov', label: 'Nov' },
    { key: 'dec', label: 'Des' }
];

export const DEPARTMENTS_LIST = [
    'Manufacturing - Production',
    'PPC & Delivery',
    'Maintenance',
    'Engineering & New Project',
    'Quality',
    'Office - Marketing',
    'Purchasing',
    'Finance & Accounting',
    'HR / GA',
    'ICT',
    'QMR / MR'
];

export const REQUEST_CATEGORIES = [
    { key: 'NEW_DEVICE', label: '1. Pembelian Perangkat Baru (Capex I-1)', badge: 'Capex Baru', color: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'PC/Laptop Baru untuk penambahan staf / kapasitas kerja', form: 'I-1' },
    { key: 'REPLACEMENT', label: '2. Penggantian Unit Rusak / Afkir (Capex I-1)', badge: 'Replacement Unit', color: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Penggantian PC/Laptop lama usia > 5 tahun sesuai IK-03-02', form: 'I-1' },
    { key: 'UPGRADE_HARDWARE', label: '3. Upgrade Hardware & Komponen (Opex F2)', badge: 'Upgrade Hardware', color: 'bg-amber-100 text-amber-800 border-amber-200', desc: 'Upgrade RAM, SSD NVMe, GPU, PSU peningkatan performa', form: 'F2' },
    { key: 'SOFTWARE_LICENSE', label: '4. Lisensi / Perpanjangan Software (Opex F1)', badge: 'Lisensi & AMC', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', desc: 'SolidWorks, ZWCAD, O365, Antivirus terpusat, AMC tahunan', form: 'F1' },
    { key: 'NETWORK_INFRA', label: '5. Infrastruktur Jaringan & Server (Capex I-1 / F1)', badge: 'Infra Jaringan', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', desc: 'Switch, Access Point WiFi Enterprise, CCTV, Server, Router', form: 'I-1' },
    { key: 'OTHER', label: '6. Kebutuhan Fasilitas ICT Lainnya', badge: 'Periferal & Lainnya', color: 'bg-slate-100 text-slate-800 border-slate-200', desc: 'Printer, Barcode Scanner Kanban, UPS, Aksesoris Komputer', form: 'I-1' }
];

export default function BudgetingCenter({ defaultSection }) {
    // Detect active organization and RBAC permissions from session
    const user = JSON.parse((typeof window !== 'undefined' && sessionStorage.getItem('user')) || 'null');
    const isSuperAdmin = user && ['super_user', 'superuser', 'administrator', 'admin'].includes(user.role?.toLowerCase());
    const userOrg = user?.organization || 'TCF-SG';
    const currentOrg = isSuperAdmin
        ? ((typeof window !== 'undefined' && sessionStorage.getItem('organization')) || userOrg)
        : userOrg;
    
    // Default plant strictly based on active session organization
    const defaultPlant = currentOrg.toUpperCase().includes('KG') ? 'KG' : 'SG';

    const [year, setYear] = useState(2027);
    const [availableYears, setAvailableYears] = useState([2024, 2025, 2026, 2027, 2028]);
    // For non-admin, strictly lock to defaultPlant. For admin, allow 'ALL' if in SG, or 'KG' if in KG
    const initialPlant = isSuperAdmin ? (defaultPlant === 'KG' ? 'KG' : 'ALL') : defaultPlant;
    const [selectedPlant, setSelectedPlant] = useState(initialPlant);
    const [activeTab, setActiveTab] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    
    // Core data
    const [overview, setOverview] = useState(null);
    const [items, setItems] = useState([]);
    const [matrix, setMatrix] = useState([]);
    const [coaDict, setCoaDict] = useState({});

    // Modal state for Add/Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        item_name: '',
        form: 'I-1',
        category: 'CAPEX',
        plant: defaultPlant,
        coa_code: 'I1.1231.1006',
        sub_category: 'Office Equipment',
        type_asset: '3',
        unit_price: 0,
        qty: 1,
        total_amount: 0,
        notes: '',
        monthly: { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 }
    });

    // Quick Simulation Modal
    const [simModalOpen, setSimModalOpen] = useState(false);
    const [simPct, setSimPct] = useState(5);
    const [simSourceYear, setSimSourceYear] = useState(2026);

    // New Fiscal Year Modal
    const [newYearModalOpen, setNewYearModalOpen] = useState(false);
    const [newYearTarget, setNewYearTarget] = useState(2028);
    const [newYearSource, setNewYearSource] = useState(2027);
    const [newYearGrowth, setNewYearGrowth] = useState(5);

    // Main Section View Navigation
    const getInitialSection = () => {
        if (defaultSection) return defaultSection;
        if (typeof window !== 'undefined') {
            try {
                const p = new URLSearchParams(window.location.search);
                const t = p.get('tab');
                if (t === 'activity' || t === 'activity-plan' || t === 'roadmap' || t === 'improvement' || t === 'gantt') {
                    return 'ACTIVITY_PLAN';
                }
                if (t === 'hardware') return 'HARDWARE_LIFECYCLE';
                if (t === 'software') return 'SOFTWARE_LIFECYCLE';
                if (t === 'iso') return 'ISO_STANDARDS';
                if (t === 'requests' || t === 'dept') return 'DEPT_REQUESTS';
            } catch (e) {}
        }
        return 'BUDGET_GRID';
    };

    const [mainSection, setMainSection] = useState(getInitialSection);

    const switchSection = (sec) => {
        setMainSection(sec);
        if (typeof window !== 'undefined') {
            try {
                const u = new URL(window.location.href);
                if (sec === 'ACTIVITY_PLAN') u.searchParams.set('tab', 'activity');
                else if (sec === 'HARDWARE_LIFECYCLE') u.searchParams.set('tab', 'hardware');
                else if (sec === 'SOFTWARE_LIFECYCLE') u.searchParams.set('tab', 'software');
                else if (sec === 'ISO_STANDARDS') u.searchParams.set('tab', 'iso');
                else if (sec === 'DEPT_REQUESTS') u.searchParams.set('tab', 'requests');
                else u.searchParams.delete('tab');
                window.history.replaceState({}, '', u.toString());
            } catch (e) {}
        }
    };

    // Hardware Lifecycle State (Sync with ICT Assets)
    const [hardwareData, setHardwareData] = useState({ summary: {}, assets: [] });
    const [hardwareLoading, setHardwareLoading] = useState(false);
    const [hwFilterStatus, setHwFilterStatus] = useState('ALL');
    const [hwFilterDept, setHwFilterDept] = useState('ALL');
    const [hwSearch, setHwSearch] = useState('');

    // Hardware Spec Detail & ISO Audit Modal State
    const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
    const [specModalOpen, setSpecModalOpen] = useState(false);
    const [specDetailTab, setSpecDetailTab] = useState('AUDIT'); // 'AUDIT' | 'SPECS'

    // Software Lifecycle State (SolidWorks, ZWCAD, Windows, O365, etc.)
    const [softwareData, setSoftwareData] = useState({ summary: {}, software: [] });
    const [softwareLoading, setSoftwareLoading] = useState(false);
    const [softwareModalOpen, setSoftwareModalOpen] = useState(false);
    const [editingSoftware, setEditingSoftware] = useState(null);
    const [softwareFormData, setSoftwareFormData] = useState({
        name: '',
        category: 'CAD / Engineering',
        plant: defaultPlant,
        vendor: '',
        seats_qty: 1,
        purchase_date: '',
        purchase_cost: 0,
        install_date: '',
        expiry_date: '',
        maintenance_payment_date: '',
        renewal_month: 'jan',
        annual_maintenance_cost: 0,
        target_form: 'F1',
        department: 'ENGINEERING',
        notes: ''
    });

    // Department Budget Requests State (SOP TCFSG-SOP-ICT-03 / Form TCFSG-FM-ICT-03-04)
    const [deptRequests, setDeptRequests] = useState([]);
    const [deptLoading, setDeptLoading] = useState(false);
    const [deptSummary, setDeptSummary] = useState({ total_amount: 0, approved_count: 0, pending_count: 0, all_count: 0 });
    const [deptFilterPlant, setDeptFilterPlant] = useState(defaultPlant === 'KG' ? 'KG' : 'ALL');
    const [deptFilterYear, setDeptFilterYear] = useState('ALL');
    const [deptFilterDept, setDeptFilterDept] = useState('ALL');
    const [deptFilterCat, setDeptFilterCat] = useState('ALL');
    const [deptFilterStatus, setDeptFilterStatus] = useState('ALL');
    const [deptSearch, setDeptSearch] = useState('');
    const [deptModalOpen, setDeptModalOpen] = useState(false);
    const [editingDeptReq, setEditingDeptReq] = useState(null);
    const [deptPdfLoading, setDeptPdfLoading] = useState(false);
    const [sopGuideOpen, setSopGuideOpen] = useState(false);
    const [deptFormData, setDeptFormData] = useState({
        plant: defaultPlant,
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
        target_year: year,
        target_month: 'jan',
        target_form: 'I-1',
        technical_specs: '',
        justification: '',
        review_notes: '',
        status: 'SUBMITTED'
    });

    // Fetch Overview & Items (Budget Plan)
    const fetchData = async () => {
        setLoading(true);
        try {
            const plantParam = selectedPlant;
            const [ovRes, itRes, matRes, coaRes, yrsRes] = await Promise.all([
                axios.get(`/api/budgeting/overview?year=${year}&plant=${plantParam}`).catch(() => ({ data: null })),
                axios.get(`/api/budgeting/items?year=${year}&plant=${plantParam}`).catch(() => ({ data: { items: [] } })),
                axios.get('/api/budgeting/matrix').catch(() => ({ data: { departments: [] } })),
                axios.get('/api/budgeting/coa').catch(() => ({ data: {} })),
                axios.get('/api/budgeting/years').catch(() => ({ data: { years: [] } }))
            ]);

            if (ovRes.data) {
                setOverview(ovRes.data);
                if (ovRes.data.availableYears) {
                    setAvailableYears(ovRes.data.availableYears);
                }
            }
            if (itRes.data) setItems(itRes.data.items || []);
            if (matRes.data) setMatrix(matRes.data.departments || []);
            if (coaRes.data) setCoaDict(coaRes.data);
            if (yrsRes.data && yrsRes.data.years) {
                const yrs = yrsRes.data.years.map(y => y.year);
                if (yrs.length > 0) setAvailableYears(yrs);
            }
        } catch (err) {
            console.error('Error fetching budget data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Hardware Lifecycle (ICT Assets Sync & IK Assessment)
    const fetchHardwareData = async () => {
        setHardwareLoading(true);
        try {
            const res = await axios.get(`/api/budgeting/master-plan/hardware?plant=${selectedPlant}`);
            if (res.data) setHardwareData(res.data);
        } catch (err) {
            console.error('Failed to fetch hardware lifecycle:', err);
        } finally {
            setHardwareLoading(false);
        }
    };

    // Fetch Software Lifecycle (AMC & Expirations)
    const fetchSoftwareData = async () => {
        setSoftwareLoading(true);
        try {
            const res = await axios.get(`/api/budgeting/master-plan/software?plant=${selectedPlant}`);
            if (res.data) setSoftwareData(res.data);
        } catch (err) {
            console.error('Failed to fetch software lifecycle:', err);
        } finally {
            setSoftwareLoading(false);
        }
    };

    // Fetch Department Requests (SOP TCFSG-SOP-ICT-03)
    const fetchDeptRequests = async () => {
        setDeptLoading(true);
        try {
            const plantParam = deptFilterPlant || 'ALL';
            const yearParam = deptFilterYear || 'ALL';
            const res = await axios.get(`/api/budgeting/department-requests?year=${yearParam}&plant=${plantParam}&department=${deptFilterDept}&category=${deptFilterCat}&status=${deptFilterStatus}&search=${encodeURIComponent(deptSearch)}`);
            if (res.data) {
                setDeptRequests(res.data.requests || []);
                setDeptSummary(res.data.summary || { total_amount: 0, approved_count: 0, pending_count: 0, all_count: 0 });
            }
        } catch (err) {
            console.error('Failed to fetch department requests:', err);
        } finally {
            setDeptLoading(false);
        }
    };

    useEffect(() => {
        // Fetch department requests immediately on mount so badge and banner are ready
        fetchDeptRequests();
    }, []);

    useEffect(() => {
        if (mainSection === 'BUDGET_GRID') {
            fetchData();
        } else if (mainSection === 'HARDWARE_LIFECYCLE') {
            fetchHardwareData();
        } else if (mainSection === 'SOFTWARE_LIFECYCLE') {
            fetchSoftwareData();
        } else if (mainSection === 'DEPT_REQUESTS') {
            fetchDeptRequests();
        }
    }, [year, selectedPlant, mainSection, deptFilterPlant, deptFilterYear, deptFilterDept, deptFilterCat, deptFilterStatus, deptSearch]);

    // Format Currency IDR
    const formatIDR = (num) => {
        const val = Number(num) || 0;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(val);
    };

    // Filter Items
    const filteredItems = useMemo(() => {
        return items.filter(it => {
            const matchPlant = selectedPlant === 'ALL' || it.plant === selectedPlant;
            const matchTab = activeTab === 'ALL' || it.category === activeTab || it.form === activeTab;
            const matchSearch = !searchQuery || 
                (it.item_name && it.item_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (it.coa_code && it.coa_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (it.sub_category && it.sub_category.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchPlant && matchTab && matchSearch;
        });
    }, [items, selectedPlant, activeTab, searchQuery]);

    // Summary calculations for filtered
    const filteredTotal = useMemo(() => {
        return filteredItems.reduce((acc, it) => acc + (Number(it.total_amount) || 0), 0);
    }, [filteredItems]);

    // Handle Open Add Modal
    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormData({
            year,
            item_name: '',
            form: 'I-1',
            category: 'CAPEX',
            plant: selectedPlant !== 'ALL' ? selectedPlant : defaultPlant,
            coa_code: 'I1.1231.1006',
            sub_category: 'Office Equipment',
            type_asset: '3',
            unit_price: 0,
            qty: 1,
            total_amount: 0,
            notes: '',
            monthly: { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 }
        });
        setModalOpen(true);
    };

    // Handle Open Edit Modal
    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setFormData({
            year: item.year || year,
            item_name: item.item_name || '',
            form: item.form || 'I-1',
            category: item.category || 'CAPEX',
            plant: item.plant || defaultPlant,
            coa_code: item.coa_code || '',
            sub_category: item.sub_category || '',
            type_asset: item.type_asset || '2',
            unit_price: item.unit_price || 0,
            qty: item.qty || 1,
            total_amount: item.total_amount || 0,
            notes: item.notes || '',
            monthly: item.monthly ? { ...item.monthly } : { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 }
        });
        setModalOpen(true);
    };

    // Handle Monthly Change in Modal
    const handleMonthlyChange = (monthKey, value) => {
        const val = Number(value) || 0;
        const updatedMonthly = { ...formData.monthly, [monthKey]: val };
        const updatedTotal = Object.values(updatedMonthly).reduce((a, b) => a + b, 0);
        setFormData({
            ...formData,
            monthly: updatedMonthly,
            total_amount: updatedTotal
        });
    };

    // Quick Equal Distribution (1/12)
    const handleDistributeEqually = () => {
        const total = Number(formData.total_amount) || (Number(formData.unit_price) * Number(formData.qty)) || 0;
        if (total <= 0) return;
        const perMonth = Math.round(total / 12);
        const newMonthly = {};
        MONTH_NAMES.forEach(m => { newMonthly[m.key] = perMonth; });
        setFormData({
            ...formData,
            monthly: newMonthly,
            total_amount: total
        });
    };

    // Quick Q1 Allocation (First Quarter)
    const handleDistributeQ1 = () => {
        const total = Number(formData.total_amount) || (Number(formData.unit_price) * Number(formData.qty)) || 0;
        if (total <= 0) return;
        const newMonthly = { jan: total, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 };
        setFormData({
            ...formData,
            monthly: newMonthly,
            total_amount: total
        });
    };

    // Save Item
    const handleSaveItem = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await axios.put(`/api/budgeting/items/${editingItem.id}`, { ...formData, year });
                Swal.fire({
                    icon: 'success',
                    title: 'Item Diperbarui',
                    text: `Budget ${formData.item_name} berhasil disimpan!`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await axios.post('/api/budgeting/items', { ...formData, year });
                Swal.fire({
                    icon: 'success',
                    title: 'Item Ditambahkan',
                    text: `Budget item baru berhasil didaftarkan ke Tahun Anggaran ${year}!`,
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            setModalOpen(false);
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        }
    };

    // Delete Item
    const handleDeleteItem = async (id, name) => {
        const result = await Swal.fire({
            title: `Hapus Item Budget ${year}?`,
            text: `Yakin ingin menghapus "${name}" dari Tahun Anggaran ${year}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/budgeting/items/${id}`);
                Swal.fire('Terhapus', 'Item berhasil dihapus.', 'success');
                fetchData();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // Apply Simulation Factor
    const handleApplySimulation = async () => {
        try {
            setLoading(true);
            await axios.post('/api/budgeting/simulate', { 
                year, 
                sourceYear: simSourceYear, 
                percentage: simPct 
            });
            setSimModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'Proyeksi Diterapkan!',
                text: `Tahun Anggaran ${year} telah disesuaikan dengan faktor +${simPct}% berbasis data tahun ${simSourceYear}.`,
                timer: 2000,
                showConfirmButton: false
            });
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Create New Fiscal Year
    const handleCreateNewYear = async () => {
        try {
            setLoading(true);
            const res = await axios.post('/api/budgeting/create-year', {
                targetYear: Number(newYearTarget),
                sourceYear: Number(newYearSource),
                growthRate: Number(newYearGrowth)
            });
            setNewYearModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'Tahun Anggaran Dibuat!',
                text: res.data.message || `Tahun Anggaran ${newYearTarget} berhasil disiapkan.`,
                timer: 2000,
                showConfirmButton: false
            });
            // Switch to new year immediately
            setYear(Number(newYearTarget));
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Export to Excel (Separated by Plant: SG, KG, or ALL)
    const handleExportExcel = async (targetPlant = selectedPlant) => {
        setExporting(true);
        try {
            const plantParam = targetPlant || selectedPlant || 'SG';
            window.location.href = `/api/budgeting/export/excel?year=${year}&plant=${plantParam}`;
            setTimeout(() => {
                setExporting(false);
            }, 2500);
        } catch (err) {
            setExporting(false);
            Swal.fire('Error', 'Gagal mengekspor file Excel.', 'error');
        }
    };

    // Filter Hardware Assets
    const filteredHardware = useMemo(() => {
        const assets = hardwareData.assets || [];
        return assets.filter(a => {
            const matchStatus = hwFilterStatus === 'ALL' || 
                (hwFilterStatus === 'UPGRADE' && a.assessment.status.includes('UPGRADE')) ||
                (hwFilterStatus === 'REPLACE' && a.assessment.status === 'REPLACE_UNIT') ||
                (hwFilterStatus === 'COMPLIANT' && a.assessment.status === 'COMPLIANT');

            const matchDept = hwFilterDept === 'ALL' || a.department === hwFilterDept;

            const q = hwSearch.toLowerCase();
            const matchSearch = !q || 
                (a.inventory_number && a.inventory_number.toLowerCase().includes(q)) ||
                (a.name && a.name.toLowerCase().includes(q)) ||
                (a.user_name && a.user_name.toLowerCase().includes(q)) ||
                (a.department && a.department.toLowerCase().includes(q)) ||
                (a.specs?.cpu && a.specs.cpu.toLowerCase().includes(q));

            return matchStatus && matchDept && matchSearch;
        });
    }, [hardwareData, hwFilterStatus, hwFilterDept, hwSearch]);

    // Unique Departments for filter
    const hardwareDepartments = useMemo(() => {
        const depts = new Set((hardwareData.assets || []).map(a => a.department).filter(Boolean));
        return Array.from(depts).sort();
    }, [hardwareData]);

    // Filter Software Licenses
    const filteredSoftware = useMemo(() => {
        return softwareData.software || [];
    }, [softwareData]);

    // Push Hardware Upgrade / Replacement to Budget
    const handlePushHardwareToBudget = async (item) => {
        const { assessment } = item;
        const confirmResult = await Swal.fire({
            title: `Ajukan ke Rencana Budget ${year}?`,
            html: `
                <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
                    <p><b>Perangkat:</b> ${item.name} (${item.inventory_number})</p>
                    <p><b>Pengguna:</b> ${item.user_name} (${item.department})</p>
                    <p><b>Rekomendasi:</b> ${assessment.recommendation}</p>
                    <p><b>Standar Acuan:</b> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${assessment.doc_standard}</span></p>
                    <p><b>Formulir:</b> ${assessment.target_form} (${assessment.category})</p>
                    <p><b>Estimasi Biaya:</b> <b style="color: #0f172a; font-size: 15px;">${formatIDR(assessment.estimated_cost)}</b></p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Ya, Daftarkan ke Anggaran ${year}`,
            cancelButtonText: 'Batal',
            confirmButtonColor: '#4f46e5'
        });

        if (confirmResult.isConfirmed) {
            try {
                const res = await axios.post('/api/budgeting/master-plan/hardware/push-to-budget', {
                    asset_id: item.id,
                    year,
                    item_name: `${assessment.category === 'CAPEX' ? 'Penggantian Unit' : 'Upgrade Hardware'}: ${item.name} (${item.user_name})`,
                    form: assessment.target_form,
                    category: assessment.category,
                    cost: assessment.estimated_cost,
                    notes: `Ref IK Standard ${assessment.doc_standard}: ${assessment.recommendation}`,
                    plant: selectedPlant !== 'ALL' ? selectedPlant : item.plant,
                    target_month: 'jan'
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Diajukan',
                    text: res.data.message || `Item berhasil masuk ke Formulir ${assessment.target_form} Tahun ${year}`,
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchData();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // Sync Software Maintenance AMC to Budget
    const handleSyncSoftwareToBudget = async (soft) => {
        const confirmResult = await Swal.fire({
            title: `Sinkronkan Lisensi ke Anggaran ${year}?`,
            html: `
                <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
                    <p><b>Software:</b> ${soft.name}</p>
                    <p><b>Vendor:</b> ${soft.vendor || '-'}</p>
                    <p><b>Jatuh Tempo:</b> ${soft.maintenance_payment_date || '-'}</p>
                    <p><b>Bulan Alokasi:</b> ${(soft.renewal_month || 'oct').toUpperCase()}</p>
                    <p><b>Biaya Annual Maintenance:</b> <b style="color: #0f172a; font-size: 15px;">${formatIDR(soft.annual_maintenance_cost)}</b></p>
                    <p><b>Formulir Target:</b> ${soft.target_form || 'F1'} (Opex Maintenance / AMC)</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Ya, Sinkronkan ke Rencana ${year}`,
            cancelButtonText: 'Batal',
            confirmButtonColor: '#f59e0b'
        });

        if (confirmResult.isConfirmed) {
            try {
                const res = await axios.post('/api/budgeting/master-plan/software/sync-to-budget', {
                    software_id: soft.id,
                    year
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Sinkronisasi Berhasil',
                    text: res.data.message,
                    timer: 2500,
                    showConfirmButton: false
                });
                fetchData();
                fetchSoftwareData();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // Open Software Add Modal
    const handleOpenAddSoftware = () => {
        setEditingSoftware(null);
        setSoftwareFormData({
            name: '',
            category: 'CAD / Engineering',
            plant: selectedPlant !== 'ALL' ? selectedPlant : defaultPlant,
            vendor: '',
            seats_qty: 1,
            purchase_date: '',
            purchase_cost: 0,
            install_date: '',
            expiry_date: 'Perpetual',
            maintenance_payment_date: '',
            renewal_month: 'jan',
            annual_maintenance_cost: 0,
            target_form: 'F1',
            department: 'ENGINEERING',
            notes: ''
        });
        setSoftwareModalOpen(true);
    };

    // Open Software Edit Modal
    const handleOpenEditSoftware = (soft) => {
        setEditingSoftware(soft);
        setSoftwareFormData({
            ...soft
        });
        setSoftwareModalOpen(true);
    };

    // Save Software Record
    const handleSaveSoftware = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/budgeting/master-plan/software', softwareFormData);
            Swal.fire({
                icon: 'success',
                title: 'Data Tersimpan',
                text: 'Data software & jadwal pembayaran maintenance berhasil diperbarui!',
                timer: 1500,
                showConfirmButton: false
            });
            setSoftwareModalOpen(false);
            fetchSoftwareData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        }
    };

    // Delete Software Record
    const handleDeleteSoftware = async (id, name) => {
        const confirmResult = await Swal.fire({
            title: `Hapus Software?`,
            text: `Yakin ingin menghapus ${name} dari Master Plan Software?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (confirmResult.isConfirmed) {
            try {
                await axios.delete(`/api/budgeting/master-plan/software/${id}`);
                Swal.fire('Terhapus', 'Software berhasil dihapus.', 'success');
                fetchSoftwareData();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // Download or Preview Blank ISO Form (TCFSG-FM-ICT-03-04)
    const handleDownloadBlankPdf = async (action = 'download') => {
        setDeptPdfLoading(true);
        try {
            const plantCode = deptFilterPlant !== 'ALL' ? deptFilterPlant : (selectedPlant !== 'ALL' ? selectedPlant : 'SG');
            await generateDeptBudgetRequestPdf({
                isBlank: true,
                plant: plantCode,
                action
            });
            if (action === 'download') {
                Swal.fire({
                    icon: 'success',
                    title: 'Formulir Kosong Berhasil Di-Download',
                    text: `Formulir resmi ${plantCode === 'KG' ? 'TCFKG-FM-ICT-03-04' : 'TCFSG-FM-ICT-03-04'} (Revisi 01) siap dicetak untuk tanda tangan manual departemen.`,
                    timer: 3000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            Swal.fire('Error PDF', err.message || 'Gagal membuat file formulir PDF kosong', 'error');
        } finally {
            setDeptPdfLoading(false);
        }
    };

    // Download or Preview Filled Request Form
    const handleDownloadReqPdf = async (reqItem, action = 'download') => {
        setDeptPdfLoading(true);
        try {
            await generateDeptBudgetRequestPdf({
                request: reqItem,
                plant: reqItem.plant || 'SG',
                isBlank: false,
                action
            });
        } catch (err) {
            Swal.fire('Error PDF', err.message || 'Gagal mengekspor PDF pengajuan budget', 'error');
        } finally {
            setDeptPdfLoading(false);
        }
    };

    // Download Blank ISO Form Excel (TCFSG-FM-ICT-03-04.xlsx)
    const handleDownloadBlankExcel = async () => {
        setDeptPdfLoading(true);
        try {
            const plantCode = deptFilterPlant !== 'ALL' ? deptFilterPlant : (selectedPlant !== 'ALL' ? selectedPlant : 'SG');
            await exportDeptBudgetExcel({
                isBlank: true,
                plant: plantCode
            });
            Swal.fire({
                icon: 'success',
                title: 'Formulir Kosong Excel Berhasil Di-Download',
                text: `File template resmi ${plantCode === 'KG' ? 'TCFKG-FM-ICT-03-04' : 'TCFSG-FM-ICT-03-04'}.xlsx siap diedit dan diisi oleh departemen pemohon.`,
                timer: 3000,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire('Error Excel', err.message || 'Gagal membuat file template Excel', 'error');
        } finally {
            setDeptPdfLoading(false);
        }
    };

    // Download Filled Request as Excel (.xlsx)
    const handleDownloadReqExcel = async (reqItem) => {
        try {
            await exportDeptBudgetExcel({
                request: reqItem,
                plant: reqItem.plant || 'SG',
                isBlank: false
            });
        } catch (err) {
            Swal.fire('Error Excel', err.message || 'Gagal mengekspor berkas Excel pengajuan', 'error');
        }
    };

    // Export Rekap Pengajuan Departemen ke Excel (.xlsx)
    const handleExportDeptRekapExcel = async () => {
        try {
            const plantCode = deptFilterPlant !== 'ALL' ? deptFilterPlant : (selectedPlant !== 'ALL' ? selectedPlant : 'ALL');
            await exportDeptBudgetRekapExcel({
                requests: deptRequests,
                summary: deptSummary,
                year,
                plant: plantCode
            });
            Swal.fire({
                icon: 'success',
                title: 'Rekapitulasi Berhasil Diekspor',
                text: `File Excel rekapitulasi pengajuan budget departemen (${deptRequests.length} item) berhasil di-download.`,
                timer: 2500,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire('Error Excel', err.message || 'Gagal mengekspor rekapitulasi Excel', 'error');
        }
    };

    // Open Add Dept Request Modal
    const handleOpenAddDeptReq = () => {
        setEditingDeptReq(null);
        setDeptFormData({
            plant: selectedPlant !== 'ALL' ? selectedPlant : defaultPlant,
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
            target_year: year,
            target_month: 'jan',
            target_form: 'I-1',
            technical_specs: '',
            justification: '',
            review_notes: '',
            signed_attachment: null,
            signed_attachment_name: '',
            status: 'SUBMITTED'
        });
        setDeptModalOpen(true);
    };

    // Open Edit Dept Request Modal
    const handleOpenEditDeptReq = (item) => {
        setEditingDeptReq(item);
        const reqTitleUpper = (item.requester_title || '').toUpperCase();
        const autoSuperior = (reqTitleUpper.includes('HEAD') || reqTitleUpper.includes('DEPT') || reqTitleUpper.includes('MANAGER')) ? 'Direktur' : (item.dept_head_title || '');
        setDeptFormData({
            ...item,
            dept_head_name: item.dept_head_name || '',
            dept_head_title: item.dept_head_title || autoSuperior
        });
        setDeptModalOpen(true);
    };

    // Save Department Request
    const handleSaveDeptReq = async (e) => {
        e.preventDefault();
        try {
            if (editingDeptReq) {
                await axios.put(`/api/budgeting/department-requests/${editingDeptReq.id}`, deptFormData);
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Diperbarui',
                    text: `Permintaan ${editingDeptReq.req_no} berhasil disimpan.`,
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                const res = await axios.post('/api/budgeting/department-requests', deptFormData);
                Swal.fire({
                    icon: 'success',
                    title: 'Pengajuan Berhasil Didaftarkan',
                    text: res.data.message || 'Formulir permintaan budget berhasil disimpan ke sistem.',
                    timer: 2500,
                    showConfirmButton: false
                });
            }
            setDeptModalOpen(false);
            fetchDeptRequests();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        }
    };

    // Delete Department Request
    const handleDeleteDeptReq = async (item) => {
        const confirmResult = await Swal.fire({
            title: 'Hapus Pengajuan Budget?',
            html: `
                <div style="text-align: left; font-size: 13px; color: #334155;">
                    <p><b>No. Registrasi:</b> ${item.req_no}</p>
                    <p><b>Item:</b> ${item.item_name}</p>
                    <p><b>Departemen:</b> ${item.department} (${item.requester_name})</p>
                    <p style="color: #ef4444; margin-top: 8px;">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (confirmResult.isConfirmed) {
            try {
                await axios.delete(`/api/budgeting/department-requests/${item.id}`);
                Swal.fire('Terhapus', 'Pengajuan budget berhasil dihapus.', 'success');
                fetchDeptRequests();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // Push / Approve Department Request into Annual Budget Items
    const handleApproveDeptReqToBudget = async (item) => {
        const formTarget = item.target_form || (item.category === 'UPGRADE_HARDWARE' ? 'F2' : item.category === 'SOFTWARE_LICENSE' ? 'F1' : 'I-1');
        const confirmResult = await Swal.fire({
            title: `Setujui & Daftarkan ke Anggaran ${item.target_year || year}?`,
            html: `
                <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
                    <p><b>No Dokumen:</b> ${item.req_no} (SOP Ref: TCFSG-FM-ICT-03-04)</p>
                    <p><b>Departemen:</b> ${item.department} - ${item.requester_name}</p>
                    <p><b>Item:</b> ${item.item_name} (${item.qty} ${item.unit || 'Unit'})</p>
                    <p><b>Kategori:</b> ${item.category}</p>
                    <p><b>Alokasi Target:</b> Formulir ${formTarget} Tahun ${item.target_year || year} (${(item.target_month || 'jan').toUpperCase()})</p>
                    <p><b>Total Anggaran:</b> <b style="color: #0f172a; font-size: 15px;">${formatIDR(item.estimated_total_cost)}</b></p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Ya, Setujui & Sinkronkan ke Budget`,
            cancelButtonText: 'Batal',
            confirmButtonColor: '#059669'
        });

        if (confirmResult.isConfirmed) {
            try {
                const res = await axios.post(`/api/budgeting/department-requests/${item.id}/approve-to-budget`, {
                    year: item.target_year || year,
                    form: formTarget,
                    reviewed_by: 'Hery (ICT Specialist)'
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Persetujuan Berhasil',
                    text: res.data.message || `Item ${item.item_name} berhasil masuk ke anggaran tahun ${item.target_year || year}!`,
                    timer: 2500,
                    showConfirmButton: false
                });

                fetchDeptRequests();
                fetchData();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || err.message, 'error');
            }
        }
    };

    // Quick upload signed document (Scan/Foto/PDF) by Technician
    const handleUploadSignedDoc = async (item) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const uploadFormData = new FormData();
            uploadFormData.append('file', file);

            try {
                Swal.fire({
                    title: 'Mengunggah Berkas TTD...',
                    text: `Sedang mengupload ${file.name}...`,
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const uploadRes = await axios.post('/api/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (uploadRes.data && uploadRes.data.url) {
                    await axios.put(`/api/budgeting/department-requests/${item.id}`, {
                        signed_attachment: uploadRes.data.url,
                        signed_attachment_name: file.name
                    });

                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil Diunggah!',
                        text: `Berkas tanda tangan untuk ${item.req_no} berhasil disimpan.`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                    fetchDeptRequests();
                } else {
                    throw new Error('Gagal mendapatkan URL file upload');
                }
            } catch (err) {
                Swal.fire('Gagal Mengunggah', err.response?.data?.error || err.message, 'error');
            }
        };
        input.click();
    };

    const tabs = [
        { id: 'ALL', label: 'Semua Item ICT', icon: Layers, count: items.length },
        { id: 'CAPEX', label: 'CAPEX (Investasi I-1)', icon: Server, badge: 'Investasi' },
        { id: 'MAINTENANCE', label: 'Perawatan (F1)', icon: Wrench, badge: 'Repair' },
        { id: 'SPAREPART', label: 'Spare Parts (F2)', icon: Package, badge: 'Hardware' },
        { id: 'RICOH_PRINT', label: 'Ricoh & Cetak (G-3)', icon: Printer, badge: 'Sewa/Tinta' },
        { id: 'TRAINING', label: 'Pelatihan (D2)', icon: BarChart3, badge: 'Skill' },
        { id: 'MATRIX', label: 'Matriks Departemen', icon: FileSpreadsheet, badge: 'PT TCF' }
    ];

    return (
        <div className="space-y-6 pb-20 animate-fadeIn text-slate-800">
            {/* Top Corporate Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 md:p-6 text-white shadow-xl border border-slate-700/50">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-40 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                                <Coins size={13} /> Multi-Year Budgeting
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 shadow-sm transition-all ${
                                selectedPlant === 'SG'
                                    ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                                    : selectedPlant === 'KG'
                                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                                        : 'bg-white/10 text-slate-200 border-white/10'
                            }`}>
                                <Building2 size={12} className={selectedPlant === 'SG' ? 'text-indigo-400' : selectedPlant === 'KG' ? 'text-amber-400' : 'text-slate-300'} />
                                {selectedPlant === 'SG' ? 'Sadang (SG)' : selectedPlant === 'KG' ? 'Karawang (KG)' : 'Konsolidasi PT TCF'}
                            </span>
                            {currentOrg && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
                                    Plant: <b className="text-white">{currentOrg}</b>
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                            <span>Enterprise Budgeting</span>
                            <span className="text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-xl border border-amber-500/20 text-lg md:text-2xl">
                                {year}
                            </span>
                        </h1>
                        <p className="text-xs text-slate-300">
                            Perencanaan & kontrol anggaran terpadu (Capex & Opex) PT Tri Centrum Fortuna.
                        </p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Dynamic Fiscal Year Selector */}
                        <div className="bg-slate-800/90 p-1 rounded-2xl border border-slate-700 flex items-center shadow-lg">
                            <div className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-400">
                                <Calendar size={14} className="text-amber-400" />
                                <span className="hidden sm:inline">Tahun:</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {availableYears.map(yr => (
                                    <button
                                        key={yr}
                                        onClick={() => setYear(yr)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            year === yr 
                                                ? 'bg-amber-500 text-slate-950 shadow-md scale-105' 
                                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {yr}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    setNewYearTarget(Math.max(...availableYears, 2027) + 1);
                                    setNewYearSource(year);
                                    setNewYearModalOpen(true);
                                }}
                                title="Buat Rencana Tahun Anggaran Baru"
                                className="ml-1 p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* Proyeksi Trigger */}
                        <button
                            onClick={() => {
                                setSimSourceYear(year > 2026 ? year - 1 : 2026);
                                setSimModalOpen(true);
                            }}
                            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                            title="Proyeksikan otomatis dari tahun acuan"
                        >
                            <Sparkles size={16} /> Proyeksi {year}
                        </button>

                        {/* Add Item Button */}
                        <button
                            onClick={handleOpenAdd}
                            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all active:scale-95"
                        >
                            <Plus size={16} /> Tambah Item
                        </button>

                        {/* Export Excel Dropdown */}
                        <div className="relative group">
                            <button
                                disabled={exporting}
                                onClick={() => handleExportExcel(selectedPlant)}
                                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                                title="Klik langsung untuk download plant aktif, atau arahkan kursor untuk opsi lain"
                            >
                                {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                                <span>Export Excel {selectedPlant !== 'ALL' ? selectedPlant : 'TCF'} ({year})</span>
                            </button>
                            
                            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 hidden group-hover:block z-50">
                                {defaultPlant !== 'KG' && (
                                    <button
                                        onClick={() => handleExportExcel('SG')}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-xs flex items-center gap-2.5 transition-colors ${
                                            selectedPlant === 'SG' ? 'bg-indigo-950/80 border border-indigo-500/40 text-indigo-200' : 'text-slate-200 hover:text-white'
                                        }`}
                                    >
                                        <FileSpreadsheet size={16} className="text-indigo-400" />
                                        <div>
                                            <p className="font-bold flex items-center gap-1.5">
                                                Plant Sadang Only (SG)
                                                {selectedPlant === 'SG' && <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-black">Aktif</span>}
                                            </p>
                                            <p className="text-[10px] text-slate-400">8 Sheet Resmi Sadang (TCFSG-FM-FAT-06)</p>
                                        </div>
                                    </button>
                                )}

                                <button
                                    onClick={() => handleExportExcel('KG')}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-xs flex items-center gap-2.5 transition-colors ${defaultPlant !== 'KG' ? 'mt-1' : ''} ${
                                        selectedPlant === 'KG' ? 'bg-amber-950/80 border border-amber-500/40 text-amber-200' : 'text-slate-200 hover:text-white'
                                    }`}
                                >
                                    <FileSpreadsheet size={16} className="text-amber-400" />
                                    <div>
                                        <p className="font-bold flex items-center gap-1.5">
                                            Plant Karawang Only (KG)
                                            {selectedPlant === 'KG' && <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-black">Aktif</span>}
                                        </p>
                                        <p className="text-[10px] text-slate-400">8 Sheet Resmi Karawang (TCFKG-FM-FAT-06)</p>
                                    </div>
                                </button>

                                {defaultPlant !== 'KG' && (
                                    <button
                                        onClick={() => handleExportExcel('ALL')}
                                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-xs text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors border-t border-slate-800 mt-1"
                                    >
                                        <Layers size={16} className="text-emerald-400" />
                                        <div>
                                            <p className="font-bold">Konsolidasi PT TCF (SG + KG)</p>
                                            <p className="text-[10px] text-slate-400">Seluruh Sheet ICT Sadang & Karawang</p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top-Level Module Navigation Switcher */}
            <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/60 shadow-lg flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        id="tab-btn-budget-grid"
                        onClick={() => switchSection('BUDGET_GRID')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            mainSection === 'BUDGET_GRID'
                                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <FileSpreadsheet size={15} />
                        <span>Rencana Anggaran ({year})</span>
                    </button>

                    <button
                        id="tab-btn-activity-plan"
                        data-testid="tab-activity-plan"
                        onClick={() => switchSection('ACTIVITY_PLAN')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            mainSection === 'ACTIVITY_PLAN'
                                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <Target size={15} className={mainSection === 'ACTIVITY_PLAN' ? 'text-slate-950' : 'text-amber-400'} />
                        <span>Activity Plan & Roadmap</span>
                    </button>

                    <button
                        id="tab-btn-hardware-lifecycle"
                        onClick={() => switchSection('HARDWARE_LIFECYCLE')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            mainSection === 'HARDWARE_LIFECYCLE'
                                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/30'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <Cpu size={15} className={mainSection === 'HARDWARE_LIFECYCLE' ? 'text-amber-300' : 'text-indigo-400'} />
                        <span>Master Plan Perangkat</span>
                    </button>

                    <button
                        id="tab-btn-software-lifecycle"
                        onClick={() => switchSection('SOFTWARE_LIFECYCLE')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            mainSection === 'SOFTWARE_LIFECYCLE'
                                ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/30'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <KeyRound size={15} className={mainSection === 'SOFTWARE_LIFECYCLE' ? 'text-amber-300' : 'text-emerald-400'} />
                        <span>Software & Lisensi</span>
                    </button>

                    <button
                        id="tab-btn-iso-standards"
                        onClick={() => switchSection('ISO_STANDARDS')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            mainSection === 'ISO_STANDARDS'
                                ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/30'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <BookOpen size={15} className={mainSection === 'ISO_STANDARDS' ? 'text-amber-300' : 'text-purple-400'} />
                        <span>Standar IK & ISO</span>
                    </button>

                    <button
                        id="tab-btn-dept-requests"
                        onClick={() => switchSection('DEPT_REQUESTS')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            mainSection === 'DEPT_REQUESTS'
                                ? 'bg-rose-600 text-white font-black shadow-md shadow-rose-600/30'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <FileText size={15} className={mainSection === 'DEPT_REQUESTS' ? 'text-amber-300' : 'text-rose-400'} />
                        <span>Permintaan Budget Dept</span>
                        {deptSummary?.pending_count > 0 && (
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center animate-pulse">
                                {deptSummary.pending_count}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* SECTION: ACTIVITY PLAN & STRATEGIC PLANT ROADMAP */}
            {mainSection === 'ACTIVITY_PLAN' && (
                <ActivityPlanSection
                    year={year}
                    selectedPlant={selectedPlant}
                    defaultPlant={defaultPlant}
                    formatIDR={formatIDR}
                    onBudgetSyncSuccess={fetchData}
                />
            )}

            {/* SECTION 1: BUDGET GRID (Multi-Year Annual Budget) */}
            {mainSection === 'BUDGET_GRID' && (
                <>
                    {/* Notice Banner for Pending Department Requests */}
                    {deptSummary?.pending_count > 0 && (
                        <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 flex-shrink-0 animate-pulse">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">
                                            Terdapat {deptSummary.pending_count} Usulan Anggaran dari Departemen Menunggu Approval ICT
                                        </p>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                                            SOP TCF-ICT-03
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Usulan baru belum masuk ke Rencana Anggaran (budget_items) sebelum disetujui & disinkronkan oleh tim ICT.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => switchSection('DEPT_REQUESTS')}
                                className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
                            >
                                <span>Tinjau & Setujui Usulan</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* KPI Executive Summary Cards */}
                    {overview && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Budget Card */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Anggaran {year}</span>
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                                <Coins size={20} />
                            </div>
                        </div>
                        <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            {formatIDR(overview.totalPlanned)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-md ${
                                Number(overview.variancePct) >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                                {Number(overview.variancePct) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {overview.variancePct > 0 ? `+${overview.variancePct}%` : `${overview.variancePct}%`}
                            </span>
                            <span className="text-xs text-slate-400">vs {overview.baselineYear || year - 1} Baseline</span>
                        </div>
                    </div>

                    {/* CAPEX Card */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">CAPEX (Investasi Asset)</span>
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                                <Server size={20} />
                            </div>
                        </div>
                        <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            {formatIDR(overview.capexTotal)}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                Form I-1 (Plant & Office)
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                                {overview.totalPlanned > 0 ? ((overview.capexTotal / overview.totalPlanned) * 100).toFixed(0) : 0}% Share
                            </span>
                        </div>
                    </div>

                    {/* OPEX Card */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">OPEX (Operasional & Rawat)</span>
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                                <Wrench size={20} />
                            </div>
                        </div>
                        <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            {formatIDR(overview.opexTotal)}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                F1, F2, G-3, H2, D2
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                                {overview.totalPlanned > 0 ? ((overview.opexTotal / overview.totalPlanned) * 100).toFixed(0) : 0}% Share
                            </span>
                        </div>
                    </div>

                    {/* Plant Split Card */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                {selectedPlant === 'SG' ? 'Fokus Plant Sadang' : selectedPlant === 'KG' ? 'Fokus Plant Karawang' : 'Sebaran Plant'}
                            </span>
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                                selectedPlant === 'SG' ? 'bg-indigo-500/10 text-indigo-600' : selectedPlant === 'KG' ? 'bg-amber-500/10 text-amber-600' : 'bg-purple-500/10 text-purple-600'
                            }`}>
                                <Building2 size={20} />
                            </div>
                        </div>
                        {selectedPlant === 'SG' ? (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-600">Sadang (SG):</span>
                                    <span className="font-black text-indigo-700 text-sm">{formatIDR(overview.totalPlanned)}</span>
                                </div>
                                <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                                    <CheckCircle2 size={12} /> Data Karawang (KG) tidak tercampur
                                </div>
                            </div>
                        ) : selectedPlant === 'KG' ? (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-600">Karawang (KG):</span>
                                    <span className="font-black text-amber-700 text-sm">{formatIDR(overview.totalPlanned)}</span>
                                </div>
                                <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                                    <CheckCircle2 size={12} /> Data Sadang (SG) tidak tercampur
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-600">Karawang (KG):</span>
                                    <span className="font-black text-slate-900">{formatIDR(overview.kgTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-600">Sadang (SG):</span>
                                    <span className="font-black text-slate-900">{formatIDR(overview.sgTotal)}</span>
                                </div>
                            </div>
                        )}
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden flex">
                            {selectedPlant === 'SG' ? (
                                <div className="bg-indigo-600 h-full w-full" title="Sadang 100%" />
                            ) : selectedPlant === 'KG' ? (
                                <div className="bg-amber-500 h-full w-full" title="Karawang 100%" />
                            ) : (
                                <>
                                    <div 
                                        style={{ width: `${(overview.kgTotal / (overview.kgTotal + overview.sgTotal || 1)) * 100}%` }} 
                                        className="bg-amber-500 h-full"
                                        title="Karawang"
                                    />
                                    <div 
                                        style={{ width: `${(overview.sgTotal / (overview.kgTotal + overview.sgTotal || 1)) * 100}%` }} 
                                        className="bg-indigo-600 h-full"
                                        title="Sadang"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Filter & Navigation Bar */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Plant Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
                        {(isSuperAdmin || defaultPlant === 'SG') && (
                            <button
                                onClick={() => setSelectedPlant('SG')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    selectedPlant === 'SG' 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${selectedPlant === 'SG' ? 'bg-white' : 'bg-indigo-500'}`} />
                                Plant Sadang (SG)
                                {defaultPlant === 'SG' && <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-normal">Sesi</span>}
                            </button>
                        )}
                        {(isSuperAdmin || defaultPlant === 'KG') && (
                            <button
                                onClick={() => setSelectedPlant('KG')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    selectedPlant === 'KG' 
                                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${selectedPlant === 'KG' ? 'bg-slate-950' : 'bg-amber-500'}`} />
                                Plant Karawang (KG)
                                {defaultPlant === 'KG' && <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded font-normal">Sesi</span>}
                            </button>
                        )}
                        {isSuperAdmin && (
                            <button
                                onClick={() => setSelectedPlant('ALL')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                    selectedPlant === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Konsolidasi (Semua Plant)
                            </button>
                        )}
                        {!isSuperAdmin && (
                            <span className="text-[10px] text-slate-500 font-bold px-2 py-1 flex items-center gap-1 bg-white rounded-xl shadow-sm border border-slate-200">
                                🔒 Locked ({defaultPlant === 'KG' ? 'Karawang' : 'Sadang'})
                            </span>
                        )}
                    </div>

                    {/* Search Field */}
                    <div className="relative min-w-[280px]">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari item, COA, komponen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-Tabs (Forms & Categories) */}
                <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 pb-1 custom-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    isActive 
                                        ? 'bg-slate-900 text-white shadow-md' 
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                                }`}
                            >
                                <Icon size={14} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB: Department Matrix View */}
            {activeTab === 'MATRIX' ? (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Matriks Pembagian Sheet Departemen (Official Matriks)</h2>
                            <p className="text-xs text-slate-500">Melihat pemetaan tanggung jawab formulir budget di seluruh departemen PT TCF.</p>
                        </div>
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black">
                            10 Departemen Terdata
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="p-3">No</th>
                                    <th className="p-3">Nama Departemen</th>
                                    <th className="p-3">Formulir Terkait</th>
                                    <th className="p-3">Tanggung Jawab Utama</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {matrix.map((dept, idx) => {
                                    const isIct = dept.name.includes('ICT');
                                    return (
                                        <tr key={idx} className={isIct ? 'bg-amber-50/50 font-bold' : 'hover:bg-slate-50/80'}>
                                            <td className="p-3 text-slate-500">{idx + 1}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-black ${isIct ? 'text-amber-800 text-sm' : 'text-slate-900'}`}>{dept.name}</span>
                                                    {isIct && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500 text-slate-950 font-black">
                                                            ACTIVE DEPT
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-1 max-w-xl">
                                                    {dept.assigned_forms.map((f, fi) => (
                                                        <span key={fi} className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            isIct ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {f}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-3 text-slate-600">
                                                {isIct ? 'Komputer, Server, CCTV, Network, ISP, Ricoh Rental, IT Licenses' : 'Operasional Departemen Terkait'}
                                            </td>
                                            <td className="p-3">
                                                {isIct ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                                                        <Check size={12} /> Diisolasi & Dikelola
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">Sheet Diabaikan</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Main Budget Grid Table */
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="font-black text-sm text-slate-900">
                                Data Rencana Budget {year}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold">
                                {filteredItems.length} Item
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">Subtotal Terfilter:</span>
                            <span className="font-black text-slate-900 text-sm">{formatIDR(filteredTotal)}</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/75 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200 select-none">
                                <tr>
                                    <th className="p-3 w-10">No</th>
                                    <th className="p-3 min-w-[200px]">Item & Spesifikasi</th>
                                    <th className="p-3 w-28">Plant / Form</th>
                                    <th className="p-3 w-32">Kategori / COA</th>
                                    <th className="p-3 w-24 text-right">Harga Unit</th>
                                    <th className="p-3 w-16 text-center">Qty</th>
                                    <th className="p-3 w-32 text-right">Total {year}</th>
                                    {MONTH_NAMES.map(m => (
                                        <th key={m.key} className="p-2 w-20 text-right text-[11px] font-bold text-slate-600 bg-slate-50/50">
                                            {m.label}
                                        </th>
                                    ))}
                                    <th className="p-3 w-24 text-center sticky right-0 bg-slate-100/95 backdrop-blur-sm z-20 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)] border-l border-slate-200">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={20} className="p-12 text-center text-slate-400">
                                            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
                                            <p className="font-bold">Memuat data anggaran {year}...</p>
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={20} className="p-12 text-center text-slate-400">
                                            <AlertCircle size={24} className="mx-auto mb-2 text-slate-400" />
                                            <p className="font-bold">Tidak ada item budget yang sesuai filter untuk Tahun {year}.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item, idx) => {
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                                                            {item.item_name}
                                                        </div>
                                                        <button
                                                            onClick={() => handleOpenEdit(item)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-amber-600 hover:bg-amber-100 transition-all shrink-0 cursor-pointer"
                                                            title="Klik Cepat untuk Edit Item"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                                                        {item.type_asset && (
                                                            <span className="px-1.5 py-0.2 rounded bg-slate-100 font-semibold">
                                                                Type: {item.type_asset}
                                                            </span>
                                                        )}
                                                        {item.notes && (
                                                            <span className="truncate max-w-[200px]" title={item.notes}>
                                                                {item.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                                            item.plant === 'KG' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-indigo-100 text-indigo-900 border-indigo-200'
                                                        }`}>
                                                            {item.plant}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                            {item.form}
                                                        </span>
                                                    </div>
                                                    {item.doc_no && (
                                                        <div className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-[140px]" title={item.doc_no}>
                                                            {item.doc_no}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-700">{item.sub_category}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{item.coa_code}</div>
                                                </td>
                                                <td className="p-3 text-right font-medium text-slate-600">
                                                    {item.unit_price > 0 ? formatIDR(item.unit_price) : '-'}
                                                </td>
                                                <td className="p-3 text-center font-bold text-slate-800">
                                                    {item.qty > 0 ? item.qty : 1}
                                                </td>
                                                <td className="p-3 text-right font-black text-slate-900">
                                                    {formatIDR(item.total_amount)}
                                                </td>

                                                {/* 12 Months Breakdown */}
                                                {MONTH_NAMES.map(m => {
                                                    const val = item.monthly?.[m.key] || 0;
                                                    return (
                                                        <td key={m.key} className={`p-2 text-right font-mono text-[11px] ${
                                                            val > 0 ? 'text-slate-800 font-bold bg-amber-50/20' : 'text-slate-300'
                                                        }`}>
                                                            {val > 0 ? (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`) : '-'}
                                                        </td>
                                                    );
                                                })}

                                                {/* Actions - Sticky Right */}
                                                <td className="p-3 text-center sticky right-0 bg-white/95 group-hover:bg-slate-50/95 transition-colors z-10 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.08)] border-l border-slate-200">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => handleOpenEdit(item)}
                                                            className="p-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 shadow-sm transition-all active:scale-95 cursor-pointer"
                                                            title="Edit Item"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteItem(item.id, item.item_name)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                            title="Hapus Item"
                                                        >
                                                            <Trash2 size={14} />
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
            </>
            )}

            {/* SECTION 2: HARDWARE LIFECYCLE & UPGRADE ASSESSMENT (Standar IK/ISO) */}
            {mainSection === 'HARDWARE_LIFECYCLE' && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Hardware KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Komputer & Laptop</span>
                                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                                    <Laptop size={16} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900">{hardwareData.summary?.total_evaluated || 0} Unit</p>
                            <p className="text-xs text-slate-400 mt-1">Armada Aktif {selectedPlant !== 'ALL' ? selectedPlant : 'PT TCF'}</p>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-emerald-200/70 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Sesuai Standar IK / ISO</span>
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                                    <CheckCircle2 size={16} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-emerald-800">{hardwareData.summary?.compliant_count || 0} Unit</p>
                            <p className="text-xs text-emerald-600 mt-1 font-semibold">Tidak Perlu Biaya</p>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-amber-200/70 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Perlu Upgrade RAM / SSD</span>
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                                    <Zap size={16} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-amber-800">
                                {(hardwareData.summary?.upgrade_ram_count || 0) + (hardwareData.summary?.upgrade_ssd_count || 0)} Unit
                            </p>
                            <p className="text-xs text-amber-600 mt-1 font-semibold">Form F2 (Opex Sparepart)</p>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-red-200/70 shadow-sm bg-gradient-to-br from-white to-red-50/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">Perlu Ganti Unit (Age &gt; 5 Thn)</span>
                                <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
                                    <AlertTriangle size={16} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-red-800">{hardwareData.summary?.replace_unit_count || 0} Unit</p>
                            <p className="text-xs text-red-600 mt-1 font-semibold">Form I-1 (Capex Investasi)</p>
                        </div>

                        <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-700 shadow-md">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Proyeksi Anggaran</span>
                                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                                    <Coins size={16} />
                                </div>
                            </div>
                            <p className="text-xl font-black text-amber-400">
                                {formatIDR((hardwareData.summary?.estimated_capex || 0) + (hardwareData.summary?.estimated_opex_upgrade || 0))}
                            </p>
                            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                                <span>Capex: {formatIDR(hardwareData.summary?.estimated_capex || 0)}</span>
                                <span>Opex: {formatIDR(hardwareData.summary?.estimated_opex_upgrade || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter and Control Bar */}
                    <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Plant Selector */}
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                                    <button
                                        onClick={() => setSelectedPlant('SG')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            selectedPlant === 'SG' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Sadang (SG)
                                    </button>
                                    <button
                                        onClick={() => setSelectedPlant('KG')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            selectedPlant === 'KG' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Karawang (KG)
                                    </button>
                                    <button
                                        onClick={() => setSelectedPlant('ALL')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            selectedPlant === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Semua
                                    </button>
                                </div>

                                {/* Status Filter */}
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                                    <button
                                        onClick={() => setHwFilterStatus('ALL')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            hwFilterStatus === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Semua
                                    </button>
                                    <button
                                        onClick={() => setHwFilterStatus('UPGRADE')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            hwFilterStatus === 'UPGRADE' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Perlu Upgrade
                                    </button>
                                    <button
                                        onClick={() => setHwFilterStatus('REPLACE')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            hwFilterStatus === 'REPLACE' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Perlu Ganti Unit
                                    </button>
                                    <button
                                        onClick={() => setHwFilterStatus('COMPLIANT')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            hwFilterStatus === 'COMPLIANT' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Standar ISO
                                    </button>
                                </div>

                                {/* Department Filter */}
                                <select
                                    value={hwFilterDept}
                                    onChange={(e) => setHwFilterDept(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                >
                                    <option value="ALL">Semua Departemen</option>
                                    {hardwareDepartments.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Search Box */}
                            <div className="relative min-w-[260px]">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari perangkat, user, CPU, RAM..."
                                    value={hwSearch}
                                    onChange={(e) => setHwSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                />
                                {hwSearch && (
                                    <button onClick={() => setHwSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <BookOpen size={14} className="text-indigo-600" />
                                <span>Kiblat Standar: <b className="text-slate-800">{hardwareData.summary?.doc_standard || 'TCFSG-IK-ICT-01'}</b> (ISO 9001:2015 & ISO 27001)</span>
                            </div>
                            <button
                                onClick={fetchHardwareData}
                                disabled={hardwareLoading}
                                className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
                            >
                                <RefreshCw size={13} className={hardwareLoading ? 'animate-spin' : ''} />
                                <span>Refresh Data Asset</span>
                            </button>
                        </div>
                    </div>

                    {/* Hardware Master Plan Table */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/80 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="p-3 w-10">No</th>
                                        <th className="p-3 min-w-[220px]">Perangkat & Pengguna</th>
                                        <th className="p-3 min-w-[140px]">Departemen / Lokasi</th>
                                        <th className="p-3 min-w-[220px]">Spesifikasi Terdeteksi</th>
                                        <th className="p-3 w-24 text-center">Umur Pakai</th>
                                        <th className="p-3 min-w-[200px]">Evaluasi Standar IK / ISO</th>
                                        <th className="p-3 w-32 text-right">Estimasi Biaya</th>
                                        <th className="p-3 w-40 text-center">Aksi Budgeting</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {hardwareLoading ? (
                                        <tr>
                                            <td colSpan={8} className="p-12 text-center text-slate-400">
                                                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                                                <p className="font-bold">Menganalisis spesifikasi perangkat di ICT Asset...</p>
                                            </td>
                                        </tr>
                                    ) : filteredHardware.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-12 text-center text-slate-400">
                                                <AlertCircle size={24} className="mx-auto mb-2 text-slate-400" />
                                                <p className="font-bold">Tidak ada perangkat yang sesuai filter.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredHardware.map((item, idx) => {
                                            const { specs, assessment } = item;
                                            const isCompliant = assessment?.status === 'COMPLIANT';
                                            const isReplace = assessment?.status === 'REPLACE_UNIT';
                                            const isUpgrade = assessment?.status?.includes('UPGRADE');

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                                                    <td 
                                                        onClick={() => {
                                                            setSelectedAssetDetail(item);
                                                            setSpecDetailTab('AUDIT');
                                                            setSpecModalOpen(true);
                                                        }}
                                                        className="p-3 cursor-pointer group/dev"
                                                        title="Klik untuk melihat Detail Spesifikasi & Analisis Penggantian ISO"
                                                    >
                                                        <div className="font-black text-slate-900 flex items-center gap-2 group-hover/dev:text-indigo-600 transition-colors">
                                                            {item.name}
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                                                {item.type || 'PC'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            User: <b className="text-slate-800">{item.user_name || '-'}</b>
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-400">
                                                            No. Inv: {item.inventory_number || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="font-bold text-slate-800">{item.department || '-'}</div>
                                                        <div className="text-[10px] text-slate-500">{item.location || '-'}</div>
                                                        <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-black ${
                                                            item.plant === 'KG' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                                                        }`}>
                                                            Plant {item.plant}
                                                        </span>
                                                    </td>
                                                    <td 
                                                        onClick={() => {
                                                            setSelectedAssetDetail(item);
                                                            setSpecDetailTab('AUDIT');
                                                            setSpecModalOpen(true);
                                                        }}
                                                        className="p-3 cursor-pointer group/spec hover:bg-indigo-50/70 transition-all rounded-xl"
                                                        title="Klik untuk melihat Detail Spesifikasi & Analisis Penggantian ISO"
                                                    >
                                                        <div className="font-bold text-slate-800 flex items-center justify-between gap-1.5">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <Cpu size={12} className="text-indigo-600 shrink-0" />
                                                                <span className="truncate max-w-[170px] group-hover/spec:text-indigo-700 transition-colors font-black" title={specs?.cpu}>
                                                                    {specs?.cpu || 'CPU N/A'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded group-hover/spec:bg-indigo-600 group-hover/spec:text-white transition-colors shrink-0 flex items-center gap-0.5">
                                                                Detil Spek
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 text-[11px]">
                                                            <span className={`px-1.5 py-0.2 rounded font-bold ${
                                                                (specs?.ram_gb || specs?.ramGb) >= 16 ? 'bg-emerald-100 text-emerald-800' : (specs?.ram_gb || specs?.ramGb) >= 8 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                RAM: {specs?.ram || `${specs?.ram_gb || specs?.ramGb || 8} GB`}
                                                            </span>
                                                            <span className={`px-1.5 py-0.2 rounded font-bold ${
                                                                (specs?.has_ssd ?? specs?.isSsd) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {(specs?.has_ssd ?? specs?.isSsd) ? 'SSD' : 'HDD Only'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                                            <span className="truncate max-w-[160px]" title={specs?.storage_summary || specs?.storage}>
                                                                {specs?.storage_summary || specs?.storage || '-'}
                                                            </span>
                                                            <span className="text-indigo-600 font-bold flex items-center gap-0.5 group-hover/spec:translate-x-0.5 transition-transform">
                                                                Audit IK <ChevronRight size={10} />
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td 
                                                        onClick={() => {
                                                            setSelectedAssetDetail(item);
                                                            setSpecDetailTab('AUDIT');
                                                            setSpecModalOpen(true);
                                                        }}
                                                        className="p-3 text-center cursor-pointer hover:bg-slate-100/70 transition-colors"
                                                        title="Klik untuk melihat Detail Siklus Hidup & Kepatuhan ISO"
                                                    >
                                                        <div className={`font-black text-sm ${
                                                            (specs?.age_years ?? specs?.age) >= 5 ? 'text-red-600' : (specs?.age_years ?? specs?.age) >= 4 ? 'text-amber-600' : 'text-slate-700'
                                                        }`}>
                                                            {(specs?.age_years ?? specs?.age) !== undefined ? `${specs.age_years ?? specs.age} Thn` : '-'}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 block">
                                                            {(specs?.age_years ?? specs?.age) >= 5 ? 'Melebihi Siklus' : 'Dalam Siklus'}
                                                        </span>
                                                    </td>
                                                    <td 
                                                        onClick={() => {
                                                            setSelectedAssetDetail(item);
                                                            setSpecDetailTab('AUDIT');
                                                            setSpecModalOpen(true);
                                                        }}
                                                        className="p-3 cursor-pointer hover:bg-amber-50/50 transition-colors"
                                                        title="Klik untuk melihat Analisis Detail Alasan Penggantian ISO"
                                                    >
                                                        <div className="mb-1">
                                                            {isCompliant ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
                                                                    <CheckCircle2 size={11} /> STANDAR TERPENUHI
                                                                </span>
                                                            ) : isReplace ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 w-fit">
                                                                    <AlertTriangle size={11} /> PERLU GANTI UNIT (CAPEX)
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                                                                    <Zap size={11} /> {assessment?.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-700 font-medium leading-tight">
                                                            {assessment?.recommendation}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center justify-between">
                                                            <span>Ref: {assessment?.doc_standard} ({assessment?.target_form})</span>
                                                            <span className="text-indigo-600 font-bold">Lihat Alasan &gt;</span>
                                                        </p>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        {assessment?.estimated_cost > 0 ? (
                                                            <div>
                                                                <div className="font-black text-slate-900">
                                                                    {formatIDR(assessment.estimated_cost)}
                                                                </div>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                                    assessment.category === 'CAPEX' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                    {assessment.category} ({assessment.target_form})
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 font-bold">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {isCompliant ? (
                                                            <span className="text-[11px] text-emerald-600 font-bold inline-flex items-center gap-1">
                                                                <Check size={13} /> Sesuai Standar
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handlePushHardwareToBudget(item)}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 mx-auto ${
                                                                    isReplace 
                                                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30' 
                                                                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                                                                }`}
                                                                title={`Masukkan ke Rencana Budget ${year}`}
                                                            >
                                                                <span>Ajukan ke {year}</span>
                                                                <ArrowRight size={13} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 3: SOFTWARE, LISENSI & AMC (SOLIDWORKS, O365, DLL) */}
            {mainSection === 'SOFTWARE_LIFECYCLE' && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Software KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Software Korporat</span>
                                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                                    <KeyRound size={16} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900">{softwareData.summary?.total_software || 0} Lisensi</p>
                            <p className="text-xs text-slate-400 mt-1">Enterprise & Engineering</p>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Nilai Lisensi Awal</span>
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                                    <Server size={16} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-blue-700">
                                {formatIDR(softwareData.summary?.total_purchase_investment || 0)}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Investasi Perangkat Lunak TCF</p>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-amber-200/70 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Biaya Maintenance (AMC) / Thn</span>
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                                    <Clock size={16} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-amber-800">
                                {formatIDR(softwareData.summary?.total_annual_maintenance || 0)}
                            </p>
                            <p className="text-xs text-amber-600 mt-1 font-semibold">Alokasi Form F1 / H2</p>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-purple-200/70 shadow-sm bg-gradient-to-br from-white to-purple-50/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Perpanjangan Segera (&lt;60 Hari)</span>
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                                    <AlertTriangle size={16} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-purple-800">
                                {softwareData.summary?.expiring_soon_count || 0} Lisensi
                            </p>
                            <p className="text-xs text-purple-600 mt-1 font-semibold">Segera Siapkan PO / Pembayaran</p>
                        </div>
                    </div>

                    {/* Filter and Action Bar */}
                    <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                                <button
                                    onClick={() => setSelectedPlant('SG')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                        selectedPlant === 'SG' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Sadang (SG)
                                </button>
                                <button
                                    onClick={() => setSelectedPlant('KG')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                        selectedPlant === 'KG' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Karawang (KG)
                                </button>
                                <button
                                    onClick={() => setSelectedPlant('ALL')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                        selectedPlant === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Semua
                                </button>
                            </div>
                            <span className="text-xs text-slate-400 hidden md:inline">
                                Memetakan siklus instalasi, masa expired, dan tagihan renewal tahunan
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleOpenAddSoftware}
                                className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                            >
                                <Plus size={15} /> Tambah Software / Lisensi
                            </button>
                        </div>
                    </div>

                    {/* Software Master Table */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/80 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="p-3 w-10">No</th>
                                        <th className="p-3 min-w-[200px]">Software & Vendor</th>
                                        <th className="p-3 w-32">Kategori & Dept</th>
                                        <th className="p-3 w-20 text-center">Seat / User</th>
                                        <th className="p-3 min-w-[170px]">Pembelian & Pemasangan</th>
                                        <th className="p-3 min-w-[170px]">Masa Berlaku & Expired</th>
                                        <th className="p-3 min-w-[180px]">Maintenance Tahunan (AMC)</th>
                                        <th className="p-3 w-40 text-center">Aksi Budgeting</th>
                                        <th className="p-3 w-16 text-center">Edit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {softwareLoading ? (
                                        <tr>
                                            <td colSpan={9} className="p-12 text-center text-slate-400">
                                                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-500" />
                                                <p className="font-bold">Memuat daftar lisensi dan maintenance software...</p>
                                            </td>
                                        </tr>
                                    ) : filteredSoftware.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="p-12 text-center text-slate-400">
                                                <AlertCircle size={24} className="mx-auto mb-2 text-slate-400" />
                                                <p className="font-bold">Belum ada software terdaftar untuk filter ini.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSoftware.map((soft, idx) => {
                                            const isExpiring = soft.status === 'EXPIRING_SOON';
                                            const isExpired = soft.status === 'EXPIRED';

                                            return (
                                                <tr key={soft.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                                                    <td className="p-3">
                                                        <div className="font-black text-slate-900 text-sm">{soft.name}</div>
                                                        <div className="text-[11px] text-slate-500">
                                                            Vendor: <b className="text-slate-700">{soft.vendor || '-'}</b>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            Plant: <span className="font-bold text-slate-700">{soft.plant}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 inline-block mb-1">
                                                            {soft.category}
                                                        </span>
                                                        <div className="text-[11px] font-bold text-slate-800">{soft.department}</div>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className="font-black text-slate-900 text-sm">{soft.seats_qty || 1}</span>
                                                        <span className="text-[10px] text-slate-400 block">Seat</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="text-[11px] text-slate-700">
                                                            Beli: <b className="text-slate-900">{soft.purchase_date || '-'}</b>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            Pasang: <b>{soft.install_date || '-'}</b>
                                                        </div>
                                                        {soft.purchase_cost > 0 && (
                                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                                Biaya: {formatIDR(soft.purchase_cost)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="font-bold text-slate-800">
                                                            {soft.expiry_date || 'Perpetual'}
                                                        </div>
                                                        {soft.expiry_date === 'Perpetual' ? (
                                                            <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-blue-100 text-blue-800 inline-block mt-0.5">
                                                                LISENSI SEUMUR HIDUP
                                                            </span>
                                                        ) : isExpired ? (
                                                            <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-red-100 text-red-800 inline-block mt-0.5">
                                                                EXPIRED
                                                            </span>
                                                        ) : isExpiring ? (
                                                            <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 inline-block mt-0.5">
                                                                SISA {soft.days_to_expiry} HARI
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 inline-block mt-0.5">
                                                                AKTIF ({soft.days_to_expiry} HARI)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="font-black text-slate-900 text-sm">
                                                            {soft.annual_maintenance_cost > 0 ? formatIDR(soft.annual_maintenance_cost) : 'Tidak Ada'}
                                                        </div>
                                                        {soft.annual_maintenance_cost > 0 && (
                                                            <>
                                                                <div className="text-[10px] text-slate-600 mt-0.5">
                                                                    Jatuh Tempo: <b className="text-amber-800">{soft.maintenance_payment_date || '-'}</b>
                                                                </div>
                                                                <div className="text-[10px] text-slate-400">
                                                                    Bulan Alokasi: <b className="uppercase text-slate-700">{soft.renewal_month || 'jan'}</b> | Form: {soft.target_form || 'F1'}
                                                                </div>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {soft.annual_maintenance_cost > 0 ? (
                                                            <button
                                                                onClick={() => handleSyncSoftwareToBudget(soft)}
                                                                className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all mx-auto"
                                                                title={`Masukkan biaya AMC ${soft.name} ke Budget ${year} (Bulan ${(soft.renewal_month || 'jan').toUpperCase()})`}
                                                            >
                                                                <Coins size={13} />
                                                                <span>Sinkron ke {year}</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">Free / No AMC</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => handleOpenEditSoftware(soft)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                                title="Edit Software"
                                                            >
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSoftware(soft.id, soft.name)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                                title="Hapus Software"
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
                </div>
            )}

            {/* SECTION 4: STANDAR DOKUMEN IK & ISO */}
            {mainSection === 'ISO_STANDARDS' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Pedoman Standar Perangkat & Siklus Hidup Aset ICT</h2>
                                <p className="text-xs text-slate-500">Berkiblat ke Sistem Manajemen Mutu ISO 9001:2015 & Keamanan Informasi ISO 27001 PT Tri Centrum Fortuna.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                                        TCFSG-IK-ICT-01 / TCFKG-IK-ICT-01
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-500">Instruksi Kerja</span>
                                </div>
                                <h3 className="text-sm font-black text-slate-900">Standar Spesifikasi Perangkat Komputer & Laptop</h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Menetapkan ambang batas minimum hardware guna menjamin kelancaran sistem ERP Adempiere, software CAD SolidWorks, dan aplikasi perkantoran tanpa bottleneck kinerja.
                                </p>
                                <ul className="text-xs space-y-1.5 text-slate-700">
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                        <span><b>Engineering & CAD:</b> Minimal Intel Core i7 / Ryzen 7, RAM 16GB, SSD NVMe, GPU Dedikasi. Siklus ganti maksimal 4 tahun.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                        <span><b>Staff Kantor & Admin:</b> Minimal Intel Core i3/i5, RAM 8GB (Wajib), Media Simpan Wajib SSD (HDD wajib di-upgrade). Siklus ganti maksimal 5 tahun.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                        <span><b>Shopfloor & QC:</b> Mini PC / Terminal industri dengan RAM 8GB dan proteksi debu.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                                        TCF-SOP-ICT-04
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-500">Standar Operasional Prosedur</span>
                                </div>
                                <h3 className="text-sm font-black text-slate-900">Manajemen Siklus Hidup & Kepatuhan Lisensi Software</h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Mengatur pengadaan, pemeliharaan kontrak tahunan (Annual Maintenance Contract / AMC), serta audit legalitas software untuk pencegahan audit penalty dan ransomware.
                                </p>
                                <ul className="text-xs space-y-1.5 text-slate-700">
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                        <span><b>Zero Piracy:</b> Seluruh PC wajib berlisensi Windows Pro OEM/OLP resmi dan antivirus Kaspersky Endpoint terpusat.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                        <span><b>AMC SolidWorks / CAD:</b> Anggaran pemeliharaan tahunan wajib diajukan di Form F1 paling lambat H-90 sebelum jatuh tempo maintenance.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                        <span><b>Cloud Subscriptions:</b> Microsoft 365 didaftarkan dalam Form H2 (Centralize IT) dan direkonsiliasi per kuartal.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Standard Specification Matrix Table */}
                        <div className="mt-8">
                            <h4 className="text-sm font-black text-slate-900 mb-3">Matriks Spesifikasi Standar Berdasarkan Peran</h4>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200">
                                        <tr>
                                            <th className="p-3">Peran / Fungsi</th>
                                            <th className="p-3">Min. Processor</th>
                                            <th className="p-3">Min. Memory RAM</th>
                                            <th className="p-3">Media Penyimpanan</th>
                                            <th className="p-3">Siklus Ganti (Refresh)</th>
                                            <th className="p-3">Formulir Budget</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr>
                                            <td className="p-3 font-black text-indigo-900">Engineering & Design CAD</td>
                                            <td className="p-3">Intel Core i7 Gen 12+ / Ryzen 7</td>
                                            <td className="p-3 font-bold text-emerald-700">Min. 16 GB (Recom 32 GB)</td>
                                            <td className="p-3">SSD NVMe 512 GB + 1TB HDD</td>
                                            <td className="p-3 font-bold">Maks. 4 Tahun</td>
                                            <td className="p-3 font-mono text-[11px]">I-1 (Capex Investasi)</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-black text-slate-900">Staff Office & Administrasi</td>
                                            <td className="p-3">Intel Core i3 / i5</td>
                                            <td className="p-3 font-bold text-slate-800">Min. 8 GB</td>
                                            <td className="p-3 font-bold text-amber-700">Wajib SSD (Min 256 GB)</td>
                                            <td className="p-3 font-bold">Maks. 5 Tahun</td>
                                            <td className="p-3 font-mono text-[11px]">I-1 (Replace) / F2 (Upgrade)</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-black text-slate-900">Shopfloor & Line Terminal</td>
                                            <td className="p-3">Intel Celeron / Core i3</td>
                                            <td className="p-3">Min. 8 GB</td>
                                            <td className="p-3">SSD 128 / 256 GB</td>
                                            <td className="p-3 font-bold">Maks. 6 Tahun</td>
                                            <td className="p-3 font-mono text-[11px]">I-1 (Capex)</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-black text-purple-900">Server & Core Infrastructure</td>
                                            <td className="p-3">Intel Xeon / AMD EPYC</td>
                                            <td className="p-3 font-bold text-purple-700">Min. 32 GB ECC</td>
                                            <td className="p-3">RAID 1/5/10 Enterprise SSD</td>
                                            <td className="p-3 font-bold">Maks. 5-7 Tahun</td>
                                            <td className="p-3 font-mono text-[11px]">I-1 (Investasi Server)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 5: PERMINTAAN BUDGET DEPARTEMEN LAIN (SOP TCFSG-SOP-ICT-03) */}
            {mainSection === 'DEPT_REQUESTS' && (
                <div className="space-y-5">
                    {/* Compact Header & SOP Control Toolbar */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 md:p-5 rounded-3xl border border-indigo-500/20 shadow-xl text-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-rose-500/10 to-transparent pointer-events-none" />
                        
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                                        <FileText size={12} /> SOP-ICT-03
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10">
                                        {selectedPlant === 'KG' ? 'TCFKG-FM-ICT-03-04' : 'TCFSG-FM-ICT-03-04'} (Rev 01)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        IATF 16949 Klausul 7.1.3
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-lg md:text-xl font-black tracking-tight text-white">
                                        Permintaan Fasilitas & Budget Dept
                                    </h2>
                                    {/* Tombol Terpisah untuk Panduan SOP & Alur Otorisasi */}
                                    <button
                                        onClick={() => setSopGuideOpen(true)}
                                        className="px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 hover:text-white border border-indigo-400/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                        title="Buka panduan alur otorisasi 5-tahap, standar dokumen, dan klasifikasi Capex/Opex"
                                    >
                                        <BookOpen size={13} className="text-amber-400" />
                                        <span>Panduan SOP & Alur Otorisasi</span>
                                    </button>
                                </div>
                                <p className="text-xs text-slate-300">
                                    Pengajuan usulan perangkat baru, upgrade hardware, lisensi software, dan infrastruktur antar-departemen.
                                </p>
                            </div>

                            {/* Grouped Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    disabled={deptPdfLoading}
                                    onClick={() => handleDownloadBlankPdf('download')}
                                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-all active:scale-95"
                                    title="Download formulir resmi kosong dalam format PDF siap cetak"
                                >
                                    <FileDown size={14} className="text-emerald-400" />
                                    <span>Form PDF</span>
                                </button>

                                <button
                                    disabled={deptPdfLoading}
                                    onClick={handleDownloadBlankExcel}
                                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-all active:scale-95"
                                    title="Download template Excel (.xlsx) dengan rumus otomatis"
                                >
                                    <FileSpreadsheet size={14} className="text-teal-400" />
                                    <span>Form Excel</span>
                                </button>

                                <button
                                    onClick={handleExportDeptRekapExcel}
                                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-colors active:scale-95"
                                    title="Export rekapitulasi seluruh pengajuan budget ke file Excel"
                                >
                                    <Download size={14} />
                                    <span>Export Rekap</span>
                                </button>

                                <button
                                    disabled={deptPdfLoading}
                                    onClick={() => handleDownloadBlankPdf('preview')}
                                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-colors active:scale-95"
                                    title="Pratinjau / Cetak Form Kosong langsung di browser"
                                >
                                    <Printer size={14} />
                                    <span>Preview / Cetak</span>
                                </button>

                                <button
                                    onClick={handleOpenAddDeptReq}
                                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
                                >
                                    <Plus size={15} />
                                    <span>+ Buat Pengajuan Baru</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Pengajuan</span>
                                <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                                    <Layers size={17} />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-2xl font-black text-slate-900 tracking-tight">
                                    {deptSummary.all_count} <span className="text-xs font-semibold text-slate-400">Pengajuan</span>
                                </div>
                                <div className="text-xs font-bold text-indigo-600">
                                    Estimasi: {formatIDR(deptSummary.total_amount)}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Disetujui ke Anggaran</span>
                                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                                    <CheckCircle2 size={17} />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-2xl font-black text-emerald-700 tracking-tight">
                                    {deptSummary.approved_count} <span className="text-xs font-semibold text-slate-400">Tersinkron</span>
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                    <Sparkles size={11} className="text-emerald-500" />
                                    <span>Sync Form I-1 / F1 / F2</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Menunggu Review ICT</span>
                                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                                    <Clock size={17} />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-2xl font-black text-amber-600 tracking-tight">
                                    {deptSummary.pending_count} <span className="text-xs font-semibold text-slate-400">Menunggu</span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    Verifikasi kelayakan & stock
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Perlu Revisi / Ditolak</span>
                                <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                                    <AlertTriangle size={17} />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-2xl font-black text-rose-600 tracking-tight">
                                    {deptRequests.filter(r => r.status === 'REJECTED').length} <span className="text-xs font-semibold text-slate-400">Item</span>
                                </div>
                                <button
                                    onClick={() => setSopGuideOpen(true)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                    <span>SOP-03 Rev 01</span>
                                    <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter & Search Toolbar */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Target Year Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                                <Calendar size={14} className="text-slate-400" />
                                <select
                                    value={deptFilterYear}
                                    onChange={(e) => setDeptFilterYear(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                >
                                    <option value="ALL">Semua Target Tahun</option>
                                    <option value="2027">Tahun 2027 (Rencana)</option>
                                    <option value="2026">Tahun 2026 (Baseline)</option>
                                </select>
                            </div>

                            {/* Plant Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                                <Building2 size={14} className="text-slate-400" />
                                <select
                                    value={deptFilterPlant}
                                    onChange={(e) => setDeptFilterPlant(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                >
                                    {defaultPlant !== 'KG' && <option value="ALL">Semua Plant (SG & KG)</option>}
                                    {defaultPlant !== 'KG' && <option value="SG">Sadang (SG)</option>}
                                    <option value="KG">Karawang (KG)</option>
                                </select>
                            </div>

                            {/* Department Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                                <Layers size={14} className="text-slate-400" />
                                <select
                                    value={deptFilterDept}
                                    onChange={(e) => setDeptFilterDept(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                >
                                    <option value="ALL">Semua Departemen Pemohon</option>
                                    {DEPARTMENTS_LIST.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                                <Filter size={14} className="text-slate-400" />
                                <select
                                    value={deptFilterCat}
                                    onChange={(e) => setDeptFilterCat(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                >
                                    <option value="ALL">Semua Kategori Kebutuhan</option>
                                    {REQUEST_CATEGORIES.map(c => (
                                        <option key={c.key} value={c.key}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                                <ShieldAlert size={14} className="text-slate-400" />
                                <select
                                    value={deptFilterStatus}
                                    onChange={(e) => setDeptFilterStatus(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                >
                                    <option value="ALL">Semua Status SOP</option>
                                    <option value="SUBMITTED">Diajukan (Menunggu Review)</option>
                                    <option value="VERIFIED_ICT">Diverifikasi Tim ICT</option>
                                    <option value="APPROVED_TO_BUDGET">Disetujui ke Anggaran</option>
                                    <option value="REJECTED">Ditolak / Review Ulang</option>
                                </select>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[260px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari item, no registrasi, pemohon..."
                                value={deptSearch}
                                onChange={(e) => setDeptSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Department Requests Table */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                    <FileSpreadsheet size={18} className="text-rose-600" />
                                    <span>Daftar Pengajuan Kebutuhan Fasilitas & Anggaran ICT ({deptRequests.length})</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Usulan kebutuhan fasilitas dan anggaran dari seluruh departemen pemohon.
                                </p>
                            </div>

                            <button
                                onClick={fetchDeptRequests}
                                disabled={deptLoading}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                title="Muat Ulang Data"
                            >
                                <RefreshCw size={16} className={deptLoading ? 'animate-spin text-rose-600' : ''} />
                            </button>
                        </div>

                        {deptLoading ? (
                            <div className="p-12 text-center text-slate-400">
                                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-rose-500" />
                                <span className="text-xs font-bold">Memuat daftar pengajuan departemen...</span>
                            </div>
                        ) : deptRequests.length === 0 ? (
                            <div className="p-12 text-center space-y-3">
                                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                    <FileText size={28} />
                                </div>
                                <h4 className="text-sm font-black text-slate-800">Belum Ada Pengajuan Permintaan Budget</h4>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                    Tidak ada pengajuan yang cocok dengan filter aktif. Departemen dapat mengajukan kebutuhan baru secara digital atau men-download formulir kosong untuk tanda tangan manual.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                    <button
                                        onClick={() => handleDownloadBlankPdf('download')}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <FileDown size={14} /> Download PDF
                                    </button>
                                    <button
                                        onClick={handleDownloadBlankExcel}
                                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <FileSpreadsheet size={14} /> Download Excel
                                    </button>
                                    <button
                                        onClick={handleOpenAddDeptReq}
                                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <Plus size={14} /> Buat Pengajuan Baru
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 font-black uppercase tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="p-3.5 pl-5">No. Registrasi & Tanggal</th>
                                            <th className="p-3.5">Departemen & Pemohon</th>
                                            <th className="p-3.5">Kategori SOP</th>
                                            <th className="p-3.5">Item & Spesifikasi Teknis</th>
                                            <th className="p-3.5">Estimasi Biaya & Target</th>
                                            <th className="p-3.5">Status SOP</th>
                                            <th className="p-3.5 pr-5 text-right sticky right-0 bg-slate-50/95 backdrop-blur-sm z-20 border-l border-slate-200 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)]">Otorisasi & Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {deptRequests.map((req) => {
                                            const catInfo = REQUEST_CATEGORIES.find(c => c.key === req.category) || REQUEST_CATEGORIES[0];
                                            const isApproved = req.status === 'APPROVED_TO_BUDGET';
                                            const isVerified = req.status === 'VERIFIED_ICT';
                                            const isRejected = req.status === 'REJECTED';

                                            return (
                                                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors group">
                                                    {/* No Registrasi & Tanggal */}
                                                    <td className="p-3.5 pl-5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-mono font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                                                                {req.req_no}
                                                            </span>
                                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                                                req.plant === 'KG' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                                                            }`}>
                                                                {req.plant}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-slate-400 block">
                                                            Tgl: {req.date}
                                                        </span>
                                                    </td>

                                                    {/* Departemen & Pemohon */}
                                                    <td className="p-3.5">
                                                        <span className="font-bold text-slate-900 block">
                                                            {req.department}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <UserCheck size={11} className="text-slate-400" />
                                                            {req.requester_name} ({req.requester_title || 'Staff'})
                                                        </span>
                                                    </td>

                                                    {/* Kategori SOP */}
                                                    <td className="p-3.5">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${catInfo.color}`}>
                                                            {catInfo.badge}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                                                            Form: {req.target_form || catInfo.form}
                                                        </span>
                                                    </td>

                                                    {/* Item & Spesifikasi */}
                                                    <td className="p-3.5 max-w-xs">
                                                        <span className="font-black text-slate-900 block truncate" title={req.item_name}>
                                                            {req.item_name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed" title={req.technical_specs}>
                                                            {req.technical_specs || 'Spek standar ICT'}
                                                        </span>
                                                        {req.justification && (
                                                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium mt-1 inline-block truncate max-w-xs" title={req.justification}>
                                                                Ref: {req.justification}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Estimasi Biaya & Target */}
                                                    <td className="p-3.5">
                                                        <span className="font-black text-slate-900 block text-sm">
                                                            {formatIDR(req.estimated_total_cost)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 block">
                                                            {req.qty} {req.unit || 'Unit'} @ {formatIDR(req.estimated_unit_price)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded mt-1 inline-block">
                                                            Thn {req.target_year} ({(req.target_month || 'jan').toUpperCase()})
                                                        </span>
                                                    </td>

                                                    {/* Status SOP */}
                                                    <td className="p-3.5">
                                                        {isApproved && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                <Check size={11} /> Disetujui Masuk Anggaran
                                                            </span>
                                                        )}
                                                        {isVerified && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
                                                                <UserCheck size={11} /> Diverifikasi ICT
                                                            </span>
                                                        )}
                                                        {!isApproved && !isVerified && !isRejected && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                                                <Clock size={11} /> Menunggu Review
                                                            </span>
                                                        )}
                                                        {isRejected && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                                                                <X size={11} /> Ditolak
                                                            </span>
                                                        )}

                                                        {req.review_notes && (
                                                            <span className="text-[10px] text-slate-500 block mt-1 italic line-clamp-1" title={req.review_notes}>
                                                                "{req.review_notes}"
                                                            </span>
                                                        )}

                                                        {req.signed_attachment && (
                                                            <a
                                                                href={req.signed_attachment}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 font-bold mt-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                                                                title={`Buka Berkas TTD: ${req.signed_attachment_name || 'Lampiran TTD'}`}
                                                            >
                                                                <Paperclip size={11} className="text-emerald-600" />
                                                                <span>Berkas TTD Terlampir</span>
                                                            </a>
                                                        )}
                                                    </td>

                                                    {/* Otorisasi & Aksi - Sticky Right */}
                                                    <td className="p-3.5 pr-5 text-right space-y-1.5 sticky right-0 bg-white/95 group-hover:bg-slate-50/95 transition-colors z-10 border-l border-slate-100 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)]">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Push to Budget Button */}
                                                            {!isApproved ? (
                                                                <button
                                                                    onClick={() => handleApproveDeptReqToBudget(req)}
                                                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                                                                    title="Setujui dan masukkan otomatis ke Anggaran Tahunan"
                                                                >
                                                                    <Sparkles size={13} />
                                                                    <span>Setujui ke Budget</span>
                                                                </button>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                                                                    <CheckCircle2 size={12} />
                                                                    <span>Tersinkron di {req.target_form || 'Budget'}</span>
                                                                </span>
                                                            )}

                                                            {/* Upload Berkas TTD Button */}
                                                            <button
                                                                onClick={() => handleUploadSignedDoc(req)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                                title="Upload Berkas Scan yang Sudah Ditandatangani Manual (PDF/Gambar)"
                                                            >
                                                                <Upload size={15} />
                                                            </button>

                                                            {/* Buka Berkas TTD jika ada */}
                                                            {req.signed_attachment && (
                                                                <a
                                                                    href={req.signed_attachment}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 transition-colors"
                                                                    title={`Buka Berkas TTD: ${req.signed_attachment_name || 'Lampiran'}`}
                                                                >
                                                                    <Paperclip size={15} />
                                                                </a>
                                                            )}

                                                            {/* Download PDF button */}
                                                            <button
                                                                onClick={() => handleDownloadReqPdf(req, 'download')}
                                                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                                                title="Download Formulir Resmi Terisi (PDF)"
                                                            >
                                                                <FileDown size={15} />
                                                            </button>

                                                            {/* Download Excel button */}
                                                            <button
                                                                onClick={() => handleDownloadReqExcel(req)}
                                                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                                                title="Download Formulir Resmi Terisi (Excel .xlsx)"
                                                            >
                                                                <FileSpreadsheet size={15} />
                                                            </button>

                                                            {/* Preview PDF button */}
                                                            <button
                                                                onClick={() => handleDownloadReqPdf(req, 'preview')}
                                                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                                                title="Preview Formulir PDF"
                                                            >
                                                                <Eye size={15} />
                                                            </button>

                                                            {/* Edit Button */}
                                                            <button
                                                                onClick={() => handleOpenEditDeptReq(req)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                title="Edit Pengajuan"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>

                                                            {/* Delete Button */}
                                                            <button
                                                                onClick={() => handleDeleteDeptReq(req)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                title="Hapus Pengajuan"
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
                </div>
            )}

            {/* Modal: Panduan SOP & Alur Otorisasi Permintaan ICT (Dipisahkan agar UI rapi & bersih) */}
            {sopGuideOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 my-8 animate-scaleUp text-slate-800">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                                        <FileText size={12} /> SOP {selectedPlant === 'KG' ? 'TCFKG-SOP-ICT-03' : 'TCFSG-SOP-ICT-03'}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                        Form Control: {selectedPlant === 'KG' ? 'TCFKG-FM-ICT-03-04' : 'TCFSG-FM-ICT-03-04'} (Rev 01)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        IATF 16949:2016 Klausul 7.1.3
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900">
                                    Panduan SOP & Alur Otorisasi Permintaan ICT
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Tata cara pengajuan kebutuhan fasilitas dan perencanaan anggaran teknologi informasi PT Tri Centrum Fortuna.
                                </p>
                            </div>
                            <button
                                onClick={() => setSopGuideOpen(false)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                            {/* Alur 5 Tahap Otorisasi */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Layers size={14} className="text-rose-600" />
                                    <span>Alur 5-Tahap Otorisasi Internal ICT</span>
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 relative">
                                        <div className="w-6 h-6 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center">1</div>
                                        <p className="text-xs font-black text-slate-900">User Pemohon</p>
                                        <p className="text-[11px] text-slate-500 leading-tight">Identifikasi spesifikasi kebutuhan & isi formulir (digital / cetak).</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 relative">
                                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">2</div>
                                        <p className="text-xs font-black text-slate-900">Dept Head User</p>
                                        <p className="text-[11px] text-slate-500 leading-tight">Review urgensi operasional & persetujuan departemen pemohon.</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 relative">
                                        <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center">3</div>
                                        <p className="text-xs font-black text-slate-900">Teknisi ICT</p>
                                        <p className="text-[11px] text-slate-500 leading-tight">Cek fisik perangkat eksisting, ketersediaan sparepart / stock gudang.</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 relative">
                                        <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-[11px] font-black flex items-center justify-center">4</div>
                                        <p className="text-xs font-black text-slate-900">SPV / Section Head</p>
                                        <p className="text-[11px] text-slate-500 leading-tight">Validasi kelayakan teknis, benchmark spesifikasi & estimasi harga.</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 relative">
                                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">5</div>
                                        <p className="text-xs font-black text-slate-900">Dept Head ICT</p>
                                        <p className="text-[11px] text-slate-500 leading-tight">Persetujuan final & pemetaan otomatis ke Rencana Anggaran (I-1/F1/F2).</p>
                                    </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="leading-relaxed">
                                        <b>Catatan Realisasi Pengadaan:</b> Otorisasi internal di atas adalah untuk tahap <i>Perencanaan Anggaran (Planning Budgeting)</i>. Persetujuan Direksi / Management Perusahaan tetap berlaku pada lembar resmi <i>Purchase Requisition (PR)</i> saat eksekusi pengadaan berjalan.
                                    </p>
                                </div>
                            </div>

                            {/* Klasifikasi Anggaran & Formulir */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Coins size={14} className="text-indigo-600" />
                                    <span>Klasifikasi Kebutuhan & Pemetaan Formulir</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-blue-900">Capex Unit Baru (Form I-1)</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">Investasi</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Penambahan armada komputer / laptop baru untuk staf baru, penambahan mesin lini produksi, atau ekspansi departemen.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-purple-900">Replacement Afkir (Form I-1)</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900">Siklus Hidup</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Penggantian unit komputer/laptop yang rusak total atau berusia lebih dari 5 tahun sesuai acuan IK-03-02 Standar Siklus Hidup Aset.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-amber-900">Upgrade Hardware (Form F2)</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">Opex Maintenance</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Peningkatan performa unit existing melalui upgrade RAM, migrasi HDD ke SSD NVMe, penggantian Power Supply, atau GPU render.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-emerald-900">Lisensi & AMC (Form F1)</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">Opex Software</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Perpanjangan lisensi SolidWorks CAD, ZWCAD, Microsoft 365, Antivirus terpusat, dan Annual Maintenance Contract (AMC) software bisnis.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Format Pengisian */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                                <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                                    <FileCheck size={14} className="text-emerald-600" />
                                    <span>Pilihan Pengajuan: Digital vs Cetak Manual</span>
                                </h4>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Departemen dapat mengajukan kebutuhan melalui dua cara resmi:
                                </p>
                                <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                                    <li><b>Pengajuan Digital (Disarankan):</b> Klik tombol <code>+ Buat Pengajuan Baru</code> di aplikasi. Data langsung tersimpan dan otomatis masuk ke antrean verifikasi ICT.</li>
                                    <li><b>Pengajuan Manual / Cetak Fisik:</b> Klik tombol <code>Form PDF</code> atau <code>Form Excel</code> untuk mengunduh template formulir kontrol guna penandatanganan fisik.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100 pt-4 mt-5 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownloadBlankPdf('download')}
                                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <FileDown size={14} className="text-emerald-600" />
                                    <span>Download Form Kosong (PDF)</span>
                                </button>
                                <button
                                    onClick={handleDownloadBlankExcel}
                                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <FileSpreadsheet size={14} className="text-teal-600" />
                                    <span>Download Form Kosong (Excel)</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setSopGuideOpen(false)}
                                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                                Tutup Panduan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Buat / Edit Formulir Permintaan Budget Departemen */}
            {deptModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                                        {selectedPlant === 'KG' ? 'TCFKG-FM-ICT-03-04' : 'TCFSG-FM-ICT-03-04'}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-mono">SOP TCFSG-SOP-ICT-03</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900">
                                    {editingDeptReq ? `Edit Pengajuan: ${editingDeptReq.req_no}` : 'Formulir Permintaan Fasilitas & Budget ICT'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Input kebutuhan perangkat, upgrade, software, atau infrastruktur dari departemen pemohon.
                                </p>
                            </div>
                            <button onClick={() => setDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveDeptReq} className="space-y-4">
                            {/* Grid Baris 1: Identitas Pemohon */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Departemen Pemohon *</label>
                                    <select
                                        required
                                        value={deptFormData.department}
                                        onChange={(e) => setDeptFormData({ ...deptFormData, department: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    >
                                        {DEPARTMENTS_LIST.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Plant / Lokasi Pabrik</label>
                                    <select
                                        value={deptFormData.plant}
                                        onChange={(e) => setDeptFormData({ ...deptFormData, plant: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    >
                                        <option value="SG">Sadang Plant (SG)</option>
                                        <option value="KG">Karawang Plant (KG)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Nama Lengkap Pemohon *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nama staf / penanggung jawab pengajuan"
                                        value={deptFormData.requester_name}
                                        onChange={(e) => setDeptFormData({ ...deptFormData, requester_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Jabatan / NIK Pemohon</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Section Head, Senior CAD Engineer, NIK: 2104..."
                                        value={deptFormData.requester_title}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const isHead = val.toUpperCase().includes('HEAD') || val.toUpperCase().includes('DEPT') || val.toUpperCase().includes('MANAGER');
                                            setDeptFormData(prev => ({
                                                ...prev,
                                                requester_title: val,
                                                dept_head_title: (!prev.dept_head_title || prev.dept_head_title === 'Dept Head' || prev.dept_head_title === 'Direktur')
                                                    ? (isHead ? 'Direktur' : 'Dept Head')
                                                    : prev.dept_head_title
                                            }));
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                        <span>Nama Atasan yang Mengetahui</span>
                                        <span className="text-[10px] text-slate-400 font-normal">(Direktur / Dept Head)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Nama Direktur / Atasan Langsung"
                                        value={deptFormData.dept_head_name || ''}
                                        onChange={(e) => setDeptFormData({ ...deptFormData, dept_head_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                        <span>Jabatan Atasan yang Mengetahui</span>
                                        <span className="text-[10px] text-rose-500 font-bold">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        list="dept-superior-titles"
                                        placeholder="Contoh: Direktur, Director, Plant Manager, Dept Head"
                                        value={deptFormData.dept_head_title || ''}
                                        onChange={(e) => setDeptFormData({ ...deptFormData, dept_head_title: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    />
                                    <datalist id="dept-superior-titles">
                                        <option value="Direktur" />
                                        <option value="Director" />
                                        <option value="Plant Manager" />
                                        <option value="General Manager" />
                                        <option value="Departement Head" />
                                        <option value="Section Head" />
                                    </datalist>
                                </div>
                            </div>

                            {/* Klasifikasi Kebutuhan */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Klasifikasi Kebutuhan ICT (Kategori SOP) *</label>
                                <select
                                    value={deptFormData.category}
                                    onChange={(e) => {
                                        const c = e.target.value;
                                        let defaultF = 'I-1';
                                        if (c === 'UPGRADE_HARDWARE') defaultF = 'F2';
                                        if (c === 'SOFTWARE_LICENSE') defaultF = 'F1';
                                        setDeptFormData({ ...deptFormData, category: c, target_form: defaultF });
                                    }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                >
                                    {REQUEST_CATEGORIES.map(c => (
                                        <option key={c.key} value={c.key}>{c.label} - {c.desc}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Rincian Item */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Nama Perangkat / Software / Komponen *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Workstation CAD Core i7, RAM 16GB DDR4, Lisensi SolidWorks Standard..."
                                    value={deptFormData.item_name}
                                    onChange={(e) => setDeptFormData({ ...deptFormData, item_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                />
                            </div>

                            {/* Qty, Satuan, Harga Satuan, Total */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Jumlah (Qty)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={deptFormData.qty}
                                        onChange={(e) => {
                                            const q = Number(e.target.value);
                                            setDeptFormData({
                                                ...deptFormData,
                                                qty: q,
                                                estimated_total_cost: q * Number(deptFormData.estimated_unit_price || 0)
                                            });
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Satuan</label>
                                    <input
                                        type="text"
                                        placeholder="Unit, Lisensi, Pcs..."
                                        value={deptFormData.unit}
                                        onChange={(e) => setDeptFormData({ ...deptFormData, unit: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Harga Satuan (IDR)</label>
                                    <input
                                        type="number"
                                        value={deptFormData.estimated_unit_price}
                                        onChange={(e) => {
                                            const p = Number(e.target.value);
                                            setDeptFormData({
                                                ...deptFormData,
                                                estimated_unit_price: p,
                                                estimated_total_cost: Number(deptFormData.qty || 1) * p
                                            });
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Total Biaya (IDR)</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={formatIDR(deptFormData.estimated_total_cost)}
                                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Target Alokasi Anggaran */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Target Tahun Anggaran</label>
                                    <select
                                        value={deptFormData.target_year}
                                        onChange={(e) => setDeptFormData({ ...deptFormData, target_year: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    >
                                        {availableYears.map(yr => (
                                            <option key={yr} value={yr}>Tahun {yr}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Bulan Kebutuhan</label>
                                    <select
                                        value={deptFormData.target_month}
                                        onChange={(e) => setDeptFormData({ ...deptFormData, target_month: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    >
                                        {MONTH_NAMES.map(m => (
                                            <option key={m.key} value={m.key}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Formulir Alokasi Budget</label>
                                    <select
                                        value={deptFormData.target_form}
                                        onChange={(e) => setDeptFormData({ ...deptFormData, target_form: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                    >
                                        <option value="I-1">I-1: Investment Asset (CAPEX)</option>
                                        <option value="F1">F1: Repair & Mtc (OPEX AMC)</option>
                                        <option value="F2">F2: Sparepart IT & Upgrade</option>
                                        <option value="H2">H2: Centralize Telco & IT</option>
                                    </select>
                                </div>
                            </div>

                            {/* Spesifikasi Teknis */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Spesifikasi Teknis yang Diperlukan</label>
                                <textarea
                                    rows="2"
                                    placeholder="Contoh: Processor Core i7, RAM 32GB DDR5, SSD 1TB NVMe, Dual Display 24 inch, Windows 11 Pro..."
                                    value={deptFormData.technical_specs}
                                    onChange={(e) => setDeptFormData({ ...deptFormData, technical_specs: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                />
                            </div>

                            {/* Justifikasi Kebutuhan */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Justifikasi Kebutuhan & Dampak Operasional *</label>
                                <textarea
                                    rows="2"
                                    required
                                    placeholder="Jelaskan tujuan penggunaan, user/line terkait, software yang dijalankan, dan dampak bila tidak dipenuhi..."
                                    value={deptFormData.justification}
                                    onChange={(e) => setDeptFormData({ ...deptFormData, justification: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                />
                            </div>

                            {/* Catatan Verifikasi ICT & Status (Jika Edit) */}
                            {editingDeptReq && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">Catatan Verifikasi Tim ICT</label>
                                        <input
                                            type="text"
                                            placeholder="Catatan evaluasi teknis..."
                                            value={deptFormData.review_notes || ''}
                                            onChange={(e) => setDeptFormData({ ...deptFormData, review_notes: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">Status Pengajuan SOP</label>
                                        <select
                                            value={deptFormData.status}
                                            onChange={(e) => setDeptFormData({ ...deptFormData, status: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                        >
                                            <option value="SUBMITTED">SUBMITTED (Menunggu Review)</option>
                                            <option value="VERIFIED_ICT">VERIFIED_ICT (Diverifikasi Tim ICT)</option>
                                            <option value="APPROVED_TO_BUDGET">APPROVED_TO_BUDGET (Disetujui)</option>
                                            <option value="REJECTED">REJECTED (Ditolak)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* File Lampiran Form Tertandatangan (Scan/Foto/PDF) */}
                            <div className="pt-3 border-t border-slate-100 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Paperclip size={13} className="text-emerald-600" />
                                        <span>File Lampiran Form Tertandatangan Lengkap (PDF / Scan)</span>
                                    </label>
                                    {deptFormData.signed_attachment && (
                                        <a
                                            href={deptFormData.signed_attachment}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-600 hover:underline text-[11px] font-bold"
                                        >
                                            Lihat File Saat Ini ({deptFormData.signed_attachment_name || 'Lampiran'})
                                        </a>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept="application/pdf,image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const uploadFormData = new FormData();
                                            uploadFormData.append('file', file);
                                            try {
                                                Swal.fire({
                                                    title: 'Mengunggah...',
                                                    text: `Mengunggah ${file.name}...`,
                                                    allowOutsideClick: false,
                                                    didOpen: () => Swal.showLoading()
                                                });
                                                const uploadRes = await axios.post('/api/upload', uploadFormData, {
                                                    headers: { 'Content-Type': 'multipart/form-data' }
                                                });
                                                if (uploadRes.data && uploadRes.data.url) {
                                                    setDeptFormData({
                                                        ...deptFormData,
                                                        signed_attachment: uploadRes.data.url,
                                                        signed_attachment_name: file.name
                                                    });
                                                    Swal.fire({
                                                        icon: 'success',
                                                        title: 'Terunggah',
                                                        text: 'File lampiran berhasil diunggah.',
                                                        timer: 1500,
                                                        showConfirmButton: false
                                                    });
                                                }
                                            } catch (err) {
                                                Swal.fire('Error Upload', err.message, 'error');
                                            }
                                        }}
                                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                    />
                                    {deptFormData.signed_attachment && (
                                        <button
                                            type="button"
                                            onClick={() => setDeptFormData({ ...deptFormData, signed_attachment: null, signed_attachment_name: '' })}
                                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 font-bold shrink-0"
                                            title="Hapus Lampiran"
                                        >
                                            Hapus
                                        </button>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-400 block italic">
                                    *Upload file hasil scan formulir yang telah ditandatangani basah lengkap (User, Dept Head User, Teknisi, SPV, Dept Head ICT).
                                </span>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setDeptModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
                                >
                                    {editingDeptReq ? 'Simpan Perubahan' : 'Kirim Pengajuan Kebutuhan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Tambah / Edit Budget Item */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    {editingItem ? `Edit Item Budget ${year}` : `Tambah Item Budget Baru (${year})`}
                                </h3>
                                <p className="text-xs text-slate-500">Perbarui rincian, alokasi bulanan, dan dokumen ISO pendukung.</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveItem} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Nama Item / Spesifikasi *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Mini PC Core i5, SSD NVMe 1TB..."
                                        value={formData.item_name}
                                        onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Formulir Standard TCF</label>
                                    <select
                                        value={formData.form}
                                        onChange={(e) => {
                                            const f = e.target.value;
                                            let cat = 'CAPEX';
                                            if (f === 'F1') cat = 'MAINTENANCE';
                                            if (f === 'F2') cat = 'SPAREPART';
                                            if (f === 'G-3') cat = 'RICOH_PRINT';
                                            if (f === 'H2') cat = 'CENTRALIZE';
                                            if (f === 'D2') cat = 'TRAINING';
                                            setFormData({ ...formData, form: f, category: cat });
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                    >
                                        <option value="I-1">I-1: Investment Asset Budget (CAPEX)</option>
                                        <option value="F1">F1: Repair & Maintenance Budget (OPEX)</option>
                                        <option value="F2">F2: Budget of Spare Part Usage (OPEX)</option>
                                        <option value="G-3">G-3: Stationary & Fotocopy Ricoh (OPEX)</option>
                                        <option value="H2">H2: Centralize Expense IT & Telco</option>
                                        <option value="D2">D2: Budget Related to Training</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Plant / Lokasi Pabrik</label>
                                    <select
                                        value={formData.plant}
                                        onChange={(e) => setFormData({ ...formData, plant: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                    >
                                        <option value="KG">Karawang Plant (KG)</option>
                                        <option value="SG">Sadang Plant (SG)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Type Asset TCF</label>
                                    <select
                                        value={formData.type_asset}
                                        onChange={(e) => setFormData({ ...formData, type_asset: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                    >
                                        <option value="1">1 = Replacement (Penggantian)</option>
                                        <option value="2">2 = Rationalization (Rasionalisasi)</option>
                                        <option value="3">3 = Expansion (Perluasan/Tambahan Baru)</option>
                                        <option value="4">4 = Improvement (Peningkatan)</option>
                                        <option value="5">5 = Social & Safety</option>
                                        <option value="6">6 = Environment</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Harga Satuan (IDR)</label>
                                    <input
                                        type="number"
                                        value={formData.unit_price}
                                        onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Estimasi Kuantitas (Qty)</label>
                                    <input
                                        type="number"
                                        value={formData.qty}
                                        onChange={(e) => setFormData({ ...formData, qty: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Monthly Distribution Box */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-amber-500" />
                                        <span className="text-xs font-black text-slate-900">Alokasi Biaya Bulanan (Jan - Des {year})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleDistributeEqually}
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                        >
                                            Bagi Rata (1/12)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDistributeQ1}
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                        >
                                            All Q1 (Jan)
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {MONTH_NAMES.map(m => (
                                        <div key={m.key} className="space-y-0.5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{m.label}</span>
                                            <input
                                                type="number"
                                                value={formData.monthly[m.key] || ''}
                                                onChange={(e) => handleMonthlyChange(m.key, e.target.value)}
                                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-600">Total Akumulasi Setahun:</span>
                                    <span className="font-black text-slate-900 text-sm">
                                        {formatIDR(formData.total_amount)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Catatan / Justifikasi Budget</label>
                                <textarea
                                    rows={2}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Alasan pengadaan atau rencana implementasi..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                                >
                                    Simpan Item Budget
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Proyeksi Otomatis */}
            {simModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles size={20} className="text-amber-500" />
                                <h3 className="text-base font-black text-slate-900">Proyeksi Otomatis Anggaran {year}</h3>
                            </div>
                            <button onClick={() => setSimModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Fitur ini akan menyesuaikan data rencana Tahun {year} dengan mengacu pada baseline tahun yang dipilih secara serentak.
                            </p>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Tahun Acuan (Source):</label>
                                <select
                                    value={simSourceYear}
                                    onChange={(e) => setSimSourceYear(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {availableYears.filter(y => y !== year).map(y => (
                                        <option key={y} value={y}>Tahun {y}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-700">Persentase Penyesuaian:</span>
                                    <span className="text-amber-600 text-base font-black">+{simPct}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="25"
                                    step="1"
                                    value={simPct}
                                    onChange={(e) => setSimPct(Number(e.target.value))}
                                    className="w-full accent-amber-500 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                    <span>0% (Sama Persis)</span>
                                    <span>+5% (Standard)</span>
                                    <span>+10% (Ekspansi)</span>
                                    <span>+25% (Besar)</span>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2">
                                <HelpCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                                <span>Setelah proyeksi diterapkan, Anda tetap dapat mengedit setiap item dan alokasi bulanan secara bebas.</span>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setSimModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleApplySimulation}
                                    className="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                                >
                                    Terapkan ke Tahun {year}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Buat Tahun Anggaran Baru */}
            {newYearModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <CalendarPlus size={20} className="text-amber-500" />
                                <h3 className="text-base font-black text-slate-900">Buat Tahun Anggaran Baru</h3>
                            </div>
                            <button onClick={() => setNewYearModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Siapkan dokumen dan rancangan anggaran untuk tahun mendatang (misal: 2028, 2029, dll) dengan mengkloning dari tahun acuan.
                            </p>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Tahun Anggaran Baru *</label>
                                <input
                                    type="number"
                                    min="2024"
                                    max="2040"
                                    value={newYearTarget}
                                    onChange={(e) => setNewYearTarget(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Kloning Dari Tahun Acuan:</label>
                                <select
                                    value={newYearSource}
                                    onChange={(e) => setNewYearSource(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>Tahun {y}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Penyesuaian Nilai Default (%):</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={newYearGrowth}
                                        onChange={(e) => setNewYearGrowth(Number(e.target.value))}
                                        className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                    <span className="text-xs text-slate-500 font-medium">Contoh: +5% untuk penyesuaian inflasi tahunan</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    onClick={() => setNewYearModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleCreateNewYear}
                                    className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
                                >
                                    Buat Rencana {newYearTarget}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Tambah / Edit Software & AMC */}
            {softwareModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                                    <KeyRound size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        {editingSoftware ? 'Edit Lisensi Software' : 'Pendaftaran Software & Lisensi Baru'}
                                    </h3>
                                    <p className="text-xs text-slate-500">Kelola jadwal aktivasi, masa kadaluarsa, dan kontrak maintenance tahunan.</p>
                                </div>
                            </div>
                            <button onClick={() => setSoftwareModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSoftware} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Nama Software *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: SolidWorks 2026 Premium, ZWCAD..."
                                        value={softwareFormData.name}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Kategori Lisensi</label>
                                    <select
                                        value={softwareFormData.category}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    >
                                        <option value="CAD / Engineering">CAD / Engineering (SolidWorks, ZWCAD)</option>
                                        <option value="Office & Productivity">Office & Productivity (M365, Office)</option>
                                        <option value="Security & Antivirus">Security & Antivirus (Kaspersky, EDR)</option>
                                        <option value="ERP & Enterprise System">ERP & Enterprise (Adempiere, SAP)</option>
                                        <option value="Operating System">Operating System (Windows 11 Pro OLP)</option>
                                        <option value="IT Infrastructure & Backup">IT Infra & Backup (Veeam, Synology)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Vendor / Distributor</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: PT Aplikanusa, PT Microdata..."
                                        value={softwareFormData.vendor}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, vendor: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Plant / Cakupan</label>
                                    <select
                                        value={softwareFormData.plant}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, plant: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    >
                                        <option value="SG">Plant Sadang (SG)</option>
                                        <option value="KG">Plant Karawang (KG)</option>
                                        <option value="ALL">Seluruh Plant TCF (SG + KG)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Departemen Pengguna</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: ENGINEERING, ICT, FINANCE..."
                                        value={softwareFormData.department}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, department: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Jumlah Seat / Lisensi</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={softwareFormData.seats_qty}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, seats_qty: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Tanggal Pembelian</label>
                                    <input
                                        type="date"
                                        value={softwareFormData.purchase_date}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, purchase_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Biaya Pembelian Awal (IDR)</label>
                                    <input
                                        type="number"
                                        value={softwareFormData.purchase_cost}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, purchase_cost: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Tanggal Pemasangan / Aktivasi</label>
                                    <input
                                        type="date"
                                        value={softwareFormData.install_date}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, install_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">Tanggal Expired / Perpanjangan</label>
                                    <input
                                        type="text"
                                        placeholder="YYYY-MM-DD atau 'Perpetual'"
                                        value={softwareFormData.expiry_date}
                                        onChange={(e) => setSoftwareFormData({ ...softwareFormData, expiry_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Annual Maintenance Contract (AMC) Box */}
                            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-amber-600" />
                                    <span className="text-xs font-black text-slate-900">Jadwal Biaya Pemeliharaan Tahunan (Annual Maintenance / AMC)</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-700">Biaya AMC Tahunan (IDR)</label>
                                        <input
                                            type="number"
                                            value={softwareFormData.annual_maintenance_cost}
                                            onChange={(e) => setSoftwareFormData({ ...softwareFormData, annual_maintenance_cost: Number(e.target.value) })}
                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-700">Jatuh Tempo Pembayaran</label>
                                        <input
                                            type="date"
                                            value={softwareFormData.maintenance_payment_date}
                                            onChange={(e) => setSoftwareFormData({ ...softwareFormData, maintenance_payment_date: e.target.value })}
                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-700">Bulan Alokasi Budget</label>
                                        <select
                                            value={softwareFormData.renewal_month}
                                            onChange={(e) => setSoftwareFormData({ ...softwareFormData, renewal_month: e.target.value })}
                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            {MONTH_NAMES.map(m => (
                                                <option key={m.key} value={m.key}>{m.label} ({m.key.toUpperCase()})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1 text-[11px] text-amber-800">
                                    <ShieldCheck size={14} className="shrink-0" />
                                    <span>Formulir Target: <b>F1: Repair & Maintenance Budget (OPEX)</b></span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700">Catatan / Serial Number / No Kontrak</label>
                                <textarea
                                    rows={2}
                                    value={softwareFormData.notes}
                                    onChange={(e) => setSoftwareFormData({ ...softwareFormData, notes: e.target.value })}
                                    placeholder="Nomor kontrak, serial number, atau detail lingkup pemeliharaan..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSoftwareModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                                >
                                    Simpan Data Software
                                </button>
                            </div>
                            </form>
                        </div>
                    </div>
            )}

            {/* Modal: Detail Spesifikasi & Audit Kepatuhan ISO */}
            {specModalOpen && selectedAssetDetail && (
                <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 my-8 overflow-hidden animate-scaleUp">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                                            {selectedAssetDetail.category || 'Desktop PC'}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                            selectedAssetDetail.plant === 'KG' ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
                                        }`}>
                                            Plant {selectedAssetDetail.plant}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            No. Inv: {selectedAssetDetail.inventory_number || '-'}
                                        </span>
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                        {selectedAssetDetail.name}
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-1">
                                        Pengguna: <b className="text-white">{selectedAssetDetail.user_name || '-'}</b> | Departemen: <b className="text-white">{selectedAssetDetail.department || '-'}</b>
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSpecModalOpen(false)} 
                                    className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Tabs */}
                            <div className="flex items-center gap-2 mt-6 border-b border-slate-700/60 pb-1">
                                <button
                                    onClick={() => setSpecDetailTab('AUDIT')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                        specDetailTab === 'AUDIT'
                                            ? 'bg-amber-500 text-slate-950 shadow-md'
                                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <ShieldCheck size={14} />
                                    <span>Audit Kepatuhan ISO & Alasan Penggantian</span>
                                    {selectedAssetDetail.assessment?.status !== 'COMPLIANT' && (
                                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setSpecDetailTab('SPECS')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                        specDetailTab === 'SPECS'
                                            ? 'bg-amber-500 text-slate-950 shadow-md'
                                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Cpu size={14} />
                                    <span>Detail Lengkap Spesifikasi Hardware</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-6">
                            {specDetailTab === 'AUDIT' ? (
                                <div className="space-y-6 animate-fadeIn">
                                    {/* Status Recommendation Banner */}
                                    <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                        selectedAssetDetail.assessment?.status === 'COMPLIANT'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                            : selectedAssetDetail.assessment?.status === 'REPLACE_UNIT'
                                                ? 'bg-red-50 border-red-200 text-red-950'
                                                : 'bg-amber-50 border-amber-200 text-amber-950'
                                    }`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2.5 rounded-xl shrink-0 ${
                                                selectedAssetDetail.assessment?.status === 'COMPLIANT'
                                                    ? 'bg-emerald-600 text-white'
                                                    : selectedAssetDetail.assessment?.status === 'REPLACE_UNIT'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-amber-500 text-slate-950'
                                            }`}>
                                                {selectedAssetDetail.assessment?.status === 'COMPLIANT' ? (
                                                    <CheckCircle2 size={24} />
                                                ) : selectedAssetDetail.assessment?.status === 'REPLACE_UNIT' ? (
                                                    <AlertTriangle size={24} />
                                                ) : (
                                                    <Zap size={24} />
                                                )}
                                            </div>
                                            <div>
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                    selectedAssetDetail.assessment?.status === 'COMPLIANT'
                                                        ? 'bg-emerald-200 text-emerald-900'
                                                        : selectedAssetDetail.assessment?.status === 'REPLACE_UNIT'
                                                            ? 'bg-red-200 text-red-900'
                                                            : 'bg-amber-200 text-amber-900'
                                                }`}>
                                                    {selectedAssetDetail.assessment?.status_label || selectedAssetDetail.assessment?.status}
                                                </span>
                                                <h4 className="text-base font-black mt-1">
                                                    {selectedAssetDetail.assessment?.recommendation}
                                                </h4>
                                                <p className="text-xs text-slate-600 mt-1">
                                                    Acuan Standar: <b className="text-slate-800">{selectedAssetDetail.assessment?.standard_rule}</b>
                                                </p>
                                            </div>
                                        </div>

                                        {selectedAssetDetail.assessment?.estimated_cost > 0 && (
                                            <div className="sm:text-right shrink-0 bg-white/90 p-3.5 rounded-2xl border border-black/5 shadow-sm">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase block">Estimasi Anggaran Diusulkan</span>
                                                <span className="text-xl font-black text-slate-900">
                                                    {formatIDR(selectedAssetDetail.assessment.estimated_cost)}
                                                </span>
                                                <span className="text-[10px] font-bold text-indigo-700 block mt-0.5">
                                                    Formulir {selectedAssetDetail.assessment.target_form} ({selectedAssetDetail.assessment.category})
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Specs At-A-Glance Bar */}
                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                <Cpu size={14} className="text-indigo-600" />
                                                <span className="font-mono text-slate-900 font-black">{selectedAssetDetail.specs?.cpu || 'CPU N/A'}</span>
                                            </div>
                                            <span className="text-slate-300">|</span>
                                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                <Zap size={14} className="text-emerald-600" />
                                                <span>RAM:</span>
                                                <span className="font-black text-slate-900">{selectedAssetDetail.specs?.ram || `${selectedAssetDetail.specs?.ramGb || 8} GB`}</span>
                                            </div>
                                            <span className="text-slate-300">|</span>
                                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                <HardDrive size={14} className="text-amber-600" />
                                                <span>Drive:</span>
                                                <span className="font-black text-slate-900">{selectedAssetDetail.specs?.storage_summary || selectedAssetDetail.specs?.storage || 'SSD'}</span>
                                            </div>
                                            <span className="text-slate-300">|</span>
                                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                <Clock size={14} className="text-blue-600" />
                                                <span>Usia:</span>
                                                <span className="font-black text-slate-900">{selectedAssetDetail.specs?.age || 0} Tahun</span>
                                                <span className="text-slate-400 text-[11px] font-normal">(Thn {selectedAssetDetail.specs?.purchaseYear || '-'})</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSpecDetailTab('SPECS')}
                                            className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 group/speklink"
                                        >
                                            <span>Lihat Spek Lengkap</span>
                                            <ChevronRight size={13} className="group-hover/speklink:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>

                                    {/* 4 Pilar Kepatuhan Standar ISO Table */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                                <ShieldCheck size={14} className="text-indigo-600" />
                                                Hasil Audit 4 Pilar Standar ISO PT TCF ({selectedAssetDetail.assessment?.doc_standard})
                                            </h4>
                                            <span className="text-[11px] text-slate-400 font-mono">
                                                Acuan: TCF-SOP-ICT-04 & IK-ICT-01
                                            </span>
                                        </div>

                                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200">
                                                    <tr>
                                                        <th className="p-3 w-44">Pilar Standar</th>
                                                        <th className="p-3 w-40">Ambang Batas ISO</th>
                                                        <th className="p-3 w-36">Kondisi Saat Ini</th>
                                                        <th className="p-3 w-28 text-center">Status Audit</th>
                                                        <th className="p-3">Analisis Teknis & Dampak</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(selectedAssetDetail.assessment?.compliance_checks || []).map((chk, ci) => (
                                                        <tr key={ci} className={chk.passed ? 'bg-white' : 'bg-red-50/40'}>
                                                            <td className="p-3 font-bold text-slate-800">
                                                                {chk.pillar}
                                                            </td>
                                                            <td className="p-3 text-slate-600 font-medium">
                                                                {chk.rule}
                                                            </td>
                                                            <td className="p-3 font-black text-slate-900">
                                                                {chk.current}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                                    chk.passed 
                                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                                                        : 'bg-red-100 text-red-800 border border-red-300'
                                                                }`}>
                                                                    {chk.passed ? <Check size={11} /> : <X size={11} />}
                                                                    {chk.passed ? 'LULUS' : 'TIDAK LOLOS'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-slate-600 leading-relaxed text-[11px]">
                                                                {chk.details}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Detailed Justification Box */}
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                                            <FileText size={16} className="text-amber-500" />
                                            <span>Justifikasi Teknis & Alasan Penggantian (Untuk Pengajuan Budget)</span>
                                        </div>
                                        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium bg-white p-4 rounded-xl border border-slate-200/80">
                                            {selectedAssetDetail.assessment?.detailed_justification || selectedAssetDetail.assessment?.recommendation}
                                        </div>

                                        {/* Technical Failure Risks */}
                                        {selectedAssetDetail.assessment?.technical_risks?.length > 0 && (
                                            <div className="pt-2">
                                                <span className="text-[11px] font-black uppercase text-red-800 tracking-wider flex items-center gap-1.5 mb-2">
                                                    <AlertTriangle size={13} className="text-red-600" />
                                                    Daftar Risiko Kegagalan Operasional (Jika Tidak Dianggarkan):
                                                </span>
                                                <ul className="space-y-1.5">
                                                    {selectedAssetDetail.assessment.technical_risks.map((risk, ri) => (
                                                        <li key={ri} className="text-xs text-red-950 flex items-start gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200/70 font-medium">
                                                            <span className="text-red-600 font-bold leading-tight">•</span>
                                                            <span>{risk}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Tab: Detailed Specs */
                                <div className="space-y-6 animate-fadeIn">
                                    {/* Evaluation Summary Quick Bar */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100">
                                        <div className="flex items-center gap-2 text-xs">
                                            <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                                            <span className="text-slate-700">
                                                Status Evaluasi ISO: <b className="text-slate-900">{selectedAssetDetail.assessment?.status_label || selectedAssetDetail.assessment?.status}</b>
                                            </span>
                                            {selectedAssetDetail.assessment?.estimated_cost > 0 && (
                                                <span className="text-indigo-900 font-black">
                                                    ({formatIDR(selectedAssetDetail.assessment.estimated_cost)} - {selectedAssetDetail.assessment?.target_form})
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setSpecDetailTab('AUDIT')}
                                            className="text-xs font-black text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 shrink-0"
                                        >
                                            <span>Lihat Kajian Alasan Penggantian</span>
                                            <ChevronRight size={13} />
                                        </button>
                                    </div>

                                    {/* 4 Primary Component Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* CPU Card */}
                                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-black text-indigo-900">
                                                <Cpu size={16} className="text-indigo-600" />
                                                <span>Processor (CPU)</span>
                                            </div>
                                            <p className="text-sm font-black text-slate-900">
                                                {selectedAssetDetail.specs?.cpu || 'CPU Tidak Terdeteksi'}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Arsitektur: {selectedAssetDetail.specs?.cpu?.includes('i7') || selectedAssetDetail.specs?.cpu?.includes('i5') ? 'Generasi Menengah/Tinggi' : 'Low-Tier / Arsitektur Lawas'}
                                            </p>
                                        </div>

                                        {/* RAM Card */}
                                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
                                                <Zap size={16} className="text-emerald-600" />
                                                <span>Memory RAM</span>
                                            </div>
                                            <p className="text-sm font-black text-slate-900">
                                                {selectedAssetDetail.specs?.ram || `${selectedAssetDetail.specs?.ramGb || 8} GB`}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Kapasitas Terukur: <b className="text-slate-800">{selectedAssetDetail.specs?.ramGb || 8} GB</b>
                                            </p>
                                        </div>

                                        {/* Storage Card */}
                                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                                                <HardDrive size={16} className="text-amber-600" />
                                                <span>Media Penyimpanan (Storage)</span>
                                            </div>
                                            <p className="text-sm font-black text-slate-900">
                                                {selectedAssetDetail.specs?.storage_summary || selectedAssetDetail.specs?.storage || 'SSD 256GB'}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Tipe: <b className={selectedAssetDetail.specs?.isSsd ? 'text-emerald-700' : 'text-amber-700'}>
                                                    {selectedAssetDetail.specs?.isSsd ? 'Solid State Drive (SSD)' : 'HDD Mechanical (Perlu Migrasi)'}
                                                </b>
                                            </p>
                                        </div>

                                        {/* OS Card */}
                                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-black text-blue-900">
                                                <Monitor size={16} className="text-blue-600" />
                                                <span>Sistem Operasi</span>
                                            </div>
                                            <p className="text-sm font-black text-slate-900">
                                                {selectedAssetDetail.specs?.os || 'Windows 10/11 Pro'}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Build: {selectedAssetDetail.specs?.os_version || 'Official Corporate License'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Identity Details */}
                                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                            Identitas Perangkat & Periferal
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Tahun Perolehan</span>
                                                <span className="font-black text-slate-900">{selectedAssetDetail.specs?.purchaseYear || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Umur Pemakaian</span>
                                                <span className="font-black text-slate-900">{selectedAssetDetail.specs?.age || 0} Tahun</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Merk / Pabrikan</span>
                                                <span className="font-bold text-slate-900">{selectedAssetDetail.specs?.manufacturer || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Model Seri</span>
                                                <span className="font-bold text-slate-900">{selectedAssetDetail.specs?.model || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Serial Number</span>
                                                <span className="font-mono text-slate-900">{selectedAssetDetail.specs?.serial_number || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">MAC Address</span>
                                                <span className="font-mono text-slate-900 truncate block" title={Array.isArray(selectedAssetDetail.specs?.mac_addresses) ? selectedAssetDetail.specs.mac_addresses.join(', ') : selectedAssetDetail.specs?.mac_addresses}>
                                                    {Array.isArray(selectedAssetDetail.specs?.mac_addresses) ? selectedAssetDetail.specs.mac_addresses.join(', ') : selectedAssetDetail.specs?.mac_addresses || '-'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Peripherals if available */}
                                        {((selectedAssetDetail.specs?.monitors && selectedAssetDetail.specs.monitors.length > 0) || 
                                          (selectedAssetDetail.specs?.printers && selectedAssetDetail.specs.printers.length > 0)) && (
                                            <div className="pt-3 border-t border-slate-100">
                                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-2">
                                                    Periferal Display & Printer Terhubung:
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                    {selectedAssetDetail.specs?.monitors?.length > 0 && (
                                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                            <span className="text-[10px] text-slate-500 font-bold block mb-1">Display / Monitor</span>
                                                            <ul className="list-disc list-inside space-y-0.5 text-slate-800 font-medium">
                                                                {selectedAssetDetail.specs.monitors.map((m, mi) => (
                                                                    <li key={mi} className="truncate">{m}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {selectedAssetDetail.specs?.printers?.length > 0 && (
                                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                            <span className="text-[10px] text-slate-500 font-bold block mb-1">Printer Terdaftar</span>
                                                            <ul className="list-disc list-inside space-y-0.5 text-slate-800 font-medium">
                                                                {selectedAssetDetail.specs.printers.map((p, pi) => (
                                                                    <li key={pi} className="truncate">{p}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Installed Software if available */}
                                        {selectedAssetDetail.specs?.installed_software && selectedAssetDetail.specs.installed_software.length > 0 && (
                                            <div className="pt-3 border-t border-slate-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                                                        Software Utama Terinstal (Agent Sync):
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                        {selectedAssetDetail.specs.installed_software.length} Software
                                                    </span>
                                                </div>
                                                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100 text-xs">
                                                    {selectedAssetDetail.specs.installed_software.map((sw, swi) => (
                                                        <div key={swi} className="p-2 flex items-center justify-between hover:bg-slate-50">
                                                            <div className="truncate mr-2">
                                                                <span className="font-bold text-slate-800 block truncate">{sw.name}</span>
                                                                <span className="text-[10px] text-slate-400">{sw.publisher || 'Verified Publisher'}</span>
                                                            </div>
                                                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                                                                v{sw.version || '1.0'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {selectedAssetDetail.specs?.raw_spec_text && (
                                            <div className="pt-3 border-t border-slate-100">
                                                <span className="text-slate-400 block text-[10px] mb-1 font-bold">Catatan Spesifikasi Asli (Asset DB):</span>
                                                <pre className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-800 font-mono whitespace-pre-wrap">
                                                    {selectedAssetDetail.specs.raw_spec_text}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setSpecModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Tutup
                            </button>

                            <div className="flex items-center gap-2">
                                {selectedAssetDetail.assessment?.status !== 'COMPLIANT' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSpecModalOpen(false);
                                            handlePushHardwareToBudget(selectedAssetDetail);
                                        }}
                                        className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
                                            selectedAssetDetail.assessment?.status === 'REPLACE_UNIT'
                                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                                        }`}
                                    >
                                        <Plus size={15} />
                                        <span>Ajukan ke Rencana Anggaran {year}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

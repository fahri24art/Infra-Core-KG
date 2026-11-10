import React, { useState } from 'react';
import { 
    Calendar, Package, AlertCircle, CheckCircle2, Clock, Search, 
    Filter, Plus, Wrench, Eye, X, Image as ImageIcon, MapPin, 
    FileText, Download, DollarSign, Tag, Layers, Settings, ArrowRight, Check,
    Trash2, Edit, Cpu, HelpCircle, HardDrive
} from 'lucide-react';

// ==================== INITIAL DUMMY DATA ====================

const initialSchedules = [
    { 
        id: "1", 
        preventive_id: "PREV651170", 
        category: "3 Month", 
        maintenance_type: "Specific", 
        date: "2024-12-22", 
        machine_no: "P.S-01", 
        machine_name: "AIDA 200 TON", 
        area_name: "Machine (MTN)",
        department: "Maintenance & Engineering",
        status: "Overdue",
        item_checks: [
            { id: "c1", item_name: "Clearance Clutch & Brake", method: "Visual & Dial Gauge", standard: "1.5mm - 2.0mm", spare_part: "Brake Lining AIDA", action: "Adjustment & Cleaning", sop_doc: "SOP-Mtn-Aida-01.pdf" },
            { id: "c2", item_name: "Slide Guide Lubrication", method: "Visual Inspection", standard: "Grease film must be evenly distributed", spare_part: "Grease Shell Gadus S2", action: "Refill Lubricant Reservoir", sop_doc: "SOP-Mtn-Aida-02.pdf" },
            { id: "c3", item_name: "Emergency Stop Button Function", method: "Functional Test", standard: "Immediate press-stop response", spare_part: "None", action: "Test & Verification", sop_doc: "SOP-Mtn-Safety-09.pdf" }
        ]
    },
    { 
        id: "2", 
        preventive_id: "PREV752422", 
        category: "6 Month", 
        maintenance_type: "Interval", 
        date: "2025-01-16", 
        machine_no: "test-machine", 
        machine_name: "machine-x", 
        area_name: "Machine",
        department: "Production",
        status: "Overdue",
        item_checks: [
            { id: "c4", item_name: "Motor Temperature", method: "Thermal Gun", standard: "< 65°C", spare_part: "None", action: "Monitoring & Log", sop_doc: "SOP-Mtn-Temp-02.pdf" },
            { id: "c5", item_name: "Belt Tension", method: "Tension Meter", standard: "80Hz - 90Hz", spare_part: "V-Belt Type B", action: "Tightening", sop_doc: "SOP-Mtn-Belt-01.pdf" }
        ]
    },
    { 
        id: "3", 
        preventive_id: "PREV952700", 
        category: "Monthly", 
        maintenance_type: "Specific", 
        date: "2025-02-11", 
        machine_no: "test-machine", 
        machine_name: "machine-x", 
        area_name: "Machine",
        department: "Production",
        status: "Overdue",
        item_checks: [
            { id: "c6", item_name: "Daily General Cleaning", method: "Visual", standard: "Clean & free of debris", spare_part: "None", action: "Wipe down", sop_doc: "SOP-Mtn-Clean-01.pdf" }
        ]
    },
    { 
        id: "4", 
        preventive_id: "PREV724421", 
        category: "Monthly", 
        maintenance_type: "Specific", 
        date: "2025-02-19", 
        machine_no: "B.8-2", 
        machine_name: "KOMATSU 150 TON", 
        area_name: "Machine (MTN)",
        department: "Maintenance & Engineering",
        status: "Overdue",
        item_checks: [
            { id: "c7", item_name: "Hydraulic Oil Pressure", method: "Pressure Gauge", standard: "140 - 150 Bar", spare_part: "Hydraulic Oil ISO VG 46", action: "Top-up & Adjust Valve", sop_doc: "SOP-Mtn-Komatsu-03.pdf" },
            { id: "c8", item_name: "Limit Switch Safety", method: "Manual Trigger Test", standard: "Auto-reverse on contact", spare_part: "Omron Limit Switch WLCA2", action: "Clean contacts & test", sop_doc: "SOP-Mtn-Safety-04.pdf" }
        ]
    }
];

const initialSpareParts = [
    { 
        id: "1", 
        item_code: "KQ2H12-04AS", 
        part_no: "3 A",
        part_name: "Fitting Tubing Lurus", 
        stock: 16, 
        minimum_stock: 5, 
        brand: "SMC", 
        specification: "Ø12mm-3/8\"", 
        category: "TUBING", 
        location: "Rak A (Tubing)", 
        uom: "Pcs",
        vendor: "SMC Pneumatics Indonesia",
        cost: 45000,
        maintenance_rate: 1,
        description: "Fitting lurus untuk menyambungkan tubing angin ukuran 12mm ke drat mesin ukuran 3/8 inch.",
        remark: "Digunakan di hampir semua mesin stamping AIDA & YADON.",
        part_image: "KQ2H12-04AS.jpg",
        drawing_image: "KQ2H12_Drawing.png"
    },
    { 
        id: "2", 
        item_code: "VZW4120", 
        part_no: "12 B",
        part_name: "Solenoid Valve 2 Port", 
        stock: 2, 
        minimum_stock: 5, 
        brand: "SMC", 
        specification: "24V DC", 
        category: "VALVE", 
        location: "Rak B (Valve)", 
        uom: "Pcs",
        vendor: "Putra Sejahtera Teknik",
        cost: 480000,
        maintenance_rate: 3,
        description: "Klep solenoid pneumatik 2 arah bertegangan 24V DC untuk kontrol aliran udara tekanan tinggi.",
        remark: "Spare part kritis. Wajib diganti segera jika respon silinder mulai melambat.",
        part_image: "VZW4120.jpg",
        drawing_image: "VZW4120_Drawing.png"
    }
];

const initialMachines = [
    { id: "m1", machine_no: "P.S-01", machine_name: "AIDA 200 TON", type: "Stamping Press", ton: 200, brand: "AIDA Japan", area: "Stamping Line A", status: "Active" },
    { id: "m2", machine_no: "B.8-2", machine_name: "KOMATSU 150 TON", type: "Hydraulic Press", ton: 150, brand: "KOMATSU", area: "Assembly Line B", status: "Active" },
    { id: "m3", machine_no: "P.S-02", machine_name: "GUANDONG 200 TON", type: "Stamping Press", ton: 200, brand: "GUANDONG", area: "Stamping Line C", status: "Maintenance" }
];

const initialTemplates = [
    { id: "t1", template_name: "Daily Preventive Checklist Yadon & Aida", machine_type: "Stamping Press", items_count: 5, author: "Maintenance Dept" },
    { id: "t2", template_name: "Monthly Hydraulic Press SOP Checklist", machine_type: "Hydraulic Press", items_count: 8, author: "Engineering Team" },
    { id: "t3", template_name: "General Crane & Hoist Standard Check List", machine_type: "Overhead Crane", items_count: 4, author: "Safety Officer" }
];

const initialWarehouses = [
    { id: "w1", code: "WH-GA-A", title: "Rak A (Tubing)", category: "TUBING", capacity: 100, occupied: 32 },
    { id: "w2", code: "WH-GA-B", title: "Rak B (Valve)", category: "VALVE", capacity: 50, occupied: 12 },
    { id: "w3", code: "WH-GA-C", title: "Rak C (Mekanikal)", category: "BEARING", capacity: 150, occupied: 85 },
    { id: "w4", code: "WH-GA-D", title: "Rak D (Elektrikal)", category: "ELEKTRIKAL", capacity: 80, occupied: 4 }
];

export default function MachineMaintenance() {
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('mm_active_tab') || 'schedules');

    useEffect(() => {
        localStorage.setItem('mm_active_tab', activeTab);
    }, [activeTab]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // States untuk Data List
    const [schedules, setSchedules] = useState(initialSchedules);
    const [spareParts, setSpareParts] = useState(initialSpareParts);
    const [machines, setMachines] = useState(initialMachines);
    const [templates, setTemplates] = useState(initialTemplates);
    const [warehouses, setWarehouses] = useState(initialWarehouses);

    // States untuk Detail Modals
    const [selectedPart, setSelectedPart] = useState(null);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [checkedItems, setCheckedItems] = useState({});

    // States untuk Add Modals (Phase 2 Master Data Form)
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

    // Form inputs states
    const [newMachine, setNewMachine] = useState({ machine_no: '', machine_name: '', type: '', ton: '', brand: '', area: '', status: 'Active' });
    const [newTemplate, setNewTemplate] = useState({ template_name: '', machine_type: '', items_count: '', author: 'Maintenance Dept' });
    const [newWarehouse, setNewWarehouse] = useState({ code: '', title: '', category: '', capacity: '', occupied: 0 });

    // Filter Logic
    const filteredSchedules = schedules.filter(s => 
        s.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.preventive_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.machine_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredParts = spareParts.filter(p => 
        p.part_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredMachines = machines.filter(m => 
        m.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.machine_no.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTemplates = templates.filter(t => 
        t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.machine_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredWarehouses = warehouses.filter(w => 
        w.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Dynamic Badge Color
    const getStatusColor = (dateStr, status) => {
        if (status === 'Completed') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
        const date = new Date(dateStr);
        const today = new Date();
        if (date < today) return 'bg-red-50 text-red-600 border-red-200'; 
        if (date.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) return 'bg-orange-50 text-orange-600 border-orange-200'; 
        return 'bg-blue-50 text-blue-600 border-blue-200'; 
    };

    const getStatusText = (dateStr, status) => {
        if (status === 'Completed') return 'Completed';
        const date = new Date(dateStr);
        const today = new Date();
        if (date < today) return 'Overdue';
        if (date.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) return 'Due Soon';
        return 'Scheduled';
    };

    // Handlers
    const handleAdjustStock = (partId, amount) => {
        const updatedParts = spareParts.map(part => {
            if (part.id === partId) {
                const newStock = Math.max(0, part.stock + amount);
                const updatedPart = { ...part, stock: newStock };
                if (selectedPart && selectedPart.id === partId) {
                    setSelectedPart(updatedPart);
                }
                return updatedPart;
            }
            return part;
        });
        setSpareParts(updatedParts);
    };

    const handleToggleCheck = (itemId) => {
        setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const handleCompleteMaintenance = (scheduleId) => {
        const updatedSchedules = schedules.map(s => {
            if (s.id === scheduleId) return { ...s, status: 'Completed' };
            return s;
        });
        setSchedules(updatedSchedules);
        setSelectedSchedule(null);
        setCheckedItems({});
        alert("Maintenance schedule closed successfully!");
    };

    // Phase 2: Add Handlers
    const handleAddMachine = (e) => {
        e.preventDefault();
        const machine = {
            id: `m_${Date.now()}`,
            ...newMachine,
            ton: parseInt(newMachine.ton) || 0
        };
        setMachines([...machines, machine]);
        setIsMachineModalOpen(false);
        setNewMachine({ machine_no: '', machine_name: '', type: '', ton: '', brand: '', area: '', status: 'Active' });
    };

    const handleAddTemplate = (e) => {
        e.preventDefault();
        const template = {
            id: `t_${Date.now()}`,
            ...newTemplate,
            items_count: parseInt(newTemplate.items_count) || 0
        };
        setTemplates([...templates, template]);
        setIsTemplateModalOpen(false);
        setNewTemplate({ template_name: '', machine_type: '', items_count: '', author: 'Maintenance Dept' });
    };

    const handleAddWarehouse = (e) => {
        e.preventDefault();
        const warehouse = {
            id: `w_${Date.now()}`,
            ...newWarehouse,
            capacity: parseInt(newWarehouse.capacity) || 0
        };
        setWarehouses([...warehouses, warehouse]);
        setIsWarehouseModalOpen(false);
        setNewWarehouse({ code: '', title: '', category: '', capacity: '', occupied: 0 });
    };

    // Delete Handlers
    const handleDeleteMachine = (id) => {
        if(confirm("Apakah Anda yakin ingin menghapus mesin ini?")) {
            setMachines(machines.filter(m => m.id !== id));
        }
    };

    const handleDeleteTemplate = (id) => {
        if(confirm("Apakah Anda yakin ingin menghapus template checklist ini?")) {
            setTemplates(templates.filter(t => t.id !== id));
        }
    };

    const handleDeleteWarehouse = (id) => {
        if(confirm("Apakah Anda yakin ingin menghapus rak gudang ini?")) {
            setWarehouses(warehouses.filter(w => w.id !== id));
        }
    };

    return (
        <div className="space-y-3 pb-12">
            {/* Upper Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Machine Maintenance</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Portal Integrasi Preventive Maintenance & Kontrol Suku Cadang</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
                        <Filter size={16} /> Filter
                    </button>
                    
                    {/* Dynamic Add Button based on Active Tab */}
                    {activeTab === 'schedules' && (
                        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                            <Plus size={16} /> Jadwal Baru
                        </button>
                    )}
                    {activeTab === 'parts' && (
                        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                            <Plus size={16} /> Item Baru
                        </button>
                    )}
                    {activeTab === 'machines' && (
                        <button onClick={() => setIsMachineModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 animate-in fade-in duration-200">
                            <Plus size={16} /> Tambah Mesin
                        </button>
                    )}
                    {activeTab === 'checklists' && (
                        <button onClick={() => setIsTemplateModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 animate-in fade-in duration-200">
                            <Plus size={16} /> Buat Checklist
                        </button>
                    )}
                    {activeTab === 'warehouses' && (
                        <button onClick={() => setIsWarehouseModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 animate-in fade-in duration-200">
                            <Plus size={16} /> Lokasi Rak Baru
                        </button>
                    )}
                </div>
            </div>

            {/* 5 Tabs System Navigation */}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/50">
                <button
                    onClick={() => { setActiveTab('schedules'); setSearchTerm(''); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'schedules' 
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/30'
                    }`}
                >
                    <Calendar size={18} /> Schedules
                </button>
                <button
                    onClick={() => { setActiveTab('parts'); setSearchTerm(''); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'parts' 
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/30'
                    }`}
                >
                    <Package size={18} /> Spare Parts
                </button>
                <button
                    onClick={() => { setActiveTab('machines'); setSearchTerm(''); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'machines' 
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/30'
                    }`}
                >
                    <Cpu size={18} /> Machine List
                </button>
                <button
                    onClick={() => { setActiveTab('checklists'); setSearchTerm(''); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'checklists' 
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/30'
                    }`}
                >
                    <FileText size={18} /> Checklist Editor
                </button>
                <button
                    onClick={() => { setActiveTab('warehouses'); setSearchTerm(''); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'warehouses' 
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/30'
                    }`}
                >
                    <MapPin size={18} /> Warehouse Layout
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder={
                        activeTab === 'schedules' ? "Cari nama mesin, nomor mesin, atau ID preventif..." : 
                        activeTab === 'parts' ? "Cari nama part, kode item, atau merek..." :
                        activeTab === 'machines' ? "Cari nomor mesin, tipe, tonase atau merek mesin..." :
                        activeTab === 'checklists' ? "Cari nama template checklist atau tipe mesin..." :
                        "Cari kode rak gudang, kategori, atau nama rak..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-medium placeholder:text-slate-400 shadow-sm"
                />
            </div>

            {/* Tables View Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                {/* 1. TAB: PREVENTIVE SCHEDULES */}
                {activeTab === 'schedules' && (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs md:text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-black">
                                    <th className="p-4 pl-6 text-[10px] uppercase tracking-widest">Schedule ID</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Machine</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Category</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Date</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Status</th>
                                    <th className="p-4 text-right pr-6" uppercase tracking-widest>Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredSchedules.map((schedule) => (
                                    <tr key={schedule.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 pl-6 font-bold text-slate-900">
                                            <div>{schedule.preventive_id}</div>
                                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{schedule.maintenance_type}</div>
                                        </td>
                                        <td className="p-4 text-[11px]">
                                            <div className="font-extrabold text-slate-800">{schedule.machine_name}</div>
                                            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{schedule.machine_no} • {schedule.area_name}</div>
                                        </td>
                                        <td className="p-4 text-[11px]">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide">
                                                {schedule.category}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-slate-600">{schedule.date}</td>
                                        <td className="p-4 text-[11px]">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-black border ${getStatusColor(schedule.date, schedule.status)}`}>
                                                {schedule.status === 'Completed' ? <CheckCircle2 size={11} /> :
                                                 getStatusText(schedule.date, schedule.status) === 'Overdue' ? <AlertCircle size={11} /> : 
                                                 getStatusText(schedule.date, schedule.status) === 'Due Soon' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                                                {getStatusText(schedule.date, schedule.status)}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <button 
                                                onClick={() => setSelectedSchedule(schedule)}
                                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                            >
                                                <Eye size={12} /> View/Execute
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 2. TAB: SPARE PARTS INVENTORY */}
                {activeTab === 'parts' && (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs md:text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-black">
                                    <th className="p-4 pl-6 text-[10px] uppercase tracking-widest">Item Info</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Category & Location</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Specification</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Stock Level</th>
                                    <th className="p-4 text-right pr-6" uppercase tracking-widest>Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredParts.map((part) => {
                                    const isLowStock = part.stock <= part.minimum_stock;
                                    const isOutOfStock = part.stock === 0;
                                    return (
                                        <tr key={part.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-4 pl-6 text-[11px]">
                                                <div className="font-extrabold text-slate-900">{part.part_name}</div>
                                                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{part.item_code} • {part.brand}</div>
                                            </td>
                                            <td className="p-4 text-[11px]">
                                                <div className="font-bold text-slate-700">{part.category}</div>
                                                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{part.location}</div>
                                            </td>
                                            <td className="p-4 font-semibold text-slate-500">{part.specification}</td>
                                            <td className="p-4 text-[11px]">
                                                <div className="flex flex-col items-start gap-1">
                                                    <div className="flex items-end gap-1">
                                                        <span className={`text-lg font-black ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                            {part.stock}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 mb-1">{part.uom}</span>
                                                    </div>
                                                    {isLowStock && (
                                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${isOutOfStock ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                            <AlertCircle size={9} /> {isOutOfStock ? 'Out of Stock' : `Low (Min: ${part.minimum_stock})`}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                <button 
                                                    onClick={() => setSelectedPart(part)}
                                                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                >
                                                    <Eye size={12} /> Detail Specs
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 3. TAB: MACHINE & EQUIPMENT MASTER */}
                {activeTab === 'machines' && (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs md:text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-black">
                                    <th className="p-4 pl-6 text-[10px] uppercase tracking-widest">Machine No</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Machine Name</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Details</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Location Area</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Status</th>
                                    <th className="p-4 text-right pr-6" uppercase tracking-widest>Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredMachines.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 pl-6 font-extrabold text-slate-900">{m.machine_no}</td>
                                        <td className="p-4 text-[11px]">
                                            <div className="font-extrabold text-slate-800">{m.machine_name}</div>
                                            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{m.brand}</div>
                                        </td>
                                        <td className="p-4 text-[11px]">
                                            <div className="font-bold text-slate-600">{m.type}</div>
                                            <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">{m.ton} TON</div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-600">{m.area}</td>
                                        <td className="p-4 text-[11px]">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                                                m.status === 'Active' 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                                : 'bg-orange-50 text-orange-600 border-orange-200'
                                            }`}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteMachine(m.id)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMachines.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-slate-400 font-bold">
                                            <Cpu size={32} className="mx-auto mb-2 text-slate-300" />
                                            Tidak ada mesin terdaftar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 4. TAB: CHECKLIST TEMPLATE EDITOR */}
                {activeTab === 'checklists' && (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs md:text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-black">
                                    <th className="p-4 pl-6 text-[10px] uppercase tracking-widest">Checklist Name</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Applicable Machine Type</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Total Questions</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Author</th>
                                    <th className="p-4 text-right pr-6" uppercase tracking-widest>Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredTemplates.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 pl-6 font-extrabold text-slate-900 flex items-center gap-2">
                                            <FileText size={16} className="text-blue-500" />
                                            {t.template_name}
                                        </td>
                                        <td className="p-4 text-[11px]">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wide">
                                                {t.machine_type}
                                            </span>
                                        </td>
                                        <td className="p-4 font-black text-indigo-600">{t.items_count} Butir</td>
                                        <td className="p-4 font-bold text-slate-500">{t.author}</td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteTemplate(t.id)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTemplates.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-slate-400 font-bold">
                                            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                                            Belum ada template checklist.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 5. TAB: WAREHOUSE LAYOUT */}
                {activeTab === 'warehouses' && (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs md:text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-black">
                                    <th className="p-4 pl-6 text-[10px] uppercase tracking-widest">Rak Code</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Storage Name</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Stored Parts Category</th>
                                    <th className="p-4 text-[10px] uppercase tracking-widest">Capacity Level</th>
                                    <th className="p-4 text-right pr-6" uppercase tracking-widest>Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredWarehouses.map((w) => {
                                    const percent = Math.round((w.occupied / w.capacity) * 100);
                                    return (
                                        <tr key={w.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-4 pl-6 font-extrabold text-slate-900">{w.code}</td>
                                            <td className="p-4 font-bold text-slate-800 flex items-center gap-1.5">
                                                <MapPin size={14} className="text-red-500" />
                                                {w.title}
                                            </td>
                                            <td className="p-4 text-[11px]">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">
                                                    {w.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[11px]">
                                                <div className="flex items-center gap-3 w-48">
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                        <div 
                                                            style={{ width: `${percent}%` }} 
                                                            className={`h-full rounded-full transition-all ${
                                                                percent > 85 ? 'bg-red-500' : percent > 50 ? 'bg-orange-500' : 'bg-emerald-500'
                                                            }`} 
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-800">{w.occupied}/{w.capacity} ({percent}%)</span>
                                                </div>
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                        <Edit size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteWarehouse(w.id)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredWarehouses.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-slate-400 font-bold">
                                            <MapPin size={32} className="mx-auto mb-2 text-slate-300" />
                                            Belum ada tata letak rak gudang.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ==================== FORM ADD MODALS (PHASE 2) ==================== */}

            {/* 1. Modal: Tambah Mesin */}
            {isMachineModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleAddMachine} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-3xl">
                            <h3 className="text-md font-black text-slate-900 uppercase">Tambah Mesin Baru</h3>
                            <button type="button" onClick={() => setIsMachineModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-800"><X size={16} /></button>
                        </div>
                        <div className="p-4 space-y-3 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1 text-slate-500 uppercase">Machine Number (No. Aset)</label>
                                <input required type="text" placeholder="Contoh: P.S-03" value={newMachine.machine_no} onChange={(e) => setNewMachine({...newMachine, machine_no: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div>
                                <label className="block mb-1 text-slate-500 uppercase">Machine Name</label>
                                <input required type="text" placeholder="Contoh: YADON 150 TON" value={newMachine.machine_name} onChange={(e) => setNewMachine({...newMachine, machine_name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-500 uppercase">Brand / Merek</label>
                                    <input required type="text" placeholder="Contoh: YADON Japan" value={newMachine.brand} onChange={(e) => setNewMachine({...newMachine, brand: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-500 uppercase">Tipe Mesin</label>
                                    <input required type="text" placeholder="Contoh: Press Stamping" value={newMachine.type} onChange={(e) => setNewMachine({...newMachine, type: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-500 uppercase">Tonase (TON)</label>
                                    <input required type="number" placeholder="Contoh: 150" value={newMachine.ton} onChange={(e) => setNewMachine({...newMachine, ton: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-500 uppercase">Lokasi Area / Line</label>
                                    <input required type="text" placeholder="Contoh: Stamping Line A" value={newMachine.area} onChange={(e) => setNewMachine({...newMachine, area: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 rounded-b-3xl">
                            <button type="button" onClick={() => setIsMachineModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-all">Batal</button>
                            <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all shadow-md shadow-blue-200">Simpan Mesin</button>
                        </div>
                    </form>
                </div>
            )}

            {/* 2. Modal: Tambah Template Checklist */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleAddTemplate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-3xl">
                            <h3 className="text-md font-black text-slate-900 uppercase">Buat Template SOP Checklist</h3>
                            <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-800"><X size={16} /></button>
                        </div>
                        <div className="p-4 space-y-3 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1 text-slate-500 uppercase">Nama Template Checklist SOP</label>
                                <input required type="text" placeholder="Contoh: Checklist Bulanan Yadon Press" value={newTemplate.template_name} onChange={(e) => setNewTemplate({...newTemplate, template_name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div>
                                <label className="block mb-1 text-slate-500 uppercase">Berlaku untuk Tipe Mesin</label>
                                <input required type="text" placeholder="Contoh: Stamping Press" value={newTemplate.machine_type} onChange={(e) => setNewTemplate({...newTemplate, machine_type: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-500 uppercase">Jumlah Butir Pertanyaan</label>
                                    <input required type="number" placeholder="Contoh: 8" value={newTemplate.items_count} onChange={(e) => setNewTemplate({...newTemplate, items_count: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-500 uppercase">Pembuat Dokumen</label>
                                    <input required type="text" value={newTemplate.author} onChange={(e) => setNewTemplate({...newTemplate, author: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 rounded-b-3xl">
                            <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-all">Batal</button>
                            <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all shadow-md shadow-blue-200">Buat Checklist</button>
                        </div>
                    </form>
                </div>
            )}

            {/* 3. Modal: Tambah Tata Letak Gudang */}
            {isWarehouseModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleAddWarehouse} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-3xl">
                            <h3 className="text-md font-black text-slate-900 uppercase">Tambah Rak Penyimpanan Baru</h3>
                            <button type="button" onClick={() => setIsWarehouseModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-800"><X size={16} /></button>
                        </div>
                        <div className="p-4 space-y-3 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-500 uppercase">Kode Rak</label>
                                    <input required type="text" placeholder="Contoh: WH-GA-E" value={newWarehouse.code} onChange={(e) => setNewWarehouse({...newWarehouse, code: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-500 uppercase">Kategori Suku Cadang</label>
                                    <input required type="text" placeholder="Contoh: PACKING" value={newWarehouse.category} onChange={(e) => setNewWarehouse({...newWarehouse, category: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-slate-500 uppercase">Nama Deskripsi Rak</label>
                                <input required type="text" placeholder="Contoh: Rak E (Packing)" value={newWarehouse.title} onChange={(e) => setNewWarehouse({...newWarehouse, title: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div>
                                <label className="block mb-1 text-slate-500 uppercase">Kapasitas Maksimal Rak (Pcs)</label>
                                <input required type="number" placeholder="Contoh: 100" value={newWarehouse.capacity} onChange={(e) => setNewWarehouse({...newWarehouse, capacity: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 rounded-b-3xl">
                            <button type="button" onClick={() => setIsWarehouseModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-all">Batal</button>
                            <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all shadow-md shadow-blue-200">Simpan Rak</button>
                        </div>
                    </form>
                </div>
            )}


            {/* ==================== EXISTING VIEW MODALS (FROM PHASE 1) ==================== */}

            {/* MODAL VIEW 1: DETAIL SPARE PARTS */}
            {selectedPart && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <div className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-1">Spare Part Specification</div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight">{selectedPart.part_name}</h3>
                            </div>
                            <button onClick={() => setSelectedPart(null)} className="w-10 h-10 rounded-xl hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-800"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase tracking-wider">Spesifikasi Teknis</h4>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Item Code</p><p className="font-extrabold text-slate-800 mt-1">{selectedPart.item_code}</p></div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Part No</p><p className="font-extrabold text-slate-800 mt-1">{selectedPart.part_no}</p></div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Brand</p><p className="font-extrabold text-slate-800 mt-1">{selectedPart.brand}</p></div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Specification</p><p className="font-extrabold text-slate-800 mt-1">{selectedPart.specification}</p></div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Category</p><p className="font-extrabold text-slate-800 mt-1">{selectedPart.category}</p></div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Storage Location</p><p className="font-extrabold text-slate-800 mt-1 flex items-center gap-1"><MapPin size={12} className="text-red-500" /> {selectedPart.location}</p></div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase tracking-wider">Bisnis & Pengadaan</h4>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Vendor</p><p className="font-extrabold text-slate-800 mt-1">{selectedPart.vendor}</p></div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Cost (Satuan)</p><p className="font-extrabold text-slate-800 mt-1">Rp {selectedPart.cost.toLocaleString('id-ID')}</p></div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase">Description / Deskripsi</p><p className="font-semibold text-slate-600 mt-1">{selectedPart.description}</p></div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase">Remark (Catatan)</p><p className="font-semibold text-slate-600 mt-1">{selectedPart.remark}</p></div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 flex flex-col justify-between">
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-blue-500 uppercase">Aktual Stok Gudang</p>
                                        <div className="flex items-end gap-1 mt-1">
                                            <span className="text-3xl font-black text-blue-900 leading-none">{selectedPart.stock}</span>
                                            <span className="text-sm font-bold text-blue-500 mb-1">{selectedPart.uom}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleAdjustStock(selectedPart.id, -1)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold hover:bg-slate-100 shadow-sm">-</button>
                                        <button onClick={() => handleAdjustStock(selectedPart.id, 1)} className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white hover:bg-blue-700 shadow-sm">+</button>
                                    </div>
                                </div>
                                <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[180px]">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><ImageIcon size={14} /> Part Image</div>
                                    <div className="flex-1 bg-slate-100/50 flex flex-col items-center justify-center text-slate-400"><ImageIcon size={32} className="mb-1 text-slate-300" /><span className="text-[10px] font-bold">{selectedPart.part_image}</span></div>
                                </div>
                                <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[180px]">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Layers size={14} /> Technical Drawing Blueprint</div>
                                    <div className="flex-1 bg-sky-950 flex flex-col items-center justify-center text-sky-400 relative">
                                        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                                        <Layers size={32} className="mb-1 text-sky-300 animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Blueprint Mode</span>
                                        <span className="text-[9px] text-sky-400/80">{selectedPart.drawing_image}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VIEW 2: INSPEKSI / PREVENTIVE SCHEDULE */}
            {selectedSchedule && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <div className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-1">Preventive Maintenance Checklist</div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight">Jadwal Perawatan: {selectedSchedule.machine_name}</h3>
                            </div>
                            <button onClick={() => setSelectedSchedule(null)} className="w-10 h-10 rounded-xl hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-800"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase">Preventive ID</p><p className="font-extrabold text-slate-800 mt-1">{selectedSchedule.preventive_id}</p></div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase">Machine Number</p><p className="font-extrabold text-slate-800 mt-1">{selectedSchedule.machine_no}</p></div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase">Target Date</p><p className="font-extrabold text-slate-800 mt-1">{selectedSchedule.date}</p></div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase">Department</p><p className="font-extrabold text-slate-800 mt-1">{selectedSchedule.department}</p></div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Wrench size={14} /> SOP & Item Check</h4>
                                    <span className="text-[10px] font-bold text-slate-400">Progress: {selectedSchedule.item_checks.filter(i => checkedItems[i.id]).length} of {selectedSchedule.item_checks.length} items checked</span>
                                </div>
                                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider"><th className="p-3 pl-5 w-12 text-[10px] uppercase tracking-widest">Check</th><th className="p-3 text-[10px] uppercase tracking-widest">Item Name</th><th className="p-3 text-[10px] uppercase tracking-widest">Method</th><th className="p-3 text-[10px] uppercase tracking-widest">Standard</th><th className="p-3 text-[10px] uppercase tracking-widest">Action</th><th className="p-3 text-[10px] uppercase tracking-widest">Part Required</th><th className="p-3 text-right pr-5" uppercase tracking-widest>SOP</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedSchedule.item_checks.map((item) => {
                                                const isChecked = checkedItems[item.id] || false;
                                                return (
                                                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-emerald-50/30' : ''}`}>
                                                        <td className="p-3 pl-5 text-[11px]">
                                                            <button onClick={() => handleToggleCheck(item.id)} className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-blue-500 bg-white'}`}>{isChecked && <Check size={12} />}</button>
                                                        </td>
                                                        <td className={`p-3 font-bold text-slate-900 ${isChecked ? 'line-through text-slate-400' : ''}`}>{item.item_name}</td>
                                                        <td className="p-3 text-slate-500">{item.method}</td>
                                                        <td className="p-3 font-bold text-indigo-600">{item.standard}</td>
                                                        <td className="p-3 text-slate-500">{item.action}</td>
                                                        <td className="p-3 font-bold text-slate-700">{item.spare_part}</td>
                                                        <td className="p-3 pr-5 text-right"><button className="inline-flex items-center gap-0.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold"><Download size={10} /> SOP</button></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                                <div><h5 className="font-bold text-slate-900 text-sm">Verifikasi & Penutupan Laporan</h5><p className="text-slate-400 font-medium mt-0.5">Semua checklist wajib dicentang untuk menutup WO.</p></div>
                                <button disabled={selectedSchedule.item_checks.some(i => !checkedItems[i.id])} onClick={() => handleCompleteMaintenance(selectedSchedule.id)} className={`px-5 py-2.5 rounded-xl font-bold transition-all shadow-md ${selectedSchedule.item_checks.every(i => checkedItems[i.id]) ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>Selesaikan Perawatan</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

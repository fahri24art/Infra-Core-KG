import React, { useState, useEffect } from 'react';
import { Save, Calendar, ArrowLeft, Play, AlertTriangle, ChevronLeft, ChevronRight, CheckSquare, Printer, Monitor, Laptop, CheckCircle, Clock, Download } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generatePCPdf } from '../utils/generatePCPdf';
import { generatePrinterPdf } from '../utils/generatePrinterPdf';
import { generateNetworkPdf } from '../utils/generateNetworkPdf';
import { generateBackupPdf } from '../utils/generateBackupPdf';
import { generatePhonePdf } from '../utils/generatePhonePdf';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';

const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

export default function MaintenanceSchedule() {
    const navigate = useNavigate();
    const [year, setYear] = useState(new Date().getFullYear());
    const currentMonthNum = new Date().getMonth() + 1;
    const initialSemester = currentMonthNum <= 6 ? 1 : 2;
    const [semester, setSemester] = useState(initialSemester);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterMyTasks, setFilterMyTasks] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [currentUser, setCurrentUser] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const viewMode = searchParams.get('tab') || 'dashboard';
    const setViewMode = (mode) => setSearchParams({ tab: mode });
    const [maintenanceType, setMaintenanceType] = useState('Semester'); // 'Daily', 'Weekly', 'Monthly', 'Semester'
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (viewMode === 'year') setMaintenanceType('Semester');
        else if (viewMode === 'month') setMaintenanceType('Monthly');
        else if (viewMode === 'week') setMaintenanceType('Weekly');
        else if (viewMode === 'day') setMaintenanceType('Daily');
        else if (viewMode === 'dashboard') setMaintenanceType('Semester');
    }, [viewMode]);

    // View Controls
    const [selectedMonth, setSelectedMonth] = useState(0); // 0-5 relative to semester
    const [selectedWeek, setSelectedWeek] = useState(1); // 1-4
    const [yearlyMonthFilter, setYearlyMonthFilter] = useState('all');

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                // ignore
            }
        }
    }, []);

    useEffect(() => {
        fetchSchedule();
        fetchStats();
    }, [year, semester, maintenanceType]);

    const categoryData = React.useMemo(() => {
        const counts = {};
        schedule.forEach(item => {
            const cat = (item.asset.category || 'OTHER').toUpperCase();
            if (!counts[cat]) counts[cat] = { name: cat, done: 0, pending: 0 };
            
            let hasPlan = false;
            let isDone = false;
            
            if (item.plan?.planning_data) {
                Object.keys(item.plan.planning_data).forEach(key => {
                    hasPlan = true;
                    if (item.plan.actual_data?.[key]) {
                        isDone = true;
                    }
                });
            }
            
            if (hasPlan) {
                if (isDone) counts[cat].done++;
                else counts[cat].pending++;
            }
        });
        return Object.values(counts);
    }, [schedule]);

    const urgentTasks = React.useMemo(() => {
        const tasks = [];
        const currentMonth = new Date().getMonth() + 1; // 1-12
        schedule.forEach(item => {
            if (item.plan?.planning_data) {
                Object.keys(item.plan.planning_data).forEach(key => {
                    const isDone = item.plan.actual_data?.[key];
                    if (!isDone) {
                        const [m, w] = key.split('_').map(Number);
                        // Consider it urgent if it's planned for this month or earlier
                        if (m <= currentMonth) {
                            tasks.push({ asset: item.asset, plan: item.plan, month: m, week: w });
                        }
                    }
                });
            }
        });
        tasks.sort((a, b) => a.month - b.month || a.week - b.week);
        return tasks.slice(0, 10);
    }, [schedule]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`/api/network/maintenance/stats?year=${year}`);
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    };

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            // UPDATED PATH: added /network prefix, type filter, and cache-busting timestamp
            const res = await fetch(`/api/network/maintenance/schedule?year=${year}&semester=${semester}&type=${maintenanceType}&_t=${Date.now()}`);
            const data = await res.json();

            const parsedData = data.map(item => ({
                ...item,
                plan: item.plan ? {
                    ...item.plan,
                    planning_data: typeof item.plan.planning_data === 'string' ? JSON.parse(item.plan.planning_data) : item.plan.planning_data,
                    actual_data: typeof item.plan.actual_data === 'string' ? JSON.parse(item.plan.actual_data) : item.plan.actual_data
                } : null
            }));

            // Sort by earliest planned week
            parsedData.sort((a, b) => {
                const getEarliest = (item) => {
                    if (!item.plan?.planning_data) return 9999;
                    const keys = Object.keys(item.plan.planning_data);
                    if (keys.length === 0) return 9999;
                    const values = keys.map(k => {
                        const [m, w] = k.split('_').map(Number);
                        return m * 10 + w;
                    });
                    return Math.min(...values);
                };
                return getEarliest(a) - getEarliest(b);
            });

            setSchedule(parsedData);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch schedule', err);
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        const confirmMsg = "PERHATIAN: Meng-generate ulang jadwal akan mengacak ulang posisi (titik biru) untuk semua perangkat yang BELUM dikerjakan. Data yang sudah dicentang/dikerjakan TIDAK akan hilang. Yakin ingin melanjutkan?";
        if (!window.confirm(confirmMsg)) return;

        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch('/api/network/maintenance/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year })
            });
            if (res.ok) fetchSchedule();
        } catch (err) {
            console.error('Failed to generate plans', err);
        }
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF('landscape');
        
        const pageWidth = doc.internal.pageSize.width;
        const imgData = await loadImage(logoTCF);
        
        if (viewMode === 'year' || viewMode === 'month') {
            if (imgData) doc.addImage(imgData, 'PNG', 14, 10, 26, 23);
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("PT. Tri Centrum Fortuna", 14, 38);
            
            doc.setFontSize(16);
            doc.text("JADWAL PEMELIHARAAN PERANGKAT ICT", 14, 45);
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Departemen : ICT", 14, 52);
            doc.text("Nama ICT Support : Mulyana", 14, 57);
            doc.text(`Periode : per 6 bulan`, 14, 62);
            doc.text(`Tahun : ${year}`, 14, 67);
            
            doc.setFontSize(8);
            doc.text("TCFSG-FM-ICT-01-01 (Rev. 01, 11 Maret 2025)", pageWidth - 80, 38);
            
            const head1 = [{ content: 'No', rowSpan: 2 }, { content: 'Kode Inventaris', rowSpan: 2 }, { content: 'Jenis', rowSpan: 2 }, { content: 'Nama Brand', rowSpan: 2 }, { content: 'Username', rowSpan: 2 }];
            const head2 = [];
            
            const monthNames = visibleWeeks.reduce((acc, curr) => {
                if (!acc.includes(curr.monthName)) acc.push(curr.monthName);
                return acc;
            }, []);
            
            monthNames.forEach(m => {
                const weeksInMonth = visibleWeeks.filter(w => w.monthName === m).length;
                head1.push({ content: m, colSpan: weeksInMonth, styles: { halign: 'center' } });
                for (let i = 1; i <= weeksInMonth; i++) {
                    head2.push(i.toString());
                }
            });
            
            const data = displayedSchedule.map((item, idx) => {
                const row = [
                    idx + 1,
                    item.asset.inventory_number || item.asset.name,
                    item.asset.category,
                    item.asset.manufacturer || '-',
                    item.asset.user_name || '-'
                ];
                visibleWeeks.forEach(w => {
                    const key = `${w.monthIndex}_${w.weekIndex}`;
                    const isDone = item.plan?.actual_data?.[key];
                    const isPlanned = item.plan?.planning_data?.[key];
                    if (isDone) row.push('V');
                    else if (isPlanned) row.push('O');
                    else row.push('');
                });
                return row;
            });
            
            autoTable(doc, {
                startY: 72,
                head: [head1, head2],
                body: data,
                theme: 'grid',
                styles: { fontSize: 7, halign: 'center', cellPadding: 1 },
                headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
                columnStyles: {
                    0: { halign: 'center' },
                    1: { halign: 'left' },
                    2: { halign: 'center' },
                    3: { halign: 'left' },
                    4: { halign: 'left' }
                }
            });

            // Signatures
            const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 60 + 20;
            doc.setFontSize(10);
            doc.text("Dibuat", 40, finalY, { align: "center" });
            doc.text("Diperiksa", pageWidth / 2, finalY, { align: "center" });
            doc.text("Disetujui", pageWidth - 40, finalY, { align: "center" });
            
            doc.text("Mulyana", 40, finalY + 25, { align: "center" });
            doc.text("Hery Hermawan", pageWidth / 2, finalY + 25, { align: "center" });
            doc.text("Herno Aji Sanjaya", pageWidth - 40, finalY + 25, { align: "center" });
            
            doc.line(20, finalY + 26, 60, finalY + 26);
            doc.line(pageWidth / 2 - 20, finalY + 26, pageWidth / 2 + 20, finalY + 26);
            doc.line(pageWidth - 60, finalY + 26, pageWidth - 20, finalY + 26);
            
            window.open(doc.output('bloburl'), '_blank');
            
        } else if (viewMode === 'week') {
            if (imgData) doc.addImage(imgData, 'PNG', 14, 10, 26, 23);
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("PT. Tri Centrum Fortuna", 14, 38);
            
            doc.setFontSize(14);
            doc.text("PELAKSANAAN PEMELIHARAAN PERANGKAT PC / NOTEBOOK", 14, 46);
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Departemen : ICT", 14, 53);
            
            doc.setFontSize(8);
            doc.text("TCFSG-FM-ICT-01-02 (Rev. 01, 11 Maret 2025)", pageWidth - 80, 38);
            
            let currentY = 62;
            doc.setFontSize(9);
            const p1 = "Sehubungan dengan akan di adakannya proses maintenance ( pemeliharaan / perbaikan ) pada Personal Computer ( PC ) / Notebook secara berkala di seluruh Bagian yang berhubungan dengan pemakaian Personal Computer ( PC ) / Notebook di lingkungan PT. Tri Centrum Fortuna oleh Personal ICT - Support, maka dengan surat ini kami akan melaksanakan program tersebut agar dapat di ketahui bersama, dalam proses pemeliharaan / perbaikan Personal Computer ( PC ) / Notebook tersebut guna menunjang kelancaran pemakaian Personal Computer ( PC ) / Notebook di dalam menggunakannya.";
            const splitP1 = doc.splitTextToSize(p1, pageWidth - 28);
            doc.text(splitP1, 14, currentY);
            currentY += (splitP1.length * 4) + 6;
            
            doc.text("Adapun proses maintenance tersebut akan di laksanakan pada :", 14, currentY);
            currentY += 6;
            const currentMonthIdx = semester === 'all' ? selectedMonth + 1 : (semester === 2 ? selectedMonth + 7 : selectedMonth + 1);
            doc.text(`Hari & Tanggal   : Minggu ke-${selectedWeek} Bulan ${months[selectedMonth]} ${year}`, 14, currentY);
            currentY += 5;
            doc.text("Plant                 : PT. Tri Centrum Fortuna Plant Sadang", 14, currentY);
            currentY += 8;
            
            doc.text("Adapun Personal Computer ( PC ) / Notebook yang akan di lakukan proses maintenance adalah :", 14, currentY);
            currentY += 4;
            doc.text("* pada kolom jenis, harap coret salah satu", 14, currentY);
            currentY += 6;
            
            const weekKey = `${currentMonthIdx}_${selectedWeek}`;
            const data = displayedSchedule
                .filter(item => item.plan?.planning_data?.[weekKey])
                .map((item, idx) => {
                    const record = item.records?.[weekKey] || {};
                    const checksheetObj = typeof record.checksheet_data === 'string' ? JSON.parse(record.checksheet_data || '{}') : (record.checksheet_data || {});
                    const hasChecksheet = record.checksheet_data && Object.keys(checksheetObj).length > 0;
                    const afterDisplay = (record.condition_after && record.condition_after !== '-') ? record.condition_after : (hasChecksheet ? "Baik" : "");
                    const beforeDisplay = record.condition_before || "";
                    
                    return [
                        idx + 1,
                        item.asset.category || '-',
                        item.asset.user_name || item.asset.contact || '-',
                        item.asset.user_department || item.asset.location || '-',
                        beforeDisplay,
                        "",
                        afterDisplay,
                        ""
                    ];
                });
            
            autoTable(doc, {
                startY: currentY,
                head: [
                    [
                        { content: 'No.', rowSpan: 2 },
                        { content: 'Jenis', rowSpan: 2 },
                        { content: 'User', rowSpan: 2 },
                        { content: 'Department', rowSpan: 2 },
                        { content: 'Sebelum Proses', colSpan: 2, styles: { halign: 'center' } },
                        { content: 'Sesudah Proses', colSpan: 2, styles: { halign: 'center' } }
                    ],
                    [
                        { content: 'Kondisi', styles: { halign: 'center' } },
                        { content: 'Paraf', styles: { halign: 'center' } },
                        { content: 'Kondisi', styles: { halign: 'center' } },
                        { content: 'Paraf', styles: { halign: 'center' } }
                    ]
                ],
                body: data,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle' },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 15 },
                    5: { cellWidth: 20 },
                    7: { cellWidth: 20 }
                }
            });
            
            const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : currentY + 40;
            doc.text("Demikian informasi ini kami sampaikan agar proses maintenance tersebut dapat di lakukan.", 14, finalY);
            
            const signY = finalY + 15;
            doc.text("Dibuat", 40, signY, { align: "center" });
            doc.text("Diperiksa", pageWidth / 2, signY, { align: "center" });
            doc.text("Disetujui", pageWidth - 40, signY, { align: "center" });
            
            doc.text("Mulyana", 40, signY + 25, { align: "center" });
            doc.text("Hery Hermawan", pageWidth / 2, signY + 25, { align: "center" });
            doc.text("Herno Aji Sanjaya", pageWidth - 40, signY + 25, { align: "center" });
            
            doc.line(20, signY + 26, 60, signY + 26);
            doc.line(pageWidth / 2 - 20, signY + 26, pageWidth / 2 + 20, signY + 26);
            doc.line(pageWidth - 60, signY + 26, pageWidth - 20, signY + 26);
            
            window.open(doc.output('bloburl'), '_blank');
        }
    };

    const executePlan = async (asset, planId, mIdx, wIdx, isDone) => {
        const weekKey = `${mIdx}_${wIdx}`;
        const type = maintenanceType;

        if (isDone) {
            try {
                const res = await fetch(`/api/network/maintenance/record?asset_id=${asset.id}&week_key=${weekKey}&year=${year}&maintenance_type=${type}&_t=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        const form = {
                            ...data,
                            checksheet_data: typeof data.checksheet_data === 'string' ? JSON.parse(data.checksheet_data) : data.checksheet_data
                        };
                        const cat = (asset.category || '').toLowerCase();
                        if (cat.includes('computer') || cat.includes('laptop') || cat.includes('desktop') || cat.includes('pc') || cat.includes('notebook')) {
                            await generatePCPdf(asset, form, 'view');
                        } else if (cat.includes('printer') || cat.includes('scanner')) {
                            await generatePrinterPdf(asset, form, 'view');
                        } else if (cat.includes('network') || cat.includes('switch') || cat.includes('router') || cat.includes('mikrotik') || cat.includes('cisco') || cat.includes('access point')) {
                            await generateNetworkPdf(asset, form, 'view');
                        } else if (cat.includes('server') || cat.includes('nas') || cat.includes('backup') || cat.includes('storage') || cat.includes('vm')) {
                            await generateBackupPdf(asset, form, 'view');
                        } else if (cat.includes('phone') || cat.includes('mobile') || cat.includes('tablet')) {
                            await generatePhonePdf(asset, form, 'view');
                        } else {
                            // Fallback generic PDF logic for other devices
                            alert("Format PDF khusus untuk perangkat ini (" + (asset.category || 'Unknown') + ") belum tersedia. Silakan hubungi developer.");
                            navigate(`/ict/maintenance/execution/${asset.id}?planId=${planId || ''}&weekKey=${weekKey}&type=${type}&mode=view`);
                        }
                    }
                }
            } catch(e) {
                console.error("Failed to fetch record for PDF", e);
                alert("Gagal menghasilkan PDF: " + e.message);
            }
        } else {
            navigate(`/ict/maintenance/execution/${asset.id}?planId=${planId || ''}&weekKey=${weekKey}&type=${type}`);
        }
    };

    // --- Logic for derived views ---

    const months = semester === 'all'
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        : (semester === 1
            ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            : ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

    let visibleWeeks = [];
    if (viewMode === 'year') {
        months.forEach((m, mIdx) => {
            if (yearlyMonthFilter !== 'all' && Number(yearlyMonthFilter) !== mIdx) return;
            for (let w = 1; w <= 4; w++) {
                const semesterOffset = semester === 2 ? 6 : 0;
                visibleWeeks.push({ monthIndex: (semester === 'all' ? mIdx + 1 : mIdx + 1 + semesterOffset), weekIndex: w, label: w, monthName: m });
            }
        });
    } else if (viewMode === 'month') {
        const m = months[selectedMonth];
        const semesterOffset = (semester === 2 && semester !== 'all') ? 6 : 0;
        for (let w = 1; w <= 4; w++) {
            visibleWeeks.push({ monthIndex: (semester === 'all' ? selectedMonth + 1 : selectedMonth + 1 + semesterOffset), weekIndex: w, label: w, monthName: m });
        }
    } else if (viewMode === 'week' || viewMode === 'day') {
        const m = months[selectedMonth];
        const semesterOffset = (semester === 2 && semester !== 'all') ? 6 : 0;
        visibleWeeks.push({ monthIndex: (semester === 'all' ? selectedMonth + 1 : selectedMonth + 1 + semesterOffset), weekIndex: selectedWeek, label: selectedWeek, monthName: m });
    }

    const monthHeaders = [];
    if (visibleWeeks.length > 0) {
        let currentMonth = visibleWeeks[0].monthName;
        let colSpan = 0;
        visibleWeeks.forEach(w => {
            if (w.monthName !== currentMonth) {
                monthHeaders.push({ name: currentMonth, colSpan });
                currentMonth = w.monthName;
                colSpan = 1;
            } else {
                colSpan++;
            }
        });
        monthHeaders.push({ name: currentMonth, colSpan });
    }

    // Filter Logic
    let displayedSchedule = filterMyTasks
        ? schedule.filter(item => item.asset.user_id === currentUser?.id)
        : schedule;

    if (categoryFilter !== 'All') {
        displayedSchedule = displayedSchedule.filter(item => {
            const cat = (item.asset.category || '').toLowerCase();
            if (categoryFilter === 'PC') return cat.includes('pc') || cat.includes('desktop');
            if (categoryFilter === 'Laptop') return cat.includes('laptop') || cat.includes('notebook');
            if (categoryFilter === 'Printer') return cat.includes('printer') || cat.includes('scanner');
            if (categoryFilter === 'Network') return cat.includes('network') || cat.includes('switch') || cat.includes('router') || cat.includes('access point') || cat.includes('mikrotik');
            if (categoryFilter === 'Server') return cat.includes('server') || cat.includes('nas') || cat.includes('storage') || cat.includes('backup');
            return true;
        });
    }

    displayedSchedule = displayedSchedule.filter(item => {
        let hasPlanInView = false;
        visibleWeeks.forEach(w => {
            const key = `${w.monthIndex}_${w.weekIndex}`;
            if (item.plan?.planning_data?.[key] || item.plan?.actual_data?.[key]) {
                hasPlanInView = true;
            }
        });
        return hasPlanInView;
    });

    const isOverdue = (mIdx, wIdx, isPlanned, isDone) => {
        if (!isPlanned || isDone) return false;
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-indexed
        const dayOfMonth = now.getDate();
        const currentWeek = Math.ceil(dayOfMonth / 7);

        if (mIdx < currentMonth) return true;
        if (mIdx === currentMonth && wIdx < currentWeek) return true;
        return false;
    };

    // Renders the Matrix Table (Year, Month views)
    const renderTable = () => (
        <div className="bg-white w-full mx-auto shadow-xl text-slate-800 overflow-hidden rounded-2xl border border-slate-200 mb-8 print:shadow-none print:m-0 print:rounded-none">
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 flex items-center justify-between print:bg-white print:text-black print:border-2 print:border-slate-300 print:p-4 rounded-t-2xl print:rounded-none">
                <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-2 shadow-lg ring-2 ring-white/30 print:shadow-none print:border print:border-slate-200">
                        <img src="/infraforce-logo.png" alt="INFRAFORCE Logo" className="w-full h-full object-contain filter drop-shadow-md print:filter-none" />
                    </div>
                    <div>
                        <h2 className="font-bold text-2xl tracking-tight uppercase leading-none text-white">Jadwal Pemeliharaan</h2>
                        <p className="text-blue-100 text-sm font-medium mt-1 tracking-widest uppercase print:text-slate-600">Perangkat ICT</p>
                        <div className="mt-2 text-[10px] font-mono opacity-60 print:opacity-100 print:text-slate-500">No. Dokumen: TCFSG-FM-ICT-01-01</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-bold text-xl tracking-wide uppercase text-white">INFRAFORCE, PT. Tri Centrum Fortuna</div>
                    <div className="text-base text-blue-100 mt-1 font-medium tracking-widest uppercase print:text-slate-700">Departemen : ICT</div>
                    <div className="text-sm bg-black/20 px-3 py-1 rounded mt-2 inline-block border border-white/20 print:bg-slate-100 print:border-slate-300 print:text-slate-800 font-bold">
                        Periode : {year} {semester === 'all' ? '(Full Year)' : `Semester ${semester}`} {viewMode === 'month' ? `- ${months[selectedMonth]}` : ''}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { size: A4 landscape; margin: 10mm; }
                        body { background: white; }
                        .print\\:hidden { display: none !important; }
                        table { width: 100% !important; border-collapse: collapse !important; }
                        th, td { border: 1px solid #333 !important; }
                        .bg-blue-50 { background-color: #f0f7ff !important; }
                        .text-blue-800 { color: #1e40af !important; }
                        .bg-slate-100 { background-color: #f1f5f9 !important; }
                    }
                `}} />
                <table className="w-full text-[10px] border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                            <th className="p-1 border-r border-slate-300 w-[20px] font-bold text-center" uppercase tracking-widest>No</th>
                            <th className="p-1 border-r border-slate-300 w-[100px] font-bold text-left" uppercase tracking-widest>Kode Inventaris</th>
                            <th className="p-1 border-r border-slate-300 w-[50px] font-bold text-center" uppercase tracking-widest>Jenis</th>
                            <th className="p-1 border-r border-slate-300 w-[70px] font-bold text-center" uppercase tracking-widest>Merk</th>
                            <th className="p-1 border-r border-slate-300 w-[70px] font-bold text-left" uppercase tracking-widest>User</th>
                            <th className="p-1 border-r border-slate-300 w-7 font-bold text-[9px] text-center" uppercase tracking-widest>Type</th>

                            {monthHeaders.map((m, i) => (
                                <th key={i} colSpan={m.colSpan} className="p-1 border-r border-slate-300 text-center bg-blue-50 text-blue-800 border-b border-slate-300 text-[9px] font-bold tracking-widest uppercase">{m.name}</th>
                            ))}
                        </tr>
                        <tr className="bg-slate-50 border-b border-slate-300 text-slate-600">
                            <th colSpan={6}></th>
                            {visibleWeeks.map((w, i) => (
                                <th key={i} className={`border-r border-slate-300 w-5 text-center text-[8px] font-bold ${w.weekIndex === 4 ? 'border-r-2 border-r-slate-400' : ''}`} uppercase tracking-widest>{w.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedSchedule.map((item, idx) => (
                            <React.Fragment key={item.asset.id}>
                                <tr className="border-b border-slate-200 hover:bg-blue-50/50 transition-colors">
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 text-center">{idx + 1}</td>
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 font-bold text-slate-800 text-[9px] leading-tight">{item.asset.inventory_number || item.asset.name}</td>
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 text-center text-[9px]">{item.asset.category}</td>
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 text-center text-[9px] text-slate-500">{item.asset.manufacturer || '-'}</td>
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 truncate max-w-[90px] text-[9px] font-bold">{item.asset.user_name || '-'}</td>
                                    <td className="p-0.5 border-r border-slate-300 font-bold bg-slate-50 text-slate-500 text-[8px] text-center h-5">Plan</td>

                                    {visibleWeeks.map((w, wIdx) => {
                                        const key = `${w.monthIndex}_${w.weekIndex}`;
                                        const isPlanned = item.plan?.planning_data?.[key];
                                        return (
                                            <td key={wIdx} className={`border-r border-slate-200 text-center p-0 h-5 ${isPlanned ? 'bg-blue-100 text-blue-600 font-bold' : ''} ${w.weekIndex === 4 ? 'border-r-2 border-r-slate-400' : ''}`}>
                                                {isPlanned ? '●' : ''}
                                            </td>
                                        );
                                    })}
                                </tr>
                                <tr className="border-b border-slate-300">
                                    <td className="p-0.5 border-r border-slate-300 font-bold text-slate-500 text-[8px] text-center h-5 uppercase tracking-widest bg-slate-50">Act</td>
                                    {visibleWeeks.map((w, wIdx) => {
                                        const key = `${w.monthIndex}_${w.weekIndex}`;
                                        const isPlanned = item.plan?.planning_data?.[key];
                                        const isDone = item.plan?.actual_data?.[key];
                                        const overdue = !isDone && isOverdue(w.monthIndex, w.weekIndex, isPlanned, isDone);

                                        return (
                                            <td
                                                key={wIdx}
                                                className={`border-r border-slate-200 text-center p-0 h-5 relative group transition-colors
                                                    ${isDone ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600' :
                                                        overdue ? 'bg-red-100 cursor-pointer hover:bg-red-200' :
                                                            isPlanned ? 'bg-transparent hover:bg-green-50 cursor-pointer text-slate-400 hover:text-green-600' : ''}
                                                    ${w.weekIndex === 4 ? 'border-r-2 border-r-slate-400' : ''}
                                                `}
                                                onClick={() => executePlan(item.asset, item.plan?.id, w.monthIndex, w.weekIndex, isDone)}
                                            >
                                                {isDone && '✓'}
                                                {overdue && <div className="absolute inset-0 flex items-center justify-center"><AlertTriangle size={8} className="text-red-500 animate-pulse" /></div>}
                                                {!isDone && (isPlanned || overdue) && (
                                                    <div className="hidden group-hover:flex absolute inset-0 items-center justify-center bg-green-100 text-green-600">
                                                        <Play size={8} fill="currentColor" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="hidden print:grid grid-cols-3 gap-5 p-12 mt-8 text-center text-sm font-bold">
                <div>
                    <p className="mb-20">Dibuat Oleh,</p>
                    <p className="border-t border-black pt-2 inline-block px-8">ICT Staff</p>
                </div>
                <div>
                    <p className="mb-20">Diketahui Oleh,</p>
                    <p className="border-t border-black pt-2 inline-block px-8">ICT Manager</p>
                </div>
                <div>
                    <p className="mb-20">Disetujui Oleh,</p>
                    <p className="border-t border-black pt-2 inline-block px-8">General Manager</p>
                </div>
            </div>
        </div>
    );

    const updateCondition = async (assetId, weekKey, value) => {
        try {
            // UPDATED PATH: added /network prefix
            await fetch('/api/network/maintenance/record/upsert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asset_id: assetId,
                    week_key: weekKey,
                    year: year,
                    condition_before: value
                })
            });
            fetchSchedule(); // Refresh data
        } catch (err) {
            console.error('Failed to update condition', err);
        }
    };

    // Renders the Formal Monthly Report
    const renderMonthlyReport = () => {
        const semesterOffset = (semester === 2 && semester !== 'all') ? 6 : 0;
        const monthIndex = semester === 'all' ? selectedMonth + 1 : selectedMonth + 1 + semesterOffset;

        const monthlyTasks = [];
        displayedSchedule.forEach(item => {
            for (let w = 1; w <= 4; w++) {
                const weekKey = `${monthIndex}_${w}`;
                if (item.plan?.planning_data?.[weekKey]) {
                    monthlyTasks.push({ ...item, w, weekKey });
                }
            }
        });

        return (
            <div className="bg-white mx-auto shadow-sm text-slate-700 overflow-hidden rounded-3xl border border-[#E1E1E1] print:shadow-none print:m-0 print:border-none w-full" style={{ maxWidth: 'none' }}>
                <div className="bg-white p-5 flex items-center justify-between print:p-4 border-b border-[#F0F0F0] print:border-b-2 print:border-slate-800">
                    <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 bg-[#F8F9FB] rounded-2xl flex items-center justify-center p-3 border border-[#E1E1E1] print:border-none">
                            <img src="/infraforce-logo.png" alt="INFRAFORCE Logo" className="w-full h-full object-contain filter grayscale opacity-80 print:grayscale-0 print:opacity-100" />
                        </div>
                        <div>
                            <h2 className="font-black text-2xl tracking-tighter uppercase text-slate-900">Laporan Pemeliharaan Bulanan</h2>
                            <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase mt-1">Perangkat PC / Notebook</p>
                            <div className="mt-2 text-[9px] font-mono text-slate-400">No. Dokumen: TCFSG-FM-ICT-01-01</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-black text-sm uppercase tracking-widest text-slate-900">INFRAFORCE, PT. Tri Centrum Fortuna</div>
                        <div className="text-[10px] text-slate-500 mt-1 font-black uppercase tracking-widest">Departemen : ICT</div>
                        <div className="text-[10px] bg-[#F8F9FB] px-4 py-2 rounded-xl mt-3 inline-block border border-[#E1E1E1] font-black tracking-widest uppercase text-slate-700">
                            Periode : {months[selectedMonth]} {year}
                        </div>
                    </div>
                </div>

                <div className="p-5 print:p-4">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            @page { size: A4 portrait; margin: 10mm; }
                        }
                    `}} />
                    <table className="w-full border-collapse text-xs shadow-sm print:shadow-none">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-widest text-[10px]">
                                <th className="border-r border-slate-200 p-2 w-[30px] font-black text-center" uppercase tracking-widest>No.</th>
                                <th className="border-r border-slate-200 p-2 w-[60px] font-black text-center" uppercase tracking-widest>Minggu</th>
                                <th className="border-r border-slate-200 p-2 w-[80px] font-black text-center" uppercase tracking-widest>Tanggal</th>
                                <th className="border-r border-slate-200 p-2 font-black text-left" uppercase tracking-widest>User</th>
                                <th className="border-r border-slate-200 p-2 w-[100px] font-black text-center" uppercase tracking-widest>Jenis</th>
                                <th className="border-r border-slate-200 p-2 w-[150px] font-black text-center" uppercase tracking-widest>Department</th>
                                <th className="border-r border-slate-200 p-2 w-[100px] font-black text-center" uppercase tracking-widest>Kondisi</th>
                                <th className="p-2 w-[80px] print:hidden font-black text-center" uppercase tracking-widest>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyTasks.length > 0 ? monthlyTasks.map((item, idx) => {
                                const record = item.records?.[item.weekKey] || {};
                                const checksheetObj = typeof record.checksheet_data === 'string' ? JSON.parse(record.checksheet_data || '{}') : (record.checksheet_data || {});
                                const hasChecksheet = record.checksheet_data && Object.keys(checksheetObj).length > 0;
                                const afterDisplay = (record.condition_after && record.condition_after !== '-') ? record.condition_after : (hasChecksheet ? "Done" : "-");
                                const conditionColor = afterDisplay === 'Done' || afterDisplay === 'Good' ? 'text-emerald-500 font-bold' : (afterDisplay === '-' ? 'text-slate-400' : 'text-rose-500 font-bold');
                                const mDate = record.maintenance_date ? new Date(record.maintenance_date).toLocaleDateString('id-ID') : '-';

                                return (
                                    <tr key={idx} className="hover:bg-[#F8F9FB] transition-colors h-12 border-b border-[#F0F0F0]">
                                        <td className="p-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                                        <td className="p-3 text-center font-black text-slate-900 bg-slate-50">W{item.w}</td>
                                        <td className="p-3 text-center text-slate-700 font-bold">{mDate}</td>
                                        <td className="p-3 font-bold text-slate-900">{item.asset.user_name || item.asset.contact}</td>
                                        <td className="p-3 text-center text-slate-500 font-medium">{item.asset.category}</td>
                                        <td className="p-3 text-center text-slate-500 font-medium">{item.asset.user_department || item.asset.location || '-'}</td>
                                        <td className={`p-3 text-center font-black uppercase tracking-widest text-[9px] ${conditionColor}`}>
                                            {afterDisplay}
                                        </td>
                                        <td className="p-3 text-center print:hidden">
                                            <button
                                                onClick={() => executePlan(item.asset, item.plan?.id, monthIndex, item.w, !!record.condition_after || hasChecksheet)}
                                                className="bg-white hover:bg-slate-50 border border-[#E1E1E1] text-slate-700 px-4 py-2 rounded-xl shadow-sm text-[9px] uppercase tracking-widest font-black transition-all hover:border-slate-300"
                                            >
                                                Checksheet
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={8} className="p-5 text-center italic text-slate-500 font-bold tracking-widest uppercase">
                                        No assets scheduled for this month.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="hidden print:grid grid-cols-3 gap-5 p-12 mt-8 text-center text-sm font-bold">
                        <div>
                            <p className="mb-20">Dibuat Oleh,</p>
                            <p className="border-t border-black pt-2 inline-block px-8">ICT Staff</p>
                        </div>
                        <div>
                            <p className="mb-20">Diketahui Oleh,</p>
                            <p className="border-t border-black pt-2 inline-block px-8">ICT Manager</p>
                        </div>
                        <div>
                            <p className="mb-20">Disetujui Oleh,</p>
                            <p className="border-t border-black pt-2 inline-block px-8">General Manager</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Renders the Formal Weekly Report
    const renderWeeklyReport = () => {
        const currentMonthIdx = semester === 'all' ? selectedMonth + 1 : (semester === 2 ? selectedMonth + 7 : selectedMonth + 1);
        const currentWeekIdx = selectedWeek;
        const weekKey = `${currentMonthIdx}_${currentWeekIdx}`;

        const weeklyTasks = displayedSchedule.filter(item => {
            return item.plan?.planning_data?.[weekKey];
        });

        return (
            <div className="bg-white mx-auto shadow-sm text-slate-700 overflow-hidden rounded-3xl border border-[#E1E1E1] print:shadow-none print:m-0 print:border-none w-full" style={{ maxWidth: viewMode === 'week' ? '210mm' : 'none' }}>
                <div className="bg-white p-5 flex items-center justify-between print:p-4 border-b border-[#F0F0F0] print:border-b-2 print:border-slate-800">
                    <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 bg-[#F8F9FB] rounded-2xl flex items-center justify-center p-3 border border-[#E1E1E1] print:border-none">
                            <img src="/infraforce-logo.png" alt="INFRAFORCE Logo" className="w-full h-full object-contain filter grayscale opacity-80 print:grayscale-0 print:opacity-100" />
                        </div>
                        <div>
                            <h2 className="font-black text-2xl tracking-tighter uppercase text-slate-900">Pelaksanaan Pemeliharaan</h2>
                            <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase mt-1">Perangkat PC / Notebook</p>
                            <div className="mt-2 text-[9px] font-mono text-slate-400">No. Dokumen: TCFSG-FM-ICT-01-01</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-black text-sm uppercase tracking-widest text-slate-900">INFRAFORCE, PT. Tri Centrum Fortuna</div>
                        <div className="text-[10px] text-slate-500 mt-1 font-black uppercase tracking-widest">Departemen : ICT</div>
                        <div className="text-[10px] bg-[#F8F9FB] px-4 py-2 border border-[#E1E1E1] rounded-xl mt-3 inline-block print:border-none font-black tracking-widest uppercase text-slate-700">
                            Periode : {months[selectedMonth]} {year} - Minggu ke-{currentWeekIdx}
                        </div>
                    </div>
                </div>

                <div className="p-5 print:p-4">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            @page { size: A4 portrait; margin: 10mm; }
                        }
                    `}} />
                    <table className="w-full border-collapse text-xs shadow-sm print:shadow-none">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-widest text-[10px]">
                                <th className="border-r border-slate-200 p-2 w-[30px] font-black text-center" uppercase tracking-widest>No.</th>
                                <th className="border-r border-slate-200 p-2 font-black text-left" uppercase tracking-widest>User</th>
                                <th className="border-r border-slate-200 p-2 w-[100px] font-black text-center" uppercase tracking-widest>Jenis</th>
                                <th className="border-r border-slate-200 p-2 w-[150px] font-black text-center" uppercase tracking-widest>Department</th>
                                <th className="border-r border-slate-200 p-2 w-[120px] font-black text-center" uppercase tracking-widest>Kondisi</th>
                                <th className="p-2 w-[80px] print:hidden font-black text-center" uppercase tracking-widest>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyTasks.length > 0 ? weeklyTasks.map((item, idx) => {
                                const record = item.records?.[weekKey] || {};
                                const checksheetObj = typeof record.checksheet_data === 'string' ? JSON.parse(record.checksheet_data || '{}') : (record.checksheet_data || {});
                                const hasChecksheet = record.checksheet_data && Object.keys(checksheetObj).length > 0;
                                const afterDisplay = (record.condition_after && record.condition_after !== '-') ? record.condition_after : (hasChecksheet ? "Done" : "-");
                                const conditionColor = afterDisplay === 'Done' || afterDisplay === 'Good' ? 'text-emerald-500 font-bold' : (afterDisplay === '-' ? 'text-slate-400' : 'text-rose-500 font-bold');

                                return (
                                    <tr key={idx} className="hover:bg-[#F8F9FB] transition-colors h-12 border-b border-[#F0F0F0]">
                                        <td className="p-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                                        <td className="p-3 font-bold text-slate-900">{item.asset.user_name || item.asset.contact}</td>
                                        <td className="p-3 text-center text-slate-500 font-medium">{item.asset.category}</td>
                                        <td className="p-3 text-center text-slate-500 font-medium">{item.asset.user_department || item.asset.location || '-'}</td>
                                        <td className={`p-3 text-center font-black text-[9px] uppercase tracking-widest bg-slate-50 ${conditionColor}`}>
                                            {afterDisplay}
                                        </td>
                                        <td className="p-3 text-center print:hidden">
                                            <button
                                                onClick={() => executePlan(item.asset, item.plan?.id, currentMonthIdx, currentWeekIdx, !!item.plan?.actual_data?.[weekKey])}
                                                className="bg-white hover:bg-slate-50 border border-[#E1E1E1] text-slate-700 px-4 py-2 rounded-xl shadow-sm text-[9px] uppercase tracking-widest font-black transition-all hover:border-slate-300"
                                            >
                                                Checksheet
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="p-5 text-center italic text-slate-500 font-bold tracking-widest uppercase">
                                        No assets scheduled for this week.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="hidden print:grid grid-cols-2 gap-5 p-12 mt-8 text-center text-sm font-bold">
                        <div>
                            <p className="mb-20">Pelaksana,</p>
                            <p className="border-t border-black pt-2 inline-block px-12">ICT Staff</p>
                        </div>
                        <div>
                            <p className="mb-20">Mengetahui,</p>
                            <p className="border-t border-black pt-2 inline-block px-12">User / Dept Head</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDailyList = () => {
        const currentMonthIdx = semester === 'all' ? selectedMonth + 1 : (semester === 2 ? selectedMonth + 7 : selectedMonth + 1);
        const currentWeekIdx = selectedWeek;
        const weekKey = `${currentMonthIdx}_${currentWeekIdx}`;

        const todaysTasks = displayedSchedule.filter(item => {
            const isPlanned = item.plan?.planning_data?.[weekKey];
            const isDone = item.plan?.actual_data?.[weekKey];
            return isPlanned || isDone;
        });

        if (todaysTasks.length === 0) {
            return (
                <div className="text-center py-12 bg-white/5 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/10">
                    <CheckSquare size={48} className="mx-auto text-slate-600 mb-4" />
                    <h3 className="text-[10px] font-black tracking-widest uppercase text-slate-500">Terima Kasih, Tidak ada Jadwal Hari ini</h3>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todaysTasks.map(item => {
                    const isDone = item.plan?.actual_data?.[weekKey];
                    return (
                        <div key={item.asset.id} className="bg-white/5 backdrop-blur-md p-4 rounded-[2rem] shadow-xl border border-white/10 border-l-4 border-l-blue-500 flex justify-between items-start transition-all hover:bg-white/10">
                            <div>
                                <h3 className="font-black text-white text-lg">{item.asset.name}</h3>
                                <p className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-widest">{item.asset.inventory_number}</p>
                                <div className="flex items-center space-x-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="bg-white/10 px-2 py-1 border border-white/5 rounded-md text-emerald-400">{item.asset.category}</span>
                                    <span>{item.asset.user_name}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => executePlan(item.asset.id, item.plan?.id, currentMonthIdx, currentWeekIdx, isDone)}
                                    className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}
                                >
                                    {isDone ? 'Done' : 'Execute'}
                                    {!isDone && <Play size={12} className="ml-2" />}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-400">Loading Maintenance Hub...</div>;

    return (
        <div className="flex flex-col space-y-5 min-h-0">
            {/* Page Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-white rounded-3xl shadow-sm border border-[#E1E1E1]">
                        <Calendar size={28} className="text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Maintenance <span className="text-blue-600 italic">Hub</span></h1>
                        <p className="text-slate-500 mt-1 font-medium">Preventive maintenance and service life-cycle management.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex p-1 bg-white rounded-2xl border border-[#E1E1E1] shadow-sm">
                        <button onClick={() => setViewMode('dashboard')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'dashboard' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>Dashboard</button>
                        <button onClick={() => { setViewMode('day'); setMaintenanceType('Daily'); }} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>Daily</button>
                        <button onClick={() => { setViewMode('week'); setMaintenanceType('Weekly'); }} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'week' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>Weekly</button>
                        <button onClick={() => { setViewMode('month'); setMaintenanceType('Monthly'); }} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>Monthly</button>
                        <button onClick={() => { setViewMode('year'); setMaintenanceType('Semester'); }} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'year' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>Yearly</button>
                    </div>
                </div>
            </div>

            {/* Sub-Filters */}
            {viewMode !== 'dashboard' && (
                <div className="flex flex-col sm:flex-row gap-4 print:hidden">
                    <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-white border border-[#E1E1E1] text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all shadow-sm"
                    >
                        <option value="All">All Categories</option>
                        <option value="PC">PC / Desktop</option>
                        <option value="Laptop">Laptop / Notebook</option>
                        <option value="Printer">Printer & Scanner</option>
                        <option value="Network">Network Devices</option>
                        <option value="Server">Servers & Storage</option>
                    </select>
                </div>
            )}

            {/* Top Statistics Section */}
            {stats && viewMode === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 print:hidden">
                    <div className="card-unifi p-5 flex items-center justify-between group hover:border-blue-600/30 transition-all shadow-sm">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Devices</p>
                            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{(stats?.devices?.pc || 0) + (stats?.devices?.laptop || 0)}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center border bg-blue-50 border-blue-100 text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                            <Monitor size={24} />
                        </div>
                    </div>

                    <div className="card-unifi p-4 flex flex-col justify-between shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Device Mix</p>
                            <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
                                <span className="text-blue-600">PC: {stats?.devices?.pc || 0}</span>
                                <span className="text-cyan-500">Laptop: {stats?.devices?.laptop || 0}</span>
                            </div>
                        </div>
                        <div className="h-24 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'PC', value: stats?.devices?.pc || 0 },
                                            { name: 'Laptop', value: stats?.devices?.laptop || 0 }
                                        ]}
                                        innerRadius={25}
                                        outerRadius={35}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="#2563eb" />
                                        <Cell fill="#06b6d4" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card-unifi p-4 flex flex-col justify-between shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Completion</p>
                            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">{stats?.completion?.percentage || 0}%</span>
                        </div>
                        <div className="h-24 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Done', value: stats?.completion?.done || 0 },
                                            { name: 'Pending', value: stats?.completion?.pending || 0 }
                                        ]}
                                        innerRadius={25}
                                        outerRadius={35}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="#10b981" />
                                        <Cell fill="#F1F5F9" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="p-5 rounded-[2rem] bg-slate-900 text-white flex flex-col justify-between shadow-xl">
                        <div>
                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                <CheckCircle size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Global Progress</span>
                            </div>
                            <h3 className="text-4xl font-black tracking-tighter text-white uppercase">{stats?.completion?.percentage || 0}%</h3>
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{stats?.completion?.done || 0} Finished</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stats?.completion?.pending || 0} Remaining</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Expanded Analytics Section */}
            {stats && viewMode === 'dashboard' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-6 print:hidden">
                    
                    {/* Column 1 & 2: Large Chart & Breakdown */}
                    <div className="lg:col-span-2 space-y-3">
                        <div className="card-unifi p-4 shadow-sm h-full">
                            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-6">Device Category Completion Breakdown</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 800 }} />
                                        <Bar dataKey="done" name="Completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="pending" name="Pending" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Urgent / Action Required List */}
                    <div className="card-unifi p-4 shadow-sm flex flex-col h-[360px]">
                        <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-orange-500" /> Action Required
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{ scrollbarWidth: 'thin' }}>
                            {urgentTasks.length > 0 ? urgentTasks.map((task, i) => (
                                <div key={i} className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex justify-between items-center group cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => executePlan(task.asset.id, task.plan?.id, task.month, task.week, false)}>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{task.asset.name}</div>
                                        <div className="text-[10px] font-black uppercase text-orange-600 tracking-widest mt-1">Month {task.month} • Week {task.week}</div>
                                    </div>
                                    <ChevronRight size={18} className="text-orange-300 group-hover:text-orange-600 transition-colors" />
                                </div>
                            )) : (
                                <div className="text-center flex flex-col items-center justify-center h-full">
                                    <CheckCircle size={48} className="text-emerald-400 mb-4 opacity-50" />
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">All caught up!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule & Analytics Control Bar */}
            <div className={`card-unifi p-4 flex flex-col lg:flex-row justify-between items-center gap-4 print:hidden shadow-sm ${viewMode === 'dashboard' ? 'mt-6' : ''}`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-[#F8F9FB] border border-[#E1E1E1] rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="bg-[#F8F9FB] border border-[#E1E1E1] rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-600 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all font-bold"
                        >
                            <option value={1}>Semester I (Jan - Jun)</option>
                            <option value={2}>Semester II (Jul - Dec)</option>
                            <option value="all">Full Year (Jan - Dec)</option>
                        </select>
                    </div>
                    {viewMode !== 'dashboard' && (
                        <>
                            <div className="h-8 w-px bg-slate-100 mx-2 hidden lg:block"></div>
                            <div className="flex gap-2">
                                {viewMode === 'year' && (
                                    <select
                                        value={yearlyMonthFilter}
                                        onChange={(e) => setYearlyMonthFilter(e.target.value)}
                                        className="bg-[#F8F9FB] border border-[#E1E1E1] rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-blue-600"
                                    >
                                        <option value="all">All Months</option>
                                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                )}
                                {(viewMode === 'month' || viewMode === 'week' || viewMode === 'day') && (
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="bg-[#F8F9FB] border border-[#E1E1E1] rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-blue-600"
                                    >
                                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                )}
                                {(viewMode === 'week' || viewMode === 'day') && (
                                    <select
                                        value={selectedWeek}
                                        onChange={(e) => setSelectedWeek(Number(e.target.value))}
                                        className="bg-[#F8F9FB] border border-[#E1E1E1] rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-blue-600"
                                    >
                                        {[1, 2, 3, 4].map(w => <option key={w} value={w}>Week {w}</option>)}
                                    </select>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {(viewMode === 'year' || viewMode === 'week' || viewMode === 'month') && (
                        <>
                            <button onClick={handleExportPDF} className="btn-primary-unifi px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2">
                                <Printer size={16} /> Export PDF
                            </button>
                            <button onClick={() => window.print()} className="px-6 py-3 bg-white border border-[#E1E1E1] text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
                                Print Report
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Display Content Area */}
            <div className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {viewMode === 'day' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayedSchedule.some(item => {
                            const currentMonthIdx = semester === 'all' ? selectedMonth + 1 : (semester === 2 ? selectedMonth + 7 : selectedMonth + 1);
                            const currentWeekIdx = selectedWeek;
                            const weekKey = `${currentMonthIdx}_${currentWeekIdx}`;
                            return item.plan?.planning_data?.[weekKey] || item.plan?.actual_data?.[weekKey];
                        }) ? (
                            displayedSchedule.map(item => {
                                const currentMonthIdx = semester === 'all' ? selectedMonth + 1 : (semester === 2 ? selectedMonth + 7 : selectedMonth + 1);
                                const currentWeekIdx = selectedWeek;
                                const weekKey = `${currentMonthIdx}_${currentWeekIdx}`;
                                const isPlanned = item.plan?.planning_data?.[weekKey];
                                const isDone = item.plan?.actual_data?.[weekKey];
                                if (!isPlanned && !isDone) return null;

                                return (
                                    <div key={item.asset.id} className="card-unifi p-5 space-y-3 group hover:border-blue-600 transition-all shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-sm group-hover:scale-105 transition-transform">
                                                {item.asset.category === 'PC' ? <Monitor size={24} /> : <Laptop size={24} />}
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                {isDone ? 'Completed' : 'Planned'}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.asset.name}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SN: {item.asset.inventory_number || 'UNKNOWN'}</p>
                                        </div>
                                        <div className="flex items-center justify-between pt-6 border-t border-[#F0F0F0]">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assigned User</span>
                                                <span className="text-xs font-bold text-slate-700">{item.asset.user_name || 'Generic Node'}</span>
                                            </div>
                                            <button
                                                onClick={() => executePlan(item.asset.id, item.plan?.id, currentMonthIdx, currentWeekIdx, !!item.plan?.actual_data?.[weekKey])}
                                                className={`p-3 rounded-xl transition-all ${isDone ? 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100' : 'text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-100 shadow-sm'}`}
                                            >
                                                {isDone ? <CheckCircle size={18} /> : <Play size={18} fill="currentColor" />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full card-unifi p-24 text-center space-y-3">
                                <CheckCircle size={48} className="mx-auto text-emerald-500" />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Zero Incidents Scheduled</h3>
                                <p className="text-slate-400 text-sm font-medium">All systems operational for the selected cycle.</p>
                            </div>
                        )}
                    </div>
                )}
                {viewMode === 'week' && renderWeeklyReport()}
                {viewMode === 'month' && renderMonthlyReport()}
                {viewMode === 'year' && renderTable()}
            </div>
        </div>
    );
}

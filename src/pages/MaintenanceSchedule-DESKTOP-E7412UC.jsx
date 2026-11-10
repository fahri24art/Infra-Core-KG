import React, { useState, useEffect } from 'react';
import { Save, Calendar, ArrowLeft, Play, AlertTriangle, ChevronLeft, ChevronRight, CheckSquare, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MaintenanceSchedule() {
    const navigate = useNavigate();
    const [year, setYear] = useState(new Date().getFullYear());
    const [semester, setSemester] = useState(1);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterMyTasks, setFilterMyTasks] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [maintenanceType, setMaintenanceType] = useState('Semester'); // 'Daily', 'Weekly', 'Monthly', 'Semester'

    // View Controls
    const [viewMode, setViewMode] = useState('year'); // 'year', 'month', 'week', 'day'
    const [selectedMonth, setSelectedMonth] = useState(0); // 0-5 relative to semester
    const [selectedWeek, setSelectedWeek] = useState(1); // 1-4

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
    }, [year, semester, maintenanceType]);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            // UPDATED PATH: added /network prefix and type filter
            const res = await fetch(`/api/network/maintenance/schedule?year=${year}&semester=${semester}&type=${maintenanceType}`);
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

    const executePlan = (assetId, planId, mIdx, wIdx) => {
        const weekKey = `${mIdx}_${wIdx}`;
        navigate(`/maintenance/execution/${assetId}?planId=${planId}&weekKey=${weekKey}`);
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
    }

    // Filter Logic
    const displayedSchedule = filterMyTasks
        ? schedule.filter(item => item.asset.user_id === currentUser?.id)
        : schedule;

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
        <div className="bg-white w-full mx-auto shadow-xl text-slate-800 overflow-hidden rounded-sm mb-8 print:shadow-none print:m-0">
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 flex items-center justify-between print:bg-white print:text-black print:border-2 print:border-slate-300 print:p-4 rounded-t-sm">
                <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-white rounded flex items-center justify-center p-1 shadow-lg print:shadow-none print:border print:border-slate-200">
                        <img src="/infraforce-logo.png" alt="INFRAFORCE Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h2 className="font-bold text-2xl tracking-tight uppercase leading-none">Jadwal Pemeliharaan</h2>
                        <p className="text-blue-100 text-sm font-light mt-1 print:text-slate-600">Perangkat PC / Notebook</p>
                        <div className="mt-2 text-[10px] font-mono opacity-60 print:opacity-100 print:text-slate-500">No. Dokumen: TCFSG-FM-ICT-01-01</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-bold text-xl tracking-wide uppercase text-white">INFRAFORCE, PT. Tri Centrum Fortuna</div>
                    <div className="text-base text-blue-100 mt-1 font-medium print:text-slate-700">Departemen : ICT</div>
                    <div className="text-sm bg-white/10 px-3 py-1 rounded mt-2 inline-block border border-white/20 print:bg-slate-100 print:border-slate-300 print:text-slate-800 font-bold">
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
                            <th className="p-2 border-r border-slate-300 min-w-[30px] font-bold text-[10px] uppercase tracking-widest">No</th>
                            <th className="p-2 border-r border-slate-300 min-w-[140px] font-bold text-left" uppercase tracking-widest>Kode Inventaris</th>
                            <th className="p-2 border-r border-slate-300 min-w-[80px] font-bold text-[10px] uppercase tracking-widest">Jenis</th>
                            <th className="p-2 border-r border-slate-300 min-w-[80px] font-bold text-[10px] uppercase tracking-widest">Merk</th>
                            <th className="p-2 border-r border-slate-300 min-w-[100px] font-bold text-left" uppercase tracking-widest>User</th>
                            <th className="p-2 border-r border-slate-300 w-8 font-bold text-[9px]" uppercase tracking-widest>Type</th>

                            {(viewMode === 'month' ? [months[selectedMonth]] : months).map((m, i) => (
                                <th key={i} colSpan={4} className="p-1 border-r border-slate-300 text-center bg-blue-50 text-blue-800 border-b border-blue-200 text-[9px] font-bold" uppercase tracking-widest>{m}</th>
                            ))}
                        </tr>
                        <tr className="bg-slate-50 border-b border-slate-300 text-slate-500">
                            <th colSpan={6}></th>
                            {visibleWeeks.map((w, i) => (
                                <th key={i} className={`border-r border-slate-300 w-5 text-center text-[8px] font-normal ${w.weekIndex === 4 ? 'border-r-2 border-r-slate-400' : ''}`} uppercase tracking-widest>{w.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedSchedule.map((item, idx) => (
                            <React.Fragment key={item.asset.id}>
                                <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 text-center bg-white">{idx + 1}</td>
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 font-medium text-slate-700 bg-white text-[9px] leading-tight">{item.asset.inventory_number || item.asset.name}</td>
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 text-center text-[9px]">{item.asset.category}</td>
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 text-center text-[9px]">{item.asset.manufacturer || '-'}</td>
                                    <td rowSpan={2} className="p-1 border-r border-slate-300 truncate max-w-[90px] text-[9px]">{item.asset.user_name || '-'}</td>
                                    <td className="p-0.5 border-r border-slate-300 font-bold bg-slate-50/50 text-slate-500 text-[8px] text-center h-5">Plan</td>

                                    {visibleWeeks.map((w, wIdx) => {
                                        const key = `${w.monthIndex}_${w.weekIndex}`;
                                        const isPlanned = item.plan?.planning_data?.[key];
                                        return (
                                            <td key={wIdx} className={`border-r border-slate-300 text-center p-0 h-5 ${isPlanned ? 'bg-blue-100 text-blue-700 font-bold' : ''} ${w.weekIndex === 4 ? 'border-r-2 border-r-slate-400' : ''}`}>
                                                {isPlanned ? '●' : ''}
                                            </td>
                                        );
                                    })}
                                </tr>
                                <tr className="border-b border-slate-400/50">
                                    <td className="p-0.5 border-r border-slate-300 font-bold text-slate-500 text-[8px] text-center h-5">Act</td>
                                    {visibleWeeks.map((w, wIdx) => {
                                        const key = `${w.monthIndex}_${w.weekIndex}`;
                                        const isPlanned = item.plan?.planning_data?.[key];
                                        const isDone = item.plan?.actual_data?.[key];
                                        const overdue = !isDone && isOverdue(w.monthIndex, w.weekIndex, isPlanned, isDone);

                                        return (
                                            <td
                                                key={wIdx}
                                                className={`border-r border-slate-300 text-center p-0 h-5 relative group transition-colors
                                                    ${isDone ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600' :
                                                        overdue ? 'bg-red-50 cursor-pointer hover:bg-red-100' :
                                                            isPlanned ? 'bg-white hover:bg-green-50 cursor-pointer text-slate-300' : ''}
                                                    ${w.weekIndex === 4 ? 'border-r-2 border-r-slate-400' : ''}
                                                `}
                                                onClick={() => executePlan(item.asset.id, item.plan?.id, w.monthIndex, w.weekIndex)}
                                            >
                                                {isDone && '✓'}
                                                {overdue && <div className="absolute inset-0 flex items-center justify-center"><AlertTriangle size={8} className="text-red-500" /></div>}
                                                {!isDone && (isPlanned || overdue) && (
                                                    <div className="hidden group-hover:flex absolute inset-0 items-center justify-center bg-green-100 text-green-700">
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
            <div className="bg-white mx-auto shadow-xl text-slate-800 overflow-hidden rounded-sm print:shadow-none print:m-0 w-full" style={{ maxWidth: 'none' }}>
                <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 flex items-center justify-between print:bg-white print:text-black print:border-2 print:border-slate-300 print:p-4 rounded-t-sm">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-1 shadow-lg ring-2 ring-white/30 print:shadow-none print:border print:border-slate-200">
                            <img src="/infraforce-logo.png" alt="INFRAFORCE Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="font-bold text-xl tracking-wide uppercase text-white">Laporan Pemeliharaan Bulanan</h2>
                            <p className="text-blue-100 text-sm font-light print:text-slate-600">Perangkat PC / Notebook</p>
                            <div className="mt-1 text-[9px] font-mono opacity-60 print:opacity-100 print:text-slate-500">No. Dokumen: TCFSG-FM-ICT-01-01</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-lg uppercase tracking-wider text-white">INFRAFORCE, PT. Tri Centrum Fortuna</div>
                        <div className="text-sm text-blue-200 mt-1 font-medium print:text-slate-700">Departemen : ICT</div>
                        <div className="text-xs bg-white/10 px-3 py-1 rounded mt-2 inline-block border border-white/20 print:bg-slate-100 print:text-slate-800 font-bold border-slate-300">
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
                    <table className="w-full border-collapse border border-slate-300 text-xs shadow-sm print:shadow-none">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700">
                                <th className="border border-slate-300 p-2 w-10 font-bold text-center" uppercase tracking-widest>No.</th>
                                <th className="border border-slate-300 p-2 w-12 font-bold text-center" uppercase tracking-widest>Minggu</th>
                                <th className="border border-slate-300 p-2 w-24 font-bold text-center" uppercase tracking-widest>Tanggal</th>
                                <th className="border border-slate-300 p-2 w-1/4 font-bold text-left" uppercase tracking-widest>User</th>
                                <th className="border border-slate-300 p-2 w-1/6 font-bold text-center" uppercase tracking-widest>Jenis</th>
                                <th className="border border-slate-300 p-2 w-1/6 font-bold text-center" uppercase tracking-widest>Department</th>
                                <th className="border border-slate-300 p-2 w-24 font-bold text-center" uppercase tracking-widest>Kondisi</th>
                                <th className="border border-slate-300 p-2 w-20 print:hidden font-bold text-center" uppercase tracking-widest>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyTasks.length > 0 ? monthlyTasks.map((item, idx) => {
                                const record = item.records?.[item.weekKey] || {};
                                const hasChecksheet = record.checksheet_data && Object.keys(JSON.parse(record.checksheet_data || '{}')).length > 0;
                                const beforeColor = record.condition_before === 'Good' ? 'text-green-600 font-bold' : (record.condition_before === 'Not Good' ? 'text-red-600 font-bold' : 'text-slate-400');
                                const mDate = record.maintenance_date ? new Date(record.maintenance_date).toLocaleDateString('id-ID') : '-';

                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors h-10 border-b border-slate-200">
                                        <td className="border-r border-slate-300 p-2 text-center text-slate-500">{idx + 1}</td>
                                        <td className="border-r border-slate-300 p-2 text-center font-bold text-blue-600">W{item.w}</td>
                                        <td className="border-r border-slate-300 p-2 text-center text-slate-700 font-medium">{mDate}</td>
                                        <td className="border-r border-slate-300 p-2 font-medium text-slate-700">{item.asset.user_name || item.asset.contact}</td>
                                        <td className="border-r border-slate-300 p-2 text-center text-slate-600">{item.asset.category}</td>
                                        <td className="border-r border-slate-300 p-2 text-center text-slate-600">{item.asset.user_department || item.asset.location || '-'}</td>
                                        <td className={`border-r border-slate-300 p-2 text-center font-medium ${beforeColor}`}>
                                            {record.condition_before || '-'}
                                        </td>
                                        <td className="p-2 text-center print:hidden">
                                            <button
                                                onClick={() => executePlan(item.asset.id, item.plan?.id, monthIndex, item.w)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm text-[10px] uppercase tracking-wider font-semibold transition-colors"
                                            >
                                                Checksheet
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={8} className="border border-slate-300 p-5 text-center italic text-slate-400 bg-slate-50">
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
            <div className="bg-white mx-auto shadow-xl text-slate-800 overflow-hidden rounded-sm print:shadow-none print:m-0 w-full" style={{ maxWidth: viewMode === 'week' ? '210mm' : 'none' }}>
                <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 flex items-center justify-between print:bg-white print:text-black print:border-2 print:border-slate-300 print:p-4 rounded-t-sm">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-1 shadow-lg ring-2 ring-white/30 print:shadow-none print:border print:border-slate-200">
                            <img src="/infraforce-logo.png" alt="INFRAFORCE Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="font-bold text-xl tracking-wide uppercase text-white">Pelaksanaan Pemeliharaan</h2>
                            <p className="text-blue-100 text-sm font-light print:text-slate-600">Perangkat PC / Notebook</p>
                            <div className="mt-1 text-[9px] font-mono opacity-60 print:opacity-100 print:text-slate-500">No. Dokumen: TCFSG-FM-ICT-01-01</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-lg uppercase tracking-wider text-white">INFRAFORCE, PT. Tri Centrum Fortuna</div>
                        <div className="text-sm text-blue-200 mt-1 font-medium print:text-slate-700">Departemen : ICT</div>
                        <div className="text-xs bg-white/10 px-3 py-1 rounded mt-2 inline-block border border-white/20 print:bg-slate-100 print:text-slate-800 font-bold border-slate-300">
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
                    <table className="w-full border-collapse border border-slate-300 text-xs shadow-sm print:shadow-none">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700">
                                <th rowSpan={2} className="border border-slate-300 p-2 w-10 font-bold text-center" uppercase tracking-widest>No.</th>
                                <th rowSpan={2} className="border border-slate-300 p-2 w-1/4 font-bold text-left" uppercase tracking-widest>User</th>
                                <th rowSpan={2} className="border border-slate-300 p-2 w-1/6 font-bold text-center" uppercase tracking-widest>Jenis</th>
                                <th rowSpan={2} className="border border-slate-300 p-2 w-1/6 font-bold text-center" uppercase tracking-widest>Department</th>
                                <th colSpan={2} className="border border-slate-300 p-1 font-bold text-center bg-blue-50 text-blue-800" uppercase tracking-widest>Sebelum Proses</th>
                                <th colSpan={2} className="border border-slate-300 p-1 font-bold text-center bg-green-50 text-green-800" uppercase tracking-widest>Sesudah Proses</th>
                                <th rowSpan={2} className="border border-slate-300 p-2 w-20 print:hidden font-bold text-center" uppercase tracking-widest>Action</th>
                            </tr>
                            <tr className="bg-slate-50 text-slate-600">
                                <th className="border border-slate-300 p-1 w-24 bg-blue-50/50 text-blue-900 font-semibold text-center" uppercase tracking-widest>Kondisi</th>
                                <th className="border border-slate-300 p-1 w-12 bg-blue-50/50 text-blue-900 font-semibold text-center" uppercase tracking-widest>Paraf</th>
                                <th className="border border-slate-300 p-1 w-24 bg-green-50/50 text-green-900 font-semibold text-center" uppercase tracking-widest>Kondisi</th>
                                <th className="border border-slate-300 p-1 w-12 bg-green-50/50 text-green-900 font-semibold text-center" uppercase tracking-widest>Paraf</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyTasks.length > 0 ? weeklyTasks.map((item, idx) => {
                                const record = item.records?.[weekKey] || {};
                                const hasChecksheet = record.checksheet_data && Object.keys(JSON.parse(record.checksheet_data || '{}')).length > 0;
                                const afterDisplay = record.condition_after ? record.condition_after : (hasChecksheet ? "Done" : "-");
                                const beforeColor = record.condition_before === 'Good' ? 'text-green-600 font-bold' : (record.condition_before === 'Not Good' ? 'text-red-600 font-bold' : 'text-slate-400');

                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors h-10 border-b border-slate-200">
                                        <td className="border-r border-slate-300 p-2 text-center text-slate-500">{idx + 1}</td>
                                        <td className="border-r border-slate-300 p-2 font-medium text-slate-700">{item.asset.user_name || item.asset.contact}</td>
                                        <td className="border-r border-slate-300 p-2 text-center text-slate-600">{item.asset.category}</td>
                                        <td className="border-r border-slate-300 p-2 text-center text-slate-600">{item.asset.user_department || item.asset.location || '-'}</td>

                                        <td className="border-r border-slate-300 p-0 text-center relative group bg-blue-50/10">
                                            <select
                                                value={record.condition_before || ""}
                                                onChange={(e) => updateCondition(item.asset.id, weekKey, e.target.value)}
                                                className={`w-full h-full text-center border-none outline-none appearance-none bg-transparent cursor-pointer print:hidden p-2 text-xs ${beforeColor}`}
                                            >
                                                <option value="" className="text-slate-400">- Select -</option>
                                                <option value="Good" className="text-green-600 font-bold">Good</option>
                                                <option value="Not Good" className="text-red-600 font-bold">Not Good</option>
                                            </select>
                                            <div className="hidden print:flex items-center justify-center w-full h-full p-2">
                                                {record.condition_before || '-'}
                                            </div>
                                        </td>

                                        <td className="border-r border-slate-300 p-2 text-[11px]"></td>

                                        <td className="border-r border-slate-300 p-2 text-center font-medium bg-green-50/10 text-slate-700 truncate max-w-[120px]" title={afterDisplay}>
                                            {afterDisplay}
                                        </td>

                                        <td className="border-r border-slate-300 p-2 text-[11px]"></td>

                                        <td className="p-2 text-center print:hidden">
                                            <button
                                                onClick={() => executePlan(item.asset.id, item.plan?.id, currentMonthIdx, currentWeekIdx)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm text-[10px] uppercase tracking-wider font-semibold transition-colors"
                                            >
                                                Checksheet
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={9} className="border border-slate-300 p-5 text-center italic text-slate-400 bg-slate-50">
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
        const today = new Date();
        const m = today.getMonth() + 1;
        const w = Math.ceil(today.getDate() / 7);
        const todayKey = `${m}_${w}`;

        const todaysTasks = displayedSchedule.filter(item => {
            const isPlanned = item.plan?.planning_data?.[todayKey];
            const isDone = item.plan?.actual_data?.[todayKey];
            return isPlanned || isDone;
        });

        if (todaysTasks.length === 0) {
            return (
                <div className="text-center py-12 bg-white rounded shadow border border-slate-200">
                    <CheckSquare size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-600">No maintenance scheduled for today.</h3>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todaysTasks.map(item => {
                    const isDone = item.plan?.actual_data?.[todayKey];
                    return (
                        <div key={item.asset.id} className="bg-white p-4 rounded shadow border-l-4 border-blue-500 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-slate-800">{item.asset.name}</h3>
                                <p className="text-xs text-slate-500 mb-2">{item.asset.inventory_number}</p>
                                <div className="flex items-center space-x-2 text-sm text-slate-600">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{item.asset.category}</span>
                                    <span>{item.asset.user_name}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => executePlan(item.asset.id, item.plan?.id, m, w)}
                                className={`px-3 py-1.5 rounded text-xs font-bold flex items-center ${isDone ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                {isDone ? 'Done' : 'Execute'}
                                {!isDone && <Play size={12} className="ml-1" />}
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return <div className="p-10 text-center font-bold text-slate-500">Loading Schedule...</div>;

    return (
        <div className="p-4 min-h-screen bg-slate-50 print:bg-white print:p-0">
            {/* Frequency Tabs & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-white/10 backdrop-blur-md mb-6 print:hidden">
                <div className="flex bg-slate-800 p-1 rounded-lg border border-white/5">
                    {['Daily', 'Weekly', 'Monthly', 'Semester'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setMaintenanceType(t)}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${maintenanceType === t
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {t === 'Semester' ? '6-MONTH' : t.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="flex items-center space-x-2">
                    {maintenanceType === 'Semester' && (
                        <button
                            onClick={handleGenerate}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center text-xs font-bold shadow-lg transition-all"
                        >
                            <Play size={14} className="mr-2" /> GENERATE 6-MONTH PLAN
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center text-xs font-bold shadow-lg transition-all border border-white/10"
                    >
                        <Printer size={14} className="mr-2" /> PRINT REPORT
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 print:hidden">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Maintenance Schedule</h1>
                        <div className="flex items-center space-x-2 mt-1">
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="text-sm border-slate-300 border rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <span className="text-slate-400 font-bold">•</span>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="text-sm border-slate-300 border rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold text-blue-700"
                            >
                                <option value={1}>Semester 1 (Jan-Jun)</option>
                                <option value={2}>Semester 2 (Jul-Dec)</option>
                                <option value="all">Full Year (Jan-Des)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex bg-slate-100 p-1 rounded font-bold text-xs uppercase tracking-wider">
                        <button onClick={() => setViewMode('year')} className={`px-4 py-1.5 rounded transition-all ${viewMode === 'year' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Tahunan</button>
                        <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 rounded transition-all ${viewMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Bulanan</button>
                        <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 rounded transition-all ${viewMode === 'week' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Mingguan</button>
                        <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 rounded transition-all ${viewMode === 'day' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Harian</button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

                    {viewMode === 'month' || viewMode === 'week' ? (
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="text-sm border-slate-300 border rounded px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium min-w-[100px]"
                        >
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    ) : null}

                    {viewMode === 'week' && (
                        <select
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(Number(e.target.value))}
                            className="text-sm border-slate-300 border rounded px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                        >
                            {[1, 2, 3, 4].map(w => <option key={w} value={w}>Week {w}</option>)}
                        </select>
                    )}

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

                    <button onClick={handleGenerate} title="Re-generate schedule for this year" className="bg-white text-blue-600 border border-blue-200 px-4 py-1.5 rounded text-sm font-bold hover:bg-blue-50 flex items-center shadow-sm transition-all active:scale-95">
                        <Play size={14} className="mr-2" /> Generate
                    </button>

                    {(viewMode === 'year' || viewMode === 'week' || viewMode === 'month') && (
                        <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-1.5 rounded text-sm font-bold hover:bg-blue-700 flex items-center shadow-md shadow-blue-200 transition-all active:scale-95">
                            <Printer size={16} className="mr-2" /> Export / Cetak
                        </button>
                    )}
                </div>
            </div>

            <div className="print:block">
                {viewMode === 'day' && renderDailyList()}
                {viewMode === 'week' && renderWeeklyReport()}
                {viewMode === 'month' && renderMonthlyReport()}
                {viewMode === 'year' && renderTable()}
            </div>
        </div>
    );
}

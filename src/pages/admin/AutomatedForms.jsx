import React, { useState } from 'react';
import { FileText, Download, ShieldAlert, Ticket, MonitorSmartphone, History, Wrench, ArrowRightLeft, Database, Calendar, Eye, FileOutput, CalendarDays, ClipboardList } from 'lucide-react';
import { generateCyberLogPdf } from '../../utils/generateCyberLogPdf';
import { generateHelpdeskReportPdf } from '../../utils/generateHelpdeskReportPdf';
import { generateAssetListPdf } from '../../utils/generateAssetListPdf';
import { generateAssetHistoryPdf } from '../../utils/generateAssetHistoryPdf';
import { generatePCPdf } from '../../utils/generatePCPdf';
import { generateNetworkPdf } from '../../utils/generateNetworkPdf';
import { generatePrinterPdf } from '../../utils/generatePrinterPdf';
import { generateHandoverPdf } from '../../utils/generateHandoverPdf';
import { generateBackupPdf } from '../../utils/generateBackupPdf';
import { generateMaintenanceSchedulePdf } from '../../utils/generateMaintenanceSchedulePdf';
import { generateMaintenanceExecutionPdf } from '../../utils/generateMaintenanceExecutionPdf';
import { generateJobListPdf } from '../../utils/generateJobListPdf';
import { generateBackupReportPdf } from '../../utils/generateBackupReportPdf';
import { generatePhonePdf } from '../../utils/generatePhonePdf';
import { generateUserAccessPdf } from '../../utils/generateUserAccessPdf';
import { generateUptimeKpiPdf } from '../../utils/generateUptimeKpiPdf';
import { generateItRequestPdf } from '../../utils/generateItRequestPdf';
import { Users, Activity } from 'lucide-react'; // adding specific icons for them

export default function AutomatedForms() {
    const [loading, setLoading] = useState(false);
    
    const user = JSON.parse((typeof window !== 'undefined' && sessionStorage.getItem('user')) || 'null');
    const isSuperAdmin = user && ['super_user', 'superuser', 'administrator', 'admin'].includes(user.role?.toLowerCase());
    const userOrg = user?.organization || 'TCF-SG';
    const [currentOrg, setCurrentOrg] = useState(() => {
        return isSuperAdmin 
            ? ((typeof window !== 'undefined' && sessionStorage.getItem('organization')) || userOrg)
            : userOrg;
    });
    const isKG = currentOrg.toUpperCase().includes('KG');

    const handlePlantSwitch = (newOrg) => {
        if (!isSuperAdmin) return;
        sessionStorage.setItem('organization', newOrg);
        setCurrentOrg(newOrg);
        if (user) {
            user.organization = newOrg;
            sessionStorage.setItem('user', JSON.stringify(user));
        }
    };
    
    // Default to current month/year
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const months = [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
        { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
    ];

    const generateCyberLogs = async (action = 'download') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/network/wazuh/alerts?limit=500`);
            const data = await res.json();
            
            const filteredData = (data.data || []).filter(log => {
                const logDate = new Date(log.timestamp);
                const isDateMatch = logDate.getMonth() + 1 === selectedMonth && logDate.getFullYear() === selectedYear;
                const level = parseInt(log.rule_level || log.level || 0);
                const isCritical = level >= 10;
                return isDateMatch && isCritical;
            });
            
            generateCyberLogPdf(filteredData, selectedMonth, selectedYear, action);
        } catch (error) {
            console.error(error);
            alert("Gagal menarik data log cyber attack.");
        } finally {
            setLoading(false);
        }
    };

    const generateHelpdeskLogs = async (action = 'download') => {
        setLoading(true);
        try {
            const res = await fetch('/api/network/tickets');
            const data = await res.json();
            
            const filteredData = (data || []).filter(ticket => {
                const logDate = new Date(ticket.created_at);
                return logDate.getMonth() + 1 === selectedMonth && logDate.getFullYear() === selectedYear;
            });
            
            generateHelpdeskReportPdf(filteredData, selectedMonth, selectedYear, action);
        } catch (error) {
            console.error(error);
            alert("Gagal menarik data helpdesk.");
        } finally {
            setLoading(false);
        }
    };

    const generateAssets = async (action = 'download') => {
        setLoading(true);
        try {
            const res = await fetch('/api/network/assets');
            const data = await res.json();
            generateAssetListPdf(data, action);
        } catch (error) {
            console.error(error);
            alert("Gagal menarik data aset.");
        } finally {
            setLoading(false);
        }
    };

    const generateUserAccess = async (action = 'download') => {
        setLoading(true);
        try {
            const res = await fetch('/api/network/users');
            const data = await res.json();
            generateUserAccessPdf(data, action);
        } catch (error) {
            console.error(error);
            alert("Gagal menarik data user.");
        } finally {
            setLoading(false);
        }
    };

    const generateUptimeKpi = async (action = 'download') => {
        setLoading(true);
        try {
            const resServer = await fetch(`/api/network/uptime-monthly?year=${selectedYear}`);
            const dataServer = await resServer.json();
            const resIsp = await fetch(`/api/network/isp-bandwidth-monthly?year=${selectedYear}`);
            const dataIsp = await resIsp.json();
            generateUptimeKpiPdf(dataServer, dataIsp, selectedYear, action);
        } catch (error) {
            console.error(error);
            alert("Gagal menarik data KPI jaringan.");
        } finally {
            setLoading(false);
        }
    };

    const downloadBlankForm = (generator, docType = 'pemeliharaan', action = 'download') => {
        const dummyAsset = { name: '', code: '', category: '', department: '', user_name: '', specs: '{}', ip_address: '', location: '' };
        const dummyForm = { date: '', problem: '', action: '', remarks: '', technician: '', created_at: new Date().toISOString(), year: selectedYear };
        generator(dummyAsset, dummyForm, action, docType);
    };

    const downloadCustomForm = (generator, action = 'download', type = '') => {
        if (type === 'schedule') {
            generator([], selectedYear, action);
        } else if (type === 'execution') {
            generator([], selectedMonth, selectedYear, action);
        } else if (type === 'joblist') {
            generator([], selectedMonth, selectedYear, action);
        } else if (type === 'handover') {
            generateHandoverPdf('.........................................', { category: 'PC' }, { divisi: '.........................................' }, action);
        }
    };

    const reports = [
        {
            title: "Log Cyber Attack",
            description: "Rekapitulasi otomatis serangan siber, malware, dan lockdown dari InfraGuard.",
            icon: <ShieldAlert size={24} className="text-red-500" />,
            color: "bg-red-50 border-red-200",
            hover: "hover:bg-red-100 hover:border-red-300",
            action: generateCyberLogs,
            requiresDate: true
        },
        {
            title: "Rekap IT Helpdesk",
            description: "Daftar histori tiket komplain IT (masuk & selesai) beserta SLA response time.",
            icon: <Ticket size={24} className="text-blue-500" />,
            color: "bg-blue-50 border-blue-200",
            hover: "hover:bg-blue-100 hover:border-blue-300",
            action: generateHelpdeskLogs,
            requiresDate: true
        },
        {
            title: "Daftar Aset IT TCF",
            description: "Export daftar seluruh aset aktif (PC, Laptop, Server, Network) saat ini.",
            icon: <MonitorSmartphone size={24} className="text-indigo-500" />,
            color: "bg-indigo-50 border-indigo-200",
            hover: "hover:bg-indigo-100 hover:border-indigo-300",
            action: generateAssets,
            requiresDate: false
        },
        {
            title: "Log Backup Server",
            description: "Catatan otomatis backup data server dari sistem NAS/Proxmox.",
            icon: <Database size={24} className="text-emerald-500" />,
            color: "bg-emerald-50 border-emerald-200",
            hover: "hover:bg-emerald-100 hover:border-emerald-300",
            action: (action) => generateBackupReportPdf([], selectedMonth, selectedYear, action),
            requiresDate: true
        },
        {
            title: "Daftar Hak Akses Pengguna",
            description: "Daftar seluruh pengguna aktif sistem beserta otorisasi Role (User Access Matrix).",
            icon: <Users size={24} className="text-orange-500" />,
            color: "bg-orange-50 border-orange-200",
            hover: "hover:bg-orange-100 hover:border-orange-300",
            action: generateUserAccess,
            requiresDate: false
        },
        {
            title: "KPI Uptime Jaringan",
            description: "Rekap pencapaian bulanan SLA Uptime Server dan Jaringan Internet tahun berjalan.",
            icon: <Activity size={24} className="text-pink-500" />,
            color: "bg-pink-50 border-pink-200",
            hover: "hover:bg-pink-100 hover:border-pink-300",
            action: generateUptimeKpi,
            requiresDate: true // Because it uses selectedYear
        }
    ];

    const blankForms = [
        {
            title: "Check Sheet Pemeliharaan Printer",
            description: "Checksheet perawatan rutin perangkat Printer dan Scanner.",
            icon: <FileOutput size={20} className="text-slate-500" />,
            actionDownload: () => downloadBlankForm(generatePrinterPdf, 'pemeliharaan', 'download'),
            actionPreview: () => downloadBlankForm(generatePrinterPdf, 'pemeliharaan', 'preview')
        },
        {
            title: "Checksheet Perbaikan PC dan Laptop",
            description: "Form berita acara untuk riwayat perbaikan PC / Laptop.",
            icon: <Wrench size={20} className="text-slate-500" />,
            actionDownload: () => downloadBlankForm(generatePCPdf, 'perbaikan', 'download'),
            actionPreview: () => downloadBlankForm(generatePCPdf, 'perbaikan', 'preview')
        },
        {
            title: "Checksheet Perbaikan Printer",
            description: "Form berita acara untuk riwayat perbaikan Printer.",
            icon: <Wrench size={20} className="text-slate-500" />,
            actionDownload: () => downloadBlankForm(generatePrinterPdf, 'perbaikan', 'download'),
            actionPreview: () => downloadBlankForm(generatePrinterPdf, 'perbaikan', 'preview')
        },
        {
            title: "Check Sheet Perbaikan Jaringan",
            description: "Form berita acara untuk riwayat perbaikan perangkat Network.",
            icon: <Wrench size={20} className="text-slate-500" />,
            actionDownload: () => downloadBlankForm(generateNetworkPdf, 'perbaikan', 'download'),
            actionPreview: () => downloadBlankForm(generateNetworkPdf, 'perbaikan', 'preview')
        },
        {
            title: "Form Jadwal Pemeliharaan Perangkat ICT",
            description: "Template matrix jadwal pemeliharaan tahunan perangkat ICT.",
            icon: <CalendarDays size={20} className="text-slate-500" />,
            actionDownload: () => downloadCustomForm(generateMaintenanceSchedulePdf, 'download', 'schedule'),
            actionPreview: () => downloadCustomForm(generateMaintenanceSchedulePdf, 'preview', 'schedule')
        },
        {
            title: "Form Pelaksanaan Pemeliharaan PC & Notebook",
            description: "Form log pelaksanaan pemeliharaan bulanan.",
            icon: <ClipboardList size={20} className="text-slate-500" />,
            actionDownload: () => downloadCustomForm(generateMaintenanceExecutionPdf, 'download', 'execution'),
            actionPreview: () => downloadCustomForm(generateMaintenanceExecutionPdf, 'preview', 'execution')
        },
        {
            title: "Form ICT Job List",
            description: "Log pekerjaan / task list departemen ICT.",
            icon: <ClipboardList size={20} className="text-slate-500" />,
            actionDownload: () => downloadCustomForm(generateJobListPdf, 'download', 'joblist'),
            actionPreview: () => downloadCustomForm(generateJobListPdf, 'preview', 'joblist')
        },
        {
            title: "Kartu Riwayat Aset",
            description: "Template kosong riwayat perawatan untuk ditempel pada PC/Mesin.",
            icon: <ClipboardList size={20} className="text-slate-500" />,
            actionDownload: () => downloadCustomForm(null, 'download', 'kartu_riwayat'),
            actionPreview: () => downloadCustomForm(null, 'preview', 'kartu_riwayat')
        },
        {
            title: "Formulir Permintaan Perangkat ICT",
            description: "Form pengajuan perangkat IT baru, hardware, software atau consumable.",
            icon: <FileText size={20} className="text-slate-500" />,
            actionDownload: () => generateItRequestPdf('download'),
            actionPreview: () => generateItRequestPdf('preview')
        },
        {
            title: "Pemeliharaan PC/Laptop",
            description: "Checksheet perawatan rutin PC/Laptop.",
            icon: <Wrench size={20} className="text-slate-500" />,
            actionDownload: () => downloadBlankForm(generatePCPdf, 'pemeliharaan', 'download'),
            actionPreview: () => downloadBlankForm(generatePCPdf, 'pemeliharaan', 'preview')
        },
        {
            title: "Pemeliharaan Jaringan",
            description: "Checksheet perawatan perangkat jaringan (Switch/Router).",
            icon: <Wrench size={20} className="text-slate-500" />,
            actionDownload: () => downloadBlankForm(generateNetworkPdf, 'pemeliharaan', 'download'),
            actionPreview: () => downloadBlankForm(generateNetworkPdf, 'pemeliharaan', 'preview')
        },
        {
            title: "Berita Acara Serah Terima",
            description: "Form BAST penyerahan perangkat IT ke User.",
            icon: <ArrowRightLeft size={20} className="text-slate-500" />,
            actionDownload: () => downloadCustomForm(null, 'download', 'handover'),
            actionPreview: () => downloadCustomForm(null, 'preview', 'handover') // Notice handover currently only does one thing, open blank. It opens in new window inherently so download vs preview is similar, but let's just leave it as is.
        },
        {
            title: "Checksheet Server",
            description: "Form catatan manual backup data server harian/mingguan.",
            icon: <Database size={20} className="text-slate-500" />,
            actionDownload: () => downloadBlankForm(generateBackupPdf, 'pemeliharaan', 'download'),
            actionPreview: () => downloadBlankForm(generateBackupPdf, 'pemeliharaan', 'preview')
        },
        {
            title: "Checksheet Smartphone / Tablet",
            description: "Checksheet perawatan rutin perangkat mobile / tablet operasional.",
            icon: <MonitorSmartphone size={20} className="text-slate-500" />,
            actionDownload: () => downloadBlankForm(generatePhonePdf, 'pemeliharaan', 'download'),
            actionPreview: () => downloadBlankForm(generatePhonePdf, 'pemeliharaan', 'preview')
        }
    ];

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-[#E1E1E1]">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                                System Reports
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                    isKG ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                }`}>
                                    {isKG ? 'TCFKG (Karawang)' : 'TCFSG (Sadang)'}
                                </span>
                            </h1>
                        </div>
                    </div>
                    <p className="text-slate-500 font-medium">Generate laporan operasional otomatis & Template Dokumen Kontrol ({isKG ? 'Standar Karawang' : 'Standar Sadang'}).</p>
                </div>
                
                {/* Global Filters & Plant Switcher */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Plant Switcher / Indicator */}
                    {isSuperAdmin ? (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                            <button
                                onClick={() => handlePlantSwitch('TCF-SG')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                    !isKG ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Plant SG
                            </button>
                            <button
                                onClick={() => handlePlantSwitch('TCF-KG')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                    isKG ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                                Plant KG
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700" title="Plant terkunci sesuai hak akses user">
                            <span className={`w-2 h-2 rounded-full ${isKG ? 'bg-amber-500' : 'bg-indigo-600'}`} />
                            <span>{isKG ? 'Plant KG (Karawang)' : 'Plant SG (Sadang)'}</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-1">🔒 Locked</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-[#E1E1E1]">
                    <div className="flex items-center gap-2 pl-3">
                        <Calendar size={18} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">Periode:</span>
                    </div>
                    <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-3 py-2 bg-white border border-[#E1E1E1] rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 text-sm font-bold"
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-3 py-2 bg-white border border-[#E1E1E1] rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 text-sm font-bold"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

            {/* Automated Data Reports */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Database size={20} className="text-indigo-600" />
                    Laporan Otomatis (Live Data)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reports.map((report, idx) => (
                        <div key={idx} className={`p-4 rounded-3xl border transition-all ${report.color} ${report.hover}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                                    {report.icon}
                                </div>
                                {report.requiresDate && (
                                    <span className="px-3 py-1 bg-white text-xs font-bold rounded-full text-slate-600 shadow-sm border border-slate-100">
                                        Bulanan
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{report.title}</h3>
                            <p className="text-sm text-slate-600 font-medium mb-6 line-clamp-2">{report.description}</p>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => report.action('preview')}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all hover:border-blue-300 hover:text-blue-600"
                                >
                                    <Eye size={18} />
                                    Preview
                                </button>
                                <button 
                                    onClick={() => report.action('download')}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all hover:border-slate-300"
                                >
                                    <Download size={18} />
                                    Download
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Blank Checksheets Section */}
            <div className="pt-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-slate-600" />
                    Dokumen Kontrol (Template Manual)
                </h2>
                <div className="bg-white rounded-3xl border border-[#E1E1E1] shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F0F0F0]">
                        {blankForms.map((form, idx) => (
                            <div key={idx} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-[#F0F0F0] md:border-b-0">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                        {form.icon}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm leading-tight mb-1">{form.title}</div>
                                        <div className="text-xs text-slate-500 line-clamp-2" title={form.description}>{form.description}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <button 
                                        onClick={form.actionPreview}
                                        className="p-2.5 rounded-xl bg-white border border-[#E1E1E1] text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                                        title="Preview Form PDF"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button 
                                        onClick={form.actionDownload}
                                        className="p-2.5 rounded-xl bg-white border border-[#E1E1E1] text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                                        title="Download Template PDF"
                                    >
                                        <Download size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}

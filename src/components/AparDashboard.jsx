import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, Info, CheckCircle, XCircle, Calendar, Download, Eye, QrCode, History, Camera, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AparDashboard({ isGuest = false }) {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [year, setYear] = useState(new Date().getFullYear());
    const [photoModalData, setPhotoModalData] = useState(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'expired_date', order: 'asc' });
    const [historySortConfig, setHistorySortConfig] = useState({ key: 'check_date', order: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [historySearchTerm, setHistorySearchTerm] = useState('');

    const requestSort = (key, isHistory = false) => {
        if (isHistory) {
            let order = 'desc';
            if (historySortConfig.key === key && historySortConfig.order === 'desc') order = 'asc';
            setHistorySortConfig({ key, order });
        } else {
            let order = 'asc';
            if (sortConfig.key === key && sortConfig.order === 'asc') order = 'desc';
            setSortConfig({ key, order });
        }
    };

    const SortableHeader = ({ label, sortKey, isHistory = false, align = 'left' }) => {
        const config = isHistory ? historySortConfig : sortConfig;
        return (
            <th className={`px-3 py-1.5 cursor-pointer hover:text-indigo-600 transition-colors group text-${align}`} onClick={() => requestSort(sortKey, isHistory)}>
                <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
                    {label}
                    {config.key === sortKey ? (
                        <span className="text-[10px] text-indigo-500 font-black">{config.order === 'asc' ? '↑' : '↓'}</span>
                    ) : (
                        <span className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100">↕</span>
                    )}
                </div>
            </th>
        );
    };

    const downloadExcel = () => {
        if (!data || data.monitoringMatrix.length === 0) return;
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Header
        csvContent += ["No", "Kode APAR", "Lokasi", "Tgl Expired", ...months, "Status Akhir"].join(",") + "\n";
        
        // Rows
        data.monitoringMatrix.forEach((apar, i) => {
            const row = [
                i + 1,
                apar.code,
                `"${apar.location}"`,
                new Date(apar.expired_date).toLocaleDateString('id-ID'),
                ...apar.months.map(mObj => mObj?.status === 'ok' ? 'V' : (mObj?.status === 'bad' ? 'X' : '')),
                apar.latestStatus
            ];
            csvContent += row.join(",") + "\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Monitoring_APAR_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/hr/apars/dashboard?year=${year}&_t=${Date.now()}`);
            const result = await res.json();
            if (result.success) {
                setData(result.data);
                setErrorMsg(null);
            } else {
                setErrorMsg(result.error || 'API returned success: false');
            }
        } catch (err) {
            console.error('Failed to fetch APAR dashboard', err);
            setErrorMsg(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [year]);

    if (loading) return <div className="flex justify-center items-center h-64 text-slate-400 font-bold">Loading Dashboard...</div>;
    if (errorMsg || !data) return (
        <div className="flex flex-col justify-center items-center h-64">
            <p className="text-red-500 font-bold">Gagal memuat data dashboard.</p>
            <p className="text-red-400 text-sm mt-2 font-mono">{errorMsg}</p>
        </div>
    );

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

    return (
        <div className="space-y-3 animate-fade-in pb-10">
            {/* Expiring Alerts */}
            {(data.expiredCount > 0 || data.expiringSoonCount > 0) && (
                <div className={`p-4 rounded-2xl border-l-4 shadow-sm flex gap-4 items-start ${data.expiredCount > 0 ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'}`}>
                    <AlertTriangle className={data.expiredCount > 0 ? 'text-red-500' : 'text-yellow-500'} size={24} />
                    <div>
                        <h3 className={`font-bold ${data.expiredCount > 0 ? 'text-red-800' : 'text-yellow-800'}`}>Peringatan Kadaluarsa APAR</h3>
                        <ul className={`mt-1 text-sm list-disc pl-4 ${data.expiredCount > 0 ? 'text-red-700' : 'text-yellow-700'}`}>
                            {data.expiredCount > 0 && (
                                <li>
                                    <strong>{data.expiredCount} APAR</strong> telah melewati tanggal kadaluarsa! Segera lakukan pengisian ulang atau penggantian.
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {data.expiredList?.map(a => (
                                            <button key={a.id} onClick={() => navigate('/hse/apar?edit=' + a.code)} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-bold text-xs transition-colors shadow-sm cursor-pointer">{a.code}</button>
                                        ))}
                                    </div>
                                </li>
                            )}
                            {data.expiringSoonCount > 0 && (
                                <li className={data.expiredCount > 0 ? "mt-2" : ""}>
                                    <strong>{data.expiringSoonCount} APAR</strong> akan kadaluarsa dalam waktu kurang dari 30 hari.
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {data.expiringSoonList?.map(a => (
                                            <button key={a.id} onClick={() => navigate('/hse/apar?edit=' + a.code)} className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded font-bold text-xs transition-colors shadow-sm cursor-pointer">{a.code}</button>
                                        ))}
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl p-5 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total APAR</div>
                    <div className="mt-2 text-3xl font-black text-slate-800">{data.totalApar}</div>
                </div>
                <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl p-5 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inspeksi</div>
                    <div className="mt-2 text-3xl font-black text-slate-800">{data.totalChecks}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Kondisi Baik</div>
                    <div className="mt-2 text-3xl font-black text-emerald-700">{data.goodAparCount}</div>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-sm">
                    <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Perlu Perbaikan</div>
                    <div className="mt-2 text-3xl font-black text-rose-700">{data.badAparCount}</div>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                        <Calendar size={18} className="text-indigo-500" />
                        Monitoring Pengecekan APAR {year}
                    </h3>
                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-56 flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Cari Kode / Lokasi..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2 font-semibold outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            {!isGuest && (
                                <button onClick={() => setShowQrModal(true)} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors">
                                    <QrCode size={16} /> QR Auditor
                                </button>
                            )}
                        <select 
                            value={year} 
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-semibold outline-none"
                        >
                            {[...Array(5)].map((_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                        {!isGuest && (
                            <button onClick={downloadExcel} className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors">
                                <Download size={16} /> Excel
                            </button>
                        )}
                        </div>
                    </div>
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="text-[10px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-bold tracking-wider">
                            <tr>
                                <th className="px-3 py-1.5 text-[10px] uppercase">No</th>
                                <SortableHeader label="Kode APAR" sortKey="code" />
                                <SortableHeader label="Lokasi" sortKey="location" />
                                <SortableHeader label="Tipe & Kapasitas" sortKey="type" />
                                <SortableHeader label="Tgl Expired" sortKey="expired_date" />
                                {months.map(m => <th key={m} className="px-2 py-3 text-center" uppercase tracking-widest>{m}</th>)}
                                <SortableHeader label="Status Akhir" sortKey="latestStatus" align="center" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.monitoringMatrix.length === 0 ? (
                                <tr><td colSpan={17} className="text-center py-8 text-slate-400">Belum ada data APAR.</td></tr>
                            ) : [...data.monitoringMatrix]
                                .filter(apar => 
                                    apar.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    apar.location.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .sort((a, b) => {
                                let aVal = a[sortConfig.key] || '';
                                let bVal = b[sortConfig.key] || '';
                                if (sortConfig.key === 'expired_date') {
                                    aVal = new Date(aVal).getTime() || 0;
                                    bVal = new Date(bVal).getTime() || 0;
                                }
                                if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
                                if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
                                return 0;
                            }).map((apar, i) => (
                                <tr key={apar.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-3 py-1.5 text-[11px] font-medium text-slate-500">{i + 1}</td>
                                    <td className="px-3 py-1.5 text-[11px] font-bold text-slate-800">{apar.code}</td>
                                    <td className="px-3 py-1.5 text-[11px]">{apar.location}</td>
                                    <td className="px-3 py-1.5 text-[11px]">{apar.type} ({apar.weight} Kg)</td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        {apar.isExpired ? (
                                            <span className="text-red-600 font-bold flex items-center gap-1" title="Sudah Kadaluarsa!"><AlertTriangle size={12} /> {new Date(apar.expired_date).toLocaleDateString('id-ID')}</span>
                                        ) : apar.isExpiringSoon ? (
                                            <span className="text-yellow-600 font-bold" title="Akan Kadaluarsa < 30 Hari">{new Date(apar.expired_date).toLocaleDateString('id-ID')}</span>
                                        ) : (
                                            <span className="text-emerald-600">{new Date(apar.expired_date).toLocaleDateString('id-ID')}</span>
                                        )}
                                    </td>
                                    {apar.months.map((mObj, mi) => (
                                        <td key={mi} className="px-2 py-3 text-center border-l border-slate-50">
                                            {mObj?.status === 'ok' && (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs font-black">✓</span>
                                                    {mObj?.photos && mObj.photos.length > 0 && (
                                                        <button onClick={() => setPhotoModalData(mObj.photos[0])} className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline whitespace-nowrap">
                                                            Bukti Inspeksi
                                                        </button>
                                                    )}
                                                    <span className="text-[8px] text-slate-400 font-bold tracking-tighter">
                                                        {new Date(mObj.check_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}
                                            {mObj?.status === 'bad' && (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex items-center justify-center w-5 h-5 bg-rose-100 text-rose-600 rounded-full text-xs font-black">✕</span>
                                                    {mObj?.photos && mObj.photos.length > 0 && (
                                                        <button onClick={() => setPhotoModalData(mObj.photos[0])} className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline whitespace-nowrap">
                                                            Bukti Inspeksi
                                                        </button>
                                                    )}
                                                    <span className="text-[8px] text-slate-400 font-bold tracking-tighter">
                                                        {new Date(mObj.check_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-3 py-1.5 text-[11px] text-center">
                                        {apar.latestStatus === 'OK' && <span className="px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest bg-emerald-100 text-emerald-700">OK</span>}
                                        {apar.latestStatus === 'RUSAK' && <span className="px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest bg-rose-100 text-rose-700">RUSAK</span>}
                                        {apar.latestStatus === 'Belum' && <span className="px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest bg-slate-100 text-slate-500">BELUM UJI</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View for Matrix */}
                <div className="block md:hidden p-4 space-y-3 bg-slate-50 border-t border-slate-100">
                    {data.monitoringMatrix.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">Belum ada data APAR.</div>
                    ) : [...data.monitoringMatrix]
                        .filter(apar => 
                            apar.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            apar.location.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .sort((a, b) => {
                        let aVal = a[sortConfig.key] || '';
                        let bVal = b[sortConfig.key] || '';
                        if (sortConfig.key === 'expired_date') {
                            aVal = new Date(aVal).getTime() || 0;
                            bVal = new Date(bVal).getTime() || 0;
                        }
                        if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
                        if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
                        return 0;
                    }).map((apar) => (
                        <div key={apar.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-slate-800 text-lg leading-tight">{apar.code}</h4>
                                    <p className="text-xs text-slate-500 font-bold mt-1">{apar.location}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{apar.type} ({apar.weight} Kg)</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tgl Expired</div>
                                    <div className="text-sm font-bold text-slate-700">{new Date(apar.expired_date).toLocaleDateString('id-ID')}</div>
                                    <div className="mt-1">
                                        {apar.latestStatus === 'OK' && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">OK</span>}
                                        {apar.latestStatus === 'RUSAK' && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700">RUSAK</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-6 gap-2 bg-slate-50 rounded-xl p-2 border border-slate-100">
                                {apar.months.map((mObj, mi) => (
                                    <div key={mi} className="flex flex-col items-center p-1">
                                        <span className="text-[8px] font-black uppercase text-slate-400 mb-1.5">{months[mi]}</span>
                                        {mObj?.status === 'ok' && (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm">✓</span>
                                                {mObj?.photos && mObj.photos.length > 0 && (
                                                    <button onClick={() => setPhotoModalData(mObj.photos[0])} className="text-[7px] font-black text-blue-600 hover:text-blue-800 underline tracking-tighter">FOTO</button>
                                                )}
                                                <span className="text-[6px] text-slate-400 tracking-tighter text-center">
                                                    {new Date(mObj.check_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                        {mObj?.status === 'bad' && (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="w-5 h-5 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm">✕</span>
                                                {mObj?.photos && mObj.photos.length > 0 && (
                                                    <button onClick={() => setPhotoModalData(mObj.photos[0])} className="text-[7px] font-black text-blue-600 hover:text-blue-800 underline tracking-tighter">FOTO</button>
                                                )}
                                                <span className="text-[6px] text-slate-400 tracking-tighter text-center">
                                                    {new Date(mObj.check_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                        {(!mObj || !mObj.status) && <span className="w-3 h-3 bg-slate-200 rounded-full opacity-50 mt-1"></span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Checks */}
            <div className="bg-white/80 backdrop-blur border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                        <History size={18} className="text-blue-500" />
                        10 Inspeksi Terakhir
                    </h3>
                    <div className="relative w-full md:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari Kode / Inspektur..." 
                            value={historySearchTerm}
                            onChange={e => setHistorySearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2 font-semibold outline-none"
                        />
                    </div>
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="text-[10px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-bold tracking-wider">
                            <tr>
                                <SortableHeader label="Tanggal" sortKey="check_date" isHistory={true} />
                                <th className="px-3 py-1.5 text-[10px] uppercase">Foto</th>
                                <SortableHeader label="Kode APAR" sortKey="asset_code" isHistory={true} />
                                <SortableHeader label="Lokasi" sortKey="location_name" isHistory={true} />
                                <SortableHeader label="Inspektur" sortKey="inspector_name" isHistory={true} />
                                <SortableHeader label="Status" sortKey="is_passed" isHistory={true} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.recentChecks.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Belum ada inspeksi.</td></tr>
                            ) : data.recentChecks
                                .filter(check => 
                                    check.asset_code.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                                    check.inspector_name.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                                    check.location_name.toLowerCase().includes(historySearchTerm.toLowerCase())
                                )
                                .sort((a, b) => {
                                    let aVal = a[historySortConfig.key] || '';
                                    let bVal = b[historySortConfig.key] || '';
                                    if (historySortConfig.key === 'check_date') {
                                        aVal = new Date(aVal).getTime() || 0;
                                        bVal = new Date(bVal).getTime() || 0;
                                    }
                                    if (aVal < bVal) return historySortConfig.order === 'asc' ? -1 : 1;
                                    if (aVal > bVal) return historySortConfig.order === 'asc' ? 1 : -1;
                                    return 0;
                                })
                                .map(check => (
                                <tr key={check.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-3 py-1.5 text-[11px] font-medium text-slate-700">{new Date(check.check_date).toLocaleDateString('id-ID')}</td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        {check.photos && check.photos.length > 0 ? (
                                            <a href={`/api${check.photos[0]}`} target="_blank" rel="noreferrer">
                                                <img src={`/api${check.photos[0]}`} alt="Proof" className="w-8 h-8 object-cover rounded shadow-sm border border-slate-200" onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%23e2e8f0"/><text x="50%" y="50%" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle" dy=".3em">N/A</text></svg>'; }} />
                                            </a>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-3 py-1.5 text-[11px] font-bold text-slate-800">{check.asset_code}</td>
                                    <td className="px-3 py-1.5 text-[11px]">{check.location_name}</td>
                                    <td className="px-3 py-1.5 text-[11px]">{check.inspector_name}</td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        {check.is_passed ? (
                                            <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs"><CheckCircle size={14}/> LULUS UJI</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-rose-600 font-bold text-xs"><XCircle size={14}/> GAGAL UJI</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View for Recent Checks */}
                <div className="block md:hidden p-4 space-y-3 bg-slate-50 border-t border-slate-100">
                    {data.recentChecks.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 font-medium">Belum ada inspeksi.</div>
                    ) : data.recentChecks
                        .filter(check => 
                            check.asset_code.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                            check.inspector_name.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                            check.location_name.toLowerCase().includes(historySearchTerm.toLowerCase())
                        )
                        .sort((a, b) => {
                            let aVal = a[historySortConfig.key] || '';
                            let bVal = b[historySortConfig.key] || '';
                            if (historySortConfig.key === 'check_date') {
                                aVal = new Date(aVal).getTime() || 0;
                                bVal = new Date(bVal).getTime() || 0;
                            }
                            if (aVal < bVal) return historySortConfig.order === 'asc' ? -1 : 1;
                            if (aVal > bVal) return historySortConfig.order === 'asc' ? 1 : -1;
                            return 0;
                        })
                        .map(check => (
                        <div key={check.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {check.photos && check.photos.length > 0 ? (
                                    <button onClick={() => setPhotoModalData(check.photos[0])}>
                                        <img src={`/api${check.photos[0]}`} alt="Proof" className="w-12 h-12 object-cover rounded shadow border border-slate-200" onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23e2e8f0"/><text x="50%" y="50%" fill="%2394a3b8" font-size="10" font-family="sans-serif" text-anchor="middle" dy=".3em">N/A</text></svg>'; }} />
                                    </button>
                                ) : <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-300 text-xs">No Pic</div>}
                                <div>
                                    <div className="font-black text-slate-800 text-sm leading-none">{check.asset_code}</div>
                                    <div className="text-[10px] text-slate-500 font-bold mt-1.5">{new Date(check.check_date).toLocaleDateString('id-ID')} • {check.inspector_name}</div>
                                </div>
                            </div>
                            <div>
                                {check.is_passed ? (
                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded tracking-widest shadow-sm border border-emerald-200">LULUS</span>
                                ) : (
                                    <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-[9px] font-black rounded tracking-widest shadow-sm border border-rose-200">GAGAL</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* QR Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-5 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <QrCode size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">QR Akses Auditor</h3>
                        <p className="text-sm text-slate-500 font-medium mb-6">Scan QR code ini untuk memberikan akses read-only dashboard APAR kepada auditor tanpa login.</p>
                        
                        <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block">
                            <QRCodeSVG value={`${window.location.origin}/public/apar`} size={200} />
                        </div>
                        
                        <div className="mt-4 bg-slate-50 p-2 rounded-lg w-full text-xs font-mono text-slate-500 break-all border border-slate-200">
                            {`${window.location.origin}/public/apar`}
                        </div>

                        <button onClick={() => setShowQrModal(false)} className="mt-8 w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
            {/* Photo Modal */}
            {photoModalData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPhotoModalData(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in print:hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-slate-900">Bukti Foto Inspeksi</h3>
                            <button onClick={() => setPhotoModalData(null)} className="text-slate-400 hover:text-rose-500"><XCircle size={20}/></button>
                        </div>
                        <div className="p-4 bg-slate-100 flex justify-center">
                            <img src={`/api${photoModalData}`} alt="Bukti Inspeksi" className="max-w-full max-h-[70vh] rounded-lg shadow-sm border border-slate-200 object-contain" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

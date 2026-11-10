import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Flame, CheckCircle, XCircle, Activity, Calendar, FileText, History } from 'lucide-react';

export default function PublicHydrantDetail() {
    const { code } = useParams();
    const [hydrant, setHydrant] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/hr/hydrants/public/${code}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setHydrant(data.data.hydrant);
                    setHistory(data.data.history);
                }
            })
            .catch(err => console.error("Fetch failed:", err))
            .finally(() => setLoading(false));
    }, [code]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Loading Data...</h2>
            </div>
        );
    }

    if (!hydrant) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Flame size={48} className="text-red-500" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 mb-2">Aset Tidak Ditemukan</h1>
                <p className="text-slate-500 font-medium">QR Code tidak valid atau Hydrant belum terdaftar di sistem.</p>
            </div>
        );
    }

    const latestCheck = history[0];

    return (
        <div className="min-h-screen bg-[#F8F9FB] pb-20">
            {/* Header Area */}
            <div className="bg-red-600 pt-12 pb-24 px-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 flex items-center justify-center">
                    <Flame size={200} />
                </div>
                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6 transform -rotate-6">
                        <Flame size={40} className="text-red-600" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight leading-tight">{hydrant.code}</h1>
                    <p className="text-red-100 font-medium mt-2 flex items-center justify-center gap-2">
                        <span className="uppercase tracking-widest text-xs font-bold">{hydrant.type}</span>
                    </p>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 -mt-16 relative z-20 space-y-3">
                {/* Status Card */}
                <div className="bg-white rounded-[2rem] p-4 shadow-xl border border-slate-100 flex items-center gap-5">
                    {latestCheck ? (
                        latestCheck.status === 'OK' ? (
                            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0">
                                <CheckCircle size={32} />
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                                <XCircle size={32} />
                            </div>
                        )
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Activity size={32} />
                        </div>
                    )}
                    
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Terkini</p>
                        <h2 className={`text-xl font-black ${!latestCheck ? 'text-slate-700' : latestCheck.status === 'OK' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {!latestCheck ? 'Belum Diinspeksi' : latestCheck.status === 'OK' ? 'KONDISI BAIK' : 'PERLU PERBAIKAN'}
                        </h2>
                        {latestCheck && (
                            <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">
                                <Calendar size={12} /> {new Date(latestCheck.check_date).toLocaleDateString('id-ID')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100">
                    <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><FileText size={18} className="text-red-600"/> Informasi Hydrant</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lokasi</span>
                            <span className="text-sm font-black text-slate-700">{hydrant.location}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipe Aset</span>
                            <span className="text-sm font-black text-slate-700">{hydrant.type}</span>
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="flex items-center justify-between px-4 pt-4">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <History size={18} className="text-red-600"/> Riwayat Inspeksi
                    </h3>
                    <a 
                        href={`/hse/hydrant/print/${hydrant.id}?year=${new Date().getFullYear()}&view=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-colors"
                    >
                        Lihat Checksheet
                    </a>
                </div>
                {history.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-5 text-center border border-slate-100 shadow-sm">
                        <p className="text-sm font-bold text-slate-400">Belum ada riwayat inspeksi.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((check) => (
                            <div key={check.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${check.status === 'OK' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(check.check_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        <h4 className="font-black text-slate-800 mt-1">{check.inspector_name}</h4>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${check.status === 'OK' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {check.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 p-4 rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Box & Pintu</span>
                                        {check.is_box_good ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-rose-500" />}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Selang</span>
                                        {check.is_hose_good ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-rose-500" />}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Nozzle</span>
                                        {check.is_nozzle_good ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-rose-500" />}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Valve</span>
                                        {check.is_valve_good ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-rose-500" />}
                                    </div>
                                    <div className="col-span-2 pt-2 mt-2 border-t border-slate-200 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Pressure</span>
                                        <span className="text-xs font-black text-slate-700">{check.water_pressure}</span>
                                    </div>
                                </div>

                                {check.notes && (
                                    <div className="mb-4 text-xs font-medium text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                                        <strong>Catatan:</strong> {check.notes}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

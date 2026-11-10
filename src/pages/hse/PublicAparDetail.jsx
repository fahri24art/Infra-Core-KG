import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, MapPin, Calendar, Clock, AlertTriangle, ArrowLeft, Camera, CheckCircle, XCircle } from 'lucide-react';
import logoTCF from '../../assets/Logo_TCF_Sec_Processed.png';
import logoK3 from '../../assets/LOGO-K3-TRANSPARANT.png';

export default function PublicAparDetail() {
    const { code } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [photoModalData, setPhotoModalData] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await fetch(`/api/hr/apars/public/${code}`);
                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                } else {
                    setErrorMsg(result.error);
                }
            } catch (err) {
                setErrorMsg('Terjadi kesalahan jaringan');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [code]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-bold animate-pulse">Memuat Data APAR...</p>
            </div>
        );
    }

    if (errorMsg || !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <ShieldAlert size={64} className="text-red-400 mb-4" />
                <h1 className="text-2xl font-black text-slate-800 mb-2">APAR Tidak Ditemukan</h1>
                <p className="text-slate-500 text-center max-w-md">{errorMsg || 'Kode APAR tidak valid atau data telah dihapus.'}</p>
                <Link to="/public" className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                    Kembali ke Beranda
                </Link>
            </div>
        );
    }

    const { apar, history } = data;
    const isExpired = new Date(apar.expired_date) < new Date();
    const isExpiringSoon = new Date(apar.expired_date) < new Date(new Date().getTime() + (30 * 24 * 60 * 60 * 1000));

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={logoTCF} alt="TCF" className="h-8 object-contain" />
                        <div className="w-px h-6 bg-slate-200"></div>
                        <img src={logoK3} alt="K3" className="h-8 object-contain" />
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Portal Audit</div>
                        <div className="text-sm font-bold text-slate-800">Public Access</div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 mt-6 space-y-3">
                {/* APAR Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                            <ShieldAlert size={200} className="translate-x-1/4 -translate-y-1/4" />
                        </div>
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                                Kartu Identitas Asset
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight">{apar.code}</h1>
                                <p className="text-slate-300 font-medium mt-1">{apar.type} ({apar.weight} Kg)</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lokasi / Area</div>
                                <div className="font-bold text-slate-800">{apar.location}</div>
                            </div>
                        </div>

                        <div className={`flex items-start gap-3 p-3 rounded-xl border ${isExpired ? 'bg-red-50 border-red-100' : isExpiringSoon ? 'bg-yellow-50 border-yellow-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <div className={`p-2 rounded-lg ${isExpired ? 'bg-red-100 text-red-600' : isExpiringSoon ? 'bg-yellow-100 text-yellow-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                <Calendar size={20} />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kadaluarsa</div>
                                <div className={`font-black ${isExpired ? 'text-red-700' : isExpiringSoon ? 'text-yellow-700' : 'text-emerald-700'}`}>
                                    {new Date(apar.expired_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inspection History */}
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-4">
                        <Clock className="text-indigo-600" /> Riwayat Inspeksi
                    </h2>
                    
                    {history.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-5 text-center text-slate-500">
                            Belum ada riwayat inspeksi untuk APAR ini.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((check) => (
                                <div key={check.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${check.is_passed ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(check.check_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            <h4 className="font-black text-slate-800 mt-1">{check.inspector_name}</h4>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${check.is_passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {check.is_passed ? 'LULUS' : 'GAGAL'}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                        {check.photos && check.photos.length > 0 ? (
                                            <button 
                                                onClick={() => setPhotoModalData(check.photos[0])}
                                                className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Camera size={14} /> Lihat Foto
                                            </button>
                                        ) : (
                                            <div className="flex-1 flex justify-center items-center px-3 py-2 bg-slate-50 text-slate-400 rounded-lg text-xs italic">
                                                -
                                            </div>
                                        )}
                                        <a 
                                            href={`/hse/apar/print/${apar.id}?year=${new Date(check.check_date).getFullYear()}&view=true`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex justify-center items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                            Lihat Checksheet
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Modal */}
            {photoModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm" onClick={() => setPhotoModalData(null)}>
                    <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Camera size={18} className="text-blue-600" /> Bukti Inspeksi</h3>
                            <button onClick={() => setPhotoModalData(null)} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                                ✕
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto flex justify-center bg-slate-100">
                            <img src={`/api${photoModalData}`} alt="Bukti Inspeksi" className="max-w-full h-auto max-h-[70vh] object-contain rounded-lg shadow-sm border border-slate-200" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

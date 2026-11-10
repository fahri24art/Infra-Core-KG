import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Activity, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AparDashboard from '../../components/AparDashboard';

export default function HSEDashboard({ isGuest = false, org = 'TCF-SG' }) {
    const [summary, setSummary] = useState({
        zeroAccidentDays: 0,
        openCapaCount: 0,
        incidentCountThisYear: 0,
        findingsThisMonth: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSummary();
    }, [org]);

    const fetchSummary = async () => {
        try {
            const res = await fetch('/api/hse/dashboard/summary', {
                headers: { 'x-organization': org }
            });
            const data = await res.json();
            if (data.success) {
                setSummary(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch HSE summary', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 font-bold text-slate-500 text-center animate-pulse">Loading HSE Dashboard...</div>;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <Heart className="text-emerald-500" size={32} /> HSE Dashboard
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Health, Safety, & Environment Monitoring Center</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-xl shadow-emerald-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between opacity-80">
                        <h3 className="font-bold uppercase tracking-widest text-xs">Zero Accident</h3>
                        <Shield size={20} />
                    </div>
                    <div className="mt-8">
                        <span className="text-5xl font-black tracking-tighter">{summary.zeroAccidentDays}</span>
                        <span className="text-emerald-100 font-bold ml-2">Days</span>
                    </div>
                    <p className="text-xs font-medium text-emerald-100 mt-2">Since last recorded LTI</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                        <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">Incident Rate</h3>
                        <AlertTriangle size={20} />
                    </div>
                    <div className="mt-8">
                        <span className="text-5xl font-black tracking-tighter text-slate-900">{summary.incidentCountThisYear}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Total incidents this year</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                        <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">Open CAPA</h3>
                        <CheckCircle size={20} className="text-amber-500" />
                    </div>
                    <div className="mt-8">
                        <span className="text-5xl font-black tracking-tighter text-slate-900">{summary.openCapaCount}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Corrective actions pending</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                        <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">Patrol Findings</h3>
                        <Activity size={20} className="text-blue-500" />
                    </div>
                    <div className="mt-8">
                        <span className="text-5xl font-black tracking-tighter text-slate-900">{summary.findingsThisMonth}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Unsafe acts/conditions this month</p>
                </div>
            </div>

            {!isGuest && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                <Link to="/hse/incidents" className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 mb-4 group-hover:scale-110 transition-transform">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Incident Reports</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6">Kelola pelaporan kecelakaan, near miss, dan tumpahan B3.</p>
                    <div className="flex items-center text-rose-600 font-bold text-sm">
                        Kelola Insiden <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>

                <Link to="/hse/patrols" className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                        <Shield size={24} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Safety Patrols</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6">Pencatatan temuan inspeksi Unsafe Act & Unsafe Condition.</p>
                    <div className="flex items-center text-blue-600 font-bold text-sm">
                        Mulai Patroli <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>

                <Link to="/hse/apar" className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 mb-4 group-hover:scale-110 transition-transform">
                        <Activity size={24} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Pemadam Api</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6">Master data, form ceklis, dan rekap matriks APAR & Hydrant.</p>
                    <div className="flex items-center text-rose-600 font-bold text-sm">
                        Kelola Pemadam Api <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>

                <Link to="/hse/capa" className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                        <CheckCircle size={24} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">CAPA Tracker</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6">Tindak lanjut tindakan perbaikan & pencegahan.</p>
                    <div className="flex items-center text-amber-600 font-bold text-sm">
                        Lihat CAPA <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>

                <Link to="/hse/statistics" className="group bg-emerald-50 rounded-2xl p-4 border border-emerald-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                        <Heart size={24} />
                    </div>
                    <h3 className="text-lg font-black text-emerald-900 mb-2">Statistic Board</h3>
                    <p className="text-sm text-emerald-700 font-medium mb-6">Input angka jam kerja aman & rekor kecelakaan.</p>
                    <div className="flex items-center text-emerald-700 font-black text-sm">
                        Kelola Statistik <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
            </div>
            )}

            {!isGuest && (
                <div className="mt-12 pt-8 border-t border-slate-200">
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Monitoring Pemadam Api (APAR)</h2>
                        <p className="text-sm font-medium text-slate-500">Rekap status bulanan dan peringatan kadaluarsa Alat Pemadam Api.</p>
                    </div>
                    <AparDashboard isGuest={isGuest} org={org} />
                </div>
            )}
        </div>
    );
}

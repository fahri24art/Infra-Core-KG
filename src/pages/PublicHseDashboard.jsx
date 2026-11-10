import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Users, Clock, ShieldCheck, PlusSquare, Trophy, Activity, AlertTriangle, ArrowLeft, HeartPulse, ShieldAlert, Moon, Sun } from 'lucide-react';
import logo from '../assets/Logo_TCF_Sec_Processed.png';
import k3Logo from '../assets/LOGO-K3-TRANSPARANT.png';
import existLogo from '../assets/exist.jpeg';

export default function PublicHseDashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryOrg = new URLSearchParams(location.search).get('org') || 'TCF-SG';
    const org = queryOrg;

    const [stats, setStats] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get(`/api/hse/statistics?org=${org}`, { headers: { 'x-organization': org } });
            if (res.data.success) {
                setStats(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch HSE statistics', err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s auto refresh
        return () => clearInterval(interval);
    }, [org]);

    if (!stats) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <ShieldCheck size={64} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] mb-6" />
                    <p className="text-emerald-500 font-bold tracking-[0.3em] uppercase">INITIALIZING HSE TELEMETRY...</p>
                </div>
            </div>
        );
    }

    const formatNum = (num) => (num || 0).toLocaleString('id-ID');

    // Stats Logic
    const isZeroAccident = stats.first_aid === 0 && stats.medical_treatment === 0 && stats.fatality === 0 && stats.total_kecelakaan_hilang_hari === 0;

    const isDark = theme === 'dark';
    
    // Theme utility classes
    const bgMain = isDark 
        ? "bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100" 
        : "bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-200 text-slate-800";
    
    const bgHeader = isDark ? "bg-slate-900/40 border-white/10" : "bg-white/40 border-slate-300 shadow-[0_4px_30px_rgba(0,0,0,0.1)]";
    const bgCard = isDark 
        ? "bg-slate-900/40 border-white/5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.5)]" 
        : "bg-white/70 border-white shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_10px_20px_rgba(0,0,0,0.1)]";
    
    const textMuted = isDark ? "text-slate-500" : "text-slate-500";
    const textBold = isDark ? "text-slate-300" : "text-slate-700";
    const textValue = isDark ? "text-white" : "text-slate-900";

    return (
        <div className={`min-h-screen w-screen ${bgMain} font-sans overflow-hidden flex flex-col relative selection:bg-emerald-500/30 transition-colors duration-500`}>
            
            {/* Background Grid Pattern */}
            <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] ${isDark ? 'opacity-5 mix-blend-screen' : 'opacity-[0.03] mix-blend-multiply'} pointer-events-none`}></div>
            
            {/* Glowing Orbs */}
            <div className={`absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full ${isDark ? 'bg-blue-600/10' : 'bg-blue-400/20'} blur-[120px] pointer-events-none`}></div>
            <div className={`absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full ${isZeroAccident ? (isDark ? 'bg-emerald-600/10' : 'bg-emerald-400/20') : (isDark ? 'bg-rose-600/10' : 'bg-rose-400/20')} blur-[120px] pointer-events-none`}></div>

            {/* Controls moved to footer */}

            {/* HEADER */}
            <div className={`relative z-10 flex items-center justify-between px-10 py-4 backdrop-blur-2xl border-b ${bgHeader}`}>
                {/* TCF Logo */}
                <div className="w-64 flex flex-col items-start justify-center">
                    <div className="bg-white/90 p-2 rounded-xl shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.2)]">
                        <img src={logo} alt="TCF Logo" className="h-20 md:h-24 object-contain" />
                    </div>
                </div>

                {/* Main Title */}
                <div className="flex-1 text-center flex flex-col items-center justify-center">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500 bg-clip-text text-transparent drop-shadow-lg">
                        ENVIRONMENT HEALTH & SAFETY
                    </h1>
                    <div className="flex items-center justify-center w-full mt-3 gap-4">
                        <div className="h-[2px] bg-gradient-to-r from-transparent to-blue-500/50 w-32"></div>
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-blue-200' : 'text-blue-800'} tracking-[0.4em] uppercase`}>
                            STATISTIC BOARD <span className="opacity-30">•</span> {org}
                        </h2>
                        <div className="h-[2px] bg-gradient-to-l from-transparent to-blue-500/50 w-32"></div>
                    </div>
                </div>

                {/* Green Cross Logo */}
                <div className="w-64 flex flex-col items-end justify-center">
                    <div className="bg-white/80 p-2 rounded-xl shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.1)]">
                        <img src={k3Logo} alt="K3 Logo" className="h-20 md:h-24 object-contain" />
                    </div>
                </div>
            </div>

            {/* DATE & TIME BADGE */}
            <div className="flex justify-center my-3 relative z-20">
                <div className={`flex flex-col items-center gap-1 ${isDark ? 'bg-slate-800/90 border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)]' : 'bg-white border-white shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_10px_30px_rgba(0,0,0,0.1)]'} backdrop-blur-xl border px-10 py-3 rounded-3xl`}>
                    <div className="flex items-center gap-4">
                        <span className={`text-2xl font-black ${textValue} tracking-wider`}>
                            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
                        </span>
                    </div>
                    <span className={`text-xl font-black ${isDark ? 'text-slate-300' : 'text-slate-600'} tabular-nums tracking-widest`}>
                        {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="flex-1 px-8 pb-8 flex flex-col justify-center gap-4 relative z-10 min-h-0">
                
                {/* TOP METRICS ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Total Karyawan */}
                    <div className={`${bgCard} backdrop-blur-md rounded-3xl p-5 flex items-center justify-between group transition-all`}>
                        <div className="flex items-center gap-5">
                            <div className={`w-16 h-16 rounded-2xl ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} flex items-center justify-center border group-hover:scale-110 transition-transform`}>
                                <Users size={32} className="text-blue-500" />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black ${textBold} uppercase tracking-wider`}>Total Karyawan</h3>
                                <p className={`text-[10px] ${textMuted} font-bold uppercase tracking-[0.2em]`}>Total Man Power</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-5xl font-black ${textValue} tracking-tighter tabular-nums drop-shadow-md`}>{formatNum(stats.total_karyawan)}</span>
                            <span className="block text-xs font-bold text-blue-500 mt-1 uppercase tracking-widest">Orang</span>
                        </div>
                    </div>

                    {/* Total Jam Kerja */}
                    <div className={`${bgCard} backdrop-blur-md rounded-3xl p-5 flex items-center justify-between group transition-all`}>
                        <div className="flex items-center gap-5">
                            <div className={`w-16 h-16 rounded-2xl ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'} flex items-center justify-center border group-hover:scale-110 transition-transform`}>
                                <Clock size={32} className="text-indigo-500" />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black ${textBold} uppercase tracking-wider`}>Total Jam Kerja</h3>
                                <p className={`text-[10px] ${textMuted} font-bold uppercase tracking-[0.2em]`}>Total Man Hours</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-5xl font-black ${textValue} tracking-tighter tabular-nums drop-shadow-md`}>{formatNum(stats.total_jam_kerja)}</span>
                            <span className="block text-xs font-bold text-indigo-500 mt-1 uppercase tracking-widest">Jam</span>
                        </div>
                    </div>

                    {/* Total Jam Kerja Aman */}
                    <div className={`${bgCard} backdrop-blur-md rounded-3xl p-5 flex items-center justify-between group transition-all relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className={`w-16 h-16 rounded-2xl ${isDark ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-emerald-100 border-emerald-300 shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_4px_10px_rgba(16,185,129,0.2)]'} flex items-center justify-center border group-hover:scale-110 transition-transform`}>
                                <ShieldCheck size={32} className="text-emerald-500" />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black ${isDark ? 'text-emerald-100' : 'text-emerald-900'} uppercase tracking-wider`}>Jam Kerja Aman</h3>
                                <p className={`text-[10px] ${isDark ? 'text-emerald-500/70' : 'text-emerald-600'} font-bold uppercase tracking-[0.2em]`}>Safe Manhour To Date</p>
                            </div>
                        </div>
                        <div className="text-right relative z-10">
                            <span className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b ${isDark ? 'from-white to-emerald-200' : 'from-emerald-700 to-emerald-500'} tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]`}>
                                {formatNum(stats.total_jam_kerja_aman)}
                            </span>
                            <span className="block text-xs font-bold text-emerald-500 mt-1 uppercase tracking-widest">Jam</span>
                        </div>
                    </div>
                </div>

                {/* MIDDLE ROW (Rekor & Hilang Hari) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Rekor Jam Kerja Aman */}
                    <div className={`${bgCard} backdrop-blur-md rounded-3xl p-5 flex items-center justify-between group transition-all`}>
                        <div className="flex items-center gap-5">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border group-hover:scale-110 group-hover:rotate-12 transition-transform ${isDark ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-amber-50 border-amber-200 shadow-[inset_0_2px_4px_rgba(255,255,255,1)]'}`}>
                                <Trophy size={32} className="text-amber-500" />
                            </div>
                            <div>
                                <h3 className={`text-xl font-black ${isDark ? 'text-amber-100' : 'text-amber-900'} uppercase tracking-wider`}>Rekor Jam Kerja Aman</h3>
                                <p className={`text-[10px] ${isDark ? 'text-amber-500/70' : 'text-amber-600'} font-bold uppercase tracking-[0.2em]`}>Longest Safe Man Hours Record</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-5xl font-black text-amber-500 tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]`}>
                                {formatNum(stats.rekor_jam_kerja_aman)}
                            </span>
                            <span className="block text-xs font-bold text-amber-500 mt-1 uppercase tracking-widest">Jam</span>
                        </div>
                    </div>

                    {/* Hilang Hari Kerja */}
                    <div className={`${isDark ? (stats.total_kecelakaan_hilang_hari === 0 ? bgCard : 'bg-slate-900/40 border border-rose-500/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_10px_20px_rgba(225,29,72,0.2)]') : (stats.total_kecelakaan_hilang_hari === 0 ? bgCard : 'bg-white/70 border border-rose-200 shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_10px_20px_rgba(225,29,72,0.1)]')} backdrop-blur-md rounded-3xl p-5 flex items-center justify-between group transition-all`}>
                        <div className="flex items-center gap-5">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border group-hover:scale-110 transition-transform ${stats.total_kecelakaan_hilang_hari === 0 ? (isDark ? 'bg-slate-800/50 border-slate-600/30' : 'bg-slate-100 border-slate-300 shadow-[inset_0_2px_4px_rgba(255,255,255,1)]') : (isDark ? 'bg-rose-500/20 border-rose-500/40 shadow-[0_0_15px_rgba(225,29,72,0.3)]' : 'bg-rose-50 border-rose-200 shadow-[inset_0_2px_4px_rgba(255,255,255,1)]')}`}>
                                <Activity size={32} className={stats.total_kecelakaan_hilang_hari === 0 ? 'text-slate-400' : 'text-rose-500'} />
                            </div>
                            <div>
                                <h3 className={`text-xl font-black ${textBold} uppercase tracking-wider`}>Hilang Hari Kerja</h3>
                                <p className={`text-[10px] ${textMuted} font-bold uppercase tracking-[0.2em]`}>Total Lost Time Accident</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-5xl font-black tracking-tighter tabular-nums ${stats.total_kecelakaan_hilang_hari === 0 ? textValue : 'text-rose-500 drop-shadow-[0_0_15px_rgba(225,29,72,0.5)]'}`}>
                                {formatNum(stats.total_kecelakaan_hilang_hari)}
                            </span>
                            <span className={`block text-xs font-bold mt-1 uppercase tracking-widest ${stats.total_kecelakaan_hilang_hari === 0 ? textMuted : 'text-rose-500'}`}>Jam</span>
                        </div>
                    </div>
                </div>

                {/* BOTTOM INCIDENTS ROW */}
                <div className="mt-2">
                    <div className="flex items-center gap-4 mb-4 px-4">
                        <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/20' : 'via-slate-300'} to-transparent flex-1`}></div>
                        <h2 className={`text-xl font-black ${isDark ? 'text-slate-300' : 'text-slate-600'} tracking-[0.3em] uppercase`}>Kecelakaan Kerja</h2>
                        <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/20' : 'via-slate-300'} to-transparent flex-1`}></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        
                        {/* First Aid */}
                        <div className={`backdrop-blur-xl rounded-3xl p-5 flex flex-col items-center justify-center gap-3 relative overflow-hidden transition-all ${stats.first_aid === 0 ? bgCard : (isDark ? 'bg-amber-950/40 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'bg-amber-50 border border-amber-200 shadow-[0_10px_20px_rgba(245,158,11,0.1)]')}`}>
                            {stats.first_aid === 0 && <div className="absolute inset-0 bg-emerald-500/5"></div>}
                            <div className={`p-4 rounded-full ${stats.first_aid === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/20 text-amber-500'} relative z-10 shadow-[inset_0_2px_4px_rgba(255,255,255,1)]`}>
                                <PlusSquare size={40} />
                            </div>
                            <div className="text-center relative z-10">
                                <h3 className={`text-xl font-black tracking-widest ${textBold} uppercase mb-1`}>First Aid</h3>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className={`text-6xl font-black tracking-tighter ${stats.first_aid === 0 ? 'text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]'}`}>{formatNum(stats.first_aid)}</span>
                                    <span className={`text-sm font-bold ${textMuted} uppercase`}>Kasus</span>
                                </div>
                            </div>
                        </div>

                        {/* Medical Treatment */}
                        <div className={`backdrop-blur-xl rounded-3xl p-5 flex flex-col items-center justify-center gap-3 relative overflow-hidden transition-all ${stats.medical_treatment === 0 ? bgCard : (isDark ? 'bg-rose-950/40 border border-rose-500/40 shadow-[0_0_30px_rgba(225,29,72,0.15)]' : 'bg-rose-50 border border-rose-200 shadow-[0_10px_20px_rgba(225,29,72,0.1)]')}`}>
                            {stats.medical_treatment === 0 && <div className="absolute inset-0 bg-emerald-500/5"></div>}
                            <div className={`p-4 rounded-full ${stats.medical_treatment === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/20 text-rose-500'} relative z-10 shadow-[inset_0_2px_4px_rgba(255,255,255,1)]`}>
                                <HeartPulse size={40} />
                            </div>
                            <div className="text-center relative z-10">
                                <h3 className={`text-xl font-black tracking-widest ${textBold} uppercase mb-1`}>Medical Treatment</h3>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className={`text-6xl font-black tracking-tighter ${stats.medical_treatment === 0 ? 'text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-rose-500 drop-shadow-[0_0_15px_rgba(225,29,72,0.5)]'}`}>{formatNum(stats.medical_treatment)}</span>
                                    <span className={`text-sm font-bold ${textMuted} uppercase`}>Kasus</span>
                                </div>
                            </div>
                        </div>

                        {/* Fatality */}
                        <div className={`backdrop-blur-xl rounded-3xl p-5 flex flex-col items-center justify-center gap-3 relative overflow-hidden transition-all ${stats.fatality === 0 ? bgCard : (isDark ? 'bg-red-950/60 border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.3)] animate-pulse' : 'bg-red-100 border border-red-300 shadow-[0_10px_30px_rgba(239,68,68,0.2)] animate-pulse')}`}>
                            {stats.fatality === 0 && <div className="absolute inset-0 bg-emerald-500/5"></div>}
                            {stats.fatality > 0 && <div className="absolute inset-0 bg-red-500/10"></div>}
                            <div className={`p-4 rounded-full ${stats.fatality === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/20 text-red-600'} relative z-10 shadow-[inset_0_2px_4px_rgba(255,255,255,1)]`}>
                                <ShieldAlert size={40} />
                            </div>
                            <div className="text-center relative z-10">
                                <h3 className={`text-xl font-black tracking-widest ${textBold} uppercase mb-1`}>Fatality</h3>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className={`text-6xl font-black tracking-tighter ${stats.fatality === 0 ? 'text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-red-600 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]'}`}>{formatNum(stats.fatality)}</span>
                                    <span className={`text-sm font-bold ${textMuted} uppercase`}>Kasus</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className={`relative z-20 ${isDark ? 'bg-black/50 border-white/5' : 'bg-slate-200/50 border-slate-300'} backdrop-blur-md border-t py-4 px-10 flex items-center justify-between mt-auto shadow-[0_-10px_20px_rgba(0,0,0,0.1)]`}>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className={`p-3 rounded-full transition-all flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_4px_6px_rgba(0,0,0,0.1)] ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                        title="Back"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'} uppercase tracking-widest`}>
                            SAFETY START WITH <span className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">ME</span>
                        </h2>
                        <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} tracking-[0.3em] mt-1`}>
                            ZERO ACCIDENT • ZERO HARM • ZERO COMPROMISE
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    <button 
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className={`p-3 rounded-full transition-all flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_4px_6px_rgba(0,0,0,0.1)] ${isDark ? 'bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:text-blue-600 hover:bg-slate-100'}`}
                        title="Toggle Theme"
                    >
                        {isDark ? <Sun size={24} /> : <Moon size={24} />}
                    </button>
                    <img src={existLogo} alt="EXIST Logo" className="h-20 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.3)] object-contain bg-white p-1" />
                </div>
            </div>

        </div>
    );
}

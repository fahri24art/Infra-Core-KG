import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Monitor, Server, Wifi, Phone,
    Users, Briefcase, Car, Building,
    Factory, Wrench, Activity, Shield,
    ArrowRight, ChevronRight, Zap, Globe, ShieldCheck, Layers
} from 'lucide-react';
import logo from '../assets/Logo_TCF_Sec_Processed.png';
import bgImage from '../assets/abstract_tech_bg.png'; // Premium dark abstract IT background
import ParticleBackground from '../components/ParticleBackground';

export default function EnterpriseHub() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen font-sans relative overflow-hidden flex flex-col justify-center items-center">
            
            {/* Stunning Dark / Glassmorphism Background */}
            <div className="absolute inset-0 z-0">
                <img src={bgImage} alt="Background" className="w-full h-full object-cover opacity-30" />
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[8px]"></div>
                
                {/* Moving Dots Animation */}
                <ParticleBackground />
                
                {/* Glow effects */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none -translate-x-1/3 translate-y-1/3" />
            </div>

            <div className="relative z-10 w-full max-w-[1400px] px-6 sm:px-12 py-12 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                
                {/* Left Side - Branding & Intro */}
                <div className="flex-1 space-y-10 text-center lg:text-left">
                    <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-5 py-2.5 rounded-full backdrop-blur-md">
                        <ShieldCheck size={18} className="text-blue-400" />
                        <span className="text-xs font-black tracking-[0.2em] uppercase text-white/80">Secured Gateway</span>
                    </div>

                    <div className="space-y-3">
                        <img src={logo} alt="TCF Logo" className="h-20 w-auto mx-auto lg:mx-0 drop-shadow-2xl" />
                        <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter leading-[1.1]">
                            Enterprise <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Asset Management</span>
                        </h1>
                        <p className="text-lg text-slate-400 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Pusat kendali terintegrasi untuk seluruh aset infrastruktur, fasilitas, dan operasional pabrik Tri Centrum Fortuna.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">All Systems Online</span>
                        </div>
                        <div className="h-4 w-px bg-white/20"></div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest">
                            <Globe size={14} className="text-blue-400" /> Geo-Sync Active
                        </div>
                    </div>
                </div>

                {/* Right Side - Portal Cards */}
                <div className="flex-1 w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-4">
                    
                    {/* Unified Login Card */}
                    <button 
                        onClick={() => navigate('/login')}
                        className="col-span-1 md:col-span-2 group relative w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 p-4 sm:p-5 rounded-[2rem] transition-all duration-500 text-left hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] backdrop-blur-xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500 shadow-inner flex-shrink-0">
                                <Shield size={32} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-2xl font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">Unified System Login</h2>
                                    <div className="flex items-center text-xs font-bold text-blue-400 uppercase tracking-widest group-hover:translate-x-2 transition-transform duration-300">
                                        Login <ArrowRight size={14} className="ml-2" />
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                    Access ICT Infrastructure, HRD & General Affairs, and Reporting dashboards from a single gateway.
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Reporting ICT Card */}
                    <button 
                        onClick={() => navigate('/public')}
                        className="group relative w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 p-5 rounded-3xl transition-all duration-500 text-left hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)] backdrop-blur-xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-inner flex-shrink-0">
                                <Activity size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">Reporting ICT</h3>
                                <div className="flex items-center text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">
                                    Public Access <ArrowRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Reporting HRGA Card */}
                    <button 
                        onClick={() => navigate('/public/hrd')}
                        className="group relative w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 p-5 rounded-3xl transition-all duration-500 text-left hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)] backdrop-blur-xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-inner flex-shrink-0">
                                <Activity size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-white tracking-tight group-hover:text-amber-400 transition-colors">Reporting HRGA</h3>
                                <div className="flex items-center text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-1">
                                    Public Access <ArrowRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                                </div>
                            </div>
                        </div>
                    </button>

                </div>
            </div>
            
            {/* Bottom Footer */}
            <div className="absolute bottom-6 left-0 w-full px-12 flex items-center justify-between z-10">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    © 2026 TCF-SG Enterprise
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    Terminal Time: {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
            </div>
            
        </div>
    );
}

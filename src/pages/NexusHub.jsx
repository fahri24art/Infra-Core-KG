import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Lock, ChevronRight, LayoutGrid, Terminal, ShieldCheck, Activity, Globe, LifeBuoy, Users, Factory, ArrowLeft } from 'lucide-react';
import logo from '../assets/Logo_TCF_Sec_Processed.png';
import bgImage from '../assets/abstract_tech_bg.png';
import ParticleBackground from '../components/ParticleBackground';

export default function NexusHub() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const modules = [
        {
            id: 'power-asset',
            title: 'TCF InfraCore',
            subtitle: 'Unified System Gateway Interface',
            icon: Zap,
            color: 'bg-slate-900',
            action: () => navigate('/login/admin'),
            status: 'Operational'
        }
    ];

    return (
        <div className="min-h-screen text-white font-sans flex flex-col items-center justify-center p-4 sm:p-12 relative overflow-hidden">
            
            {/* Back Button */}
            <button 
                onClick={() => navigate('/')}
                className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group text-[10px] font-black uppercase tracking-widest z-50 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/10 backdrop-blur-md"
            >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Gateway
            </button>

            {/* Background Decoration */}
            <div className="absolute inset-0 z-0">
                <img src={bgImage} alt="Background" className="w-full h-full object-cover opacity-30" />
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[8px]"></div>
                <ParticleBackground />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
            </div>

            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                {/* Branding Section */}
                <div className="space-y-10">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="TCF Logo" className="h-24 w-auto drop-shadow-sm transform hover:scale-105 transition-transform" />
                        <div className="h-12 w-px bg-slate-200"></div>
                        <div className="text-slate-400 font-black tracking-widest text-[10px] uppercase">
                            Enterprise <span className="text-blue-600 italic">v7.04</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-6xl sm:text-7xl font-black tracking-tighter leading-none text-white">
                            Power<span className="text-blue-500">Asset</span>
                            <span className="block text-xl sm:text-3xl font-bold text-slate-400 mt-4 tracking-normal uppercase">System Gateway Interface</span>
                        </h1>
                        <p className="text-slate-400 text-lg sm:text-xl font-medium max-w-lg leading-relaxed">
                            Unified infrastructure management and security protocols for <span className="text-white font-black italic">Tri Centrum Fortuna</span> assets.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-10">
                        <StatusBadge icon={ShieldCheck} label="FIPS 140-2" />
                        <StatusBadge icon={Globe} label="Geo-Sync Active" />
                        <StatusBadge icon={Activity} label="SLA 99.9%" />
                    </div>
                </div>

                {/* Command Card */}
                <div className="w-full py-8">
                    <div className="space-y-1 mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authenticating Entry Protocols</span>
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tight">Access Control</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {modules.map((module) => (
                            <button
                                key={module.id}
                                onClick={module.action}
                                className="group relative w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 p-4 rounded-3xl transition-all duration-300 text-left hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.2)] active:scale-[0.98]"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl ${module.color} flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110`}>
                                            <module.icon size={26} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 leading-none">{module.status}</span>
                                            </div>
                                            <h4 className="text-xl font-black text-white leading-none group-hover:text-blue-400 transition-colors">{module.title}</h4>
                                            <p className="text-xs text-slate-400 font-bold mt-2">{module.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-blue-500 group-hover:border-blue-500 group-hover:text-white transition-all shadow-sm">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Terminal size={12} />
                            Terminal: {currentTime.toLocaleTimeString()}
                        </div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            © 2025 TCF-SG
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ icon: Icon, label }) {
    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 shadow-sm backdrop-blur-md">
            <Icon size={14} className="text-blue-400" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">{label}</span>
        </div>
    );
}

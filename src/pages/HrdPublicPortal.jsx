import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Activity, Globe, Server, ArrowLeft, ChevronRight, 
    MessageSquare, Zap, Monitor, LayoutGrid, Shield, Package
} from 'lucide-react';
import bgImage from '../assets/space-background.jpg';

export default function HrdPublicPortal() {
    const navigate = useNavigate();

    const organizations = [
        {
            title: "TCF-SG HRD Portal",
            subtitle: "Tri Centrum Fortuna - Sunter & Sadang",
            options: [
                {
                    id: 'fasilitas_sg',
                    title: 'Dashboard Fasilitas',
                    subtitle: 'Live asset checks and coverage tracking.',
                    icon: Package,
                    color: 'bg-blue-600',
                    glow: 'shadow-blue-600/30',
                    path: '/public/fasilitas?org=TCF-SG'
                },
                {
                    id: 'hse_sg',
                    title: 'Dashboard HSE',
                    subtitle: 'Environment Health & Safety Statistic Board.',
                    icon: Shield,
                    color: 'bg-emerald-600',
                    glow: 'shadow-emerald-600/30',
                    path: '/public/hse?org=TCF-SG'
                },
                {
                    id: 'room_sg',
                    title: 'Dashboard Meeting Room',
                    subtitle: 'Room availability and MoM analytics.',
                    icon: LayoutGrid,
                    color: 'bg-orange-600',
                    glow: 'shadow-orange-600/30',
                    path: '/public/rooms?org=TCF-SG'
                }
            ]
        },
        {
            title: "TCF-KG HRD Portal",
            subtitle: "Tri Centrum Fortuna - Karawang",
            options: [
                {
                    id: 'fasilitas_kg',
                    title: 'Dashboard Fasilitas',
                    subtitle: 'Live asset checks and coverage tracking.',
                    icon: Package,
                    color: 'bg-blue-600',
                    glow: 'shadow-blue-600/30',
                    path: '/public/fasilitas?org=TCF-KG'
                },
                {
                    id: 'hse_kg',
                    title: 'Dashboard HSE',
                    subtitle: 'Environment Health & Safety Statistic Board.',
                    icon: Shield,
                    color: 'bg-emerald-600',
                    glow: 'shadow-emerald-600/30',
                    path: '/public/hse?org=TCF-KG'
                },
                {
                    id: 'room_kg',
                    title: 'Dashboard Meeting Room',
                    subtitle: 'Room availability and MoM analytics.',
                    icon: LayoutGrid,
                    color: 'bg-orange-600',
                    glow: 'shadow-orange-600/30',
                    path: '/public/rooms?org=TCF-KG'
                }
            ]
        }
    ];

    return (
        <div className="h-screen bg-[#020617] text-white font-sans relative overflow-hidden px-4 sm:px-8 flex flex-col items-center justify-center">
            
            {/* Back Button */}
            <button 
                onClick={() => navigate('/')}
                className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group text-[10px] font-black uppercase tracking-widest z-50 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/10 backdrop-blur-md"
            >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Gateway
            </button>

            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-[-10%] z-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen animate-drift" style={{ backgroundImage: `url(${bgImage})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617] z-0"></div>
            </div>

            <div className="w-full max-w-[1600px] mx-auto relative z-10 flex flex-col h-full justify-center py-6">
                
                {/* Header */}
                <div className="text-center space-y-2 mb-8 animate-in slide-in-from-top duration-1000">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                        HRD <span className="text-purple-500 italic">Command</span> Portal
                    </h1>
                    <p className="text-slate-400 text-sm font-light tracking-wide max-w-xl mx-auto uppercase">
                        Select a facility layer to view live safety and space analytics.
                    </p>
                </div>

                {/* Organizations Grid */}
                <div className="space-y-5">
                    {organizations.map((org, orgIdx) => (
                        <div key={orgIdx} className="space-y-3">
                            <div className="border-l-4 border-purple-500 pl-3 animate-in slide-in-from-left duration-1000">
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">{org.title}</h2>
                                <p className="text-slate-400 font-medium text-xs">{org.subtitle}</p>
                            </div>

                            <div className="flex justify-center gap-5">
                                {org.options.map((option, idx) => (
                                    <button
                                        key={option.id}
                                        onClick={() => navigate(option.path)}
                                        className="group relative bg-white/5 backdrop-blur-3xl border border-white/10 p-5 rounded-3xl text-left transition-all duration-500 hover:bg-white/10 hover:-translate-y-1 hover:border-white/20 animate-in fade-in slide-in-from-bottom duration-1000 flex flex-col justify-between w-[350px]"
                                        style={{ animationDelay: `${(orgIdx * 2 + idx) * 0.1}s`, minHeight: '160px' }}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl ${option.color} flex items-center justify-center shadow-lg ${option.glow} mb-4 group-hover:scale-110 transition-transform duration-500`}>
                                            <option.icon size={24} className="text-white" />
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <h3 className="text-sm font-black text-white tracking-tight uppercase group-hover:text-purple-400 transition-colors leading-tight">
                                                {option.title}
                                            </h3>
                                            <p className="text-slate-500 text-[10px] font-medium leading-relaxed line-clamp-2">
                                                {option.subtitle}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-4 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-purple-500 group-hover:gap-2 transition-all">
                                            Enter <ChevronRight size={12} />
                                        </div>

                                        {/* Corner Accent */}
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <LayoutGrid size={32} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Status */}
                <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">© 2025 TCF HRD COMMAND</p>
                    <div className="flex gap-5">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                            Secure Open-Access Line
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

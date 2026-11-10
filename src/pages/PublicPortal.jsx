import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, ChevronRight, MessageSquare, Printer,
    FileSpreadsheet, Sparkles, Clock, ShieldCheck, 
    Building2, Activity, ExternalLink, CheckCircle2,
    Layers, Compass
} from 'lucide-react';
import bgImage from '../assets/space-background.jpg';

export default function PublicPortal() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedPlant, setSelectedPlant] = useState('ALL'); // 'ALL' | 'SG' | 'KG'

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    const dateString = currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    const organizations = [
        {
            code: 'SG',
            title: "TCF-SG Public Portal",
            name: "Plant Sadang & Sunter",
            subtitle: "Pusat Fabrikasi Sadang (Purwakarta) & Kantor Sunter (Jakarta)",
            badgeColor: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
            glowColor: "from-blue-600/10 via-cyan-500/5 to-transparent",
            accentBorder: "group-hover:border-blue-500/50",
            options: [
                {
                    id: 'ticket_sg',
                    category: 'HELP-DESK SLA',
                    title: 'Dashboard Tiket & Layanan',
                    subtitle: 'Pemantauan live antrian tiket kendala, SLA penanganan teknisi, dan eskalasi problem ICT.',
                    icon: MessageSquare,
                    color: 'from-blue-600 to-cyan-500',
                    borderHover: 'hover:border-blue-500/50 hover:shadow-blue-500/20',
                    badge: 'Live Queue & SLA',
                    tags: ['Real-Time', 'SLA Tracking', 'Tiket Aktif'],
                    path: '/public/dashboard/view/ticket?org=TCF-SG'
                },
                {
                    id: 'ricoh_sg',
                    category: 'PRINT TELEMETRY',
                    title: 'Dashboard Fotokopi & Print',
                    subtitle: 'Monitoring utilisasi mesin fotokopi Ricoh, pemakaian kertas tiap departemen & level toner terkini.',
                    icon: Printer,
                    color: 'from-purple-600 to-pink-500',
                    borderHover: 'hover:border-purple-500/50 hover:shadow-purple-500/20',
                    badge: 'Ricoh Telemetry',
                    tags: ['Level Toner', 'Counter Kertas', 'Ricoh MFP'],
                    path: '/public/dashboard/view/ricoh?org=TCF-SG'
                },
                {
                    id: 'budget_sg',
                    category: 'SOP-ICT-03 RESMI',
                    title: 'Permintaan Fasilitas & Budget',
                    subtitle: 'Formulir online resmi TCFSG-FM-ICT-03-04 untuk pengajuan PC baru, upgrade komponen & lisensi.',
                    icon: FileSpreadsheet,
                    color: 'from-rose-600 to-amber-500',
                    borderHover: 'hover:border-rose-500/50 hover:shadow-rose-500/20',
                    badge: 'Terbuka Umum',
                    tags: ['Formulir ISO', 'Tanpa Login', 'Upgrade & Capex'],
                    path: '/pengajuan-budget?plant=SG'
                }
            ]
        },
        {
            code: 'KG',
            title: "TCF-KG Public Portal",
            name: "Plant Karawang",
            subtitle: "Pusat Manufaktur Terpadu Karawang (KIM)",
            badgeColor: "from-indigo-500/20 to-teal-500/20 border-teal-500/30 text-teal-300",
            glowColor: "from-teal-600/10 via-indigo-500/5 to-transparent",
            accentBorder: "group-hover:border-teal-500/50",
            options: [
                {
                    id: 'ticket_kg',
                    category: 'HELP-DESK SLA',
                    title: 'Dashboard Tiket & Layanan',
                    subtitle: 'Pemantauan live antrian tiket kendala, SLA penanganan teknisi, dan eskalasi problem ICT.',
                    icon: MessageSquare,
                    color: 'from-indigo-600 to-teal-500',
                    borderHover: 'hover:border-teal-500/50 hover:shadow-teal-500/20',
                    badge: 'Live Queue & SLA',
                    tags: ['Real-Time', 'SLA Tracking', 'Tiket Aktif'],
                    path: '/public/dashboard/view/ticket?org=TCF-KG'
                },
                {
                    id: 'ricoh_kg',
                    category: 'PRINT TELEMETRY',
                    title: 'Dashboard Fotokopi & Print',
                    subtitle: 'Monitoring utilisasi mesin fotokopi Ricoh, pemakaian kertas tiap departemen & level toner terkini.',
                    icon: Printer,
                    color: 'from-fuchsia-600 to-violet-500',
                    borderHover: 'hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/20',
                    badge: 'Ricoh Telemetry',
                    tags: ['Level Toner', 'Counter Kertas', 'Ricoh MFP'],
                    path: '/public/dashboard/view/ricoh?org=TCF-KG'
                },
                {
                    id: 'budget_kg',
                    category: 'SOP-ICT-03 RESMI',
                    title: 'Permintaan Fasilitas & Budget',
                    subtitle: 'Formulir online resmi TCFKG-FM-ICT-03-04 untuk pengajuan PC baru, upgrade komponen & lisensi.',
                    icon: FileSpreadsheet,
                    color: 'from-amber-600 to-rose-500',
                    borderHover: 'hover:border-amber-500/50 hover:shadow-amber-500/20',
                    badge: 'Terbuka Umum',
                    tags: ['Formulir ISO', 'Tanpa Login', 'Upgrade & Capex'],
                    path: '/pengajuan-budget?plant=KG'
                }
            ]
        }
    ];

    const filteredOrganizations = selectedPlant === 'ALL' 
        ? organizations 
        : organizations.filter(o => o.code === selectedPlant);

    return (
        <div className="min-h-screen bg-[#030712] text-white font-sans relative overflow-x-hidden flex flex-col justify-between selection:bg-blue-600 selection:text-white">
            
            {/* Ambient Background & Deep Glow */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 mix-blend-screen animate-pulse" 
                    style={{ backgroundImage: `url(${bgImage})`, animationDuration: '8s' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#030712] via-[#030712]/80 to-[#030712]" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute bottom-10 right-10 w-[500px] h-[300px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />
            </div>

            {/* Top Navigation Bar */}
            <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex flex-wrap items-center justify-between gap-4">
                <button 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2.5 text-slate-300 hover:text-white transition-all group text-xs font-black uppercase tracking-wider bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 rounded-2xl border border-white/10 hover:border-white/20 backdrop-blur-xl shadow-lg"
                >
                    <ArrowLeft size={16} className="text-blue-400 group-hover:-translate-x-1 transition-transform" />
                    <span>Kembali ke Gateway</span>
                </button>

                <div className="flex items-center gap-3">
                    {/* Live Indicator */}
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full backdrop-blur-xl">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Live Systems</span>
                    </div>

                    {/* Clock Chip */}
                    <div className="hidden sm:flex items-center gap-2 bg-white/[0.04] border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-slate-300 backdrop-blur-xl">
                        <Clock size={13} className="text-blue-400" />
                        <span>{dateString}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-white font-mono">{timeString}</span>
                    </div>
                </div>
            </header>

            {/* Hero Title Section */}
            <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col justify-center">
                
                <div className="text-center space-y-3 mb-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-black uppercase tracking-widest backdrop-blur-md">
                        <Compass size={14} className="text-blue-400 animate-spin" style={{ animationDuration: '12s' }} />
                        PT Tri Centrum Fortuna • Public Command Center
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-none">
                        ICT <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">Command</span> Portal
                    </h1>
                    
                    <p className="text-slate-400 text-sm sm:text-base font-normal max-w-2xl mx-auto leading-relaxed">
                        Layanan operasional mandiri, monitoring tiket helpdesk, dan telemetri mesin fotokopi terpadu untuk seluruh plant.
                    </p>

                    {/* Plant Filter Buttons */}
                    <div className="pt-2 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setSelectedPlant('ALL')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                selectedPlant === 'ALL'
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30 scale-105'
                                    : 'bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                            }`}
                        >
                            Semua Sektor ({organizations.length})
                        </button>
                        <button
                            onClick={() => setSelectedPlant('SG')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                selectedPlant === 'SG'
                                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-600/30 scale-105'
                                    : 'bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                            }`}
                        >
                            Plant Sadang & Sunter (SG)
                        </button>
                        <button
                            onClick={() => setSelectedPlant('KG')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                selectedPlant === 'KG'
                                    ? 'bg-teal-600 text-white border-teal-500 shadow-lg shadow-teal-600/30 scale-105'
                                    : 'bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                            }`}
                        >
                            Plant Karawang (KG)
                        </button>
                    </div>
                </div>

                {/* Organizations Sectors */}
                <div className="space-y-12">
                    {filteredOrganizations.map((org) => (
                        <div key={org.code} className="space-y-5">
                            
                            {/* Sector Header Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-1 rounded-lg border text-xs font-black uppercase tracking-widest bg-gradient-to-r ${org.badgeColor}`}>
                                        SECTOR {org.code}
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                            {org.name}
                                        </h2>
                                        <p className="text-slate-400 text-xs font-medium">{org.subtitle}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                    <span>3 Layanan Terintegrasi</span>
                                </div>
                            </div>

                            {/* 3 Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {org.options.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => navigate(option.path)}
                                        className={`group relative bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-2xl border border-white/10 p-7 rounded-3xl text-left transition-all duration-300 hover:-translate-y-1.5 shadow-xl flex flex-col justify-between overflow-hidden ${option.borderHover}`}
                                        style={{ minHeight: '260px' }}
                                    >
                                        {/* Ambient Top Glow Line */}
                                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${option.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                                        
                                        {/* Corner Decorative Aura */}
                                        <div className={`absolute -right-10 -bottom-10 w-40 h-40 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-20 rounded-full blur-2xl transition-opacity duration-500 pointer-events-none`} />

                                        <div>
                                            {/* Header of Card */}
                                            <div className="flex items-center justify-between mb-5">
                                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                                    <option.icon size={28} className="text-white" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full group-hover:text-white transition-colors">
                                                    {option.badge}
                                                </span>
                                            </div>

                                            {/* Category Tag */}
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                                {option.category}
                                            </p>

                                            {/* Title */}
                                            <h3 className="text-lg font-black text-white tracking-tight uppercase group-hover:text-blue-400 transition-colors leading-snug mb-2.5">
                                                {option.title}
                                            </h3>

                                            {/* Subtitle / Description */}
                                            <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                                                {option.subtitle}
                                            </p>

                                            {/* Micro Tags */}
                                            <div className="flex flex-wrap gap-1.5 mt-4">
                                                {option.tags.map((tag, tIdx) => (
                                                    <span 
                                                        key={tIdx} 
                                                        className="text-[9px] font-bold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/5"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action Button CTA */}
                                        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-black uppercase tracking-wider text-blue-400 group-hover:text-blue-300 transition-colors">
                                            <span>Buka Layanan</span>
                                            <div className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-md">
                                                <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                        </div>
                    ))}
                </div>

            </main>

            {/* Futuristic Footer */}
            <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
                <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[11px] text-slate-400">
                    <ShieldCheck size={16} className="text-blue-400" />
                    <span>PT Tri Centrum Fortuna • ICT Infrastructure & Enterprise Command</span>
                </div>
                
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Prosedur IATF 16949 / ISO 9001</span>
                    <span>•</span>
                    <span>Hak Akses Terbuka</span>
                </div>
            </footer>

        </div>
    );
}

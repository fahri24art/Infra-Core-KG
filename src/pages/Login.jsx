import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Shield, User, Lock, AlertCircle, ArrowRight,
    Activity, ShieldCheck, Building2, FileSpreadsheet,
    Sparkles, Eye, EyeOff, Cpu, Server, Clock, Layers
} from 'lucide-react';
import infracoreEmblem from '../assets/infracore_emblem.png';
import bgGlobe from '../assets/custom_login_bg.jpg';
import ParticleBackground from '../components/ParticleBackground';

const ORGANIZATIONS = [
    {
        id: 'TCF-KG',
        shortLabel: 'Plant KG • Karawang',
        location: 'Karawang Manufacturing Node',
        node: 'KG-01'
    }
];

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [selectedOrg] = useState('TCF-KG');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const config = {
        title: 'Unified Core Access',
        subtitle: 'Autentikasi pusat kendali infrastruktur & aset TCF Karawang.',
        idLabel: 'Email / Username',
        passLabel: 'Password Keamanan',
        buttonLabel: 'Masuk ke InfraCore',
        brandSubtitle: 'Enterprise ICT, Asset Lifecycle & Security Fabric Platform',
        bgImage: bgGlobe,
    };

    useEffect(() => {
        document.title = 'Masuk - TCF InfraCore Karawang';
    }, []);

    const handleAdminLogin = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: credentials.username,
                    password: credentials.password,
                    organization: selectedOrg
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login gagal, periksa kembali akun Anda.');
            }

            sessionStorage.setItem('user', JSON.stringify(data));
            sessionStorage.setItem('organization', data.organization || selectedOrg);

            // Normal InfraCore Login Navigation
            const from = location.state?.from;
            if (from) {
                navigate(from.pathname + from.search, { replace: true });
            } else {
                const role = data.role?.toLowerCase() || '';
                if (['super_user', 'superuser', 'administrator', 'admin'].includes(role) || role.startsWith('ict') || role === 'technician' || role === 'teknisi') {
                    navigate('/ict/dashboard');
                } else {
                    navigate('/support');
                }
            }
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const formattedTime = currentTime.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const formattedDate = currentTime.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const activeOrgObj = ORGANIZATIONS[0];

    return (
        <div
            className="min-h-screen w-full font-sans flex flex-col justify-between px-6 py-4 sm:px-12 sm:py-6 lg:px-16 relative overflow-x-hidden overflow-y-auto bg-cover bg-center bg-no-repeat select-none"
            style={{ backgroundImage: `url(${config.bgImage})` }}
        >
            {/* Atmospheric Backdrop */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/95 via-[#030b1c]/80 to-[#020617]/75"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(6,182,212,0.18),transparent_55%),radial-gradient(circle_at_15%_80%,rgba(37,99,235,0.15),transparent_50%)] pointer-events-none"></div>

            <ParticleBackground />

            {/* ================= TOP MINIMAL OPEN STATUS BAR ================= */}
            <header className="w-full max-w-[960px] xl:max-w-[1000px] mx-auto flex-none flex items-center justify-between gap-4 z-30 pb-2.5 border-b border-white/[0.07] relative">
                {/* Left Status */}
                <div className="flex items-center gap-3 text-xs">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-cyan-400"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                    </span>
                    <span className="uppercase tracking-[0.2em] font-black text-white">
                        TCF INFRACORE
                    </span>
                    <span className="hidden sm:inline text-white/20">/</span>
                    <span className="hidden sm:flex items-center gap-1.5 text-amber-300 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>Plant Karawang Node (KG)</span>
                    </span>
                </div>

                {/* Right Telemetry & Clock */}
                <div className="flex items-center gap-4 text-xs">
                    <div className="hidden md:flex items-center gap-1.5 text-slate-400 font-medium">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span>ISO 9001 & IATF 16949</span>
                    </div>
                    <span className="hidden md:inline text-white/15">•</span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-300">
                        <Clock size={13} className="text-cyan-400" />
                        <span className="hidden sm:inline text-slate-400">{formattedDate},</span>
                        <span className="text-cyan-300 font-bold">{formattedTime} WIB</span>
                    </div>
                </div>
            </header>

            {/* ================= MAIN CONTENT AREA ================= */}
            <main className="flex-1 w-full max-w-[960px] xl:max-w-[1000px] mx-auto flex items-center justify-center my-auto relative z-20 py-4">
                <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-10 xl:gap-12">

                    {/* ================= LEFT SIDE: OPEN EDITORIAL SHOWCASE ================= */}
                    <div className="w-full lg:flex-1 max-w-[540px] flex flex-col justify-center space-y-6">

                        {/* 1. Open Brand Identity & Hero Title */}
                        <div className="space-y-3.5">
                            <div className="flex items-center gap-4">
                                <div className="relative flex items-center justify-center">
                                    <div className="absolute -inset-2.5 rounded-full bg-cyan-500/35 blur-xl"></div>
                                    <img
                                        src={infracoreEmblem}
                                        alt="TCF InfraCore"
                                        className="h-14 sm:h-15 w-auto object-contain relative drop-shadow-[0_0_18px_rgba(34,211,238,0.65)]"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xs sm:text-sm font-black tracking-[0.24em] uppercase text-cyan-400">
                                            PT Tri Centrum Fortuna
                                        </span>
                                        <span className="text-white/25">•</span>
                                        <span className="text-xs font-mono font-bold text-slate-400">
                                            v4.2 Enterprise
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-[13px] text-slate-400 font-medium tracking-wide mt-0.5">
                                        Automotive Stamping & Tooling Infrastructure
                                    </p>
                                </div>
                            </div>

                            {/* Hero Title */}
                            <div className="pt-1">
                                <h1 className="text-5xl sm:text-6xl lg:text-[62px] font-black tracking-tight leading-none flex items-center gap-3.5">
                                    <span className="text-white">Infra</span>
                                    <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                                        Core
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-cyan-300/95 font-mono translate-y-1">
                                        <Sparkles size={14} className="text-cyan-400" /> AI-Assisted
                                    </span>
                                </h1>
                                <p className="text-sm sm:text-[15px] text-slate-300/95 font-normal max-w-xl leading-relaxed mt-3">
                                    {config.brandSubtitle} — Node Mandiri Khusus <span className="text-amber-400 font-bold">Plant Karawang (KG)</span>.
                                </p>
                            </div>
                        </div>

                        {/* 2. Architectural Feature Stream */}
                        <div className="relative pl-7 space-y-5 before:content-[''] before:absolute before:left-[12px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-cyan-400 before:via-blue-500/60 before:to-transparent">
                            <div className="relative group">
                                <span className="absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.85)] group-hover:scale-125 transition-transform"></span>
                                <div className="flex items-center gap-2.5">
                                    <Server size={16} className="text-cyan-400" />
                                    <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                                        Master Asset & Live Telemetry
                                    </h3>
                                    <span className="text-xs font-mono text-amber-400/90 font-semibold">• Plant Karawang</span>
                                </div>
                                <p className="text-xs sm:text-[13.5px] text-slate-400 mt-1 leading-relaxed">
                                    Inventaris real-time spesifikasi PC, Laptop, CCTV, dan perangkat jaringan lokal Karawang.
                                </p>
                            </div>

                            <div className="relative group">
                                <span className="absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.65)] group-hover:scale-125 transition-transform"></span>
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck size={16} className="text-emerald-400" />
                                    <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                                        Autonomous Factory Node
                                    </h3>
                                    <span className="text-xs font-mono text-emerald-400/90 font-semibold">• Standalone KG</span>
                                </div>
                                <p className="text-xs sm:text-[13.5px] text-slate-400 mt-1 leading-relaxed">
                                    Server mandiri berkecepatan tinggi dengan latensi nol dan proteksi fail-safe operasional pabrik.
                                </p>
                            </div>

                            <div className="relative group">
                                <span className="absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.65)] group-hover:scale-125 transition-transform"></span>
                                <div className="flex items-center gap-2.5">
                                    <Layers size={16} className="text-indigo-400" />
                                    <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                                        Smart Budgeting & Digital Checksheet
                                    </h3>
                                    <span className="text-xs font-mono text-amber-300/90 font-semibold">• ISO / IK</span>
                                </div>
                                <p className="text-xs sm:text-[13.5px] text-slate-400 mt-1 leading-relaxed">
                                    Otomasi perencanaan CAPEX/OPEX Y2027, form pengajuan fasilitas & kuota printer Ricoh.
                                </p>
                            </div>
                        </div>

                        {/* 3. Open Self-Service Action Links */}
                        <div className="pt-5 border-t border-white/10 space-y-3.5">
                            <div className="flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                                    Akses Langsung Tanpa Login (Public Hub)
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-7 pt-1">
                                {/* Link 1: Form Pengajuan Budget & Fasilitas */}
                                <button
                                    type="button"
                                    onClick={() => navigate('/pengajuan-budget')}
                                    className="group flex items-start gap-3.5 text-left cursor-pointer relative"
                                >
                                    <div className="mt-0.5 p-3 rounded-full bg-cyan-500/15 text-cyan-300 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                                        <FileSpreadsheet size={19} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm sm:text-[15px] font-black text-white group-hover:text-cyan-300 transition-colors underline-offset-4 group-hover:underline">
                                                Form Pengajuan Fasilitas & Budget
                                            </span>
                                            <ArrowRight size={15} className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            SOP-ICT-03-04 • Ajukan PC, upgrade & anggaran (PDF/Excel)
                                        </p>
                                    </div>
                                </button>

                                <div className="hidden sm:block w-px h-10 bg-white/15"></div>

                                {/* Link 2: Portal Publik & Reporting ICT */}
                                <button
                                    type="button"
                                    onClick={() => navigate('/public')}
                                    className="group flex items-start gap-3.5 text-left cursor-pointer relative"
                                >
                                    <div className="mt-0.5 p-3 rounded-full bg-emerald-500/15 text-emerald-300 group-hover:bg-emerald-400 group-hover:text-slate-950 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                                        <Activity size={19} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm sm:text-[15px] font-black text-white group-hover:text-emerald-300 transition-colors underline-offset-4 group-hover:underline">
                                                Portal Publik & Reporting ICT
                                            </span>
                                            <ArrowRight size={15} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Cek status jaringan, kuota Ricoh & tiket support
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ================= RIGHT SIDE: THE ONLY CARD ================= */}
                    <div className="w-full lg:w-auto flex justify-center">
                        <div className="w-full max-w-[395px] lg:w-[395px] rounded-3xl bg-slate-950/80 backdrop-blur-2xl border border-cyan-500/25 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(6,182,212,0.14)] relative overflow-hidden">

                            {/* Top Highlight Beam */}
                            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                            <div className="absolute -top-20 -right-20 w-44 h-44 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

                            {/* Card Header */}
                            <div className="relative z-10 mb-5">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.18em] uppercase text-cyan-400">
                                        <Shield size={12} />
                                        <span>Identity & Access</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        TLS 1.3
                                    </span>
                                </div>

                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    {config.title}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {config.subtitle}
                                </p>
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center gap-2.5 relative z-10">
                                    <AlertCircle className="text-rose-400 shrink-0" size={16} />
                                    <p className="text-[11px] font-bold text-rose-200 leading-snug">{error}</p>
                                </div>
                            )}

                            {/* Login Form */}
                            <form onSubmit={handleAdminLogin} className="space-y-4 relative z-10">

                                {/* Locked Segment for Plant */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold uppercase tracking-widest text-slate-400">
                                            Lokasi Plant
                                        </span>
                                        <span className="font-mono text-amber-300/90 font-bold">
                                            Karawang Manufacturing Node
                                        </span>
                                    </div>

                                    <div className="py-2.5 px-3 rounded-xl bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center justify-center gap-2 shadow-sm">
                                        <Building2 size={13} className="text-amber-400" />
                                        <span>Plant KG • Karawang (Standalone Server)</span>
                                    </div>
                                </div>

                                {/* Username Input */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                                        {config.idLabel}
                                    </label>
                                    <div className="relative group">
                                        <User
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors"
                                            size={16}
                                        />
                                        <input
                                            type="text"
                                            value={credentials.username}
                                            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                            className="w-full bg-slate-900/85 border border-white/15 focus:bg-slate-900 rounded-xl py-2.5 pl-10 pr-3.5 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all font-semibold text-white placeholder-slate-500 text-xs sm:text-sm"
                                            placeholder="Username atau email TCF"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                                        {config.passLabel}
                                    </label>
                                    <div className="relative group">
                                        <Lock
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors"
                                            size={16}
                                        />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={credentials.password}
                                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                            className="w-full bg-slate-900/85 border border-white/15 focus:bg-slate-900 rounded-xl py-2.5 pl-10 pr-10 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all font-semibold text-white placeholder-slate-500 text-xs sm:text-sm"
                                            placeholder="••••••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                                            title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
                                        >
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button Area */}
                                <div className="pt-1.5">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 px-5 text-xs font-black uppercase tracking-[0.18em] shadow-xl flex items-center justify-center gap-2 text-white rounded-xl transition-all cursor-pointer hover:brightness-110 active:scale-[0.99] bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 shadow-cyan-500/25"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                <span>Memverifikasi...</span>
                                            </span>
                                        ) : (
                                            <>
                                                <span>{config.buttonLabel}</span>
                                                <ArrowRight size={15} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Card Footer */}
                            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-medium relative z-10">
                                <span className="flex items-center gap-1.5">
                                    <Cpu size={12} className="text-cyan-400" />
                                    <span>Active Directory & RBAC</span>
                                </span>
                                <span className="font-mono text-slate-500">NODE: {activeOrgObj.node}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            {/* ================= BOTTOM FOOTER ================= */}
            <footer className="w-full max-w-[960px] xl:max-w-[1000px] mx-auto flex-none flex flex-wrap items-center justify-between gap-2 z-20 pt-2 border-t border-white/[0.06] text-[10px] text-slate-400 font-medium">
                <span>© 2026 PT Tri Centrum Fortuna • Enterprise Infrastructure & Asset Management</span>
                <span className="text-slate-500">Protected by InfraGuard Zero-Trust Security Fabric</span>
            </footer>
        </div>
    );
}

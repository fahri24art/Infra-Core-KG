import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    Search, Bell, User, ChevronDown, LogOut, Shield,
    Activity, Lock, Book, Server, Settings, Globe, Zap,
    LayoutGrid, Menu, X, Terminal, AlertCircle, Printer, MonitorSpeaker, Users
} from 'lucide-react';
import logo from '../assets/Logo_TCF_Sec_Processed.png';

export default function Header() {
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [organization, setOrganization] = useState('TCF-KG');

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user data");
            }
        }

        // Hardlocked to TCF-KG for Karawang Standalone Instance
        sessionStorage.setItem('organization', 'TCF-KG');
        setOrganization('TCF-KG');

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const checkActive = (path) => location.pathname === path;

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('organization');
        navigate('/');
    };

    return (
        <header className={`fixed top-0 left-0 right-0 z-[100] pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex justify-center ${scrolled ? 'py-4' : 'py-6'}`}>
            <div className={`
                relative pointer-events-auto w-[96%] max-w-7xl flex items-center justify-between px-3 py-2 
                transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
                ${scrolled
                    ? 'rounded-[2rem] bg-[#020617]/70 backdrop-blur-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.15)] border border-white/10'
                    : 'rounded-[2.5rem] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.05)] border border-white/[0.08]'}
            `}>
                {/* Glowing edge effect overlay */}
                <div className="absolute inset-0 rounded-[inherit] pointer-events-none border border-transparent" style={{ background: 'linear-gradient(rgba(255,255,255,0.1), transparent) border-box', WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}></div>
                {scrolled && <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] opacity-50"></div>}
                {scrolled && <div className="absolute bottom-0 left-[40%] right-[40%] h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.5)] opacity-30"></div>}

                {/* Brand Area */}
                <div className="flex items-center gap-2 xl:gap-4 z-10 pl-1 xl:pl-2">
                    <div className="flex items-center gap-2 xl:gap-4 cursor-pointer group" onClick={() => navigate('/nexus')}>
                        <div className="relative w-8 h-8 xl:w-10 xl:h-10 flex items-center justify-center bg-gradient-to-br from-blue-900/40 to-cyan-900/20 rounded-xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 group-hover:scale-105 transition-transform duration-500 shrink-0">
                            <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-20 group-hover:opacity-60 transition-opacity duration-500 rounded-full"></div>
                            <img src={logo} alt="TCF" className="h-5 xl:h-7 w-auto relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-110" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-[0.2em] group-hover:to-white transition-all uppercase flex items-center gap-1">
                                POWER<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 italic drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">ASSET</span>
                            </h1>
                            <p className="text-[8px] font-bold text-amber-400/90 tracking-[0.3em] uppercase mt-0.5 group-hover:text-amber-300 transition-colors">Plant Karawang Hub</p>
                        </div>
                    </div>

                    <div className="hidden lg:block w-px h-6 xl:h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-1 xl:mx-0"></div>

                    {/* Navigation */}
                    <nav className="hidden lg:flex items-center gap-1 xl:gap-2 bg-white/5 backdrop-blur-md p-1 xl:p-1.5 rounded-2xl border border-white/10 shadow-inner">
                        {user?.role === 'admin' ? (
                            <>
                                <NavLink to="/dashboard" icon={LayoutGrid} label="Dashboard" active={checkActive('/dashboard')} />
                                <NavLink to="/assets" icon={Server} label="Inventory" active={checkActive('/assets')} />
                                <NavLink to="/maintenance" icon={Settings} label="Maintenance" active={checkActive('/maintenance')} />
                                <NavLink to="/tickets" icon={AlertCircle} label="Tickets" active={checkActive('/tickets')} />
                                <NavLink to="/hrd/employees" icon={Users} label="Employees" active={checkActive('/hrd/employees')} />
                                <NavLink to="/monitoring-alert" icon={MonitorSpeaker} label="Monitoring Alert" active={checkActive('/monitoring-alert')} />
                                <NavLink to="/reports" icon={Activity} label="Reports" active={checkActive('/reports')} />
                                <NavLink to="/admin" icon={Shield} label="Admin" active={checkActive('/admin')} />
                                <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                                <NavLink to="/support" icon={User} label="Support Center" active={checkActive('/support')} />
                            </>
                        ) : (
                            <>
                                <NavLink to="/support" icon={User} label="Support Center" active={checkActive('/support')} />
                            </>
                        )}
                    </nav>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 xl:gap-3 z-10 pr-1">
                    {/* Organization Badge */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-br from-emerald-900/30 to-black/40 backdrop-blur-md border border-emerald-500/20 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)]">
                        <Globe size={10} className="text-emerald-400 xl:w-3 xl:h-3" />
                        <span className="text-[8px] xl:text-[9px] font-black text-emerald-300 tracking-[0.2em] uppercase">{organization}</span>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 bg-gradient-to-br from-blue-900/30 to-black/40 backdrop-blur-md border border-cyan-500/20 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(34,211,238,0.1)]">
                        <Terminal size={10} className="text-cyan-400 animate-pulse xl:w-3 xl:h-3" />
                        <span className="text-[8px] xl:text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase truncate max-w-[100px] xl:max-w-none">Node: {user?.name || 'ADMIN'}</span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="bg-black/30 hover:bg-red-500/20 p-2 xl:p-2.5 rounded-full text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all duration-300 shadow-[0_0_0_rgba(239,68,68,0)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] group ml-0.5 xl:ml-1"
                        title="Terminate Session"
                    >
                        <LogOut size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                    </button>

                    <button className="lg:hidden text-white p-2.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-md" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-in fade-in duration-300"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}

            {/* Mobile Menu Menu */}
            <div className={`
                lg:hidden fixed top-[72px] left-4 right-4 z-[100] transition-all duration-500 transform
                ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}
            `}>
                <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-5 shadow-2xl relative overflow-hidden">
                    {/* Decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>

                    <nav className="flex flex-col gap-4 relative z-10">
                        {user?.role === 'admin' ? (
                            <>
                                <MobileNavLink to="/dashboard" icon={LayoutGrid} label="Dashboard" active={location.pathname === '/dashboard'} onClick={() => setIsOpen(false)} />
                                <MobileNavLink to="/assets" icon={Server} label="Inventory" active={location.pathname === '/assets'} onClick={() => setIsOpen(false)} />
                                <MobileNavLink to="/maintenance" icon={Settings} label="Maintenance" active={location.pathname === '/maintenance'} onClick={() => setIsOpen(false)} />
                                <MobileNavLink to="/tickets" icon={AlertCircle} label="Tickets" active={location.pathname === '/tickets'} onClick={() => setIsOpen(false)} />
                                <MobileNavLink to="/monitoring-alert" icon={MonitorSpeaker} label="Monitoring Alert" active={location.pathname === '/monitoring-alert'} onClick={() => setIsOpen(false)} />
                                <MobileNavLink to="/reports" icon={Activity} label="Reports" active={location.pathname === '/reports'} onClick={() => setIsOpen(false)} />
                                <MobileNavLink to="/admin" icon={Shield} label="Admin" active={location.pathname === '/admin'} onClick={() => setIsOpen(false)} />
                                <MobileNavLink to="/support" icon={User} label="Support Center" active={location.pathname === '/support'} onClick={() => setIsOpen(false)} />
                            </>
                        ) : (
                            <>
                                <MobileNavLink to="/support" icon={User} label="Support Center" active={location.pathname === '/support'} onClick={() => setIsOpen(false)} />
                            </>
                        )}

                        <div className="h-px bg-white/10 my-2"></div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 text-red-400 font-black uppercase text-xs tracking-[0.2em]"
                        >
                            <LogOut size={20} />
                            <span>Terminate Session</span>
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}

function NavLink({ to, icon: Icon, label, active }) {
    return (
        <Link to={to} className={`
            relative px-2 py-1.5 xl:px-4 xl:py-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 xl:gap-2 
            text-[8px] xl:text-[10px] font-black uppercase tracking-widest group border whitespace-nowrap
            ${active
                ? 'bg-blue-500/20 border-blue-400/40 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'bg-transparent border-transparent text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20'}
        `}>
            {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-xl pointer-events-none"></div>
            )}

            <Icon size={15} className={`
                relative z-10 transition-transform duration-300 
                ${active ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] scale-110' : 'group-hover:scale-110'}
            `} />
            <span className="relative z-10">{label}</span>

            {active && (
                <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-cyan-400 rounded-t-full shadow-[0_-2px_10px_rgba(34,211,238,1)]"></div>
            )}
        </Link>
    );
}

function MobileNavLink({ to, icon: Icon, label, active, onClick }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className={`
                relative px-6 py-4 rounded-2xl transition-all duration-300 flex items-center gap-4 border overflow-hidden
                text-xs font-black uppercase tracking-widest group
                ${active
                    ? 'bg-blue-600/20 border-blue-500/40 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20 hover:text-white'}
            `}
        >
            <div className={`
                p-2.5 rounded-xl transition-all duration-300 relative z-10 flex items-center justify-center
                ${active ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-[0_4px_15px_rgba(34,211,238,0.4)]' : 'bg-black/20 group-hover:bg-white/10'}
            `}>
                <Icon size={20} className={active ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'group-hover:scale-110 transition-transform'} />
            </div>
            <span className="relative z-10 font-bold">{label}</span>

            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-1/2 bg-cyan-400 rounded-r-full shadow-[2px_0_15px_rgba(34,211,238,0.8)]"></div>
            )}
        </Link>
    );
}
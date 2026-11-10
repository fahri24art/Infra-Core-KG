import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate, Link } from 'react-router-dom';
import { 
    LayoutGrid, Server, Settings, Zap, AlertCircle, 
    MonitorSpeaker, Shield, LogOut, User, Users, Activity, LifeBuoy, Printer, Wrench, Layers, Package, Heart, Menu, X, CalendarDays, Terminal, Database, ChevronLeft, ChevronRight, ChevronDown, Video, FileText, Network, Book, FolderOpen, ClipboardList, Key, BarChart2, Coins,
    Search, Bell, Moon
} from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import RemoteDesktop from './components/RemoteDesktop';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import ICTInventory from './pages/ict/ICTInventory';
import DataCenterMonitoring from './pages/DataCenterMonitoring';
import CctvCenter from './pages/ict/CctvCenter';
import EndpointLockdown from './pages/ict/EndpointLockdown';
import BudgetingCenter from './pages/ict/BudgetingCenter';
import PublicRoomDashboard from './pages/PublicRoomDashboard';
import PublicFasilitasDashboard from './pages/PublicFasilitasDashboard';

import MaintenanceSchedule from './pages/MaintenanceSchedule';
import MaintenanceExecution from './pages/MaintenanceExecution';
import Tickets from './pages/Tickets';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import UserManagement from './pages/admin/UserManagement';
import UserProfile from './pages/admin/UserProfile';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import DivisionManagement from './pages/admin/DivisionManagement';
import SystemSettings from './pages/admin/SystemSettings';
import DocumentControl from './pages/admin/DocumentControl';
import RawDocumentBank from './pages/admin/RawDocumentBank';
import AutomatedForms from './pages/admin/AutomatedForms';
import DocumentStudio from './pages/admin/DocumentStudio';
import Licenses from './pages/admin/glpi/Licenses';
import Consumables from './pages/admin/glpi/Consumables';
import Contracts from './pages/admin/glpi/Contracts';
import KnowledgeBase from './pages/admin/glpi/KnowledgeBase';
import DatabaseAsset from './pages/admin/DatabaseAsset';
import Agent from './pages/Agent';
import NexusHub from './pages/NexusHub';
import SupportCenter from './pages/SupportCenter';
import PublicDashboard from './pages/PublicDashboard';
import PublicPortal from './pages/PublicPortal';
import InfraGuard from './pages/ict/InfraGuard';
import InfraGuardDashboard from './pages/ict/InfraGuardDashboard';
import RicohServer from './pages/RicohServer';
import PublicRicohDashboard from './pages/PublicRicohDashboard';
import SkillMatrix from './pages/admin/SkillMatrix';
import Rooms from './pages/Rooms';
import PublicBudgetRequest from './pages/PublicBudgetRequest';
import bgImage from './assets/space-background.jpg';
import logo from './assets/Logo_TCF_Sec_Processed.png';
import infracoreEmblem from './assets/infracore_emblem.png';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-20 text-center bg-white h-screen">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                    <pre className="text-xs bg-slate-100 p-4 rounded-lg overflow-auto max-w-2xl mx-auto text-left text-slate-900 border border-slate-300">
                        {this.state.error?.toString()}
                        <br />
                        {this.state.error?.stack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    const handleGlobalSearchKeyDown = (e) => {
        if (e.key === 'Enter' && globalSearch.trim()) {
            navigate('/ict/assets?search=' + encodeURIComponent(globalSearch.trim()));
        }
    };
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
        const saved = localStorage.getItem('sidebarExpanded');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [openDropdowns, setOpenDropdowns] = useState({});
    
    // Set dynamic document title for Plant Karawang
    useEffect(() => {
        document.title = 'TCF InfraCore KG - Enterprise Infrastructure & Operations';
    }, []);

    // Reset manual toggle overrides saat pindah halaman agar menu yang aktif otomatis terbuka
    useEffect(() => {
        setOpenDropdowns({});
    }, [location.pathname]);

    const toggleDropdown = (label, currentIsOpen) => {
        setOpenDropdowns(prev => ({ 
            ...prev, 
            [label]: !currentIsOpen 
        }));
        if (!isSidebarExpanded) {
            setIsSidebarExpanded(true);
            localStorage.setItem('sidebarExpanded', 'true');
        }
    };
    
    const toggleSidebar = () => {
        const newState = !isSidebarExpanded;
        setIsSidebarExpanded(newState);
        localStorage.setItem('sidebarExpanded', JSON.stringify(newState));
    };

    const isLoginPage = location.pathname.startsWith('/login');
    const isNexusPage = location.pathname === '/portal' || location.pathname === '/nexus' || location.pathname === '/ict-hub' || location.pathname === '/hrd-hub';
    const isSupportPage = location.pathname === '/support';
    const isPublicRoute = location.pathname.startsWith('/public');
    const isPrintPage = location.pathname.includes('/print/');
    const isTvMode = location.pathname === '/ict/cctv' && location.search.includes('tv=1');
    const isBudgetRequestPage = location.pathname === '/pengajuan-budget' || location.pathname === '/permintaan-budget';
    
    const hideNav = isLoginPage || isNexusPage || isSupportPage || isPublicRoute || isPrintPage || isTvMode || isBudgetRequestPage;

    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    const isSuperAdmin = user && ['super_user', 'superuser', 'administrator', 'admin'].includes(user.role?.toLowerCase());
    
    // For Plant KG standalone, strictly locked to TCF-KG
    const userOrg = user?.organization || 'TCF-KG';
    const activeOrg = 'TCF-KG';
    const isKG = true;

    // Auto-correct sessionStorage if non-admin has mismatched plant
    useEffect(() => {
        if (!isSuperAdmin && user?.organization && sessionStorage.getItem('organization') !== user.organization) {
            sessionStorage.setItem('organization', user.organization);
        }
    }, [isSuperAdmin, user?.organization]);

    const handleSwitchPlant = (targetOrg) => {
        if (!isSuperAdmin) {
            console.warn('[Security] Unauthorized: Hanya administrator yang dapat beralih plant.');
            return;
        }
        if (targetOrg === activeOrg) return;
        sessionStorage.setItem('organization', targetOrg);
        if (user) {
            user.organization = targetOrg;
            sessionStorage.setItem('user', JSON.stringify(user));
        }
        const url = new URL(window.location.href);
        if (url.searchParams.has('org')) {
            url.searchParams.set('org', targetOrg);
            window.location.href = url.toString();
        } else {
            window.location.reload();
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        navigate('/login');
    };

    if (hideNav) return <div className="min-h-screen bg-[#F6F7F9] font-sans antialiased text-slate-900">{children}</div>;

    const isTechnician = Boolean(
        user && (
            ['technician', 'teknisi'].includes(user.role?.toLowerCase()) ||
            user.role?.toLowerCase()?.includes('technician') ||
            user.role?.toLowerCase()?.includes('teknisi') ||
            user.role?.toLowerCase()?.includes('tech') ||
            (isKG && user.username?.toLowerCase() === 'agung')
        )
    );
    const isKGTechnician = isKG && isTechnician;

    const ictNavItems = [
        { path: '/ict/dashboard', label: 'Dashboard', icon: LayoutGrid },
        { label: 'Assets', icon: Server, subItems: [
            { path: '/ict/assets', label: 'Fixed Assets', icon: Server },
            { path: '/ict/assets?tab=sto', label: 'Stock Opname (STO)', icon: FileText },
            { path: '/ict/assets?tab=agent', label: 'Node Control (Agent)', icon: Zap },
            ...(!isKGTechnician ? [{ path: '/ict/datacenter', label: 'Data Center', icon: Database }] : []),
        ]},
        { label: 'Assistance', icon: LifeBuoy, subItems: [
            { path: '/ict/tickets', label: 'Tickets', icon: AlertCircle },
            { path: '/support', label: 'Support Center ICT', icon: LifeBuoy },
        ]},
        { label: 'Tools', icon: Wrench, subItems: [
            { path: '/ict/cctv', label: 'CCTV Surveillance', icon: Video },
            { path: '/ict/ricoh-server', label: 'Ricoh Server', icon: Printer },
        ]},
        { label: 'Maintenance', icon: Settings, subItems: [
            { path: '/ict/maintenance', label: 'Maintenance Schedule', icon: Settings },
        ]},
        { label: 'Security', icon: Shield, subItems: [
            { path: '/ict/lockdown', label: 'Endpoint Lockdown', icon: Shield },
        ]},
        { label: 'Administration', icon: Wrench, subItems: [
            { path: '/ict/admin', label: 'Admin Panel', icon: Wrench },
            { path: '/ict/reports', label: 'Modul KPI ICT', icon: BarChart2 },
            { path: '/ict/admin/documents', label: 'Document Control (PDF QMR)', icon: FolderOpen },
            { path: '/ict/admin/automated-forms', label: 'System Reports', icon: ClipboardList },
            { path: '/ict/budgeting', label: 'Budgeting (Capex/Opex)', icon: Coins },
            { path: '/ict/glpi/licenses', label: 'Software Licenses', icon: Key },
            { path: '/ict/glpi/contracts', label: 'Contracts & Vendors', icon: FileText },
        ]},
    ];

    let navItems = [...ictNavItems];

    // Home navigation
    const handleHomeClick = () => {
        navigate('/ict/dashboard');
    };

    return (
        <div className="flex h-screen w-full bg-[#F6F7F9] print:bg-white font-sans antialiased text-slate-900 overflow-hidden print:overflow-visible relative">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Premium Modern Dark Nav Sidebar */}
            <nav className={`
                print:hidden fixed md:relative h-full
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${isSidebarExpanded ? 'md:w-[260px]' : 'md:w-[72px]'}
                w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-50 group shadow-2xl
            `}>
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800 overflow-hidden whitespace-nowrap bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <img src={infracoreEmblem} alt="InfraCore" className="w-10 h-10 object-contain drop-shadow-md" />
                        <span className={`font-black tracking-tight text-xl text-white transition-all ${!isSidebarExpanded ? 'md:hidden' : 'block'}`}>
                            INFRA<span className="text-cyan-400">CORE</span>
                        </span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 py-3 space-y-1 relative z-50 overflow-y-auto custom-scrollbar pb-20">
                    {navItems.map((item, idx) => {
                        if (item.subItems) {
                            const isGroupActive = item.subItems.some(sub => location.pathname === sub.path);
                            const isOpen = openDropdowns[item.label] !== undefined 
                                ? openDropdowns[item.label] 
                                : isGroupActive;
                            return (
                                <div key={idx} className="mb-1">
                                    <button 
                                        onClick={() => toggleDropdown(item.label, isOpen)}
                                        className={`w-full flex items-center h-12 relative transition-all duration-300 group/item mx-3 rounded-xl overflow-hidden hover:bg-white/5 ${
                                            isGroupActive ? 'text-amber-500' : 'text-slate-300'
                                        }`}
                                    >
                                        <div className="w-[48px] flex items-center justify-center min-w-[48px] h-full">
                                            <item.icon size={20} className={`${isGroupActive ? 'text-amber-500' : 'group-hover/item:scale-110'} transition-all duration-300`} />
                                        </div>
                                        <span className={`absolute left-[56px] font-bold text-[14px] whitespace-nowrap transition-all duration-300 md:block tracking-wide ${!isSidebarExpanded ? 'md:opacity-0 md:-translate-x-4 md:pointer-events-none hidden' : 'md:opacity-100 block'}`}>
                                            {item.label}
                                        </span>
                                        <ChevronDown size={16} className={`absolute right-8 transition-transform duration-300 ${!isSidebarExpanded ? 'opacity-0' : 'opacity-100'} ${isOpen ? 'rotate-180 text-amber-500' : 'text-slate-400'}`} />
                                    </button>
                                    
                                    {/* Sub Items */}
                                    <div className={`overflow-hidden transition-all duration-300 ${isOpen && isSidebarExpanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="ml-12 border-l border-slate-600/50 my-1 py-1 space-y-1">
                                            {item.subItems.map(sub => {
                                                const isActive = location.pathname === sub.path;
                                                return (
                                                    <Link 
                                                        key={sub.path} 
                                                        to={sub.path}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`flex items-center h-10 px-4 relative transition-all duration-300 group/subitem rounded-r-xl overflow-hidden ${
                                                            isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <span className="font-bold text-[13px] whitespace-nowrap">{sub.label}</span>
                                                        {isActive && (
                                                            <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 h-full w-1 bg-amber-500 rounded-r-full" />
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // Normal Item
                        const isActive = location.pathname === item.path;
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path}
                                title={item.label}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center h-12 relative transition-all duration-300 group/item mx-3 my-1 rounded-xl overflow-hidden ${
                                    isActive ? 'bg-amber-500/15 text-amber-500' : 'text-slate-300 hover:text-slate-100 hover:bg-white/5'
                                }`}
                            >
                                <div className={`w-[48px] flex items-center justify-center min-w-[48px] h-full ${!isSidebarExpanded && isActive ? 'bg-amber-500/20 rounded-xl' : ''}`}>
                                    <item.icon size={20} className={`${isActive ? 'scale-110 text-amber-500' : 'group-hover/item:scale-110'} transition-all duration-300`} />
                                </div>
                                <span className={`absolute left-[56px] font-bold text-[14px] whitespace-nowrap transition-all duration-300 md:block tracking-wide ${!isSidebarExpanded ? 'md:opacity-0 md:-translate-x-4 md:pointer-events-none hidden' : 'md:opacity-100 block'}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-amber-500 rounded-r-full" />
                                )}
                                {/* Modern Floating Tooltip for Desktop */}
                                {!isSidebarExpanded && (
                                    <div className="absolute left-[64px] px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black rounded-lg opacity-0 md:group-hover/item:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none uppercase tracking-widest translate-x-0 md:group-hover/item:translate-x-2 hidden md:block z-[60] shadow-xl">
                                        {item.label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-auto border-t border-slate-800 p-3 flex flex-col gap-2 bg-black/20">
                    <button 
                        onClick={toggleSidebar}
                        title={isSidebarExpanded ? "Collapse menu" : "Expand menu"}
                        className="hidden md:flex w-full h-12 items-center rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-300 relative group/toggle px-1"
                    >
                        <div className="w-[48px] flex items-center justify-center min-w-[48px]">
                            {isSidebarExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                        <span className={`absolute left-[56px] font-bold text-[13px] whitespace-nowrap transition-all duration-300 md:block ${!isSidebarExpanded ? 'md:opacity-0 md:-translate-x-4 md:pointer-events-none hidden' : 'md:opacity-100 block'}`}>
                            Collapse menu
                        </span>
                    </button>

                    <button 
                        onClick={handleLogout}
                        title="Sign Out"
                        className="w-full h-12 flex items-center rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all duration-300 relative group/logout px-1 mt-auto"
                    >
                        <div className="w-[48px] flex items-center justify-center min-w-[48px]">
                            <LogOut size={20} className="group-hover/logout:scale-110 transition-transform duration-200" />
                        </div>
                        <span className={`absolute left-[56px] font-bold text-[13px] whitespace-nowrap transition-all duration-300 md:block ${!isSidebarExpanded ? 'md:opacity-0 md:-translate-x-4 md:pointer-events-none hidden' : 'md:opacity-100 block'}`}>
                            Sign Out
                        </span>
                        {!isSidebarExpanded && (
                            <div className="absolute left-[70px] px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black rounded-lg opacity-0 md:group-hover/logout:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none uppercase tracking-widest translate-x-0 md:group-hover/logout:translate-x-2 hidden md:block z-[60] shadow-xl shadow-rose-500/20">
                                Sign Out
                            </div>
                        )}
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen print:h-auto overflow-hidden print:overflow-visible w-full max-w-full">
                {/* InfraGuard-Aligned Cyber Topbar */}
                <header className="print:hidden h-14 bg-[#0B132B] border-b border-slate-800/90 flex items-center justify-between px-3 md:px-5 z-30 shadow-md">
                    <div className="flex items-center gap-2 md:gap-4 text-sm font-bold text-slate-400 overflow-hidden">
                        {/* Hamburger Menu Toggle (Mobile Only) */}
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-1.5 -ml-1 text-slate-400 hover:text-white md:hidden rounded-lg hover:bg-slate-800"
                        >
                            <Menu size={22} />
                        </button>

                        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={handleHomeClick}>
                            <div className="flex flex-col justify-center">
                                <span className="font-black text-white tracking-wider flex items-center text-sm md:text-base leading-tight">
                                    INFRA<span className="text-blue-500 font-extrabold ml-0.5">CORE</span>
                                </span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.18em] leading-tight">
                                    Unified Assets
                                </span>
                            </div>
                        </div>

                        <div className="w-1 h-1 rounded-full bg-slate-700 hidden sm:block shrink-0" />

                        <span className="text-slate-400 text-xs font-semibold capitalize truncate max-w-[140px] sm:max-w-none tracking-wide">
                            {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
                        </span>

                        {/* Static Plant Indicator (Karawang Standalone Node) */}
                        <div 
                            className="flex items-center bg-slate-900/90 px-3 py-1.5 rounded-xl border border-amber-500/40 ml-1 sm:ml-2 text-amber-300 text-xs font-black gap-2 shadow-sm"
                            title="Node Mandiri Khusus Plant Karawang (KG)"
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            <span>Plant KG (Karawang)</span>
                        </div>
                    </div>

                    {/* Right Controls Aligned with InfraGuard */}
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Search Bar */}
                        <div className="relative hidden md:block">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search IPs, Logs, Policies..."
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                onKeyDown={handleGlobalSearchKeyDown}
                                className="bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-400 pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-52 lg:w-64 transition-all shadow-inner"
                            />
                        </div>

                        {/* Dark Mode Icon */}
                        <button
                            type="button"
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 rounded-lg transition-all"
                            title="Dark Fabric Theme Active"
                        >
                            <Moon size={18} />
                        </button>

                        {/* Notification Bell */}
                        <button
                            type="button"
                            onClick={() => navigate('/ict/tickets')}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-all relative"
                            title="Live Alerts & Tickets"
                        >
                            <Bell size={18} />
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse absolute top-1 right-1 ring-2 ring-[#0B132B]"></span>
                        </button>

                        {/* User Profile Pill & Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs uppercase">
                                    {user?.name?.[0]?.toUpperCase() || 'A'}
                                </div>
                                <div className="text-left hidden sm:block">
                                    <p className="text-xs font-bold text-slate-200 leading-tight">
                                        {user?.full_name || user?.name || 'Administrator TCF'}
                                    </p>
                                    <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 leading-tight">
                                        {user?.role?.toUpperCase() || 'ADMIN'}
                                    </p>
                                </div>
                                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
                            </button>

                            {/* Dropdown Menu */}
                            {showUserDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs">
                                        <div className="px-4 py-2.5 border-b border-slate-800">
                                            <p className="font-bold text-white text-sm">{user?.name || 'Administrator TCF'}</p>
                                            <p className="text-slate-400 text-[11px] font-medium">{user?.username || 'admin@tricentrumfortuna.com'}</p>
                                            <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[9px] font-black uppercase">
                                                {activeOrg} • {user?.role || 'Admin'}
                                            </span>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                type="button"
                                                onClick={() => { setShowUserDropdown(false); navigate('/ict/admin'); }}
                                                className="w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
                                            >
                                                <Settings size={14} className="text-slate-400" /> Admin Settings
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowUserDropdown(false); navigate('/support'); }}
                                                className="w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
                                            >
                                                <LifeBuoy size={14} className="text-slate-400" /> Support Center
                                            </button>
                                        </div>
                                        <div className="border-t border-slate-800 pt-1 mt-1">
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-2 font-bold"
                                            >
                                                <LogOut size={14} /> Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="print:p-0 flex-1 overflow-y-auto print:overflow-visible custom-scrollbar p-4 md:p-5 relative">
                    <div className="print:max-w-none max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

const ProtectedRoute = ({ children, requireAdmin = false, blockKGTech = false }) => {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    const location = useLocation();

    // Bypass Auth for TV Dashboard Link
    if (location.pathname === '/ict/cctv' && location.search.includes('tv=1')) {
        return children;
    }

    if (!user) {
        let loginType = 'support';
        if (requireAdmin) loginType = 'admin';
        return <Navigate to={`/login/${loginType}`} state={{ from: location }} replace />;
    }

    const role = user.role?.toLowerCase() || '';
    const isSuperAdmin = ['admin', 'administrator', 'super_user', 'superuser'].includes(role);
    const userOrg = user?.organization || 'TCF-KG';
    const activeOrg = isSuperAdmin ? (sessionStorage.getItem('organization') || userOrg) : userOrg;
    const isTechnician = role === 'technician' || role === 'teknisi' || role.includes('tech') || (activeOrg === 'TCF-KG' && user?.username?.toLowerCase() === 'agung');
    const isKGTechnician = activeOrg === 'TCF-KG' && isTechnician;

    if (blockKGTech && isKGTechnician) {
        return <Navigate to="/ict/dashboard" replace />;
    }

    if (requireAdmin && !isSuperAdmin && !role.startsWith('ict') && !isTechnician) {
        return <Navigate to="/support" replace />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <Layout>
                <ErrorBoundary>
                    <Routes>
                        <Route path="/" element={<Navigate to="/ict/dashboard" replace />} />
                        <Route path="/portal" element={<Navigate to="/ict/dashboard" replace />} />
                        <Route path="/ict-hub" element={<NexusHub />} />
                        <Route path="/nexus" element={<Navigate to="/ict/dashboard" replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/login/:type" element={<Login />} />

                        {/* Admin Only Routes */}
                        <Route path="/ict/dashboard" element={<ProtectedRoute requireAdmin={true}><Dashboard /></ProtectedRoute>} />
                        <Route path="/ict/assets" element={<ProtectedRoute requireAdmin={true}><Assets /></ProtectedRoute>} />
                        <Route path="/ict/documents" element={<ProtectedRoute requireAdmin={true} blockKGTech={true}><RawDocumentBank /></ProtectedRoute>} />
                        <Route path="/ict/assets/:id" element={<ProtectedRoute requireAdmin={true}><AssetDetail /></ProtectedRoute>} />
                        <Route path="/ict/inventory" element={<ProtectedRoute requireAdmin={true}><ICTInventory /></ProtectedRoute>} />
                        <Route path="/ict/maintenance" element={<ProtectedRoute requireAdmin={true}><MaintenanceSchedule /></ProtectedRoute>} />
                        <Route path="/ict/maintenance/execution/:id" element={<ProtectedRoute requireAdmin={true}><MaintenanceExecution /></ProtectedRoute>} />
                        <Route path="/ict/datacenter" element={<ProtectedRoute requireAdmin={true} blockKGTech={true}><DataCenterMonitoring /></ProtectedRoute>} />

                        {/* ICT Additional Routes */}
                        <Route path="/ict/tickets" element={<ProtectedRoute requireAdmin={true}><Tickets /></ProtectedRoute>} />
                        <Route path="/ict/reports" element={<ProtectedRoute requireAdmin={true}><Reports /></ProtectedRoute>} />
                        <Route path="/ict/budgeting" element={<ProtectedRoute requireAdmin={true}><BudgetingCenter /></ProtectedRoute>} />
                        <Route path="/ict/activity-plan" element={<ProtectedRoute requireAdmin={true}><BudgetingCenter defaultSection="ACTIVITY_PLAN" /></ProtectedRoute>} />
                        <Route path="/ict/activity-plans" element={<ProtectedRoute requireAdmin={true}><BudgetingCenter defaultSection="ACTIVITY_PLAN" /></ProtectedRoute>} />
                        <Route path="/ict/roadmap" element={<ProtectedRoute requireAdmin={true}><BudgetingCenter defaultSection="ACTIVITY_PLAN" /></ProtectedRoute>} />
                        <Route path="/ict/kpi" element={<Navigate to="/ict/reports" replace />} />
                        <Route path="/ict/ricoh-server" element={<ProtectedRoute requireAdmin={true}><RicohServer /></ProtectedRoute>} />
                        <Route path="/ict/lockdown" element={<ProtectedRoute requireAdmin={true}><EndpointLockdown /></ProtectedRoute>} />
                        <Route path="/ict/cctv" element={<ProtectedRoute requireAdmin={true}><CctvCenter /></ProtectedRoute>} />
                        <Route path="/ict/remote/:id" element={<ProtectedRoute requireAdmin={true}><RemoteDesktop /></ProtectedRoute>} />
                        <Route path="/ict/admin" element={<ProtectedRoute requireAdmin={true}><Admin /></ProtectedRoute>} />
                        <Route path="/ict/admin/users" element={<ProtectedRoute requireAdmin={true}><UserManagement /></ProtectedRoute>} />
                        <Route path="/ict/admin/users/profile/:id" element={<ProtectedRoute requireAdmin={true}><UserProfile /></ProtectedRoute>} />
                        <Route path="/ict/admin/departments" element={<ProtectedRoute requireAdmin={true}><DepartmentManagement /></ProtectedRoute>} />
                        <Route path="/ict/admin/divisions" element={<ProtectedRoute requireAdmin={true}><DivisionManagement /></ProtectedRoute>} />
                        <Route path="/ict/admin/database-asset" element={<ProtectedRoute requireAdmin={true}><DatabaseAsset /></ProtectedRoute>} />
                        <Route path="/ict/admin/settings" element={<ProtectedRoute requireAdmin={true}><SystemSettings /></ProtectedRoute>} />
                        <Route path="/ict/admin/documents" element={<ProtectedRoute requireAdmin={true}><DocumentControl /></ProtectedRoute>} />
                        <Route path="/ict/admin/automated-forms" element={<ProtectedRoute requireAdmin={true} blockKGTech={true}><AutomatedForms /></ProtectedRoute>} />
                        <Route path="/ict/glpi/licenses" element={<ProtectedRoute requireAdmin={true}><Licenses /></ProtectedRoute>} />
                        <Route path="/ict/glpi/consumables" element={<ProtectedRoute requireAdmin={true}><Consumables /></ProtectedRoute>} />
                        <Route path="/ict/glpi/contracts" element={<ProtectedRoute requireAdmin={true}><Contracts /></ProtectedRoute>} />
                        <Route path="/ict/glpi/knowledge-base" element={<ProtectedRoute requireAdmin={true}><KnowledgeBase /></ProtectedRoute>} />
                        {/* Redirect dari URL lama ke URL baru */}
                        <Route path="/admin/settings" element={<Navigate to="/ict/admin/settings" replace />} />
                        <Route path="/ict/agent" element={<Navigate to="/ict/assets?tab=agent" replace />} />
                        <Route path="/ict/document-control" element={<Navigate to="/ict/admin/documents" replace />} />

                        {/* Public/User Routes */}
                        <Route path="/support" element={<ProtectedRoute><SupportCenter /></ProtectedRoute>} />
                        <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
                        <Route path="/public" element={<PublicPortal />} />
                        <Route path="/public/dashboard" element={<PublicDashboard />} />
                        <Route path="/public/dashboard/view/:type" element={<PublicDashboard />} />
                        <Route path="/public/dashboard/view/ricoh" element={<PublicRicohDashboard />} />
                        <Route path="/public/rooms" element={<PublicRoomDashboard />} />
                        <Route path="/public/fasilitas" element={<PublicFasilitasDashboard />} />
                        <Route path="/public/hse" element={<PublicHseDashboard />} />
                        
                        {/* Public Department Budget Request (No Login Required) */}
                        <Route path="/pengajuan-budget" element={<PublicBudgetRequest />} />
                        <Route path="/permintaan-budget" element={<PublicBudgetRequest />} />
                        <Route path="/public/permintaan-budget" element={<PublicBudgetRequest />} />
                        <Route path="/public/budget-request" element={<PublicBudgetRequest />} />
                    </Routes>
                </ErrorBoundary>
            </Layout>
        </Router>
    );
}

export default App;

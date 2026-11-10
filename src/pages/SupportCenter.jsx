import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Plus, Search, Clock, CheckCircle, MessageCircle, Send, XCircle, AlertCircle, ChevronLeft, ChevronRight,
    Ticket, Activity, User, Monitor, FileText, Paperclip, LayoutGrid, LogOut, CheckSquare, Shield, Settings, LifeBuoy
} from 'lucide-react';

import SupportLogo from '../assets/SupportCenterLogo.png';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SignatureModal from '../components/ui/SignatureModal';

export default function SupportCenter() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'home';
    const setActiveTab = (tabId) => setSearchParams({ tab: tabId });
    const [user, setUser] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [assets, setAssets] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [allAssets, setAllAssets] = useState([]);
    const [assetSearch, setAssetSearch] = useState('');
    const [signatureConfig, setSignatureConfig] = useState(null);

    // Form State
    const [ticketForm, setTicketForm] = useState({
        target_dept: 'ICT',
        topic: 'Perbaikan / Masalah Perangkat - PC / Laptop Lemot atau Error',
        asset_id: '',
        subject: '',
        message: ''
    });

    // Detail View State
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [responses, setResponses] = useState([]);
    const [replyMessage, setReplyMessage] = useState('');

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchMyData(parsedUser.id);
    }, []);

    const fetchMyData = async (userId) => {
        try {
            const org = user?.organization || 'TCF-SG';
            const [ticketsRes, assetsRes, approvalsRes, allAssetsRes] = await Promise.all([
                fetch(`/api/network/portal/my-tickets/${userId}`),
                fetch(`/api/network/portal/my-assets/${userId}`),
                fetch(`/api/network/portal/my-approvals/${userId}`),
                fetch(`/api/network/assets`)
            ]);

            setTickets(ticketsRes.ok ? await ticketsRes.json() : []);
            setAssets(assetsRes.ok ? await assetsRes.json() : []);
            setApprovals(approvalsRes.ok ? await approvalsRes.json() : []);
            setAllAssets(allAssetsRes.ok ? await allAssetsRes.json() : []);
        } catch (err) {
            console.error('Failed to fetch data', err);
            setTickets([]);
            setAssets([]);
            setApprovals([]);
            setAllAssets([]);
        }
    };

    const onSignatureSave = async (base64) => {
        const record = signatureConfig;
        setSignatureConfig(null);
        if (!record) return;

        try {
            const updatedData = { ...record.checksheet_data };
            let approvedByField = '';

            if (record.required_role === 'User') {
                updatedData.sign_user = base64;
                approvedByField = 'checked_by';
            } else if (record.required_role === 'Manager') {
                updatedData.sign_manager = base64;
                approvedByField = 'approved_by';
            }

            const payload = {
                ...record,
                checksheet_data: updatedData,
                [approvedByField]: user.name,
                [approvedByField === 'checked_by' ? 'checked_at' : 'approved_at']: new Date().toISOString()
            };

            const res = await fetch('/api/network/maintenance/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchMyData(user.id);
                alert('Signature saved successfully!');
            } else {
                alert('Failed to save signature.');
            }
        } catch (err) {
            console.error('Error saving signature', err);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if(!ticketForm.message || ticketForm.message === '<p><br></p>') return;
        try {
            const res = await fetch('/api/network/portal/create-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_dept: ticketForm.target_dept,
                    user_id: user.id,
                    asset_id: ticketForm.asset_id,
                    subject: ticketForm.subject,
                    description: `[Topic: ${ticketForm.topic}]\n\n${ticketForm.message}`,
                    priority: 'Normal'
                })
            });

            if (res.ok) {
                alert('Ticket created successfully!');
                setTicketForm({ target_dept: 'ICT', topic: 'Network Issue', asset_id: '', subject: '', message: '' });
                setAssetSearch('');
                fetchMyData(user.id);
                setActiveTab('status');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openTicketDetail = async (ticket) => {
        setSelectedTicket(ticket);
        try {
            const res = await fetch(`/api/network/tickets/${ticket.id}/responses`);
            const data = await res.json();
            setResponses(Array.isArray(data) ? data : []);
            setActiveTab('detail');
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        if(!replyMessage || replyMessage === '<p><br></p>') return;
        try {
            const res = await fetch(`/api/network/tickets/${selectedTicket.id}/responses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    message: replyMessage,
                    type: 'public'
                })
            });

            if (res.ok) {
                const newResponse = await res.json();
                setResponses([...responses, newResponse]);
                setReplyMessage('');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Diajukan':
            case 'New': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'Diproses':
            case 'Open': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'Selesai':
            case 'Resolved':
            case 'Closed': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'Ditolak': return 'bg-rose-50 text-rose-600 border-rose-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const handleLogout = () => {
        const role = user?.role;
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('organization');
        // Redirect ke login modul masing-masing
        if (role === 'hrd') navigate('/login/hrd');
        else if (role === 'machine') navigate('/login/machine');
        else if (role === 'dies') navigate('/login/dies');
        else if (role === 'admin') navigate('/login/admin');
        else navigate('/login/support');
    };

    // Helper: back destination per role
    const backConfig = {
        admin:   { label: 'Enterprise Hub',        path: '/' },
        hrd:     { label: 'HRD Dashboard',         path: '/dashboard/hrd' },
        machine: { label: 'Maintenance Dashboard', path: '/dashboard/machine' },
        dies:    { label: 'Engineering Dashboard', path: '/dashboard/dies' },
    };

    if (!user) return null;

    return (
        <div className="flex flex-col h-screen w-full bg-[#F6F7F9] font-sans text-slate-900 overflow-hidden">
            <style>{`
                .ql-toolbar { border: none !important; border-bottom: 1px solid #E2E8F0 !important; border-radius: 1rem 1rem 0 0; background: #F8FAFC; padding: 12px 16px !important; }
                .ql-container { border: none !important; border-radius: 0 0 1rem 1rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; min-height: 150px; background: white; }
                .ql-editor { padding: 20px !important; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
            `}</style>

            {/* Top Header */}
            <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[#E1E1E1] flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600"></div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 p-1.5 rounded-xl border border-blue-100/50 shadow-inner">
                        <img src={SupportLogo} alt="Support Logo" className="w-full h-full object-contain drop-shadow-sm" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">Support Center <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">ICT & HRGA</span></h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Employee Self-Service</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Tombol kembali untuk semua role modul */}
                    {backConfig[user?.role] && (
                        <button
                            onClick={() => navigate(backConfig[user.role].path)}
                            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all"
                        >
                            <ChevronLeft size={14} />
                            {backConfig[user.role].label}
                        </button>
                    )}
                    <div className="text-right hidden sm:block">
                        <p className="text-[11px] font-black text-slate-900 leading-none">{user.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-sm font-black border border-blue-100 text-blue-600">
                        {user.name.charAt(0)}
                    </div>
                    <button onClick={handleLogout} className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-64 border-r border-[#E1E1E1] bg-white flex flex-col shrink-0 z-0">
                    <div className="p-4 border-b border-[#E1E1E1] space-y-3">
                        <button
                            onClick={() => navigate((backConfig[user?.role] || { path: '/ict/dashboard' }).path)}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <ChevronLeft size={18} /> {(backConfig[user?.role] || { label: 'ICT Dashboard' }).label}
                        </button>
                        <button onClick={() => setActiveTab('new')} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                            <Plus size={18} /> New Request
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Self-Service Modules</h3>
                            <ul className="space-y-1">
                                {[
                                    { id: 'home', icon: LayoutGrid, label: 'Dashboard' },
                                    { id: 'status', icon: Ticket, label: 'My Tickets', badge: tickets.length },
                                    { id: 'approvals', icon: CheckSquare, label: 'Approvals', badge: approvals.length },
                                    { id: 'assets', icon: Monitor, label: 'My Assets', badge: assets.length }
                                ].map(tab => {
                                    const isActive = activeTab === tab.id || (activeTab === 'detail' && tab.id === 'status');
                                    return (
                                        <li key={tab.id}>
                                            <button 
                                                onClick={() => { setActiveTab(tab.id); if(tab.id !== 'detail') setSelectedTicket(null); }} 
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <tab.icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                                                    <span>{tab.label}</span>
                                                </div>
                                                {tab.badge > 0 && (
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>{tab.badge}</span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#F6F7F9]">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                        <div className="space-y-5 w-full max-w-[1600px] mx-auto">

                            {/* HOME DASHBOARD */}
                            {activeTab === 'home' && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-5 md:p-10 rounded-3xl shadow-xl flex flex-col md:flex-row items-center gap-5 border border-white/10">
                                        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                                        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
                                        
                                        <div className="relative z-10 w-24 h-24 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center border border-white/20 shrink-0 shadow-2xl">
                                            <LifeBuoy size={40} className="drop-shadow-lg" />
                                        </div>
                                        <div className="relative z-10 text-center md:text-left">
                                            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase drop-shadow-md">Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">Support Center ICT & HRGA</span></h2>
                                            <p className="text-blue-100/80 mt-3 font-medium max-w-2xl text-sm md:text-base leading-relaxed">This is your comprehensive Employee Self-Service Portal. Request HRD/GA support, book meeting rooms, view assets assigned to you, and securely approve maintenance checksheets.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-lg shadow-amber-500/5 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner border border-amber-200/50 group-hover:scale-110 transition-transform"><Ticket size={26}/></div>
                                                <span className="text-4xl font-black text-slate-800 tracking-tighter">{tickets.length}</span>
                                            </div>
                                            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Active Tickets</h3>
                                            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Track support requests</p>
                                        </div>
                                        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-lg shadow-blue-500/5 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner border border-blue-200/50 group-hover:scale-110 transition-transform"><Monitor size={26}/></div>
                                                <span className="text-4xl font-black text-slate-800 tracking-tighter">{assets.length}</span>
                                            </div>
                                            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">My Assets</h3>
                                            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Hardware assigned to you</p>
                                        </div>
                                        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-lg shadow-emerald-500/5 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-200/50 group-hover:scale-110 transition-transform"><CheckSquare size={26}/></div>
                                                <span className="text-4xl font-black text-slate-800 tracking-tighter">{approvals.length}</span>
                                            </div>
                                            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Pending Approvals</h3>
                                            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Awaiting your sign</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NEW TICKET FORM */}
                            {activeTab === 'new' && (
                                <div className="bg-white p-5 rounded-3xl border border-[#E1E1E1] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="mb-8 border-b border-[#E1E1E1] pb-6">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Submit Support Request</h2>
                                        <p className="text-slate-500 text-sm mt-1">Fill out the form below to report an issue or request a service from the ICT team.</p>
                                    </div>

                                    <form onSubmit={handleCreateTicket} className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Dept</label>
                                                <select
                                                    required
                                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                                                    value={ticketForm.target_dept}
                                                    onChange={(e) => setTicketForm({ ...ticketForm, target_dept: e.target.value, topic: e.target.value === 'ICT' ? 'Perbaikan / Masalah Perangkat - PC / Laptop Lemot atau Error' : 'Facility Issue' })}
                                                >
                                                    <option value="ICT">ICT (Information & Communication Tech)</option>
                                                    <option value="HRGA">HRGA (Human Resources & General Affairs)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                                                <select
                                                    required
                                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                                                    value={ticketForm.topic}
                                                    onChange={(e) => setTicketForm({ ...ticketForm, topic: e.target.value })}
                                                >
                                                    {ticketForm.target_dept === 'ICT' ? (
                                                        <>
                                                            <optgroup label="Permintaan Baru (Requisition)">
                                                                <option value="Permintaan Baru - Hardware (PC/Laptop/Printer)">Hardware (PC/Laptop/Printer)</option>
                                                                <option value="Permintaan Baru - Aksesoris & Consumables">Aksesoris & Consumables (Mouse/Keyboard/Tinta)</option>
                                                                <option value="Permintaan Baru - Akun & Jaringan">Akun & Jaringan (Email/WiFi/Akses)</option>
                                                                <option value="Permintaan Baru - Software & Sistem">Software & Sistem (Akses Modul/Report)</option>
                                                                <option value="Permintaan Baru - Lainnya">Lainnya</option>
                                                            </optgroup>
                                                            <optgroup label="Perbaikan / Masalah Perangkat">
                                                                <option value="Perbaikan / Masalah Perangkat - PC / Laptop Lemot atau Error">PC / Laptop Lemot atau Error</option>
                                                                <option value="Perbaikan / Masalah Perangkat - Printer / Mesin Fotocopy Macet">Printer / Mesin Fotocopy Macet</option>
                                                                <option value="Perbaikan / Masalah Perangkat - Checksheet / Maintenance Rutin">Checksheet / Maintenance Rutin</option>
                                                                <option value="Perbaikan / Masalah Perangkat - Lainnya">Lainnya</option>
                                                            </optgroup>
                                                            <optgroup label="Laporan Kerusakan Sistem / Jaringan">
                                                                <option value="Laporan Kerusakan Sistem / Jaringan - Jaringan / Internet Mati Total">Jaringan / Internet Mati Total</option>
                                                                <option value="Laporan Kerusakan Sistem / Jaringan - Server / Akses Sistem Down">Server / Akses Sistem Down</option>
                                                                <option value="Laporan Kerusakan Sistem / Jaringan - CCTV Mati / Minta Rekaman">CCTV Mati / Minta Rekaman</option>
                                                                <option value="Laporan Kerusakan Sistem / Jaringan - Lainnya">Lainnya</option>
                                                            </optgroup>
                                                            <optgroup label="Lain-lain / Pertanyaan Umum">
                                                                <option value="Lain-lain / Pertanyaan Umum">Pertanyaan Umum / Lainnya</option>
                                                            </optgroup>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option value="Facility Issue">Facility Issue (AC, Listrik, Air)</option>
                                                            <option value="Vehicle Request">Vehicle Request (Kendaraan)</option>
                                                            <option value="Employee Needs">Employee Needs (ATK, Meja, Kursi)</option>
                                                            <option value="Other HRGA Request">Other HRGA Request</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                            {ticketForm.target_dept === 'ICT' ? (
                                                <div className="space-y-2 relative">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Asset (Optional)</label>
                                                    <input 
                                                        type="text"
                                                        list="ict-assets-list"
                                                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                                                        placeholder="Type to search asset..."
                                                        value={assetSearch}
                                                        onChange={(e) => {
                                                            setAssetSearch(e.target.value);
                                                            const found = allAssets.find(a => `${a.inventory_number} - ${a.name}` === e.target.value);
                                                            setTicketForm({ ...ticketForm, asset_id: found ? found.id : '' });
                                                        }}
                                                    />
                                                    <datalist id="ict-assets-list">
                                                        {allAssets.map(asset => (
                                                            <option key={asset.id} value={`${asset.inventory_number} - ${asset.name}`} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Asset (Optional)</label>
                                                    <select
                                                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                                                        value={ticketForm.asset_id}
                                                        onChange={(e) => setTicketForm({ ...ticketForm, asset_id: e.target.value })}
                                                    >
                                                        <option value="">No Specific Asset</option>
                                                        {assets.map(asset => (
                                                            <option key={asset.id} value={asset.id}>{asset.name} - {asset.inventory_number}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Brief summary of the issue..."
                                                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-800"
                                                value={ticketForm.subject}
                                                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detailed Description</label>
                                            <div className="rounded-2xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                                <ReactQuill
                                                    theme="snow"
                                                    value={ticketForm.message}
                                                    onChange={(content) => setTicketForm({ ...ticketForm, message: content })}
                                                    placeholder="Please provide detailed information..."
                                                    modules={{
                                                        toolbar: [
                                                            ['bold', 'italic', 'underline'],
                                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                            ['image', 'clean']
                                                        ]
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-6 flex justify-end">
                                            <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                                                <Send size={16} /> Submit Ticket
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* TICKET LIST */}
                            {activeTab === 'status' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">My Support Tickets</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {tickets.length === 0 ? (
                                            <div className="col-span-full bg-white p-16 rounded-3xl border border-[#E1E1E1] text-center">
                                                <Ticket size={48} className="mx-auto text-slate-300 mb-4" />
                                                <h3 className="text-lg font-bold text-slate-600">No tickets found</h3>
                                                <p className="text-slate-400 text-sm mt-1">You haven't submitted any support requests yet.</p>
                                            </div>
                                        ) : (
                                            tickets.map(ticket => (
                                                <div key={ticket.id} onClick={() => openTicketDetail(ticket)} className="bg-white p-5 rounded-2xl border border-[#E1E1E1] shadow-sm hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between gap-4 group">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-all shrink-0">
                                                            <Activity size={24} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{ticket.id}</span>
                                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${getStatusStyle(ticket.status)}`}>
                                                                    {ticket.status}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">{ticket.subject}</h4>
                                                            {ticket.category && <p className="text-xs font-semibold text-slate-500 mt-1 line-clamp-1">{ticket.category}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-t border-slate-100 pt-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock size={14} />
                                                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <span className="group-hover:text-blue-500 flex items-center gap-1 transition-colors">View <ChevronRight size={14} /></span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TICKET DETAIL */}
                            {activeTab === 'detail' && selectedTicket && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setActiveTab('status')} className="w-10 h-10 bg-white border border-[#E1E1E1] rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                                            <ChevronLeft size={20} />
                                        </button>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase line-clamp-1 flex-1">{selectedTicket.subject}</h2>
                                        <span className={`px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-widest ${getStatusStyle(selectedTicket.status)}`}>
                                            {selectedTicket.status}
                                        </span>
                                    </div>

                                    <div className="bg-white rounded-3xl border border-[#E1E1E1] shadow-sm overflow-hidden flex flex-col">
                                        
                                        {/* Top Details Table */}
                                        {(() => {
                                            const lastResponse = responses.length > 0 ? responses[responses.length - 1] : null;
                                            const lastResponseDate = lastResponse ? new Date(lastResponse.created_at).toLocaleString() : '-';
                                            const lastMessageDate = new Date(selectedTicket.created_at).toLocaleString();
                                            
                                            let closedBy = '-';
                                            let closeDate = '-';
                                            if (selectedTicket.status === 'Closed') {
                                                closeDate = new Date(selectedTicket.updated_at).toLocaleString();
                                                const lastAdminResp = [...responses].reverse().find(r => r.user_role === 'admin');
                                                closedBy = lastAdminResp ? lastAdminResp.user_name : 'System';
                                            }

                                            return (
                                                <div className="bg-white border-b border-slate-200 text-sm">
                                                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
                                                        {/* Left Column */}
                                                        <div className="flex-1">
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-4">
                                                                <span className="font-bold text-slate-700">Status:</span>
                                                                <span className="text-blue-600">{selectedTicket.status}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-4">
                                                                <span className="font-bold text-slate-700">Priority:</span>
                                                                <span className="text-blue-600">{selectedTicket.priority || 'Normal'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-200 p-2 px-4">
                                                                <span className="font-bold text-slate-700">Department:</span>
                                                                <span className="text-blue-600">{selectedTicket.user_department || selectedTicket.department || 'General'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-4">
                                                                <span className="font-bold text-slate-700">Create Date:</span>
                                                                <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-4 bg-slate-50/50">
                                                                <span className="font-bold text-slate-700">Closed By:</span>
                                                                <span>{closedBy}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-4 bg-slate-50/50">
                                                                <span className="font-bold text-slate-700">SLA Plan:</span>
                                                                <span className="text-blue-600">Default SLA</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] p-2 px-4 bg-slate-50/50">
                                                                <span className="font-bold text-slate-700">Close Date:</span>
                                                                <span>{closeDate}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Right Column */}
                                                        <div className="flex-1">
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-4">
                                                                <span className="font-bold text-slate-700">User:</span>
                                                                <span className="text-blue-600 font-semibold">{user.name}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-4">
                                                                <span className="font-bold text-slate-700">Email:</span>
                                                                <span className="text-slate-600">{selectedTicket.email || '-'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-200 p-2 px-4">
                                                                <span className="font-bold text-slate-700">Source:</span>
                                                                <span>{selectedTicket.source || 'Web'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-4">
                                                                <span className="font-bold text-slate-700">Help Topic:</span>
                                                                <span className="text-blue-600">{selectedTicket.category || 'General'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-4">
                                                                <span className="font-bold text-slate-700">Last Message:</span>
                                                                <span>{lastMessageDate}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[110px_1fr] p-2 px-4">
                                                                <span className="font-bold text-slate-700">Last Response:</span>
                                                                <span>{lastResponseDate}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Asset Info Row */}
                                                    <div className="border-t border-slate-200 bg-slate-100 p-2 px-4">
                                                        <div className="grid grid-cols-[110px_1fr]">
                                                            <span className="font-bold text-slate-700">Asset Info:</span>
                                                            <span className="text-slate-600 italic">{selectedTicket.asset_name || '—Empty—'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Thread Header Tabs */}
                                        <div className="border-b border-slate-200 bg-[#F6F7F9] px-4 pt-4 flex">
                                            <div className="bg-white px-4 py-2 border-t border-x border-slate-200 rounded-t flex items-center font-bold text-sm text-slate-800 -mb-px">
                                                Ticket Thread ({responses.length + 1})
                                            </div>
                                        </div>

                                        <div className="p-5 space-y-5 bg-[#F6F7F9]">
                                            {/* Initial Request */}
                                            <div className="flex justify-end gap-3">
                                                <div className="bg-white border border-[#c1d1e4] rounded shadow-sm w-full md:w-5/6 relative">
                                                    <div className="absolute top-4 -right-2 w-4 h-4 bg-[#EAF1F8] border-t border-r border-[#c1d1e4] transform rotate-45"></div>
                                                    <div className="bg-[#EAF1F8] border-b border-[#c1d1e4] px-4 py-2 flex items-center justify-between">
                                                        <div>
                                                            <span className="font-bold text-slate-800 text-sm">{user.name}</span>
                                                            <span className="text-slate-500 text-xs ml-2">posted {new Date(selectedTicket.created_at).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <div dangerouslySetInnerHTML={{ __html: selectedTicket.description || selectedTicket.subject }} className="p-4 text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none" />
                                                </div>
                                                <div className="w-10 h-10 rounded bg-slate-300 shrink-0 flex items-center justify-center text-white font-bold">
                                                    {user.name.charAt(0)}
                                                </div>
                                            </div>

                                            {/* Responses */}
                                            {responses.filter(r => r.type === 'public').map(response => {
                                                const isAdmin = response.user_role === 'admin';
                                                
                                                if (isAdmin) {
                                                    // Admin Response Bubble
                                                    return (
                                                        <div key={response.id} className="flex gap-3">
                                                            <div className="w-10 h-10 rounded bg-slate-800 shrink-0 flex items-center justify-center text-white">
                                                                <Shield size={18} />
                                                            </div>
                                                            <div className="bg-white border border-[#e0c4a4] rounded shadow-sm w-full md:w-5/6 relative">
                                                                <div className="absolute top-4 -left-2 w-4 h-4 bg-[#fdeedc] border-b border-l border-[#e0c4a4] transform rotate-45"></div>
                                                                <div className="bg-[#fdeedc] border-b border-[#e0c4a4] px-4 py-2 flex items-center justify-between">
                                                                    <div>
                                                                        <span className="font-bold text-slate-800 text-sm">Support Engineer ({response.user_name})</span>
                                                                        <span className="text-slate-500 text-xs ml-2">posted {new Date(response.created_at).toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                                <div dangerouslySetInnerHTML={{ __html: response.message }} className="p-4 text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none" />
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    // User Follow-up Bubble
                                                    return (
                                                        <div key={response.id} className="flex justify-end gap-3">
                                                            <div className="bg-white border border-[#c1d1e4] rounded shadow-sm w-full md:w-5/6 relative">
                                                                <div className="absolute top-4 -right-2 w-4 h-4 bg-[#EAF1F8] border-t border-r border-[#c1d1e4] transform rotate-45"></div>
                                                                <div className="bg-[#EAF1F8] border-b border-[#c1d1e4] px-4 py-2 flex items-center justify-between">
                                                                    <div>
                                                                        <span className="font-bold text-slate-800 text-sm">{response.user_name}</span>
                                                                        <span className="text-slate-500 text-xs ml-2">posted {new Date(response.created_at).toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                                <div dangerouslySetInnerHTML={{ __html: response.message }} className="p-4 text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none" />
                                                            </div>
                                                            <div className="w-10 h-10 rounded bg-slate-300 shrink-0 flex items-center justify-center text-white font-bold">
                                                                {response.user_name.charAt(0)}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })}
                                        </div>

                                        {/* Reply Box */}
                                        <div className="p-4 bg-white">
                                            {selectedTicket.status === 'Closed' ? (
                                                <div className="text-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                                    <CheckCircle size={32} className="mx-auto text-slate-400 mb-2" />
                                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">This ticket has been closed</p>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleSendReply}>
                                                    <div className="rounded-2xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all overflow-hidden">
                                                        <ReactQuill 
                                                            theme="snow"
                                                            value={replyMessage}
                                                            onChange={setReplyMessage}
                                                            placeholder="Type your reply here..."
                                                            modules={{ toolbar: [['bold', 'italic', 'underline'], [{'list':'ordered'}, {'list':'bullet'}], ['link', 'clean']] }}
                                                        />
                                                    </div>
                                                    <div className="mt-4 flex justify-end">
                                                        <button type="submit" className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                                                            <Send size={16} /> Send Reply
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ASSETS LIST */}
                            {activeTab === 'assets' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">My Assets</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {assets.length === 0 ? (
                                            <div className="col-span-full bg-white p-16 rounded-3xl border border-[#E1E1E1] text-center">
                                                <Monitor size={48} className="mx-auto text-slate-300 mb-4" />
                                                <h3 className="text-lg font-bold text-slate-600">No assets assigned</h3>
                                                <p className="text-slate-400 text-sm mt-1">You currently have no hardware assets assigned to your account.</p>
                                            </div>
                                        ) : (
                                            assets.map(asset => (
                                                <div key={asset.id} className="bg-white p-4 rounded-2xl border border-[#E1E1E1] shadow-sm flex items-start gap-4 hover:border-blue-300 transition-colors">
                                                    <div className="w-12 h-12 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
                                                        <Monitor size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{asset.name}</h3>
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-3">{asset.inventory_number}</p>
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[10px] font-black uppercase tracking-widest">
                                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Active
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* APPROVALS LIST */}
                            {activeTab === 'approvals' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Pending Approvals</h2>
                                    <div className="grid grid-cols-1 gap-4">
                                        {approvals.length === 0 ? (
                                            <div className="bg-white p-16 rounded-3xl border border-[#E1E1E1] text-center">
                                                <CheckSquare size={48} className="mx-auto text-slate-300 mb-4" />
                                                <h3 className="text-lg font-bold text-slate-600">All caught up</h3>
                                                <p className="text-slate-400 text-sm mt-1">There are no pending maintenance checks that require your signature.</p>
                                            </div>
                                        ) : (
                                            approvals.map(approval => (
                                                <div key={approval.id} className="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-orange-500">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-black uppercase tracking-widest border border-orange-200">Requires Signature</span>
                                                            <span className="text-xs text-slate-500">{new Date(approval.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <h3 className="font-bold text-slate-900 text-lg">Maintenance Report: {approval.asset_name}</h3>
                                                        <p className="text-sm text-slate-600 mt-1">Role required: <span className="font-semibold">{approval.required_role}</span></p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setSignatureConfig(approval)}
                                                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors whitespace-nowrap"
                                                    >
                                                        Review & Sign
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}



                        </div>
                    </div>
                </div>
            </div>

            {signatureConfig && (
                <SignatureModal
                    onSave={onSignatureSave}
                    onClose={() => setSignatureConfig(null)}
                    title={`Sign as ${signatureConfig.required_role}`}
                />
            )}
        </div>
    );
}

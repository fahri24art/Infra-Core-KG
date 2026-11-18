import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Plus, Search, Clock, CheckCircle, MessageCircle, Send, XCircle, AlertCircle, ChevronLeft, ChevronRight,
    Ticket, Activity, User, Monitor, FileText, Paperclip, LayoutGrid, LogOut, CheckSquare, Shield, Settings, LifeBuoy, Printer,
    FileSpreadsheet, Laptop, KeyRound, Sparkles, RefreshCw, Check, ArrowRight, CheckCircle2, AlertTriangle, Building2, Smartphone, Copy
} from 'lucide-react';

import SupportLogo from '../assets/SupportCenterLogo.png';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SignatureModal from '../components/ui/SignatureModal';
import PublicBudgetRequest from './PublicBudgetRequest';
import http from '../services/http';

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

    // Quota Self-Service State (Auto-Integrated)
    const [selectedQuotaAssetId, setSelectedQuotaAssetId] = useState('');
    const [useCustomDevice, setUseCustomDevice] = useState(false);
    const [customDeviceName, setCustomDeviceName] = useState('');
    const [ricohPin, setRicohPin] = useState('');
    const [quotaType, setQuotaType] = useState('BW'); // 'BW' | 'COLOR' | 'COPIER_BW' | 'COPIER_COLOR' | 'CUSTOM'
    const [amountBw, setAmountBw] = useState(50);
    const [amountColor, setAmountColor] = useState(0);
    const [amountCopierBw, setAmountCopierBw] = useState(0);
    const [amountCopierColor, setAmountCopierColor] = useState(0);
    const [quotaReason, setQuotaReason] = useState('');
    const [quotaPhone, setQuotaPhone] = useState('');
    const [submittingQuota, setSubmittingQuota] = useState(false);
    const [quotaSuccessMsg, setQuotaSuccessMsg] = useState('');
    const [quotaErrorMsg, setQuotaErrorMsg] = useState('');
    const [myQuotaRequests, setMyQuotaRequests] = useState([]);
    const [allPublicDevices, setAllPublicDevices] = useState([]);
    const [publicDeviceQuery, setPublicDeviceQuery] = useState('');
    const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);

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
        if (parsedUser.phone) setQuotaPhone(parsedUser.phone);
        fetchMyData(parsedUser.id, parsedUser);
        fetchPublicDevices();
    }, []);

    const fetchPublicDevices = async () => {
        try {
            const res = await http.get('/api/ricoh/public-devices');
            if (Array.isArray(res.data)) {
                setAllPublicDevices(res.data);
            }
        } catch(e) {}
    };

    const fetchMyQuotaRequests = async (currentUser, compName) => {
        try {
            const u = currentUser || user;
            const params = new URLSearchParams();
            if (compName) params.append('device_name', compName);
            if (u?.name) params.append('applicant_name', u.name);
            if (u?.nik) params.append('applicant_nik', u.nik);
            const res = await http.get(`/api/ricoh/my-requests?${params.toString()}`);
            if (Array.isArray(res.data)) {
                setMyQuotaRequests(res.data);
            }
        } catch(e) {}
    };

    const fetchMyData = async (userId, currentUser) => {
        try {
            const u = currentUser || user;
            const [ticketsRes, assetsRes, approvalsRes, allAssetsRes] = await Promise.all([
                fetch(`/api/network/portal/my-tickets/${userId}`),
                fetch(`/api/network/portal/my-assets/${userId}`),
                fetch(`/api/network/portal/my-approvals/${userId}`),
                fetch(`/api/network/assets`)
            ]);

            const loadedTickets = ticketsRes.ok ? await ticketsRes.json() : [];
            const loadedAssets = assetsRes.ok ? await assetsRes.json() : [];
            const loadedApprovals = approvalsRes.ok ? await approvalsRes.json() : [];
            const loadedAllAssets = allAssetsRes.ok ? await allAssetsRes.json() : [];

            setTickets(loadedTickets);
            setAssets(loadedAssets);
            setApprovals(loadedApprovals);
            setAllAssets(loadedAllAssets);

            // Pre-select primary asset for quota and ticket
            if (loadedAssets.length > 0) {
                const primary = loadedAssets.find(a => a.ricoh_quota_id) || loadedAssets[0];
                if (primary) {
                    setSelectedQuotaAssetId(primary.id);
                    if (primary.ricoh_user_code) setRicohPin(primary.ricoh_user_code);
                    setTicketForm(prev => ({ ...prev, asset_id: primary.id }));
                    fetchMyQuotaRequests(u, primary.name);
                }
            } else {
                fetchMyQuotaRequests(u, '');
            }
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

    const activeQuotaAsset = assets.find(a => String(a.id) === String(selectedQuotaAssetId)) || assets.find(a => a.ricoh_quota_id) || assets[0] || null;

    const handleSelectQuotaAsset = (assetId) => {
        if (assetId === '__OTHER__') {
            setUseCustomDevice(true);
            setSelectedQuotaAssetId('__OTHER__');
            setRicohPin('');
        } else {
            setUseCustomDevice(false);
            setSelectedQuotaAssetId(assetId);
            const found = assets.find(a => String(a.id) === String(assetId));
            if (found && found.ricoh_user_code) {
                setRicohPin(found.ricoh_user_code);
            }
            if (found) fetchMyQuotaRequests(user, found.name);
        }
    };

    const handlePresetQuota = (type, bw, col, copBw, copCol = 0) => {
        setQuotaType(type);
        setAmountBw(bw);
        setAmountColor(col);
        setAmountCopierBw(copBw);
        setAmountCopierColor(copCol);
    };

    const handleSubmitQuota = async (e) => {
        if (e) e.preventDefault();
        setQuotaErrorMsg('');
        setQuotaSuccessMsg('');

        const targetComp = useCustomDevice ? customDeviceName.trim() : (activeQuotaAsset?.name || '');
        if (!targetComp) {
            setQuotaErrorMsg('Nama komputer / perangkat belum dipilih.');
            return;
        }
        if (!ricohPin.trim()) {
            setQuotaErrorMsg('PIN Ricoh (User Code 4-digit) wajib dimasukkan.');
            return;
        }
        if (!quotaReason.trim()) {
            setQuotaErrorMsg('Alasan pengajuan penambahan kuota wajib diisi.');
            return;
        }

        try {
            setSubmittingQuota(true);
            const payload = {
                device_id: useCustomDevice ? null : (activeQuotaAsset?.ricoh_quota_id || activeQuotaAsset?.id || null),
                computer_name: targetComp,
                pin: ricohPin.trim(),
                applicant_name: user?.name || user?.full_name || 'Staff',
                applicant_nik: user?.nik || '',
                applicant_phone: quotaPhone.trim() || user?.phone || '',
                request_type: quotaType,
                amount_bw: Number(amountBw) || 0,
                amount_color: Number(amountColor) || 0,
                amount_copier_bw: Number(amountCopierBw) || 0,
                amount_copier_color: Number(amountCopierColor) || 0,
                amount_copier: (Number(amountCopierBw) || 0) + (Number(amountCopierColor) || 0),
                reason: quotaReason.trim()
            };

            const res = await http.post('/api/ricoh/request-submit', payload);
            if (res.data && res.data.success) {
                setQuotaSuccessMsg('✅ Pengajuan penambahan kuota berhasil dikirim! Menunggu persetujuan Admin ICT.');
                setQuotaReason('');
                fetchMyData(user.id);
                fetchMyQuotaRequests(user, targetComp);
            } else {
                setQuotaErrorMsg(res.data?.error || 'Gagal mengirim pengajuan.');
            }
        } catch (err) {
            setQuotaErrorMsg(err.response?.data?.error || err.message || 'Gagal mengirim pengajuan.');
        } finally {
            setSubmittingQuota(false);
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
                                    { id: 'home', icon: LayoutGrid, label: 'Dashboard Utama' },
                                    { id: 'ricoh', icon: Printer, label: 'Pengajuan Kuota Ricoh' },
                                    { id: 'budget', icon: FileSpreadsheet, label: 'Pengajuan Fasilitas / Budget' },
                                    { id: 'status', icon: Ticket, label: 'Tiket Saya', badge: tickets.length },
                                    { id: 'assets', icon: Monitor, label: 'Perangkat Saya', badge: assets.length },
                                    { id: 'approvals', icon: CheckSquare, label: 'Persetujuan Checksheet', badge: approvals.length }
                                ].map(tab => {
                                    const isActive = activeTab === tab.id || (activeTab === 'detail' && tab.id === 'status');
                                    return (
                                        <li key={tab.id}>
                                            <button 
                                                onClick={() => { 
                                                    setActiveTab(tab.id); 
                                                    if (tab.id !== 'detail') setSelectedTicket(null); 
                                                }} 
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
                                    {/* Welcome Hero Banner */}
                                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
                                        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

                                        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
                                            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border border-white/20 shrink-0">
                                                {user?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                                                    <span className="text-xs font-bold text-blue-300 bg-blue-500/20 px-3 py-0.5 rounded-full border border-blue-400/30">
                                                        {user?.department || 'Departemen'}
                                                    </span>
                                                    {user?.nik && (
                                                        <span className="text-xs font-bold text-slate-300 bg-white/10 px-3 py-0.5 rounded-full border border-white/10">
                                                            NIK: {user.nik}
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-3 py-0.5 rounded-full border border-emerald-400/30">
                                                        {user?.organization || 'TCF-SG'}
                                                    </span>
                                                </div>
                                                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                                    Halo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-200">{user?.name}</span>
                                                </h2>
                                                <p className="text-blue-100/70 text-xs md:text-sm mt-1 max-w-xl">
                                                    Portal mandiri karyawan: Ajukan kuota cetak Ricoh, permintaan fasilitas & budget ICT, atau laporkan kendala teknis tanpa perlu mengetik ulang data profil Anda.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Primary Device Quick Glance Badge */}
                                        <div className="relative z-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-left w-full sm:w-auto min-w-[220px]">
                                            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
                                                <Laptop size={14} /> Perangkat Terdaftar
                                            </div>
                                            <div className="text-white font-black text-base truncate">
                                                {activeQuotaAsset?.name || 'Belum Terdaftar'}
                                            </div>
                                            <div className="text-[11px] text-blue-200/70 mt-0.5 flex items-center justify-between">
                                                <span>{activeQuotaAsset?.category || 'Hardware PC'}</span>
                                                {activeQuotaAsset?.ricoh_quota_id && (
                                                    <span className="text-emerald-300 font-bold">● Ricoh Aktif</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5 Integrated Action & Status Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                        {/* Card 1: Kuota Ricoh */}
                                        <div 
                                            onClick={() => setActiveTab('ricoh')}
                                            className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md hover:border-purple-300 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                                                    <Printer size={22} />
                                                </div>
                                                <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                    Top-Up
                                                </span>
                                            </div>
                                            <h3 className="font-black text-slate-900 text-base">Kuota Ricoh</h3>
                                            <div className="mt-2 space-y-1 text-xs">
                                                <div className="flex justify-between text-slate-600 font-semibold">
                                                    <span>Sisa B/W:</span>
                                                    <span className="font-bold text-slate-900">
                                                        {activeQuotaAsset?.ricoh_quota_id ? Math.max(0, (activeQuotaAsset.monthly_quota_bw || 0) - (activeQuotaAsset.current_usage_bw || 0)) : '-'} lbr
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-slate-600 font-semibold">
                                                    <span>Sisa Copy B/W / Color:</span>
                                                    <span className="font-bold text-slate-900">
                                                        {activeQuotaAsset?.ricoh_quota_id
                                                            ? `${Math.max(0, (activeQuotaAsset.monthly_quota_copier_bw ?? activeQuotaAsset.monthly_quota_copier ?? 0) - (activeQuotaAsset.current_usage_copier_bw || 0))} / ${Math.max(0, (activeQuotaAsset.monthly_quota_copier_color ?? 0) - (activeQuotaAsset.current_usage_copier_color || 0))}`
                                                            : '-'} lbr
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-3 text-[11px] font-bold text-purple-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Ajukan Tambahan <ArrowRight size={12} />
                                            </div>
                                        </div>

                                        {/* Card 2: Pengajuan Budget & Fasilitas ICT */}
                                        <div 
                                            onClick={() => setActiveTab('budget')}
                                            className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm hover:shadow-md hover:border-rose-300 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                                                    <FileSpreadsheet size={22} />
                                                </div>
                                                <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                    Budget ICT
                                                </span>
                                            </div>
                                            <h3 className="font-black text-slate-900 text-base">Fasilitas & Budget</h3>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                Usulan pengadaan PC baru, upgrade RAM/SSD, lisensi software, atau komponen.
                                            </p>
                                            <div className="mt-3 text-[11px] font-bold text-rose-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Buka Formulir <ArrowRight size={12} />
                                            </div>
                                        </div>

                                        {/* Card 3: Perangkat Saya */}
                                        <div 
                                            onClick={() => setActiveTab('assets')}
                                            className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                    <Monitor size={22} />
                                                </div>
                                                <span className="text-xl font-black text-slate-800">{assets.length}</span>
                                            </div>
                                            <h3 className="font-black text-slate-900 text-base">Perangkat Saya</h3>
                                            <p className="text-xs text-slate-500 mt-1 truncate">
                                                {activeQuotaAsset?.name || 'Aset kantor terdaftar'}
                                            </p>
                                            <div className="mt-3 text-[11px] font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Lihat Detail <ArrowRight size={12} />
                                            </div>
                                        </div>

                                        {/* Card 4: Tiket Kendala */}
                                        <div 
                                            onClick={() => setActiveTab('status')}
                                            className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-300 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                                                    <Ticket size={22} />
                                                </div>
                                                <span className="text-xl font-black text-slate-800">{tickets.length}</span>
                                            </div>
                                            <h3 className="font-black text-slate-900 text-base">Tiket Kendala</h3>
                                            <p className="text-xs text-slate-500 mt-1">Lacak tiket & permohonan</p>
                                            <div className="mt-3 text-[11px] font-bold text-amber-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Lihat Tiket <ArrowRight size={12} />
                                            </div>
                                        </div>

                                        {/* Card 5: Persetujuan Checksheet */}
                                        <div 
                                            onClick={() => setActiveTab('approvals')}
                                            className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                                                    <CheckSquare size={22} />
                                                </div>
                                                <span className="text-xl font-black text-slate-800">{approvals.length}</span>
                                            </div>
                                            <h3 className="font-black text-slate-900 text-base">Persetujuan</h3>
                                            <p className="text-xs text-slate-500 mt-1">Checksheet maintenance</p>
                                            <div className="mt-3 text-[11px] font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Tinjau <ArrowRight size={12} />
                                            </div>
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

                            {/* RICOH QUOTA REQUEST TAB */}
                            {activeTab === 'ricoh' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                                    {/* Banner */}
                                    <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-white/10 text-white">
                                        <div className="flex flex-col sm:flex-row items-center gap-5">
                                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-purple-300 border border-white/20 shrink-0 shadow-lg">
                                                <Printer size={32} />
                                            </div>
                                            <div className="text-center sm:text-left">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[11px] font-black text-purple-200 uppercase tracking-widest mb-1.5">
                                                    <Sparkles size={12} /> Auto-Integrated • Tanpa Ketik Ulang
                                                </div>
                                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Formulir Pengajuan Kuota Ricoh</h2>
                                                <p className="text-purple-100/70 text-xs sm:text-sm mt-1">
                                                    Profil pemohon & perangkat kantor Anda terisi otomatis. Masukkan PIN Ricoh Anda untuk verifikasi dan ajukan kuota tambahan.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 1: Profil Pemohon Terintegrasi */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <User size={18} className="text-purple-600" />
                                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">I. Data Pemohon & Perangkat Kerja</h3>
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Terverifikasi dari Akun
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lengkap</label>
                                                <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{user?.name || user?.full_name}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Departemen</label>
                                                <p className="font-bold text-slate-800 text-sm mt-0.5">{user?.department || '-'}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">NIK / ID Karyawan</label>
                                                <p className="font-bold text-slate-800 text-sm mt-0.5">{user?.nik || user?.employee_id || '-'}</p>
                                            </div>
                                        </div>

                                        {/* Device Selector */}
                                        <div className="space-y-2 pt-2">
                                            <label className="text-xs font-bold text-slate-700 block">Pilih Perangkat Komputer / Laptop:</label>
                                            {assets.length > 0 && !useCustomDevice ? (
                                                <div className="space-y-2">
                                                    <select 
                                                        value={selectedQuotaAssetId}
                                                        onChange={(e) => handleSelectQuotaAsset(e.target.value)}
                                                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm font-bold text-slate-800"
                                                    >
                                                        {assets.map(a => (
                                                            <option key={a.id} value={a.id}>
                                                                💻 {a.name} ({a.category || 'PC'}) — {a.ricoh_quota_id ? `Sisa B/W: ${Math.max(0, (a.monthly_quota_bw || 0) - (a.current_usage_bw || 0))} lbr` : 'Belum ada kuota'}
                                                            </option>
                                                        ))}
                                                        <option value="__OTHER__">➕ Masukkan / Cari Perangkat Lain...</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="relative">
                                                        <input 
                                                            type="text"
                                                            placeholder="Ketik nama komputer (contoh: DESKTOP-B0QJ9O3 atau TCF-PUR01)..."
                                                            value={customDeviceName}
                                                            onChange={(e) => {
                                                                setCustomDeviceName(e.target.value);
                                                                setShowDeviceDropdown(true);
                                                            }}
                                                            onFocus={() => setShowDeviceDropdown(true)}
                                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm font-bold text-slate-800"
                                                        />
                                                        {showDeviceDropdown && allPublicDevices.length > 0 && customDeviceName && (
                                                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                                                {allPublicDevices
                                                                    .filter(d => (d.computer_name || '').toLowerCase().includes(customDeviceName.toLowerCase()))
                                                                    .slice(0, 8)
                                                                    .map((d, i) => (
                                                                        <div 
                                                                            key={i}
                                                                            onClick={() => {
                                                                                setCustomDeviceName(d.computer_name);
                                                                                setShowDeviceDropdown(false);
                                                                                fetchMyQuotaRequests(user, d.computer_name);
                                                                            }}
                                                                            className="px-4 py-2.5 hover:bg-purple-50 cursor-pointer text-xs font-semibold text-slate-700 flex justify-between"
                                                                        >
                                                                            <span>💻 {d.computer_name}</span>
                                                                            <span className="text-slate-400">{d.department_name || ''}</span>
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                    {assets.length > 0 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleSelectQuotaAsset(assets[0].id)}
                                                            className="text-xs font-bold text-purple-600 hover:text-purple-800"
                                                        >
                                                            ← Kembali ke perangkat saya ({assets[0].name})
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section 2: Kartu Status Kuota Realtime Perangkat */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Activity size={18} className="text-purple-600" />
                                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                                                    II. Status Kuota Realtime: <span className="text-purple-700">{useCustomDevice ? (customDeviceName || 'Perangkat Custom') : (activeQuotaAsset?.name || 'Perangkat')}</span>
                                                </h3>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">Reset tiap tgl 21</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Print B/W */}
                                            {(() => {
                                                const qBw = Number(activeQuotaAsset?.monthly_quota_bw) || 0;
                                                const uBw = Number(activeQuotaAsset?.current_usage_bw) || 0;
                                                const remBw = Math.max(0, qBw - uBw);
                                                const pctBw = qBw > 0 ? Math.min(100, (uBw / qBw) * 100) : 0;
                                                return (
                                                    <div className="p-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                                📄 Print B/W
                                                            </span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${remBw <= 10 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                                                                {remBw <= 10 ? 'Menipis' : 'Aktif'}
                                                            </span>
                                                        </div>
                                                        <div className="text-2xl font-black text-slate-900 mt-1">
                                                            {remBw} <span className="text-xs font-bold text-slate-400 font-normal">lembar sisa</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">Pemakaian: {uBw} / {qBw} lbr</p>
                                                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
                                                            <div className={`h-full ${pctBw >= 90 ? 'bg-rose-500' : pctBw >= 70 ? 'bg-amber-500' : 'bg-slate-700'}`} style={{ width: `${pctBw}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Print Color */}
                                            {(() => {
                                                const qCol = Number(activeQuotaAsset?.monthly_quota_color) || 0;
                                                const uCol = Number(activeQuotaAsset?.current_usage_color) || 0;
                                                const remCol = Math.max(0, qCol - uCol);
                                                const pctCol = qCol > 0 ? Math.min(100, (uCol / qCol) * 100) : 0;
                                                return (
                                                    <div className="p-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/30">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                                                🎨 Print Warna
                                                            </span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${remCol <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-purple-100 text-purple-700'}`}>
                                                                {remCol <= 5 ? 'Menipis' : 'Aktif'}
                                                            </span>
                                                        </div>
                                                        <div className="text-2xl font-black text-slate-900 mt-1">
                                                            {remCol} <span className="text-xs font-bold text-slate-400 font-normal">lembar sisa</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">Pemakaian: {uCol} / {qCol} lbr</p>
                                                        <div className="w-full bg-purple-100 h-2 rounded-full overflow-hidden mt-3">
                                                            <div className={`h-full ${pctCol >= 90 ? 'bg-rose-500' : 'bg-purple-600'}`} style={{ width: `${pctCol}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Copy B/W */}
                                            {(() => {
                                                const fb = Number(activeQuotaAsset?.monthly_quota_copier) || 0;
                                                const qCopBw = activeQuotaAsset?.monthly_quota_copier_bw != null ? Number(activeQuotaAsset.monthly_quota_copier_bw) : Math.round(fb * 0.8);
                                                const uCopBw = Number(activeQuotaAsset?.current_usage_copier_bw) || 0;
                                                const remCopBw = Math.max(0, qCopBw - uCopBw);
                                                const pctCopBw = qCopBw > 0 ? Math.min(100, (uCopBw / qCopBw) * 100) : 0;
                                                return (
                                                    <div className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                                                                📑 Copy B/W
                                                            </span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${remCopBw <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {remCopBw <= 5 ? 'Menipis' : 'Aktif'}
                                                            </span>
                                                        </div>
                                                        <div className="text-2xl font-black text-slate-900 mt-1">
                                                            {remCopBw} <span className="text-xs font-bold text-slate-400 font-normal">lembar sisa</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">Pemakaian: {uCopBw} / {qCopBw} lbr</p>
                                                        <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden mt-3">
                                                            <div className={`h-full ${pctCopBw >= 90 ? 'bg-rose-500' : 'bg-blue-600'}`} style={{ width: `${pctCopBw}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Copy Color */}
                                            {(() => {
                                                const fb = Number(activeQuotaAsset?.monthly_quota_copier) || 0;
                                                const bwDef = activeQuotaAsset?.monthly_quota_copier_bw != null ? Number(activeQuotaAsset.monthly_quota_copier_bw) : Math.round(fb * 0.8);
                                                const qCopCol = activeQuotaAsset?.monthly_quota_copier_color != null ? Number(activeQuotaAsset.monthly_quota_copier_color) : Math.max(0, fb - bwDef);
                                                const uCopCol = Number(activeQuotaAsset?.current_usage_copier_color) || 0;
                                                const remCopCol = Math.max(0, qCopCol - uCopCol);
                                                const pctCopCol = qCopCol > 0 ? Math.min(100, (uCopCol / qCopCol) * 100) : 0;
                                                return (
                                                    <div className="p-4 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-teal-50/30">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-black text-cyan-900 uppercase tracking-wider flex items-center gap-1.5">
                                                                🌈 Copy Color
                                                            </span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${remCopCol <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-cyan-100 text-cyan-700'}`}>
                                                                {remCopCol <= 5 ? 'Menipis' : 'Aktif'}
                                                            </span>
                                                        </div>
                                                        <div className="text-2xl font-black text-slate-900 mt-1">
                                                            {remCopCol} <span className="text-xs font-bold text-slate-400 font-normal">lembar sisa</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">Pemakaian: {uCopCol} / {qCopCol} lbr</p>
                                                        <div className="w-full bg-cyan-100 h-2 rounded-full overflow-hidden mt-3">
                                                            <div className={`h-full ${pctCopCol >= 90 ? 'bg-rose-500' : 'bg-cyan-600'}`} style={{ width: `${pctCopCol}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Section 3: Form Pengajuan Tambahan */}
                                    <form onSubmit={handleSubmitQuota} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <KeyRound size={18} className="text-purple-600" />
                                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">III. Otorisasi PIN & Pilihan Tambahan Kuota</h3>
                                            </div>
                                        </div>

                                        {/* PIN Ricoh */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                <span>PIN Ricoh (User Code 4-Digit) *</span>
                                                <span className="text-[11px] font-normal text-slate-400">Verifikasi hak akses perangkat</span>
                                            </label>
                                            <div className="relative">
                                                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input 
                                                    type="password"
                                                    required
                                                    maxLength={8}
                                                    value={ricohPin}
                                                    onChange={(e) => setRicohPin(e.target.value)}
                                                    placeholder="Contoh: 3035 atau 8352"
                                                    className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm font-bold tracking-widest text-slate-800"
                                                />
                                            </div>
                                        </div>

                                        {/* Quota Preset Buttons */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 block">Pilih Jumlah Tambahan Kuota:</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                                                {[
                                                    { label: '+25 B/W', sub: 'Print B/W', type: 'BW', bw: 25, col: 0, copBw: 0, copCol: 0 },
                                                    { label: '+50 B/W', sub: 'Rekomendasi', type: 'BW', bw: 50, col: 0, copBw: 0, copCol: 0 },
                                                    { label: '+100 B/W', sub: 'Beban Berat', type: 'BW', bw: 100, col: 0, copBw: 0, copCol: 0 },
                                                    { label: '+50 Copy B/W', sub: 'Fotokopi B/W', type: 'COPIER_BW', bw: 0, col: 0, copBw: 50, copCol: 0 },
                                                    { label: '+25 Copy Color', sub: 'Fotokopi Warna', type: 'COPIER_COLOR', bw: 0, col: 0, copBw: 0, copCol: 25 },
                                                    { label: '⚙️ Custom', sub: 'Atur Bebas', type: 'CUSTOM', bw: amountBw, col: amountColor, copBw: amountCopierBw, copCol: amountCopierColor }
                                                ].map((p, idx) => {
                                                    const isSelected = quotaType === p.type && (p.type !== 'BW' || amountBw === p.bw);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => handlePresetQuota(p.type, p.bw, p.col, p.copBw, p.copCol)}
                                                            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${isSelected ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm ring-2 ring-purple-500/20 font-black' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-semibold'}`}
                                                        >
                                                            <div className="text-xs sm:text-sm">{p.label}</div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">{p.sub}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Custom inputs if CUSTOM selected */}
                                            {quotaType === 'CUSTOM' && (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 mt-3">
                                                    <div>
                                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Print B/W (lbr)</label>
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            value={amountBw} 
                                                            onChange={(e) => setAmountBw(Math.max(0, parseInt(e.target.value) || 0))} 
                                                            className="w-full h-10 px-3 bg-white border border-purple-200 rounded-xl font-bold text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Print Color (lbr)</label>
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            value={amountColor} 
                                                            onChange={(e) => setAmountColor(Math.max(0, parseInt(e.target.value) || 0))} 
                                                            className="w-full h-10 px-3 bg-white border border-purple-200 rounded-xl font-bold text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Copy B/W (lbr)</label>
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            value={amountCopierBw} 
                                                            onChange={(e) => setAmountCopierBw(Math.max(0, parseInt(e.target.value) || 0))} 
                                                            className="w-full h-10 px-3 bg-white border border-purple-200 rounded-xl font-bold text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Copy Color (lbr)</label>
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            value={amountCopierColor} 
                                                            onChange={(e) => setAmountCopierColor(Math.max(0, parseInt(e.target.value) || 0))} 
                                                            className="w-full h-10 px-3 bg-white border border-purple-200 rounded-xl font-bold text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reason & Phone */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <label className="text-xs font-bold text-slate-700 block">Alasan Pengajuan Tambahan Kuota *</label>
                                                <textarea 
                                                    required
                                                    rows={2}
                                                    value={quotaReason}
                                                    onChange={(e) => setQuotaReason(e.target.value)}
                                                    placeholder="Contoh: Kebutuhan cetak laporan audit internal, SOP produksi, dan dokumen purchasing bulan ini..."
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm text-slate-800"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 block">Nomor WhatsApp Pemohon (Opsional)</label>
                                                <input 
                                                    type="text"
                                                    value={quotaPhone}
                                                    onChange={(e) => setQuotaPhone(e.target.value)}
                                                    placeholder="08xxxxxxxxxx"
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                                                />
                                            </div>
                                        </div>

                                        {/* Messages */}
                                        {quotaErrorMsg && (
                                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                                                <AlertTriangle size={16} /> {quotaErrorMsg}
                                            </div>
                                        )}
                                        {quotaSuccessMsg && (
                                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                                                <CheckCircle2 size={16} /> {quotaSuccessMsg}
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={submittingQuota}
                                                className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 cursor-pointer"
                                            >
                                                {submittingQuota ? (
                                                    <>
                                                        <RefreshCw size={16} className="animate-spin" />
                                                        <span>Mengirim Pengajuan ke Helpdesk...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send size={16} />
                                                        <span>Kirim Pengajuan Tambahan Kuota</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>

                                    {/* Section 4: Riwayat Pengajuan Kuota Saya */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Clock size={18} className="text-purple-600" />
                                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">IV. Riwayat Pengajuan Kuota Saya</h3>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">{myQuotaRequests.length} pengajuan</span>
                                        </div>

                                        {myQuotaRequests.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                                                Belum ada riwayat pengajuan penambahan kuota.
                                            </div>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {myQuotaRequests.map((req) => {
                                                    const isPending = req.status === 'PENDING';
                                                    const isApproved = req.status === 'APPROVED';
                                                    return (
                                                        <div 
                                                            key={req.id}
                                                            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isApproved ? 'bg-emerald-50/40 border-emerald-200' : isPending ? 'bg-amber-50/40 border-amber-200' : 'bg-rose-50/40 border-rose-200'}`}
                                                        >
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isApproved ? 'bg-emerald-100 text-emerald-800' : isPending ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                                                        {isApproved ? 'DISETUJUI' : isPending ? 'MENUNGGU ICT' : 'DITOLAK'}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-slate-800">💻 {req.computer_name}</span>
                                                                    <span className="text-[11px] text-slate-400">• {new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                                <p className="text-xs text-slate-600 font-semibold">
                                                                    Tambahan: {req.amount_bw > 0 ? `+${req.amount_bw} Print B/W ` : ''}{req.amount_color > 0 ? `+${req.amount_color} Print Color ` : ''}{(req.amount_copier_bw > 0 || (!req.amount_copier_bw && !req.amount_copier_color && req.amount_copier > 0)) ? `+${req.amount_copier_bw ?? req.amount_copier} Copy B/W ` : ''}{req.amount_copier_color > 0 ? `+${req.amount_copier_color} Copy Color` : ''}
                                                                </p>
                                                                <p className="text-xs text-slate-500 italic">"{req.reason}"</p>
                                                            </div>
                                                            {req.admin_notes && (
                                                                <div className="text-right sm:max-w-xs">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Catatan ICT:</p>
                                                                    <p className="text-xs font-semibold text-slate-700">{req.admin_notes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* BUDGET REQUEST TAB */}
                            {activeTab === 'budget' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <PublicBudgetRequest embedded={true} onBack={() => setActiveTab('home')} />
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

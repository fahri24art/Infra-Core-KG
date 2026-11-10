import React, { useState, useEffect } from 'react';
import { X, User, Monitor, Ticket, Phone, Mail, Building, Activity, ShieldCheck, MapPin, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { generateHandoverPdf } from '../utils/generateHandoverPdf';

export default function UserDetailModal({ userName, assets, onClose }) {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // BAST form state
    const [employeeData, setEmployeeData] = useState(null);
    const [showBastForm, setShowBastForm] = useState(false);
    const [selectedBastAssets, setSelectedBastAssets] = useState(null);
    const [bastFormData, setBastFormData] = useState({ nik: '', jabatan: '', divisi: '', atasan: '', snCharger: '' });

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const res = await fetch('/api/hr/employees');
                const result = await res.json();
                const data = result.data || result;
                const emp = data.find(e => e.name.toLowerCase() === userName.toLowerCase());
                if (emp) setEmployeeData(emp);
            } catch (err) {
                console.error('Failed to fetch employee for BAST', err);
            }
        };
        fetchEmployee();
    }, [userName]);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const res = await fetch('/api/network/tickets');
                const data = await res.json();
                
                // Filter tickets by user name (case insensitive)
                const userTickets = data.filter(t => 
                    t.user_name && t.user_name.toLowerCase().includes(userName.toLowerCase())
                );
                
                setTickets(userTickets);
            } catch (err) {
                console.error('Failed to fetch user tickets', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [userName]);

    // Filter assigned assets
    const assignedAssets = assets.filter(a => {
        if (a.user_name) {
            // If the asset has an assigned user_name, only match that user_name
            return a.user_name.toLowerCase() === userName.toLowerCase();
        }
        // If there is no user_name assigned (e.g. legacy/external), fall back to contact
        return a.contact && a.contact.toLowerCase() === userName.toLowerCase();
    });

    // Filter only desktop and laptop for BAST
    const bastAssets = assignedAssets.filter(a => {
        const cat = (a.category || '').toLowerCase();
        return cat.includes('desktop') || cat.includes('laptop') || cat.includes('pc') || cat.includes('computer');
    });

    // Extract email from contact if it looks like an email
    const email = userName.includes('@') ? userName : `${userName.replace(/\s+/g, '.').toLowerCase()}@tricentrum.com`;
    const department = assignedAssets.length > 0 && assignedAssets[0].location ? assignedAssets[0].location : 'General';

    const handlePrintClick = (assetsToPrint) => {
        setSelectedBastAssets(assetsToPrint);
        setBastFormData({
            nik: employeeData?.nik || '',
            jabatan: employeeData?.position || '',
            divisi: employeeData?.department || department || 'General',
            atasan: '',
            snCharger: ''
        });
        setShowBastForm(true);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 md:p-4 overflow-y-auto">
            <div className="bg-[#F8F9FB] rounded-[2rem] shadow-2xl w-full max-w-5xl flex flex-col my-auto border border-white max-h-[90vh] animate-slide-up">
                
                {/* Header */}
                <div className="bg-white px-8 py-6 rounded-t-[2rem] border-b border-[#F0F0F0] flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 border-4 border-white">
                            <span className="text-2xl font-black">{userName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{userName}</h2>
                            <div className="flex items-center gap-4 mt-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full"><Activity size={12} className="text-emerald-500" /> Active Employee</span>
                                <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full"><ShieldCheck size={12} /> Standard Access</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {bastAssets.length > 0 && (
                            <button 
                                onClick={() => handlePrintClick(bastAssets)}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-sm transition-all text-xs font-black uppercase flex items-center gap-2"
                                title="Print BAST Semua Aset"
                            >
                                <Printer size={16} /> Print BAST
                            </button>
                        )}
                        <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        
                        {/* Left Column: Contact & Info */}
                        <div className="lg:col-span-4 space-y-3">
                            <div className="bg-white p-4 rounded-[1.5rem] border border-[#E1E1E1] shadow-sm">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                                    <User size={14} /> Contact Information
                                </h3>
                                <div className="space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                            <Mail size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                                            <p className="font-bold text-slate-700 text-sm truncate">{email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                            <Phone size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Phone / Ext</p>
                                            <p className="font-bold text-slate-700 text-sm">-</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                            <MapPin size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Location</p>
                                            <p className="font-bold text-slate-700 text-sm truncate">{department}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                            <Building size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                                            <p className="font-bold text-slate-700 text-sm truncate">Staff</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Assets & Tickets */}
                        <div className="lg:col-span-8 space-y-3">
                            
                            {/* Assigned Assets */}
                            <div className="bg-white p-4 rounded-[1.5rem] border border-[#E1E1E1] shadow-sm">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Monitor size={14} /> Assigned Assets ({assignedAssets.length})
                                    </h3>
                                </div>
                                
                                {assignedAssets.length === 0 ? (
                                    <div className="p-5 text-center bg-slate-50 rounded-2xl border border-dashed border-[#E1E1E1]">
                                        <Monitor size={32} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-slate-500 font-bold text-sm">No assets assigned to this user.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {assignedAssets.map(asset => (
                                            <Link 
                                                key={asset.id} 
                                                to={`/ict/assets/${asset.id}`}
                                                className="group p-4 bg-slate-50 rounded-2xl border border-[#E1E1E1] hover:border-blue-600 hover:shadow-md hover:bg-white transition-all flex items-start gap-4"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-white border border-[#E1E1E1] flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all shadow-sm shrink-0">
                                                    <Monitor size={20} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-black text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">{asset.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 truncate">{asset.inventory_number || 'UNTAGGED'}</p>
                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                            {asset.status}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-white border border-[#E1E1E1] text-slate-500">
                                                            {asset.category || 'Device'}
                                                        </span>
                                                        {bastAssets.some(b => b.id === asset.id) && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.preventDefault(); // Prevent Link navigation
                                                                    e.stopPropagation();
                                                                    handlePrintClick(asset);
                                                                }}
                                                                className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-all text-[9px] font-black uppercase flex items-center gap-1.5"
                                                                title="Print Serah Terima Perangkat Ini"
                                                            >
                                                                <Printer size={12} /> Print
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Ticket History */}
                            <div className="bg-white p-4 rounded-[1.5rem] border border-[#E1E1E1] shadow-sm">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Ticket size={14} /> Helpdesk Tickets ({tickets.length})
                                    </h3>
                                </div>

                                {loading ? (
                                    <div className="p-5 text-center bg-slate-50 rounded-2xl border border-dashed border-[#E1E1E1]">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-slate-500 font-bold text-sm">Loading tickets...</p>
                                    </div>
                                ) : tickets.length === 0 ? (
                                    <div className="p-5 text-center bg-slate-50 rounded-2xl border border-dashed border-[#E1E1E1]">
                                        <Ticket size={32} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-slate-500 font-bold text-sm">No ticket history for this user.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {tickets.slice(0, 5).map(ticket => (
                                            <div key={ticket.id} className="p-4 bg-slate-50 rounded-2xl border border-[#E1E1E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase tracking-widest">{ticket.number}</span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${ticket.status?.name?.toLowerCase() === 'open' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                            {ticket.status?.name || 'Closed'}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 text-sm truncate">{ticket.subject}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase tracking-widest">
                                                        {new Date(ticket.created).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {tickets.length > 5 && (
                                            <div className="p-3 text-center">
                                                <Link to="/ict/tickets" className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">
                                                    View All Tickets &rarr;
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
                {/* BAST Data Form Modal */}
                {showBastForm && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] p-5 w-full max-w-md shadow-2xl border border-white animate-slide-up">
                            <h3 className="text-xl font-black text-slate-900 mb-6">Lengkapi Data BAST</h3>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">N.I.K</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 border border-[#E1E1E1] rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" value={bastFormData.nik} onChange={e => setBastFormData({...bastFormData, nik: e.target.value})} placeholder="Kosongkan jika tidak ada" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Department</label>
                                        <input type="text" className="w-full p-3 bg-slate-50 border border-[#E1E1E1] rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" value={bastFormData.divisi} onChange={e => setBastFormData({...bastFormData, divisi: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Jabatan</label>
                                        <input type="text" className="w-full p-3 bg-slate-50 border border-[#E1E1E1] rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" value={bastFormData.jabatan} onChange={e => setBastFormData({...bastFormData, jabatan: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Atasan Langsung</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 border border-[#E1E1E1] rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" value={bastFormData.atasan} onChange={e => setBastFormData({...bastFormData, atasan: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">SN Charger (Opsional)</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 border border-[#E1E1E1] rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" value={bastFormData.snCharger} onChange={e => setBastFormData({...bastFormData, snCharger: e.target.value})} placeholder="Masukkan Serial Number Charger" />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button onClick={() => setShowBastForm(false)} className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl font-bold transition-all text-xs uppercase tracking-widest">Batal</button>
                                <button onClick={() => {
                                    generateHandoverPdf(userName, selectedBastAssets, bastFormData);
                                    setShowBastForm(false);
                                }} className="px-6 py-2.5 text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl font-black flex items-center gap-2 transition-all text-xs uppercase tracking-widest">
                                    <Printer size={16} /> Print PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

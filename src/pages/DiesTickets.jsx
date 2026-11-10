import React, { useState, useEffect } from 'react';
import { AlertCircle, Tag, Clock, CheckCircle, Search, RefreshCw, X, Save } from 'lucide-react';
import MonitoringAlert from './MonitoringAlert';

export default function DiesTickets() {
    const [tickets, setTickets] = useState([]);
    const [spareparts, setSpareparts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [completionData, setCompletionData] = useState({
        repair_cost: 0,
        downtime_hours: 0,
        root_cause: '',
        kaizen_action: '',
        sparepart_used_id: '',
        sparepart_qty: 0
    });

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/engineering-tickets?category=dies');
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (error) {
            console.error('Failed to fetch dies tickets:', error);
        }
        setLoading(false);
    };

    const fetchSpareparts = async () => {
        try {
            const res = await fetch('/api/dies/spareparts');
            if (res.ok) {
                const data = await res.json();
                setSpareparts(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch spareparts:', error);
        }
    };

    useEffect(() => {
        fetchTickets();
        fetchSpareparts();
        const interval = setInterval(fetchTickets, 15000); // Auto-refresh every 15s
        return () => clearInterval(interval);
    }, []);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await fetch(`/api/engineering-tickets/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchTickets();
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    // MANUAL TICKET
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualData, setManualData] = useState({ type: 'MJO', machine_name: '', operator_name: '', description: '' });

    const handleCreateManual = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/engineering-tickets/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(manualData)
            });
            if (res.ok) {
                setIsManualModalOpen(false);
                setManualData({ type: 'MJO', machine_name: '', operator_name: '', description: '' });
                fetchTickets();
            } else {
                alert('Gagal membuat tiket manual');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateMock = async () => {
        try {
            const res = await fetch('/api/engineering-tickets/mock', { method: 'POST' });
            if (res.ok) {
                alert('Mock tiket berhasil di-generate!');
                fetchTickets();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenCompleteModal = (id) => {
        setSelectedTicketId(id);
        setCompletionData({
            repair_cost: 0,
            downtime_hours: 0,
            root_cause: '',
            kaizen_action: '',
            sparepart_used_id: '',
            sparepart_qty: 0
        });
        setIsCompleteModalOpen(true);
    };

    const handleSubmitCompletion = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const payload = {
                status: 'COMPLETED',
                repair_cost: parseFloat(completionData.repair_cost) || 0,
                downtime_hours: parseFloat(completionData.downtime_hours) || 0,
                root_cause: completionData.root_cause,
                kaizen_action: completionData.kaizen_action,
                sparepart_used_id: completionData.sparepart_used_id ? parseInt(completionData.sparepart_used_id) : null,
                sparepart_qty: parseInt(completionData.sparepart_qty) || 0
            };

            const res = await fetch(`/api/engineering-tickets/${selectedTicketId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                setIsCompleteModalOpen(false);
                fetchTickets();
                fetchSpareparts(); // Refresh inventory if sparepart was deducted
            } else {
                alert(data.error || 'Failed to complete ticket');
            }
        } catch (error) {
            console.error('Failed to submit completion', error);
            alert('Gagal menyelesaikan tiket');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'OPEN': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'IN_PROGRESS': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'RESOLVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const filteredTickets = tickets.filter(t => 
        t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dies MJO & RJO</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Maintenance Job Order & Repair Job Order (Live from Andon)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari tiket atau dies..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        />
                    </div>
                    <button onClick={handleGenerateMock} className="p-2 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 text-rose-600 transition-colors font-bold text-sm px-4">
                        Generate Mock
                    </button>
                    <button onClick={fetchTickets} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => setIsManualModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                        <Tag size={16} /> Buat Manual
                    </button>
                </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 font-bold text-[10px] text-slate-500 uppercase">Ticket No</th>
                                <th className="p-4 font-bold text-[10px] text-slate-500 uppercase">Waktu</th>
                                <th className="p-4 font-bold text-[10px] text-slate-500 uppercase">Target (Mesin/Dies)</th>
                                <th className="p-4 font-bold text-[10px] text-slate-500 uppercase">Operator</th>
                                <th className="p-4 font-bold text-[10px] text-slate-500 uppercase">Deskripsi</th>
                                <th className="p-4 font-bold text-[10px] text-slate-500 uppercase">Status</th>
                                <th className="p-4 font-bold text-[10px] text-slate-500 uppercase text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && tickets.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-5 text-center text-slate-400 font-bold">Memuat data tiket...</td>
                                </tr>
                            ) : filteredTickets.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle size={32} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900">Belum Ada Tiket</h3>
                                        <p className="text-slate-500 mt-2 max-w-md mx-auto font-medium">
                                            Tiket MJO, RJO, atau Emergency Call dari Andon akan otomatis muncul di sini.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTickets.map(ticket => (
                                    <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 font-bold text-slate-900 text-[11px] whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {ticket.type.includes('EMG') && <AlertCircle size={14} className="text-rose-500" />}
                                                {ticket.ticket_number}
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium block mt-0.5">{ticket.type}</span>
                                        </td>
                                        <td className="p-4 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                                            {new Date(ticket.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-4 font-bold text-slate-900 text-[11px] whitespace-nowrap">
                                            {ticket.machine_name}
                                        </td>
                                        <td className="p-4 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                                            {ticket.operator_name}
                                        </td>
                                        <td className="p-4 text-[11px] font-medium text-slate-600 max-w-xs truncate" title={ticket.description}>
                                            {ticket.description}
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-[11px]">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border ${getStatusColor(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            {ticket.status === 'OPEN' && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}
                                                    className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs font-bold transition-colors border border-orange-200"
                                                >
                                                    Proses
                                                </button>
                                            )}
                                            {ticket.status === 'IN_PROGRESS' && (
                                                <button 
                                                    onClick={() => handleOpenCompleteModal(ticket.id)}
                                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors border border-emerald-200"
                                                >
                                                    Selesai
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* WA Notification Logs */}
            <div className="mt-8">
                <MonitoringAlert department="dies" />
            </div>

            {/* COMPLETION MODAL */}
            {isCompleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Penyelesaian Tiket MJO/RJO</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">Lengkapi data perbaikan untuk Analytics KPI</p>
                            </div>
                            <button 
                                onClick={() => setIsCompleteModalOpen(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitCompletion} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Root Cause (Akar Masalah) *</label>
                                    <textarea required value={completionData.root_cause} onChange={e => setCompletionData({...completionData, root_cause: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none h-20" placeholder="Jelaskan penyebab kerusakan..."></textarea>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Kaizen / Tindakan Perbaikan *</label>
                                    <textarea required value={completionData.kaizen_action} onChange={e => setCompletionData({...completionData, kaizen_action: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none h-20" placeholder="Jelaskan tindakan yang dilakukan..."></textarea>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Lama Mesin Mati (Downtime) *</label>
                                    <div className="relative">
                                        <input required type="number" step="0.1" min="0" value={completionData.downtime_hours} onChange={e => setCompletionData({...completionData, downtime_hours: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all pr-12" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Jam</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Biaya Jasa / Lainnya (Rp)</label>
                                    <input type="number" min="0" value={completionData.repair_cost} onChange={e => setCompletionData({...completionData, repair_cost: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                </div>

                                <div className="space-y-2 md:col-span-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <h4 className="text-sm font-black text-blue-900 mb-3 flex items-center gap-2"><Tag size={16}/> Pemakaian Sparepart (Opsional)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Pilih Komponen</label>
                                            <select 
                                                value={completionData.sparepart_used_id} 
                                                onChange={e => setCompletionData({...completionData, sparepart_used_id: e.target.value})}
                                                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none focus:border-blue-500"
                                            >
                                                <option value="">-- Tidak pakai sparepart --</option>
                                                {spareparts.map(sp => (
                                                    <option key={sp.id} value={sp.id}>{sp.erp_item_code ? `[${sp.erp_item_code}] ` : ''}{sp.part_name} (Stok: {sp.qty_in_stock})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Qty Terpakai</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                value={completionData.sparepart_qty} 
                                                onChange={e => setCompletionData({...completionData, sparepart_qty: e.target.value})} 
                                                disabled={!completionData.sparepart_used_id}
                                                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2.5 font-bold text-slate-900 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setIsCompleteModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                    Batal
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? 'Menyimpan...' : <><Save size={18} /> Selesaikan Tiket</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MANUAL MODAL */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Buat Tiket Manual</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">Buat tiket MJO / RJO tanpa Andon</p>
                            </div>
                            <button 
                                onClick={() => setIsManualModalOpen(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateManual} className="p-4 space-y-3">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Tipe Tiket</label>
                                <select 
                                    value={manualData.type} 
                                    onChange={e => setManualData({...manualData, type: e.target.value})}
                                    className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                >
                                    <option value="MJO">MJO (Maintenance Job Order)</option>
                                    <option value="RJO">RJO (Repair Job Order)</option>
                                    <option value="EMG">EMG (Emergency)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Nama Mesin / Dies</label>
                                <input required value={manualData.machine_name} onChange={e => setManualData({...manualData, machine_name: e.target.value})} className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Contoh: Press Line 1 (Dies A)" />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Nama Operator</label>
                                <input required value={manualData.operator_name} onChange={e => setManualData({...manualData, operator_name: e.target.value})} className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Nama Pelapor..." />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Deskripsi Kendala</label>
                                <textarea required value={manualData.description} onChange={e => setManualData({...manualData, description: e.target.value})} className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none h-24" placeholder="Jelaskan kendala..."></textarea>
                            </div>
                            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setIsManualModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                    Batal
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? 'Membuat...' : <><Save size={18} /> Buat Tiket</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { AlertCircle, Tag, Clock, CheckCircle, Search, RefreshCw } from 'lucide-react';
import MonitoringAlert from './MonitoringAlert';

export default function MachineTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/engineering-tickets?category=machine');
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (error) {
            console.error('Failed to fetch machine tickets:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTickets();
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

    const getStatusColor = (status) => {
        switch(status) {
            case 'OPEN': return 'bg-red-100 text-red-700 border-red-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'RESOLVED': return 'bg-green-100 text-green-700 border-green-200';
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
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Machine MJO & RJO</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Maintenance Job Order & Repair Job Order (Live from Andon)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari tiket atau mesin..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        />
                    </div>
                    <button onClick={fetchTickets} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
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
                                <th className="p-4 font-bold text-[10px] text-slate-500 uppercase">Mesin</th>
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
                                        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle size={32} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900">Belum Ada Tiket</h3>
                                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                                            Tiket MJO, RJO, atau Emergency Call dari Andon akan otomatis muncul di sini.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTickets.map(ticket => (
                                    <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 font-bold text-slate-900 text-[11px] whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {ticket.type.includes('EMG') && <AlertCircle size={14} className="text-red-500" />}
                                                {ticket.ticket_number}
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium block mt-0.5">{ticket.type}</span>
                                        </td>
                                        <td className="p-4 text-[11px] text-slate-600 whitespace-nowrap">
                                            {new Date(ticket.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-4 font-bold text-slate-900 text-[11px] whitespace-nowrap">
                                            {ticket.machine_name}
                                        </td>
                                        <td className="p-4 text-[11px] text-slate-600 whitespace-nowrap">
                                            {ticket.operator_name}
                                        </td>
                                        <td className="p-4 text-[11px] text-slate-600 max-w-xs truncate" title={ticket.description}>
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
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Proses
                                                </button>
                                            )}
                                            {ticket.status === 'IN_PROGRESS' && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(ticket.id, 'RESOLVED')}
                                                    className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors"
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
                <MonitoringAlert department="machine" />
            </div>
        </div>
    );
}

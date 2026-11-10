import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Search, Filter, CheckCircle, XCircle, Clock,
    MoreHorizontal, FileText, User, Monitor, Send, Paperclip, Download, Lock, RefreshCw, Printer
} from 'lucide-react';

export default function Tickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Selection State
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [responses, setResponses] = useState([]);
    const [replyMessage, setReplyMessage] = useState('');
    const [replyType, setReplyType] = useState('public'); // public | private

    // Admin User Info (from localStorage)
    const currentUser = JSON.parse(sessionStorage.getItem('user'));

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchResponses(selectedTicket.id);
        }
    }, [selectedTicket]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch('/api/network/tickets');
            const data = await res.json();
            setTickets(data);
            setLoading(false);
            if (!selectedTicket && data.length > 0) {
                setSelectedTicket(data[0]); // Select first ticket by default
            }
        } catch (err) {
            console.error('Failed to fetch tickets', err);
            setLoading(false);
        }
    };

    const fetchResponses = async (ticketId) => {
        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch(`/api/network/tickets/${ticketId}/responses`);
            const data = await res.json();
            setResponses(data);
        } catch (err) {
            console.error('Failed to fetch responses', err);
        }
    };

    const generatePDF = () => {
        if (!selectedTicket) return;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(24);
        doc.setTextColor(30, 64, 175);
        doc.text("TCF SUPPORT TICKET", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        // Ticket Details Box
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 40, 182, 50, 3, 3, 'F');

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(`Subject: ${selectedTicket.subject}`, 20, 52);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Ticket ID: #${selectedTicket.id}`, 20, 62);
        doc.text(`Status: ${selectedTicket.status}`, 80, 62);
        doc.text(`Priority: ${selectedTicket.priority}`, 140, 62);

        doc.text(`Requestor: ${selectedTicket.user_name}`, 20, 72);
        doc.text(`Department: ${selectedTicket.user_department || 'N/A'}`, 80, 72);
        doc.text(`Asset: ${selectedTicket.asset_name || 'N/A'}`, 140, 72);

        doc.setTextColor(71, 85, 105);
        const splitDesc = doc.splitTextToSize(`Issue: ${selectedTicket.description}`, 170);
        doc.text(splitDesc, 20, 82);

        // Conversation History
        const tableBody = responses.map(r => [
            new Date(r.created_at).toLocaleString(),
            r.user_name + (r.user_role === 'admin' ? ' (Admin)' : ''),
            r.type.toUpperCase(),
            r.message
        ]);

        autoTable(doc, {
            startY: 100,
            head: [['Date', 'User', 'Type', 'Message Content']],
            body: tableBody,
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 35 },
                2: { cellWidth: 20 },
                3: { cellWidth: 'auto' }
            }
        });

        doc.save(`Ticket_${selectedTicket.id}_Report.pdf`);
    };

    const handleSendReply = async () => {
        if (!replyMessage.trim()) return;
        if (!selectedTicket) return;

        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch(`/api/network/tickets/${selectedTicket.id}/responses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser?.id,
                    message: replyMessage,
                    type: replyType
                })
            });

            if (res.ok) {
                const newResponse = await res.json();
                setResponses([...responses, newResponse]);
                setReplyMessage('');
            }
        } catch (err) {
            console.error('Failed to send reply', err);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!selectedTicket) return;
        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch(`/api/network/tickets/${selectedTicket.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                const updated = await res.json();
                setTickets(tickets.map(t => t.id === updated.id ? { ...t, status: updated.status } : t));
                setSelectedTicket({ ...selectedTicket, status: updated.status });
            }
        } catch (err) {
            console.error('Failed to update ticket', err);
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
        const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ticket.user_name && ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-700';
            case 'Open': return 'bg-orange-100 text-orange-700';
            case 'Pending': return 'bg-yellow-100 text-yellow-700';
            case 'Resolved': return 'bg-green-100 text-green-700';
            case 'Closed': return 'bg-slate-100 text-slate-500';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    return (
        <div className="flex bg-slate-50 h-[calc(100vh-64px)] overflow-hidden font-sans">

            {/* Ticket Sidebar List */}
            <div className="w-[380px] bg-white border-r border-slate-200 flex flex-col shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Helpdesk Inbound</h2>
                        <button onClick={fetchTickets} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    <div className="relative group mb-4">
                        <Search className="absolute left-3 top-2.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find tickets or users..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex space-x-1 p-1 bg-slate-100 rounded-xl">
                        {['All', 'New', 'Open', 'Resolved'].map(status => (
                            <button
                                key={status}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${filterStatus === status ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                onClick={() => setFilterStatus(status)}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                    {loading ? (
                        <div className="p-10 text-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div></div>
                    ) : filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                        <div
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className={`p-5 cursor-pointer transition-all border-l-[3px] ${selectedTicket?.id === ticket.id ? 'bg-blue-50/50 border-l-blue-600' : 'border-l-transparent hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-800 text-sm line-clamp-1">{ticket.subject}</span>
                                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">#{ticket.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${getStatusColor(ticket.status)}`}>
                                    {ticket.status}
                                </span>
                                <div className="text-[10px] font-bold text-slate-400 flex items-center">
                                    <Clock size={12} className="mr-1" /> {new Date(ticket.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="mt-3 flex items-center text-xs font-bold text-slate-500">
                                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mr-2 ring-2 ring-white">
                                    {ticket.user_name?.charAt(0)}
                                </div>
                                {ticket.user_name}
                                {ticket.user_department && <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] uppercase tracking-tighter">{ticket.user_department}</span>}
                            </div>
                        </div>
                    )) : (
                        <div className="p-12 text-center text-slate-400 font-bold text-sm italic">Nothing found</div>
                    )}
                </div>
            </div>

            {/* Conversation Viewer */}
            <div className="flex-1 flex flex-col h-full bg-white relative">
                {selectedTicket ? (
                    <>
                        {/* Detail Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                                    {selectedTicket.subject}
                                    <span className="ml-3 px-3 py-1 bg-slate-100 rounded-lg text-slate-400 font-mono text-sm">#{selectedTicket.id}</span>
                                </h1>
                                <div className="flex items-center space-x-4 mt-2">
                                    <div className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                                        <User size={14} className="mr-2 text-blue-500" /> {selectedTicket.user_name}
                                    </div>
                                    <div className="h-4 w-px bg-slate-200"></div>
                                    <div className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                                        <Clock size={14} className="mr-2 text-orange-500" /> {new Date(selectedTicket.created_at).toLocaleString()}
                                    </div>
                                    <div className="h-4 w-px bg-slate-200"></div>
                                    <div className="flex items-center">
                                        <select
                                            value={selectedTicket.status}
                                            onChange={(e) => handleUpdateStatus(e.target.value)}
                                            className={`text-[10px] font-bold uppercase tracking-widest border-none outline-none rounded-full px-3 py-1 cursor-pointer transition-all ${getStatusColor(selectedTicket.status)}`}
                                        >
                                            <option value="New">New</option>
                                            <option value="Open">Open</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button onClick={generatePDF} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95">
                                    <Printer size={20} />
                                </button>
                                <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all shadow-sm">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-slate-50/10">
                            {/* Asset Link Info */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-3xl shadow-2xl shadow-blue-200 text-white flex justify-between items-center overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:scale-110 transition-transform"><Monitor size={120} /></div>
                                <div className="relative z-10">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-2">Linked Hardware Asset</div>
                                    <h3 className="text-2xl font-black tracking-tight">{selectedTicket.asset_name || 'No hardware linked'}</h3>
                                    {selectedTicket.asset_inventory && <div className="font-mono text-sm opacity-80 mt-1">{selectedTicket.asset_inventory}</div>}
                                </div>
                                {selectedTicket.asset_name && (
                                    <button className="relative z-10 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 border border-white/30">
                                        View Specs
                                    </button>
                                )}
                            </div>

                            {/* Thread Title */}
                            <div className="flex items-center space-x-4 border-b border-slate-100 pb-4">
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Communication History</h4>
                            </div>

                            {/* Original Content */}
                            <div className="flex space-x-6 animate-in slide-in-from-left duration-500">
                                <div className="w-12 h-12 rounded-2xl bg-slate-200 flex flex-shrink-0 items-center justify-center font-black text-slate-500 text-lg shadow-sm border-2 border-white">
                                    {selectedTicket.user_name?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="bg-white p-7 rounded-3xl rounded-tl-none shadow-xl shadow-slate-200/50 border border-slate-100 text-slate-700 leading-relaxed font-medium">
                                        {selectedTicket.description}
                                    </div>
                                </div>
                            </div>

                            {/* Responses */}
                            <div className="space-y-10 pl-6 border-l-2 border-slate-100 ml-6">
                                {responses.map(response => (
                                    <div key={response.id} className="flex space-x-6 animate-in slide-in-from-bottom-4 duration-500">
                                        <div className={`w-12 h-12 rounded-2xl flex flex-shrink-0 items-center justify-center font-black text-white text-lg shadow-xl ${response.user_role === 'admin' ? 'bg-blue-600 shadow-blue-100' : 'bg-slate-400 shadow-slate-100'}`}>
                                            {response.user_role === 'admin' ? 'A' : response.user_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-black text-slate-800 text-sm uppercase tracking-tighter">{response.user_role === 'admin' ? 'ICT Agent' : response.user_name}</span>
                                                <span className="text-[10px] font-bold text-slate-300">{new Date(response.created_at).toLocaleString()}</span>
                                            </div>
                                            <div className={`p-7 rounded-3xl rounded-tl-none shadow-xl border leading-relaxed font-medium ${response.type === 'private' ? 'bg-yellow-50 border-yellow-100 text-yellow-900' : 'bg-white border-slate-100 text-slate-600'}`}>
                                                {response.type === 'private' && <div className="text-[8px] font-black uppercase tracking-widest text-yellow-600 mb-2">Internal Staff Note</div>}
                                                {response.message}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bottom Spacing */}
                            <div className="h-40"></div>
                        </div>

                        {/* Reply Controls */}
                        <div className="absolute bottom-10 left-10 right-10 z-30">
                            <div className="bg-white/80 backdrop-blur-3xl p-4 rounded-[2.5rem] shadow-2xl border border-white/50 ring-1 ring-slate-200/50">
                                <div className="flex space-x-2 mb-3 ml-2">
                                    <button onClick={() => setReplyType('public')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${replyType === 'public' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}>Post Reply</button>
                                    <button onClick={() => setReplyType('private')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${replyType === 'private' ? 'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-100' : 'text-slate-400 hover:text-slate-600'}`}>Internal Note</button>
                                </div>
                                <div className="flex items-end space-x-4 bg-slate-50 p-2 rounded-3xl border border-slate-100 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                    <textarea
                                        className="flex-1 bg-transparent border-none outline-none p-4 text-sm font-bold text-slate-700 min-h-[60px] max-h-[200px]"
                                        placeholder={replyType === 'public' ? "Type response to user..." : "Internal notes hidden from user..."}
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                    ></textarea>
                                    <button
                                        onClick={handleSendReply}
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-xl ${replyType === 'private' ? 'bg-yellow-500 text-white shadow-yellow-100' : 'bg-blue-600 text-white shadow-blue-200'}`}
                                    >
                                        <Send size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <FileText size={48} className="opacity-20 translate-y-1" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-slate-300">Queue Selected</h3>
                        <p className="text-xs font-bold text-slate-400 mt-2 opacity-50">Choose a ticket from the left pane to begin assistance</p>
                    </div>
                )}
            </div>
        </div>
    );
}

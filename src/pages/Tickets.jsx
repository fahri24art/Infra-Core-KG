import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, CheckCircle, Clock, Lock, Unlock, AlertCircle, Play, ChevronLeft, Send, Printer, User, RefreshCw, BarChart2, ShieldAlert, X, ChevronRight, Activity, MoreHorizontal, Plus, FileText, ChevronDown, Users, Server, Layers
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';
import MonitoringAlert from './MonitoringAlert';
import { generateTicketPdf } from '../utils/generateTicketPdf';

export default function Tickets() {
    const [activeView, setActiveView] = useState('user_tickets'); // 'user_tickets' | 'system_tickets' | 'all_tickets' | 'monitoring'
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Selection State
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [responses, setResponses] = useState([]);
    const [replyMessage, setReplyMessage] = useState('');
    const [replyType, setReplyType] = useState('public'); // public | private

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
            const res = await fetch('/api/network/tickets', {
                headers: { 'x-organization': currentUser?.organization || 'TCF-SG' }
            });
            const data = await res.json();
            setTickets(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch tickets', err);
            setLoading(false);
        }
    };

    const fetchResponses = async (ticketId) => {
        try {
            const res = await fetch(`/api/network/tickets/${ticketId}/responses`, {
                headers: { 'x-organization': currentUser?.organization || 'TCF-SG' }
            });
            const data = await res.json();
            setResponses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch responses', err);
        }
    };

    const handleUpdateStatus = async (ticketId, newStatus) => {
        try {
            const res = await fetch(`/api/network/tickets/${ticketId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-organization': currentUser?.organization || 'TCF-SG'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                const updated = await res.json();
                setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, status: updated.status } : t));
                if (selectedTicket && selectedTicket.id === ticketId) {
                    setSelectedTicket({ ...selectedTicket, status: updated.status });
                }
            }
        } catch (err) {
            console.error('Failed to update ticket', err);
            fetchTickets(); // Revert on failure
        }
    };

    const handleSendReply = async () => {
        if (!replyMessage || replyMessage === '<p><br></p>') return;
        if (!selectedTicket) return;

        try {
            const res = await fetch(`/api/network/tickets/${selectedTicket.id}/responses`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-organization': currentUser?.organization || 'TCF-SG'
                },
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
                if (replyType === 'public' && (selectedTicket.status === 'Diajukan' || selectedTicket.status === 'New')) {
                    handleUpdateStatus(selectedTicket.id, 'Diproses');
                }
            } else {
                alert('Warning: API response failed or returned an error.');
            }
        } catch (err) {
            console.error('Failed to send reply', err);
        }
    };

    const loadImage = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    const generatePDF = async () => {
        if (!selectedTicket) return;
        const doc = new jsPDF();
        
        // Brand Logo
        const imgData = await loadImage(logoTCF);
        if (imgData) doc.addImage(imgData, 'PNG', 14, 10, 26, 23);
        
        // Header Titles
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("PT. TRI CENTRUM FORTUNA", 45, 16);
        
        // Top Right Info
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Printed: ${new Date().toLocaleString()}`, 196, 12, { align: 'right' });
        
        let defaultDocNo = "TCFSG-FM-ICT-03-04";
        try {
            defaultDocNo = await getDocId('doc_ticket', defaultDocNo);
        } catch(e) {}
        
        const currentOrg = sessionStorage.getItem('organization') || '';
        const isKG = currentOrg.toUpperCase().includes('KG') || 
            (selectedTicket.id && typeof selectedTicket.id === 'string' && selectedTicket.id.includes("TCFKG")) ||
            (selectedTicket.number && typeof selectedTicket.number === 'string' && selectedTicket.number.includes("TCFKG"));
        let docNo = isKG ? defaultDocNo.replace("TCFSG", "TCFKG") : defaultDocNo;
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        doc.setFont("helvetica", "normal");
        const docNoWidth = doc.getTextWidth(docNo);
        doc.text(docNo, 196, 16, { align: 'right' });
        
        doc.setFont("helvetica", "bold");
        doc.text("No. Dokumen: ", 196 - docNoWidth - 2, 16, { align: 'right' });

        // Header Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 64, 175); // Dark blue for professional look
        doc.text("TICKET REPORT", 45, 22);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Ticket ID: ${selectedTicket.id}`, 45, 27);
        doc.setTextColor(0, 0, 0); // Reset color
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 35, 196, 35);
        
        // Derived Data
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

        // Ticket Details Box
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        
        let cleanSubject = selectedTicket.raw_subject || selectedTicket.subject || '';
        
        if (cleanSubject.startsWith('[')) {
            const closingBracketIdx = cleanSubject.indexOf(']');
            if (closingBracketIdx !== -1) {
                cleanSubject = cleanSubject.substring(closingBracketIdx + 1).replace(/^(\s*-\s*)/, '').trim();
            }
        }
        if (cleanSubject.includes(':')) {
           const parts = cleanSubject.split(':');
           if (parts[0].length < 100) { // Increased to 100 to catch long Help Topics
               cleanSubject = parts.slice(1).join(':').trim();
           }
        }
        if (!cleanSubject) cleanSubject = selectedTicket.raw_subject || selectedTicket.subject;
        
        const titleText = `[${selectedTicket.status.toUpperCase()}] - ${cleanSubject}`;
        const titleLines = doc.splitTextToSize(titleText, 182);
        
        // Dynamic title color based on status
        if (selectedTicket.status === 'Open') doc.setTextColor(220, 38, 38); // Red for open
        else if (selectedTicket.status === 'Closed') doc.setTextColor(22, 163, 74); // Green for closed
        else doc.setTextColor(202, 138, 4); // Yellow for pending
        
        doc.text(titleLines, 14, 42);
        doc.setTextColor(0, 0, 0); // Reset color
        
        const titleHeight = (titleLines.length * 5);

        autoTable(doc, {
            startY: 42 + titleHeight,
            theme: 'grid',
            head: [],
            body: [
                ['Status:', selectedTicket.status, 'User:', selectedTicket.user_name],
                ['Priority:', selectedTicket.priority || 'Normal', 'Email:', selectedTicket.email || '-'],
                ['Department:', selectedTicket.user_department || selectedTicket.department || 'General', 'Source:', selectedTicket.source || 'Web'],
                ['Create Date:', new Date(selectedTicket.created_at).toLocaleString(), 'Help Topic:', selectedTicket.category || 'General'],
                ['Closed By:', closedBy, 'Last Message:', lastMessageDate],
                ['SLA Plan:', 'Default SLA', 'Last Response:', lastResponseDate],
                ['Close Date:', closeDate, '', '']
            ],
            styles: { fontSize: 8, font: 'helvetica', cellPadding: 2 },
            columnStyles: { 
                0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 25 }, 
                1: { cellWidth: 65 }, 
                2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 25 },
                3: { cellWidth: 65 }
            }
        });

        // Asset Info Row
        let finalY = doc.lastAutoTable.finalY;
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(248, 250, 252);
        doc.rect(14, finalY, 182, 8, 'FD');
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Asset Info:", 16, finalY + 5.5);
        doc.setFont("helvetica", "italic");
        doc.text(selectedTicket.asset_name || "—Empty—", 41, finalY + 5.5);
        
        // Thread
        finalY += 15;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Ticket Thread (${responses.length + 1})`, 14, finalY);
        doc.line(14, finalY + 2, 196, finalY + 2);
        finalY += 6;

        const drawMessageBlock = (author, date, message, isAdmin, isInternal, yPos) => {
            const margin = 14;
            const width = 182;
            const headerHeight = 8;
            
            // Auto calculate message height
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            const textLines = doc.splitTextToSize(message, width - 6);
            const bodyHeight = (textLines.length * 4) + 6;
            const totalHeight = headerHeight + bodyHeight;

            // Page break if needed
            if (yPos + totalHeight > 280) {
                doc.addPage();
                yPos = 20;
            }

            // Header Background
            if (isInternal) {
                doc.setFillColor(254, 243, 199); // amber-100
                doc.setDrawColor(252, 211, 77); // amber-300
            } else if (isAdmin) {
                doc.setFillColor(253, 238, 220); // orange-100
                doc.setDrawColor(224, 196, 164);
            } else {
                doc.setFillColor(234, 241, 248); // blue-50
                doc.setDrawColor(193, 209, 228);
            }

            // Draw Block
            doc.rect(margin, yPos, width, totalHeight, 'FD');
            doc.line(margin, yPos + headerHeight, margin + width, yPos + headerHeight);

            // Header Text
            doc.setFont("helvetica", "bold");
            const authorWidth = doc.getTextWidth(author);
            doc.text(author, margin + 3, yPos + 5.5);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`posted ${date}`, margin + 3 + authorWidth + 2, yPos + 5.5);
            doc.setTextColor(0, 0, 0);

            if (isInternal) {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(217, 119, 6);
                doc.text("INTERNAL", margin + width - 20, yPos + 5.5);
                doc.setTextColor(0, 0, 0);
            }

            // Body Text
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(textLines, margin + 3, yPos + headerHeight + 5);

            return yPos + totalHeight + 4; // Return next Y position
        };

        // Render Initial Request
        const initMsg = (selectedTicket.raw_description || selectedTicket.description || selectedTicket.subject)
            .replace(/<[^>]*>?/gm, '')
            .replace(/[^\x00-\x7F]/g, '');

        finalY = drawMessageBlock(
            selectedTicket.user_name, 
            new Date(selectedTicket.created_at).toLocaleString(), 
            initMsg, 
            false, 
            false, 
            finalY
        );

        // Render Responses
        for (let r of responses) {
            const isAdmin = r.user_role === 'admin';
            const isInternal = r.type === 'private';
            const msg = (r.message || '').replace(/<[^>]*>?/gm, '').replace(/[^\x00-\x7F]/g, ''); // strip HTML & emoji
            finalY = drawMessageBlock(
                r.user_name,
                new Date(r.created_at).toLocaleString(),
                msg,
                isAdmin,
                isInternal,
                finalY
            );
        }

        doc.save(`Ticket_${selectedTicket.id}.pdf`);
    };

    const printFormPerbaikan = async () => {
        if (!selectedTicket || !selectedTicket.asset_id) {
            alert('Tiket ini tidak terkait dengan aset manapun. Tidak bisa mencetak Form Perbaikan.');
            return;
        }
        const newWindow = window.open('', '_blank');
        if (newWindow) newWindow.document.write('Memuat PDF...');
        try {
            const res = await fetch(`/api/network/assets/${selectedTicket.asset_id}`);
            if(!res.ok) throw new Error('Asset not found');
            const asset = await res.json();
            
            // If asset user_name is missing, fallback to ticket's user
            if (!asset.user_name) asset.user_name = selectedTicket.user_name;
            if (!asset.department) asset.department = selectedTicket.department || 'ICT';

            // Fetch last 6 months ticket history for this asset
            let historyTickets = [];
            try {
                const histRes = await fetch(`/api/network/assets/${selectedTicket.asset_id}/tickets`);
                if (histRes.ok) {
                    historyTickets = await histRes.json();
                }
            } catch(e) {}

            const checksheet_data = {};
            
            historyTickets.forEach(t => {
                const subj = (t.subject + " " + t.description).toLowerCase();
                const date = new Date(t.created_at).toLocaleString('id-ID', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
                const note = (t.closing_notes || t.description || '').replace(/<[^>]*>?/gm, ''); // strip HTML
                
                const entry = { date, note, mark: 'X' };
                
                if (subj.includes('fan') || subj.includes('kipas')) checksheet_data.fan = entry;
                if (subj.includes('keyboard') || subj.includes('mouse') || subj.includes('ngetik')) checksheet_data.keyboardMouse = entry;
                if (subj.includes('layar') || subj.includes('monitor') || subj.includes('blank')) checksheet_data.monitor = entry;
                if (subj.includes('kabel') || subj.includes('power')) checksheet_data.cabling = entry;
                if (subj.includes('ram') || subj.includes('memory')) checksheet_data.sdram = entry;
                if (subj.includes('harddisk') || subj.includes('hdd') || subj.includes('ssd') || subj.includes('storage')) checksheet_data.hardDisk = entry;
                if (subj.includes('lambat') || subj.includes('lemot') || subj.includes('sampah') || subj.includes('cache')) checksheet_data.tempPrefetch = entry;
                if (subj.includes('jaringan') || subj.includes('lan') || subj.includes('ip ') || subj.includes('internet') || subj.includes('wifi')) checksheet_data.lanConfig = entry;
                if (subj.includes('office') || subj.includes('excel') || subj.includes('word') || subj.includes('powerpoint')) checksheet_data.msOffice = entry;
                if (subj.includes('pdf') || subj.includes('acrobat') || subj.includes('reader')) checksheet_data.acrobatReader = entry;
                if (subj.includes('browser') || subj.includes('chrome') || subj.includes('firefox')) checksheet_data.internetBrowser = entry;
                if (subj.includes('mail') || subj.includes('outlook') || subj.includes('email')) checksheet_data.mailClient = entry;
                if (subj.includes('design') || subj.includes('autocad') || subj.includes('corel') || subj.includes('photoshop')) checksheet_data.designApps = entry;
                if (subj.includes('finance') || subj.includes('accurate') || subj.includes('tax')) checksheet_data.financeApps = entry;
                if (subj.includes('virus') || subj.includes('antivirus') || subj.includes('malware') || subj.includes('trojan')) checksheet_data.antivirus = entry;
            });
            
            // Default conditionBody if there's any history
            if (Object.keys(checksheet_data).length > 0 && !checksheet_data.conditionBody) {
                checksheet_data.conditionBody = { date: '', note: 'Normal', mark: 'v' };
            }

            const formObj = { checksheet_data, year: new Date().getFullYear(), maintenance_date: new Date() };
            
            if (asset.category === 'PC' || asset.category === 'Laptop' || asset.category === 'Notebook' || asset.category === 'Server') {
                const { generatePCPdf } = await import('../utils/generatePCPdf');
                await generatePCPdf(asset, formObj, 'filled', 'perbaikan', newWindow);
            } else if (asset.category === 'Printer' || asset.category === 'Scanner') {
                const { generatePrinterPdf } = await import('../utils/generatePrinterPdf');
                await generatePrinterPdf(asset, formObj, 'filled', 'perbaikan', newWindow);
            } else if (asset.category === 'Network' || asset.category === 'CCTV' || asset.category === 'Access Point' || asset.category === 'Switch') {
                const { generateNetworkPdf } = await import('../utils/generateNetworkPdf');
                await generateNetworkPdf(asset, formObj, 'filled', 'perbaikan', newWindow);
            } else {
                alert('Kategori aset ini tidak didukung untuk Form Perbaikan ISO otomatis. Gunakan kategori PC/Printer/Network.');
            }
        } catch(err) {
            console.error(err);
            if (newWindow) newWindow.close();
            alert('Gagal mencetak form perbaikan: ' + (err.message || err));
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Diajukan':
            case 'New': return 'bg-blue-600 text-white border-blue-700';
            case 'Diproses':
            case 'Open':
            case 'In Progress': return 'bg-amber-500 text-white border-amber-600';
            case 'Pending': return 'bg-yellow-400 text-slate-900 border-yellow-500';
            case 'Selesai':
            case 'Resolved':
            case 'Closed': return 'bg-emerald-600 text-white border-emerald-700';
            case 'Ditolak':
            case 'Rejected': return 'bg-rose-600 text-white border-rose-700';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const isSystem = (ticket) => {
        if (!ticket) return false;
        if (ticket.ticket_type === 'system') return true;
        if (ticket.ticket_type === 'user') return false;
        const userName = String(ticket.user_name || '').toLowerCase();
        if (userName && userName !== 'admin' && userName !== 'system auto-alert' && userName !== 'system') {
            return false;
        }
        const num = String(ticket.id || ticket.number || '');
        const subj = String(ticket.subject || ticket.raw_subject || '');
        const desc = String(ticket.description || ticket.raw_description || '');
        const src = String(ticket.source || '').toLowerCase();
        const cat = String(ticket.category || '').toLowerCase();
        return (
            num.includes('-IR-') || num.startsWith('ICT-2026') || num.includes('IR-') ||
            subj.startsWith('[AUTO-ALERT]') || subj.toLowerCase().includes('uptime kuma') || subj.toLowerCase().includes('wireguard') ||
            desc.toLowerCase().startsWith('uptime kuma') || desc.toLowerCase().includes('wireguard mendeteksi') ||
            src === 'system' || src === 'monitoring' || cat === 'monitoring'
        );
    };

    const userTickets = tickets.filter(t => !isSystem(t));
    const systemTickets = tickets.filter(t => isSystem(t));

    const currentPoolTickets = 
        activeView === 'system_tickets' ? systemTickets :
        activeView === 'all_tickets' ? tickets :
        userTickets;

    const filteredTickets = currentPoolTickets.filter(ticket => {
        let matchesStatus = false;
        if (filterStatus === 'All') {
            matchesStatus = true;
        } else if (filterStatus === 'Active' || filterStatus === 'Open') {
            matchesStatus = ['Diajukan', 'Diproses', 'New', 'Open', 'In Progress', 'Pending'].includes(ticket.status);
        } else if (filterStatus === 'Diajukan') {
            matchesStatus = ticket.status === 'Diajukan' || ticket.status === 'New';
        } else if (filterStatus === 'Diproses') {
            matchesStatus = ticket.status === 'Diproses' || ticket.status === 'Open' || ticket.status === 'In Progress' || ticket.status === 'Pending';
        } else if (filterStatus === 'Selesai') {
            matchesStatus = ticket.status === 'Selesai' || ticket.status === 'Closed' || ticket.status === 'Resolved';
        } else if (filterStatus === 'Ditolak') {
            matchesStatus = ticket.status === 'Ditolak' || ticket.status === 'Rejected';
        } else {
            matchesStatus = ticket.status === filterStatus;
        }
        const matchesSearch = (ticket.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ticket.user_name && ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (ticket.id && ticket.id.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    const activeTicketsCount = currentPoolTickets.filter(t => ['Diajukan', 'Diproses', 'New', 'Open', 'In Progress', 'Pending'].includes(t.status)).length;
    const resolvedTodayCount = currentPoolTickets.filter(t => ['Selesai', 'Resolved', 'Closed'].includes(t.status) && (new Date(t.updated_at || t.created_at).toDateString() === new Date().toDateString())).length;

    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays === 1) return `yesterday`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="flex h-[calc(100vh-80px)] w-full bg-white font-sans text-slate-800 -mx-6 -mt-6">
            <style>{`
                .ql-toolbar { border: none !important; border-bottom: 1px solid #E2E8F0 !important; border-radius: 0.5rem 0.5rem 0 0; background: #F8FAFC; padding: 12px 16px !important; }
                .ql-container { border: none !important; border-radius: 0 0 0.5rem 0.5rem; font-family: 'IBM Plex Sans', sans-serif; font-size: 0.875rem; min-height: 120px; background: white; }
                .ql-editor { padding: 16px !important; }
                .ticket-content img { max-width: 100%; border-radius: 0.5rem; margin-top: 0.5rem; cursor: pointer; }
                .ticket-content a { color: #2563eb; text-decoration: none; font-weight: 500; transition: color 0.2s;}
                .ticket-content a:hover { color: #1d4ed8; text-decoration: underline; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
            `}</style>

            {/* Left Sidebar */}
            <div className="w-64 border-r border-slate-200 bg-slate-50/30 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="font-bold text-[#172b4c] text-lg font-rubik">Tickets</h2>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1 transition-colors">
                        <Plus size={16} /> New ticket
                    </button>
                </div>
                
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search in all tickets..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {/* Modules / Ticket Origin Section */}
                    <div>
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Kategori Tiket</h3>
                        <ul className="space-y-0.5">
                            <li>
                                <button 
                                    onClick={() => { setActiveView('user_tickets'); setSelectedTicket(null); }} 
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeView === 'user_tickets' || activeView === 'tickets' ? 'bg-blue-100/60 font-bold text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className={activeView === 'user_tickets' || activeView === 'tickets' ? 'text-blue-600' : 'text-slate-500'} />
                                        <span>Tiket User (Helpdesk)</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                        {userTickets.length}
                                    </span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => { setActiveView('system_tickets'); setSelectedTicket(null); }} 
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeView === 'system_tickets' ? 'bg-purple-100/60 font-bold text-purple-700' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Server size={16} className={activeView === 'system_tickets' ? 'text-purple-600' : 'text-slate-500'} />
                                        <span>Tiket Sistem (Alerts)</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                        {systemTickets.length}
                                    </span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => { setActiveView('all_tickets'); setSelectedTicket(null); }} 
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${activeView === 'all_tickets' ? 'bg-slate-200/60 font-bold text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} className="text-slate-500" />
                                        <span>Semua Tiket</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                        {tickets.length}
                                    </span>
                                </button>
                            </li>
                            <li className="pt-2 border-t border-slate-200/60 mt-1">
                                <button 
                                    onClick={() => { setActiveView('monitoring'); setSelectedTicket(null); }} 
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activeView === 'monitoring' ? 'bg-emerald-100/60 font-bold text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <Activity size={16} className={activeView === 'monitoring' ? 'text-emerald-600' : 'text-slate-500'} />
                                    <span>Monitoring Broadcasts</span>
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* All Tickets Section */}
                    <div className={activeView === 'monitoring' ? 'hidden' : 'block'}>
                        <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2 px-3">
                            {activeView === 'system_tickets' ? 'Tiket Sistem' : activeView === 'all_tickets' ? 'Semua Tiket' : 'Tiket User'}
                        </h3>
                        <ul className="space-y-0.5">
                            <li>
                                <button 
                                    onClick={() => setFilterStatus('All')} 
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${filterStatus === 'All' ? 'bg-slate-200/60 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <span>Tickets to handle</span>
                                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{currentPoolTickets.length}</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setFilterStatus('Active')} 
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${filterStatus === 'Active' ? 'bg-slate-200/60 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <span>Tiket Aktif</span>
                                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{activeTicketsCount}</span>
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Statuses Section */}
                    <div className={activeView === 'monitoring' ? 'hidden' : 'block'}>
                        <div className="flex items-center justify-between px-3 mb-2">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statuses</h3>
                            <AlertCircle size={12} className="text-slate-300" />
                        </div>
                        <ul className="space-y-0.5">
                            {['Diajukan', 'Diproses', 'Selesai', 'Ditolak'].map(status => {
                                const count = currentPoolTickets.filter(t => {
                                    if (status === 'Diajukan') return t.status === 'Diajukan' || t.status === 'New';
                                    if (status === 'Diproses') return t.status === 'Diproses' || t.status === 'Open' || t.status === 'In Progress' || t.status === 'Pending';
                                    if (status === 'Selesai') return t.status === 'Selesai' || t.status === 'Closed' || t.status === 'Resolved';
                                    if (status === 'Ditolak') return t.status === 'Ditolak' || t.status === 'Rejected';
                                    return t.status === status;
                                }).length;
                                return (
                                    <li key={status}>
                                        <button 
                                            onClick={() => setFilterStatus(status)} 
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${filterStatus === status ? 'bg-slate-200/60 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            <span>{status}</span>
                                            {count > 0 && <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{count}</span>}
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
                {activeView === 'monitoring' ? (
                    <div className="h-full overflow-y-auto p-5 custom-scrollbar">
                        <MonitoringAlert />
                    </div>
                ) : selectedTicket ? (
                    /* Ticket Detail / Conversation View */
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Detail Header */}
                        <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedTicket(null)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">#{selectedTicket.number || selectedTicket.id}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${getStatusStyle(selectedTicket.status)}`}>
                                            {selectedTicket.status}
                                        </span>
                                    </div>
                                    <h1 className="text-xl font-bold text-slate-900 leading-tight">{selectedTicket.raw_subject || selectedTicket.subject}</h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedTicket.status !== 'Diproses' && selectedTicket.status !== 'Selesai' && selectedTicket.status !== 'Closed' && (
                                    <button 
                                        onClick={() => handleUpdateStatus(selectedTicket.id, 'Diproses')}
                                        className="px-3 py-1.5 border border-amber-500 bg-amber-50 text-amber-700 rounded text-sm font-semibold hover:bg-amber-600 hover:text-white transition-colors"
                                    >
                                        Proses Tiket
                                    </button>
                                )}
                                {selectedTicket.status !== 'Selesai' && selectedTicket.status !== 'Closed' ? (
                                    <button 
                                        onClick={() => handleUpdateStatus(selectedTicket.id, 'Selesai')}
                                        className="px-3 py-1.5 border border-emerald-500 bg-emerald-50 text-emerald-700 rounded text-sm font-semibold hover:bg-emerald-600 hover:text-white transition-colors"
                                    >
                                        Tandai Selesai
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleUpdateStatus(selectedTicket.id, 'Diproses')}
                                        className="px-3 py-1.5 border border-slate-300 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        Buka Kembali
                                    </button>
                                )}
                                {selectedTicket.status !== 'Ditolak' && selectedTicket.status !== 'Selesai' && selectedTicket.status !== 'Closed' && (
                                    <button 
                                        onClick={() => handleUpdateStatus(selectedTicket.id, 'Ditolak')}
                                        className="px-3 py-1.5 border border-rose-300 bg-rose-50 text-rose-700 rounded text-sm font-semibold hover:bg-rose-600 hover:text-white transition-colors"
                                    >
                                        Tolak
                                    </button>
                                )}
                                <button onClick={generatePDF} className="p-1.5 border border-slate-300 rounded text-slate-500 hover:bg-slate-50 transition-colors" title="Print Ticket Summary">
                                    <Printer size={18} />
                                </button>
                                {selectedTicket.asset_id && (
                                    <button 
                                        onClick={printFormPerbaikan} 
                                        className="px-3 py-1.5 border border-blue-600 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
                                        title="Cetak Form ISO Checksheet Perbaikan"
                                    >
                                        <FileText size={16} />
                                        <span>Form Perbaikan (ISO)</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Thread */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-4 space-y-3 bg-[#F6F7F9] custom-scrollbar">
                            <div className="max-w-5xl mx-auto space-y-3">
                                
                                {/* Deriving variables for osTicket layout */}
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
                                        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden text-sm">
                                            {/* Top Details Table */}
                                            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
                                                {/* Left Column */}
                                                <div className="flex-1">
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-3">
                                                        <span className="font-bold text-slate-700">Status:</span>
                                                        <span className="text-blue-600">{selectedTicket.status}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-3">
                                                        <span className="font-bold text-slate-700">Priority:</span>
                                                        <span className="text-blue-600">{selectedTicket.priority || 'Normal'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-200 p-2 px-3">
                                                        <span className="font-bold text-slate-700">Department:</span>
                                                        <span className="text-blue-600">{selectedTicket.user_department || selectedTicket.department || 'General'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-3">
                                                        <span className="font-bold text-slate-700">Create Date:</span>
                                                        <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-3 bg-slate-50/50">
                                                        <span className="font-bold text-slate-700">Closed By:</span>
                                                        <span>{closedBy}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-3 bg-slate-50/50">
                                                        <span className="font-bold text-slate-700">SLA Plan:</span>
                                                        <span className="text-blue-600">Default SLA</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] p-2 px-3 bg-slate-50/50">
                                                        <span className="font-bold text-slate-700">Close Date:</span>
                                                        <span>{closeDate}</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Right Column */}
                                                <div className="flex-1">
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-3">
                                                        <span className="font-bold text-slate-700">User:</span>
                                                        <span className="text-blue-600 font-semibold flex items-center gap-2">
                                                            <User size={14} /> {selectedTicket.user_name}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-3">
                                                        <span className="font-bold text-slate-700">Email:</span>
                                                        <span className="text-slate-600">{selectedTicket.email || '-'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-200 p-2 px-3">
                                                        <span className="font-bold text-slate-700">Source:</span>
                                                        <span>{selectedTicket.source || 'Web'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-3">
                                                        <span className="font-bold text-slate-700">Help Topic:</span>
                                                        <span className="text-blue-600">{selectedTicket.category || 'General'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] border-b border-slate-100 p-2 px-3">
                                                        <span className="font-bold text-slate-700">Last Message:</span>
                                                        <span>{lastMessageDate}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[110px_1fr] p-2 px-3">
                                                        <span className="font-bold text-slate-700">Last Response:</span>
                                                        <span>{lastResponseDate}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Asset Info Row */}
                                            <div className="border-t border-slate-200 bg-slate-100 p-2 px-3">
                                                <div className="grid grid-cols-[110px_1fr]">
                                                    <span className="font-bold text-slate-700">Asset Info:</span>
                                                    <span className="text-slate-600 italic">{selectedTicket.asset_name || '—Empty—'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                


                                {/* Thread Header Tabs */}
                                <div className="border-b border-slate-300 mt-6 flex">
                                    <div className="bg-white px-4 py-2 border-t border-x border-slate-300 rounded-t flex items-center font-bold text-sm text-slate-800 -mb-px">
                                        Ticket Thread ({responses.length + 1})
                                    </div>
                                    <div className="bg-slate-100/50 px-4 py-2 border-t border-x border-slate-200 rounded-t flex items-center text-sm text-slate-500 ml-1 cursor-not-allowed">
                                        Tasks
                                    </div>
                                </div>

                                {/* Thread Messages Area */}
                                <div className="space-y-3 pt-4">
                                    {/* Initial Request (User) */}
                                    <div className="flex justify-end gap-3">
                                        <div className="bg-white border border-[#c1d1e4] rounded shadow-sm w-full md:w-5/6 relative">
                                            {/* Bubble arrow */}
                                            <div className="absolute top-4 -right-2 w-4 h-4 bg-[#EAF1F8] border-t border-r border-[#c1d1e4] transform rotate-45"></div>
                                            <div className="bg-[#EAF1F8] border-b border-[#c1d1e4] px-4 py-2 flex items-center justify-between">
                                                <div>
                                                    <span className="font-bold text-slate-800 text-sm">{selectedTicket.user_name}</span>
                                                    <span className="text-slate-500 text-xs ml-2">posted {new Date(selectedTicket.created_at).toLocaleString()}</span>
                                                </div>
                                                <ChevronDown size={14} className="text-slate-400" />
                                            </div>
                                            <div className="p-4 text-sm text-slate-800 leading-relaxed">
                                                {selectedTicket.raw_description || selectedTicket.description || selectedTicket.subject}
                                            </div>
                                        </div>
                                        {/* Avatar Placeholder */}
                                        <div className="w-10 h-10 rounded bg-slate-300 shrink-0 flex items-center justify-center text-white">
                                            <User size={24} />
                                        </div>
                                    </div>

                                    {/* Thread Responses */}
                                    {responses.map((response, idx) => {
                                        const isAdmin = response.user_role === 'admin';
                                        const isInternal = response.type === 'private';
                                        
                                        if (isAdmin) {
                                            // Staff Response Bubble (Left aligned)
                                            return (
                                                <div key={response.id} className="flex gap-3">
                                                    {/* Avatar Placeholder */}
                                                    <div className="w-10 h-10 rounded bg-slate-300 shrink-0 flex items-center justify-center text-white">
                                                        <User size={24} />
                                                    </div>
                                                    <div className={`bg-white border ${isInternal ? 'border-amber-300' : 'border-[#e0c4a4]'} rounded shadow-sm w-full md:w-5/6 relative`}>
                                                        {/* Bubble arrow */}
                                                        <div className={`absolute top-4 -left-2 w-4 h-4 ${isInternal ? 'bg-amber-100' : 'bg-[#fdeedc]'} border-b border-l ${isInternal ? 'border-amber-300' : 'border-[#e0c4a4]'} transform rotate-45`}></div>
                                                        <div className={`${isInternal ? 'bg-amber-100' : 'bg-[#fdeedc]'} border-b ${isInternal ? 'border-amber-300' : 'border-[#e0c4a4]'} px-4 py-2 flex items-center justify-between`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-800 text-sm">{response.user_name}</span>
                                                                <span className="text-slate-500 text-xs ml-1">posted {new Date(response.created_at).toLocaleString()}</span>
                                                                {isInternal && (
                                                                    <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded ml-2">INTERNAL</span>
                                                                )}
                                                            </div>
                                                            <ChevronDown size={14} className="text-slate-400" />
                                                        </div>
                                                        <div 
                                                            className="p-4 text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: response.message }} 
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            // User Follow-up Bubble (Right aligned)
                                            return (
                                                <div key={response.id} className="flex justify-end gap-3">
                                                    <div className="bg-white border border-[#c1d1e4] rounded shadow-sm w-full md:w-5/6 relative">
                                                        <div className="absolute top-4 -right-2 w-4 h-4 bg-[#EAF1F8] border-t border-r border-[#c1d1e4] transform rotate-45"></div>
                                                        <div className="bg-[#EAF1F8] border-b border-[#c1d1e4] px-4 py-2 flex items-center justify-between">
                                                            <div>
                                                                <span className="font-bold text-slate-800 text-sm">{response.user_name}</span>
                                                                <span className="text-slate-500 text-xs ml-2">posted {new Date(response.created_at).toLocaleString()}</span>
                                                            </div>
                                                            <ChevronDown size={14} className="text-slate-400" />
                                                        </div>
                                                        <div 
                                                            className="p-4 text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: response.message }} 
                                                        />
                                                    </div>
                                                    <div className="w-10 h-10 rounded bg-slate-300 shrink-0 flex items-center justify-center text-white">
                                                        <User size={24} />
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Reply Box */}
                        <div className="bg-slate-100 p-4 shrink-0 border-t border-slate-200">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex gap-1 mb-2">
                                    <button 
                                        onClick={() => setReplyType('public')} 
                                        className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${replyType === 'public' ? 'bg-white text-slate-800 border-t border-x border-slate-300' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
                                    >
                                        Public reply
                                    </button>
                                    <button 
                                        onClick={() => setReplyType('private')} 
                                        className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1 ${replyType === 'private' ? 'bg-amber-50 text-amber-800 border-t border-x border-amber-200' : 'text-slate-500 hover:text-amber-700 hover:bg-slate-200'}`}
                                    >
                                        <Lock size={12} /> Internal note
                                    </button>
                                </div>
                                <div className={`bg-white rounded-b-lg rounded-tr-lg border ${replyType === 'private' ? 'border-amber-200' : 'border-slate-300'} shadow-sm flex flex-col`}>
                                    <ReactQuill 
                                        theme="snow" 
                                        value={replyMessage} 
                                        onChange={setReplyMessage}
                                        placeholder={replyType === 'public' ? "Type your response..." : "Type an internal note..."}
                                        modules={{
                                            toolbar: [
                                                ['bold', 'italic', 'underline'],
                                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                                ['link', 'clean']
                                            ]
                                        }}
                                    />
                                    <div className="p-3 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-lg">
                                        <span className="text-xs text-slate-400">Ctrl + Enter to send</span>
                                        <button 
                                            onClick={handleSendReply}
                                            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded text-sm font-bold shadow-sm transition-colors"
                                        >
                                            Submit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Table View */
                    <div className="flex flex-col h-full">
                        {/* Table Header Controls */}
                        <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <span>
                                        {activeView === 'system_tickets' ? 'Tiket Sistem (Alerts)' :
                                         activeView === 'all_tickets' ? 'Semua Tiket' : 'Tiket User (Helpdesk)'}
                                    </span>
                                    <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-bold">
                                        {filteredTickets.length} tickets
                                    </span>
                                </h3>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                                <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
                                    <span className="flex items-center gap-1 hover:text-blue-600"><span className="border-b border-dashed border-slate-400">Set status</span> <ChevronRight size={12} className="rotate-90"/></span>
                                    <span className="flex items-center gap-1 hover:text-blue-600"><span className="border-b border-dashed border-slate-400">Assign agent</span> <ChevronRight size={12} className="rotate-90"/></span>
                                </div>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white z-10 shadow-sm shadow-slate-200/50 text-[10px] uppercase tracking-widest">
                                    <tr className="text-[11px] font-bold text-[#172b4c] uppercase tracking-wider border-b border-slate-200">
                                        <th className="px-3 py-1.5 w-12 text-center"><input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></th>
                                        <th className="py-3 px-2 w-64 text-[10px] uppercase tracking-widest">Requester</th>
                                        <th className="py-3 px-2 text-[10px] uppercase tracking-widest">Subject</th>
                                        <th className="py-3 px-2 w-48 text-[10px] uppercase tracking-widest">Agent</th>
                                        <th className="py-3 px-2 w-32 text-[10px] uppercase tracking-widest">Status</th>
                                        <th className="px-3 py-1.5 w-40 text-right" uppercase tracking-widest>Last message</th>
                                        <th className="py-3 px-2 w-12 text-[10px] uppercase tracking-widest"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="py-20 text-center text-slate-400">
                                                <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                                                <span className="text-sm">Loading tickets...</span>
                                            </td>
                                        </tr>
                                    ) : filteredTickets.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="py-20 text-center text-slate-500">
                                                No tickets found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : filteredTickets.map((ticket, idx) => (
                                        <tr 
                                            key={ticket.id || ticket.internal_id || `t-${idx}`} 
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group transition-colors"
                                        >
                                            <td className="px-3 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            </td>
                                            <td className="py-3 px-2 text-[11px]">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full ${isSystem(ticket) ? 'bg-purple-600' : 'bg-[#B85D43]'} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                                                        {isSystem(ticket) ? <Server size={14} /> : (ticket.user_name?.charAt(0).toUpperCase() || 'U')}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]">
                                                                {isSystem(ticket) ? (ticket.user_name === 'admin' ? 'System Auto-Alert' : ticket.user_name) : ticket.user_name}
                                                            </span>
                                                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${isSystem(ticket) ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                                {isSystem(ticket) ? 'SYSTEM' : 'USER'}
                                                            </span>
                                                        </div>
                                                        {ticket.asset_name ? (
                                                            <span className="text-[10px] text-slate-500 truncate max-w-[160px]">{ticket.asset_name}</span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic truncate max-w-[160px]">
                                                                {isSystem(ticket) ? 'Uptime Kuma / Network' : (ticket.user_department || 'Helpdesk User')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-[11px]">
                                                <div className="flex items-center gap-2">
                                                    {ticket.status === 'Resolved' || ticket.status === 'Closed' ? (
                                                        <span className="text-emerald-500">✅</span>
                                                    ) : (
                                                        <span className="text-amber-500">🔥</span>
                                                    )}
                                                    <span className="font-semibold text-slate-700 text-sm hover:text-blue-600 truncate max-w-[400px]">{ticket.subject}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-[11px] text-slate-600 truncate">
                                                {ticket.assigned_to || 'unassigned'}
                                            </td>
                                            <td className="py-3 px-2 text-[11px]">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusStyle(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1.5 text-right text-[11px] text-slate-500 whitespace-nowrap">
                                                {getTimeAgo(ticket.updated_at || ticket.created_at)}
                                            </td>
                                            <td className="py-3 px-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <button className="p-1 hover:bg-slate-200 rounded"><MoreHorizontal size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

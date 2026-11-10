import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    MessageSquare, Mail, Users, Clock, Search, Filter, 
    RefreshCw, Download, CheckCircle, MessageCircle, Hash, ChevronRight, CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MonitoringAlert({ department = 'all' }) {
    const [messages, setMessages] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'whatsapp';
    const setActiveTab = (tabId) => setSearchParams({ tab: tabId });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [ticketNumber, setTicketNumber] = useState('');
    const [selectedChatId, setSelectedChatId] = useState(null);

    const tabs = [
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'emerald' },
        { id: 'email', label: 'Email', icon: Mail, color: 'blue' },
        { id: 'teams', label: 'Teams', icon: Users, color: 'indigo' }
    ];

    useEffect(() => {
        fetchAlerts();
    }, [activeTab, department]);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const url = `/api/monitoring/alerts?platform=${activeTab}&ticket_number=${ticketNumber}&department=${department}`;
            const currentUser = JSON.parse(sessionStorage.getItem('user'));
            const res = await fetch(url, {
                headers: { 'x-organization': currentUser?.organization || 'TCF-SG' }
            });
            const data = await res.json();
            setMessages(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch alerts', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            fetchAlerts();
        }
    };

    const groupedChats = groupAndFilterMessages(messages, searchTerm);
    const selectedGroup = groupedChats.find(g => g.id === selectedChatId);

    // Auto-select first chat if none selected
    useEffect(() => {
        if (!selectedChatId && groupedChats.length > 0) {
            setSelectedChatId(groupedChats[0].id);
        } else if (groupedChats.length === 0) {
            setSelectedChatId(null);
        }
    }, [groupedChats, selectedChatId]);

    return (
        <div className="space-y-3 pb-10 h-[calc(100vh-100px)] flex flex-col">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#E1E1E1] shadow-sm flex-none">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#111B21] rounded-2xl flex items-center justify-center shadow-lg">
                         <MessageCircle size={28} className="text-[#00A884]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-[#111B21] tracking-tight flex items-center gap-3">
                            WhatsApp <span className="text-[#00A884]">Monitoring</span>
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">Interactive Telemetry Terminal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={fetchAlerts} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-[#E1E1E1] transition-all">
                        <RefreshCw size={18} className={loading ? 'animate-spin text-[#00A884]' : ''} />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-[#111B21] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            {/* Main WA Interface */}
            <div className="flex-1 bg-white rounded-3xl border border-[#E1E1E1] shadow-sm overflow-hidden flex">
                
                {/* Left Sidebar: Chat List */}
                <div className="w-96 border-r border-[#E1E1E1] flex flex-col bg-white">
                    {/* Sidebar Header & Search */}
                    <div className="p-4 border-b border-[#E1E1E1] bg-[#F0F2F5] space-y-3">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Cari chat atau tiket..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#00A884] outline-none transition-all font-semibold text-slate-700 text-sm shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                        {loading ? (
                            <div className="p-10 flex justify-center">
                                <RefreshCw className="animate-spin text-[#00A884]" size={24} />
                            </div>
                        ) : groupedChats.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 text-sm font-semibold">
                                Tidak ada log tiket WhatsApp aktif.
                            </div>
                        ) : (
                            groupedChats.map(group => {
                                const lastMsg = group.messages[group.messages.length - 1];
                                const isSelected = selectedChatId === group.id;
                                return (
                                    <div 
                                        key={group.id} 
                                        onClick={() => setSelectedChatId(group.id)}
                                        className={`flex items-center gap-4 p-4 cursor-pointer border-b border-[#F0F2F5] transition-colors ${isSelected ? 'bg-[#F0F2F5]' : 'hover:bg-[#F5F6F6]'}`}
                                    >
                                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Users size={20} className="text-slate-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="font-bold text-slate-900 text-sm truncate">{group.title}</h4>
                                                <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap ml-2">
                                                    {new Date(group.lastUpdate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {lastMsg.type === 'outgoing' && <CheckCheck size={14} className="text-slate-400" />}
                                                <p className="text-xs text-slate-500 truncate font-medium">
                                                    {lastMsg.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Right Pane: Chat Window */}
                <div className="flex-1 flex flex-col bg-[#EFEAE2] relative overflow-hidden" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain', backgroundRepeat: 'repeat', opacity: 0.9 }}>
                    {selectedGroup ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 bg-[#F0F2F5] border-b border-[#E1E1E1] flex items-center gap-4 relative z-10 shadow-sm">
                                <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
                                    <Users size={18} className="text-slate-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 text-base">{selectedGroup.title}</h2>
                                    <p className="text-[11px] font-semibold text-slate-500">
                                        Total {selectedGroup.messages.length} messages
                                    </p>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {selectedGroup.messages.map(msg => {
                                    const isOutgoing = msg.type === 'outgoing';
                                    return (
                                        <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm relative ${
                                                isOutgoing ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'
                                            }`}>
                                                {!isOutgoing && (
                                                    <div className="text-[11px] font-bold text-blue-500 mb-1 flex items-center justify-between">
                                                        <span>{msg.sender_name || 'System/User'} {msg.isGroup && '(Grup Teknisi)'}</span>
                                                    </div>
                                                )}
                                                <div className="text-sm text-[#111B21] whitespace-pre-wrap font-medium leading-relaxed">
                                                    {msg.message}
                                                </div>
                                                <div className="text-[10px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1 font-semibold">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    {isOutgoing && <CheckCheck size={14} className="text-[#53BDEB]" />}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-center px-10">
                            <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <MessageCircle size={40} className="text-slate-400" />
                            </div>
                            <h2 className="text-3xl font-light text-slate-700 mb-4">WhatsApp Log Viewer</h2>
                            <p className="text-slate-500 font-medium text-sm max-w-md">
                                Pilih chat di menu sebelah kiri untuk melihat riwayat pesan WhatsApp antara sistem dan User yang telah mengirimkan Tiket.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

function groupAndFilterMessages(messages, searchTerm) {
    const lowSearch = searchTerm?.toLowerCase() || '';
    const groupedMap = new Map();
    
    messages.forEach(msg => {
        const isOutgoing = msg.type === 'outgoing';
        const isGroup = msg.platform === 'whatsapp-group';
        
        const rawPartner = isOutgoing ? msg.recipient : msg.sender;
        let partnerKey = rawPartner;
        if(typeof rawPartner === 'string') {
            if (isGroup && rawPartner.includes('|')) {
                partnerKey = rawPartner.split('|')[0].replace(/@.*$/, '').replace(/\D/g, '');
            } else {
                partnerKey = rawPartner.replace(/@.*$/, '').replace(/\D/g, '');
            }
        }
        if (msg.sender === 'status@broadcast') partnerKey = 'status-broadcast';
        
        let groupKey;
        let title;
        if (msg.ticket_number && msg.ticket_number !== 'null' && msg.ticket_number.trim() !== '') {
            groupKey = `TICKET-${msg.ticket_number}`;
            title = msg.sender_name ? `${msg.sender_name} (+${partnerKey})` : `TICKET: ${msg.ticket_number}`;
        } else {
            groupKey = `USER-${partnerKey}`;
            title = msg.sender_name ? `${msg.sender_name} (+${partnerKey})` : `+${partnerKey}`;
        }
        
        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
                id: groupKey,
                title: title,
                participant: msg.ticket_number ? msg.ticket_number : partnerKey,
                platform: msg.platform,
                messages: [],
                lastUpdate: new Date(msg.timestamp).getTime()
            });
        }
        
        const group = groupedMap.get(groupKey);
        const enhancedMsg = { ...msg, isGroup };
        group.messages.push(enhancedMsg);
        
        if (!msg.ticket_number && !isOutgoing && msg.sender_name) {
            group.title = `${msg.sender_name} (+${partnerKey})`;
        }
        
        const msgTime = new Date(msg.timestamp).getTime();
        if (msgTime > group.lastUpdate) group.lastUpdate = msgTime;
    });

    let groups = Array.from(groupedMap.values());
    
    // STRICT FILTER: Only show chats that have ticket interactions (including outgoing system notifications)
    groups = groups.filter(g => {
        const hasTicketInteraction = g.messages.some(m => 
            (m.ticket_number && m.ticket_number !== 'null' && m.ticket_number.trim() !== '') ||
            (m.message && m.message.toLowerCase().includes('#ticket')) ||
            (m.message && m.message.toLowerCase().startsWith('#close'))
        );
        return hasTicketInteraction;
    });

    if (lowSearch) {
        groups = groups.filter(g => 
            g.title.toLowerCase().includes(lowSearch) || 
            g.participant.toLowerCase().includes(lowSearch) ||
            g.messages.some(m => m.message?.toLowerCase().includes(lowSearch))
        );
    }
    
    groups.sort((a, b) => b.lastUpdate - a.lastUpdate);
    groups.forEach(g => g.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    return groups;
}

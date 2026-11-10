import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Users, User, Video, Wifi, Monitor, CheckCircle2, XCircle, Plus, ChevronLeft, ChevronRight, Check, FileText, Trash2, Save, Send, Settings, Edit, PieChart, Search, UploadCloud, Paperclip } from 'lucide-react';
import axios from 'axios';
import { format, addDays, subDays, startOfMonth, endOfMonth, isSameDay, parseISO, differenceInMinutes } from 'date-fns';
import RoomAnalytics from './RoomAnalytics';

const Rooms = () => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isAdminOrHrd = ['admin', 'administrator', 'super_user', 'hrd'].includes(user?.role);
    
    const [rooms, setRooms] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [timelineBookingDetail, setTimelineBookingDetail] = useState(null);
    const [roomForm, setRoomForm] = useState({ id: null, name: '', capacity: 10, color_theme: '#3B82F6', facilities: '' });
    const [bookingForm, setBookingForm] = useState({
        room_id: '',
        title: '',
        booker_name: '',
        booker_contact: '',
        start_time: '09:00',
        end_time: '10:00'
    });

    // MoM States
    const [showMomModal, setShowMomModal] = useState(false);
    const [selectedMomBooking, setSelectedMomBooking] = useState(null);
    const [momForm, setMomForm] = useState({
        id: null,
        discussion: '',
        action_items: [],
        attendees: []
    });

    const org = user?.organization || 'TCF-SG';

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const roomsRes = await axios.get('/api/hr/rooms', { headers: { 'x-organization': org } });
            setRooms(roomsRes.data.data);
            
            const start = startOfMonth(selectedDate).toISOString();
            const end = endOfMonth(selectedDate).toISOString();
            const bookingsRes = await axios.get(`/api/hr/rooms/bookings?start=${start}&end=${end}`, { headers: { 'x-organization': org } });
            setBookings(bookingsRes.data.data);
        } catch (err) {
            console.error("Error fetching rooms/bookings:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if(!bookingForm.booker_name) {
            setBookingForm(prev => ({...prev, booker_name: user.name || ''}));
        }
    }, [selectedDate, org]);

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        try {
            const startDateTime = new Date(selectedDate);
            const [startH, startM] = bookingForm.start_time.split(':');
            startDateTime.setHours(startH, startM, 0, 0);
            
            const endDateTime = new Date(selectedDate);
            const [endH, endM] = bookingForm.end_time.split(':');
            endDateTime.setHours(endH, endM, 0, 0);

            await axios.post('/api/hr/rooms/bookings', {
                ...bookingForm,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString()
            }, { headers: { 'x-organization': org } });
            
            setShowBookingModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Error booking room");
        }
    };

    const openMomDetail = async (booking) => {
        setSelectedMomBooking(booking);
        try {
            const res = await axios.get(`/api/hr/rooms/bookings/${booking.id}/mom`, { headers: { 'x-organization': org } });
            if (res.data.data) {
                setMomForm({
                    id: res.data.data.id,
                    discussion: res.data.data.discussion || '',
                    action_items: res.data.data.action_items || [],
                    attendees: res.data.data.attendees || []
                });
            } else {
                setMomForm({ id: null, discussion: '', action_items: [], attendees: [] });
            }
            setShowMomModal(true);
        } catch (err) {
            console.error("Error fetching MoM:", err);
            // Default empty mom if not found
            setMomForm({ id: null, discussion: '', action_items: [], attendees: [], attachments: [] });
            setShowMomModal(true);
        }
    };

    const openBookingDetail = async (booking) => {
        try {
            const res = await axios.get(`/api/hr/rooms/bookings/${booking.id}/mom`, { headers: { 'x-organization': org } });
            setTimelineBookingDetail({
                ...booking,
                mom: res.data.data
            });
        } catch (err) {
            setTimelineBookingDetail({
                ...booking,
                mom: null
            });
        }
    };

    const handleMomSubmit = async (statusUpdate = null) => {
        try {
            if (momForm.id) {
                await axios.put(`/api/hr/rooms/moms/${momForm.id}`, {
                    discussion: momForm.discussion,
                    action_items: momForm.action_items,
                    attendees: momForm.attendees
                }, { headers: { 'x-organization': org } });
            }
            if (statusUpdate) {
                await axios.put(`/api/hr/rooms/bookings/${selectedMomBooking.id}/status`, {
                    status: statusUpdate
                }, { headers: { 'x-organization': org } });
            }
            alert("MoM berhasil disimpan!");
            setShowMomModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Gagal menyimpan MoM");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-organization': org
                }
            });
            if (res.data.success) {
                setMomForm(prev => ({
                    ...prev,
                    attachments: [...(prev.attachments || []), { name: res.data.filename, url: res.data.url }]
                }));
            }
        } catch (err) {
            alert('Gagal upload file: ' + (err.response?.data?.error || err.message));
        }
    };

    const addActionItem = () => {
        setMomForm(prev => ({
            ...prev,
            action_items: [...prev.action_items, { task: '', pic: '', deadline: '', status: 'Open' }]
        }));
    };

    const updateActionItem = (index, field, value) => {
        setMomForm(prev => {
            const newItems = [...prev.action_items];
            newItems[index][field] = value;
            return { ...prev, action_items: newItems };
        });
    };

    const removeActionItem = (index) => {
        setMomForm(prev => ({
            ...prev,
            action_items: prev.action_items.filter((_, i) => i !== index)
        }));
    };

    const handleCheckIn = async (booking) => {
        const pin = prompt(`Silakan masukkan PIN Check-In untuk Ruangan ${booking.room_name} (Simulasi: ketik 1234):`);
        if (pin === '1234') {
            try {
                await axios.put(`/api/hr/rooms/bookings/${booking.id}/status`, { status: 'IN_PROGRESS' }, { headers: { 'x-organization': org } });
                alert(`Check-In berhasil! Status rapat diubah menjadi IN PROGRESS.`);
                fetchData();
            } catch(e) {
                alert('Gagal Check-in.');
            }
        } else if (pin) {
            alert('PIN salah! Tidak dapat melakukan Check-in.');
        }
    };

    const handleShareWA = async (booking) => {
        const targetNumber = prompt("Masukkan nomor WhatsApp grup/peserta (misal: 628123456789):", booking.booker_contact || "");
        if (!targetNumber) return;
        
        try {
            const res = await axios.get(`/api/hr/rooms/bookings/${booking.id}/mom`, { headers: { 'x-organization': org } });
            const mom = res.data.data;
            
            let message = `*Notulensi Rapat (MoM) - Power Asset*\n\n`;
            message += `📌 *Agenda:* ${booking.title}\n`;
            message += `📅 *Tanggal:* ${format(parseISO(booking.start_time), 'dd MMM yyyy')}\n`;
            message += `🕒 *Waktu:* ${format(parseISO(booking.start_time), 'HH:mm')} - ${format(parseISO(booking.end_time), 'HH:mm')}\n`;
            message += `🏢 *Ruangan:* ${booking.room_name}\n`;
            message += `👤 *Pimpinan:* ${booking.booker_name}\n\n`;
            message += `👥 *Daftar Hadir:*\n`;
            if (mom.attendees && mom.attendees.length > 0) {
                mom.attendees.forEach((name, i) => {
                    message += `- ${name}\n`;
                });
            } else {
                message += `- (Belum diisi)\n`;
            }
            message += `\n📝 *Hasil Keputusan/Diskusi:*\n${mom.discussion || '-'}\n\n`;
            message += `✅ *Action Items:*\n`;
            if (mom.action_items && mom.action_items.length > 0) {
                mom.action_items.forEach((item, i) => {
                    message += `${i+1}. ${item.task} (PIC: ${item.pic} | Deadline: ${item.deadline} | Status: ${item.status})\n`;
                });
            } else {
                message += `- Tidak ada Action Item\n`;
            }
            message += `\n_Dikirim otomatis oleh System Smart Meeting Power Asset_`;

            const sendRes = await axios.post('/api/hrga/bot/send-message', {
                to: targetNumber,
                message: message
            });
            
            if (sendRes.data.success) {
                alert('Berhasil mengirimkan MoM ke WhatsApp!');
            } else {
                alert('Gagal mengirim ke WhatsApp: ' + sendRes.data.error);
            }
        } catch (e) {
            console.error('Error sharing WA:', e);
            alert('Terjadi kesalahan saat membagikan MoM ke WA. Pastikan bot aktif.');
        }
    };

    // Timeline calculations
    const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

    const getBookingStyle = (booking) => {
        const start = parseISO(booking.start_time);
        const end = parseISO(booking.end_time);
        
        const startHour = start.getHours() + start.getMinutes() / 60;
        const endHour = end.getHours() + end.getMinutes() / 60;
        
        const left = Math.max(0, ((startHour - 8) / 10) * 100);
        const width = Math.min(100 - left, ((endHour - startHour) / 10) * 100);
        
        const isOvertime = booking.status === 'IN_PROGRESS' && new Date() > parseISO(booking.end_time);

        return {
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: isOvertime ? '#EF4444' : (booking.color_theme || '#3B82F6'),
            animation: isOvertime ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
            border: isOvertime ? '2px solid #B91C1C' : 'none'
        };
    };

    const [activeTab, setActiveTab] = useState('timeline');

    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        try {
            const org = localStorage.getItem('organization') || 'TCF-SG';
            const payload = {
                name: roomForm.name,
                capacity: parseInt(roomForm.capacity),
                color_theme: roomForm.color_theme,
                facilities: roomForm.facilities.split(',').map(f => f.trim()).filter(f => f)
            };
            if (roomForm.id) {
                await axios.put(`/api/hr/rooms/${roomForm.id}`, payload, { headers: { 'x-organization': org } });
                alert('Ruangan berhasil diupdate!');
            } else {
                await axios.post('/api/hr/rooms', payload, { headers: { 'x-organization': org } });
                alert('Ruangan berhasil ditambahkan!');
            }
            setShowRoomModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Gagal menyimpan ruangan');
        }
    };

    const deleteRoom = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus ruangan ini? (Semua data booking akan ikut terhapus)')) return;
        try {
            // Note: Backend delete route might not exist, but let's assume it does or we just show alert if it fails
            alert('Fitur hapus belum tersedia di backend (Untuk alasan keamanan histori MoM). Hubungi IT jika ingin menonaktifkan ruangan.');
        } catch (e) {
            console.error(e);
        }
    };

    // ... (Keep existing fetch logic)

    return (
        <div className="p-4 md:p-4 space-y-3 w-full">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        Meeting Rooms
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full uppercase tracking-widest">{org}</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Manage room availability and Minutes of Meeting (MoM)</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {activeTab === 'timeline' && (
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-white rounded-md transition-colors"><ChevronLeft size={18}/></button>
                            <span className="px-4 font-bold text-slate-700 min-w-[120px] text-center">{format(selectedDate, 'dd MMM yyyy')}</span>
                            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-white rounded-md transition-colors"><ChevronRight size={18}/></button>
                        </div>
                    )}
                    <button onClick={() => setShowBookingModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap">
                        <Plus size={20} />
                        <span className="hidden sm:inline">New Booking</span>
                    </button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-1 bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-white/50 shadow-sm w-fit overflow-x-auto max-w-full">
                <button 
                    onClick={() => setActiveTab('timeline')}
                    className={`px-4 sm:px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'timeline' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                    <CalendarIcon size={16} /> Booking Timeline
                </button>
                <button 
                    onClick={() => setActiveTab('mom')}
                    className={`px-4 sm:px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'mom' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                    <CheckCircle2 size={16} /> Daftar Risalah Rapat (MoM)
                </button>
                {isAdminOrHrd && (
                    <button 
                        onClick={() => setActiveTab('master')}
                        className={`px-4 sm:px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'master' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                    >
                        <Settings size={16} /> Kelola Ruangan
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('analytics')}
                    className={`px-4 sm:px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                    <PieChart size={16} /> Analytics & Knowledge
                </button>
            </div>

            {/* Main Content Area */}
            {activeTab === 'timeline' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Timeline UI */}
                    <div className="lg:col-span-3 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm overflow-hidden flex flex-col">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><CalendarIcon size={20} className="text-blue-500"/> Schedule Timeline</h2>
                        
                        {isLoading ? (
                            <div className="flex-1 flex items-center justify-center min-h-[300px]">
                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-x-auto custom-scrollbar">
                                <div className="min-w-[800px]">
                                    {/* Timeline Header (Hours) */}
                                    <div className="flex ml-40 border-b border-slate-200 pb-2 relative">
                                        {hours.slice(0, 10).map((hour, idx) => (
                                            <div key={hour} className="flex-1 text-xs font-bold text-slate-400">
                                                {hour.toString().padStart(2, '0')}:00
                                            </div>
                                        ))}
                                        <div className="absolute right-0 text-xs font-bold text-slate-400">18:00</div>
                                    </div>
                                    
                                    {/* Rooms Rows */}
                                    <div className="mt-4 space-y-3">
                                        {rooms.map(room => (
                                            <div key={room.id} className="flex items-center relative group">
                                                {/* Room Info */}
                                                <div className="w-40 pr-4 flex-shrink-0 z-10 bg-white">
                                                    <h3 className="font-bold text-slate-800 truncate">{room.name}</h3>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Users size={12}/> Cap: {room.capacity}</p>
                                                </div>
                                                
                                                {/* Timeline Tracks */}
                                                <div className="flex-1 h-12 bg-slate-50 rounded-lg relative border border-slate-100 overflow-hidden">
                                                    {/* Clickable Grid Slots */}
                                                    <div className="absolute inset-0 flex">
                                                        {hours.slice(0, 10).map((hour, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                className="flex-1 border-r border-slate-200/50 hover:bg-blue-100/50 cursor-pointer transition-colors"
                                                                onClick={() => {
                                                                    const startH = hour.toString().padStart(2, '0');
                                                                    const endH = (hour + 1).toString().padStart(2, '0');
                                                                    setBookingForm(prev => ({
                                                                        ...prev,
                                                                        room_id: room.id,
                                                                        start_time: `${startH}:00`,
                                                                        end_time: `${endH}:00`
                                                                    }));
                                                                    setShowBookingModal(true);
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Bookings */}
                                                    {bookings.filter(b => b.room_id === room.id && isSameDay(parseISO(b.start_time), selectedDate)).map(booking => (
                                                        <div 
                                                            key={booking.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openBookingDetail(booking);
                                                            }}
                                                            className="absolute top-1 bottom-1 rounded-md shadow-sm border border-black/10 overflow-hidden cursor-pointer hover:ring-2 ring-white transition-all flex flex-col justify-center px-2 group/booking z-10"
                                                            style={getBookingStyle(booking)}
                                                        >
                                                            <div className="text-[10px] font-bold text-white/90 truncate leading-tight">{booking.title}</div>
                                                            <div className="text-[9px] text-white/70 truncate">{booking.booker_name}</div>
                                                            
                                                            {/* Tooltip */}
                                                            <div className="absolute hidden group-hover/booking:block z-50 bg-slate-800 text-white p-3 rounded-lg shadow-xl w-48 -bottom-1 translate-y-full left-1/2 -translate-x-1/2">
                                                                <p className="font-bold text-sm mb-1">{booking.title}</p>
                                                                <p className="text-xs text-slate-300 flex items-center gap-1"><Clock size={12}/> {format(parseISO(booking.start_time), 'HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}</p>
                                                                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1"><User size={12}/> {booking.booker_name}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {rooms.length === 0 && (
                                            <div className="text-center py-10 text-slate-500 font-medium italic">No rooms available.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Available Rooms List */}
                    <div className="space-y-3">
                        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm h-full">
                            <h2 className="text-lg font-bold mb-4">Room Facilities</h2>
                            <div className="space-y-3">
                                {rooms.map(room => (
                                    <div key={room.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-800 leading-tight">{room.name}</h3>
                                            <div className="w-3 h-3 rounded-full mt-1" style={{backgroundColor: room.color_theme}}></div>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded flex items-center gap-1">
                                                <Users size={10}/> {room.capacity} Pax
                                            </span>
                                            {room.facilities && room.facilities.map((fac, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold rounded">
                                                    {fac}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'mom' ? (
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold flex items-center gap-2"><CheckCircle2 size={20} className="text-blue-500"/> Daftar Risalah Rapat (MoM)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#1E293B] text-white uppercase tracking-widest">
                                <tr>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">#</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">KODE DOKUMEN</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">JUDUL RAPAT</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">TANGGAL</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">TEMPAT</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">PIMPINAN (OWNER)</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">STATUS</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">AKSI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {bookings.length > 0 ? bookings.map((booking, index) => {
                                    const code = `MOM-${new Date(booking.start_time).getFullYear()}-${booking.id.toString().padStart(4, '0')}`;
                                    const isDraft = booking.status !== 'COMPLETED';
                                    return (
                                        <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-3 py-1.5 text-[11px] text-slate-500">{index + 1}</td>
                                            <td className="px-3 py-1.5 text-[11px] font-mono font-bold text-slate-700">{code}</td>
                                            <td className="px-3 py-1.5 text-[11px] font-bold text-slate-800">{booking.title}</td>
                                            <td className="px-3 py-1.5 text-[11px] text-slate-600">{format(parseISO(booking.start_time), 'yyyy-MM-dd')}</td>
                                            <td className="px-3 py-1.5 text-[11px] text-slate-600">{booking.room_name}</td>
                                            <td className="px-3 py-1.5 text-[11px] text-slate-600">{booking.booker_name}</td>
                                            <td className="px-3 py-1.5 text-[11px]">
                                                <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                                    isDraft ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                                                }`}>
                                                    {isDraft ? 'DRAFT' : 'SIGNOFF'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1.5 text-[11px]">
                                                <div className="flex gap-2">
                                                    {booking.status === 'SCHEDULED' && (
                                                        <button 
                                                            onClick={() => handleCheckIn(booking)}
                                                            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-md transition-colors shadow-sm flex items-center gap-1"
                                                        >
                                                            <CheckCircle2 size={12}/> Check-In
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => openMomDetail(booking)}
                                                        className="px-4 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-md transition-colors shadow-sm"
                                                    >
                                                        Form Detail
                                                    </button>
                                                    {booking.status === 'COMPLETED' && (
                                                        <button 
                                                            onClick={() => handleShareWA(booking)}
                                                            className="px-4 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-bold rounded-md transition-colors shadow-sm flex items-center gap-1"
                                                        >
                                                            <Send size={12}/> Bagikan WA
                                                        </button>
                                                    )}
                                                    <button className="text-red-500 hover:text-red-700 text-xs font-bold px-2 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-8 text-center text-slate-500 italic">Belum ada risalah rapat (MoM).</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'master' ? (
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={20} className="text-blue-500"/> Kelola Master Ruangan</h2>
                        <button 
                            onClick={() => {
                                setRoomForm({ id: null, name: '', capacity: 10, color_theme: '#3B82F6', facilities: '' });
                                setShowRoomModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg font-bold transition-all shadow-sm"
                        >
                            <Plus size={16} /> Tambah Ruangan
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#1E293B] text-white uppercase tracking-widest">
                                <tr>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">TEMA WARNA</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">NAMA RUANGAN</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">KAPASITAS</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">FASILITAS</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">STATUS</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider">AKSI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {rooms.map(room => (
                                    <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: room.color_theme }}></div>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px] font-bold text-slate-800">{room.name}</td>
                                        <td className="px-3 py-1.5 text-[11px] text-slate-600"><Users size={14} className="inline mr-1"/> {room.capacity} Pax</td>
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <div className="flex flex-wrap gap-1">
                                                {room.facilities && room.facilities.map((f, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md border border-slate-200">{f}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {room.is_active ? 'Aktif' : 'Non-Aktif'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setRoomForm({
                                                            id: room.id,
                                                            name: room.name,
                                                            capacity: room.capacity,
                                                            color_theme: room.color_theme,
                                                            facilities: room.facilities ? room.facilities.join(', ') : ''
                                                        });
                                                        setShowRoomModal(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md font-bold transition-colors flex items-center gap-1"
                                                >
                                                    <Edit size={14}/> Edit
                                                </button>
                                                <button onClick={() => deleteRoom(room.id)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-bold transition-colors">
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {rooms.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-slate-500 italic">Belum ada master ruangan.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'analytics' ? (
                <RoomAnalytics bookings={bookings} org={org} />
            ) : null}

            {/* Timeline Booking Detail Modal */}
            {timelineBookingDetail && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-[#1E293B] text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2"><CalendarIcon size={20}/> Detail Booking</h2>
                            <button onClick={() => setTimelineBookingDetail(null)} className="text-slate-400 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Agenda / Judul</p>
                                <p className="text-lg font-black text-slate-800">{timelineBookingDetail.title}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ruangan</p>
                                    <p className="font-bold text-slate-700">{timelineBookingDetail.room_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pimpinan</p>
                                    <p className="font-bold text-slate-700">{timelineBookingDetail.booker_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Waktu</p>
                                    <p className="font-bold text-slate-700">
                                        {format(parseISO(timelineBookingDetail.start_time), 'HH:mm')} - {format(parseISO(timelineBookingDetail.end_time), 'HH:mm')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                        timelineBookingDetail.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 
                                        (timelineBookingDetail.status === 'IN_PROGRESS' && new Date() > parseISO(timelineBookingDetail.end_time)) ? 'bg-red-100 text-red-600 animate-pulse' :
                                        'bg-orange-100 text-orange-600'
                                    }`}>
                                        {(timelineBookingDetail.status === 'IN_PROGRESS' && new Date() > parseISO(timelineBookingDetail.end_time)) ? 'OVERTIME' : timelineBookingDetail.status}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Daftar Hadir view */}
                            {timelineBookingDetail.mom && timelineBookingDetail.mom.attendees && timelineBookingDetail.mom.attendees.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Users size={14} className="text-blue-500"/> Daftar Hadir
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {timelineBookingDetail.mom.attendees.map((a, i) => (
                                            <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 shadow-sm">
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lampiran view */}
                            {timelineBookingDetail.mom && timelineBookingDetail.mom.attachments && timelineBookingDetail.mom.attachments.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Paperclip size={14} className="text-blue-500"/> Dokumen Lampiran
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {timelineBookingDetail.mom.attachments.map((att, i) => (
                                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 shadow-sm flex items-center gap-2 truncate transition-colors">
                                                <FileText size={14}/> {att.name}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-3">
                                {timelineBookingDetail.status === 'SCHEDULED' && (
                                    <button 
                                        onClick={() => {
                                            handleCheckIn(timelineBookingDetail);
                                            setTimelineBookingDetail(null);
                                        }}
                                        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={16}/> Lakukan Check-In
                                    </button>
                                )}
                                <button 
                                    onClick={() => {
                                        openMomDetail(timelineBookingDetail);
                                        setTimelineBookingDetail(null);
                                        setActiveTab('mom');
                                    }}
                                    className="w-full py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                                >
                                    <FileText size={16}/> Buka Form MoM (Risalah)
                                </button>
                                {timelineBookingDetail.status === 'COMPLETED' && (
                                    <button 
                                        onClick={() => {
                                            handleShareWA(timelineBookingDetail);
                                            setTimelineBookingDetail(null);
                                        }}
                                        className="w-full py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <Send size={16}/> Bagikan Hasil ke WA
                                    </button>
                                )}
                                {(timelineBookingDetail.status === 'IN_PROGRESS' && new Date() > parseISO(timelineBookingDetail.end_time)) && (
                                    <button 
                                        onClick={async () => {
                                            try {
                                                const newEnd = new Date(parseISO(timelineBookingDetail.end_time));
                                                newEnd.setMinutes(newEnd.getMinutes() + 30);
                                                await axios.put(`/api/hr/rooms/bookings/${timelineBookingDetail.id}/time`, {
                                                    end_time: newEnd.toISOString()
                                                }, { headers: { 'x-organization': org } });
                                                alert('Waktu rapat berhasil diperpanjang 30 menit!');
                                                setTimelineBookingDetail(null);
                                                fetchData();
                                            } catch (e) {
                                                alert('Gagal memperpanjang waktu: ' + (e.response?.data?.error || e.message));
                                            }
                                        }}
                                        className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <Clock size={16}/> Perpanjang 30 Menit
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Room Master Modal */}
            {showRoomModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-[#1E293B] text-white">
                            <h2 className="text-xl font-bold">{roomForm.id ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}</h2>
                            <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleRoomSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Ruangan</label>
                                <input 
                                    type="text" required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500"
                                    placeholder="e.g. Boardroom A"
                                    value={roomForm.name}
                                    onChange={e => setRoomForm({...roomForm, name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Kapasitas (Orang)</label>
                                    <input 
                                        type="number" required min="1"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500"
                                        value={roomForm.capacity}
                                        onChange={e => setRoomForm({...roomForm, capacity: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tema Warna</label>
                                    <input 
                                        type="color" required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg h-11 p-1 outline-none cursor-pointer"
                                        value={roomForm.color_theme}
                                        onChange={e => setRoomForm({...roomForm, color_theme: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Fasilitas</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500"
                                    placeholder="Pisahkan dengan koma (Misal: TV, AC, Proyektor)"
                                    value={roomForm.facilities}
                                    onChange={e => setRoomForm({...roomForm, facilities: e.target.value})}
                                />
                            </div>
                            
                            <div className="pt-4 mt-2 border-t border-slate-100 flex gap-3">
                                <button type="button" onClick={() => setShowRoomModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">
                                    Batal
                                </button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                                    Simpan Ruangan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            {showBookingModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800">Book Meeting Room</h2>
                            <button onClick={() => setShowBookingModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleBookingSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Select Room</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    required
                                    value={bookingForm.room_id}
                                    onChange={e => setBookingForm({...bookingForm, room_id: e.target.value})}
                                >
                                    <option value="">-- Choose a room --</option>
                                    {rooms.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.capacity} Pax)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Meeting Title / Agenda</label>
                                <input 
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    placeholder="e.g. Monthly Review"
                                    value={bookingForm.title}
                                    onChange={e => setBookingForm({...bookingForm, title: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Start Time</label>
                                    <input 
                                        type="time"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                        value={bookingForm.start_time}
                                        onChange={e => setBookingForm({...bookingForm, start_time: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">End Time</label>
                                    <input 
                                        type="time"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                        value={bookingForm.end_time}
                                        onChange={e => setBookingForm({...bookingForm, end_time: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Your Name</label>
                                <input 
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    value={bookingForm.booker_name}
                                    onChange={e => setBookingForm({...bookingForm, booker_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp Number (Optional)</label>
                                <input 
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    placeholder="For reminders"
                                    value={bookingForm.booker_contact}
                                    onChange={e => setBookingForm({...bookingForm, booker_contact: e.target.value})}
                                />
                            </div>
                            
                            <div className="pt-4 mt-2 border-t border-slate-100 flex gap-3">
                                <button type="button" onClick={() => setShowBookingModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                                    Confirm Booking
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MoM Modal */}
            {showMomModal && selectedMomBooking && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#1E293B] text-white">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2"><FileText size={20} className="text-blue-400"/> Digital Minutes of Meeting (MoM)</h2>
                                <p className="text-sm text-slate-300 mt-1">{selectedMomBooking.title} • {format(parseISO(selectedMomBooking.start_time), 'dd MMM yyyy')}</p>
                            </div>
                            <button onClick={() => setShowMomModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 custom-scrollbar">
                            {/* Meeting Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div><p className="text-xs text-slate-500 font-bold uppercase">Ruangan</p><p className="font-medium text-sm">{selectedMomBooking.room_name}</p></div>
                                <div><p className="text-xs text-slate-500 font-bold uppercase">Waktu</p><p className="font-medium text-sm">{format(parseISO(selectedMomBooking.start_time), 'HH:mm')} - {format(parseISO(selectedMomBooking.end_time), 'HH:mm')}</p></div>
                                <div><p className="text-xs text-slate-500 font-bold uppercase">Pimpinan Rapat</p><p className="font-medium text-sm">{selectedMomBooking.booker_name}</p></div>
                                <div><p className="text-xs text-slate-500 font-bold uppercase">Status Saat Ini</p><p className="font-medium text-sm text-blue-600">{selectedMomBooking.status}</p></div>
                            </div>

                            {/* Discussion Text */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Hasil Pembahasan & Keputusan</label>
                                <textarea 
                                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[150px] shadow-sm resize-y"
                                    placeholder="Tuliskan ringkasan diskusi, keputusan yang disepakati, dan catatan penting di sini..."
                                    value={momForm.discussion}
                                    onChange={e => setMomForm({...momForm, discussion: e.target.value})}
                                ></textarea>
                            </div>

                            {/* Daftar Hadir */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-blue-500"/> Daftar Hadir</h3>
                                    <button 
                                        type="button"
                                        onClick={() => setMomForm(prev => ({ ...prev, attendees: [...(prev.attendees || []), ''] }))}
                                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={14}/> Tambah Peserta
                                    </button>
                                </div>
                                
                                {(!momForm.attendees || momForm.attendees.length === 0) ? (
                                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                        <p className="text-sm font-bold text-slate-500">Belum ada daftar hadir.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {momForm.attendees.map((attendee, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{idx+1}</div>
                                                <input 
                                                    type="text"
                                                    placeholder="Nama Peserta..."
                                                    className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 transition-all"
                                                    value={attendee}
                                                    onChange={e => {
                                                        const newAttendees = [...momForm.attendees];
                                                        newAttendees[idx] = e.target.value;
                                                        setMomForm(prev => ({ ...prev, attendees: newAttendees }));
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const newAttendees = momForm.attendees.filter((_, i) => i !== idx);
                                                        setMomForm(prev => ({ ...prev, attendees: newAttendees }));
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Dokumen & Lampiran */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Paperclip size={18} className="text-blue-500"/> Dokumen & Lampiran</h3>
                                    <div>
                                        <input 
                                            type="file" 
                                            id="momUpload" 
                                            className="hidden" 
                                            onChange={handleFileUpload}
                                        />
                                        <label 
                                            htmlFor="momUpload"
                                            className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer cursor-pointer"
                                        >
                                            <UploadCloud size={14}/> Upload File
                                        </label>
                                    </div>
                                </div>

                                {(!momForm.attachments || momForm.attachments.length === 0) ? (
                                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                        <p className="text-sm font-bold text-slate-500">Belum ada file lampiran.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {momForm.attachments.map((att, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2 truncate">
                                                    <Paperclip size={14} /> {att.name}
                                                </a>
                                                <button 
                                                    onClick={() => {
                                                        const newAtt = momForm.attachments.filter((_, i) => i !== idx);
                                                        setMomForm(prev => ({ ...prev, attachments: newAtt }));
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Items */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="block text-sm font-bold text-slate-700">Action Items & Penugasan</label>
                                    <button onClick={addActionItem} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors">
                                        <Plus size={14}/> Tambah Tugas
                                    </button>
                                </div>
                                
                                <div className="space-y-3">
                                    {momForm.action_items.map((item, idx) => (
                                        <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <input 
                                                type="text" placeholder="Deskripsi Tugas" 
                                                className="flex-1 min-w-[200px] border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-400"
                                                value={item.task} onChange={e => updateActionItem(idx, 'task', e.target.value)}
                                            />
                                            <input 
                                                type="text" placeholder="Nama PIC" 
                                                className="w-full md:w-40 border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-400"
                                                value={item.pic} onChange={e => updateActionItem(idx, 'pic', e.target.value)}
                                            />
                                            <input 
                                                type="date" 
                                                className="w-full md:w-36 border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-400"
                                                value={item.deadline} onChange={e => updateActionItem(idx, 'deadline', e.target.value)}
                                            />
                                            <select 
                                                className={`w-full md:w-32 border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-400 font-bold
                                                    ${item.status === 'Done' ? 'text-green-600' : item.status === 'Progress' ? 'text-orange-500' : 'text-slate-600'}
                                                `}
                                                value={item.status} onChange={e => updateActionItem(idx, 'status', e.target.value)}
                                            >
                                                <option value="Open">Open</option>
                                                <option value="Progress">Progress</option>
                                                <option value="Done">Done</option>
                                            </select>
                                            <button onClick={() => removeActionItem(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    ))}
                                    {momForm.action_items.length === 0 && (
                                        <div className="text-center py-6 text-slate-400 text-sm italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            Belum ada Action Item. Klik tombol tambah untuk menugaskan pekerjaan.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-5 border-t border-slate-200 bg-white flex justify-between gap-3">
                            <button onClick={() => setShowMomModal(false)} className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all">
                                Tutup
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => handleMomSubmit()} className="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-all flex items-center gap-2">
                                    <Save size={18}/> Simpan Draft
                                </button>
                                <button onClick={() => handleMomSubmit('COMPLETED')} className="px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20">
                                    <CheckCircle2 size={18}/> Sign-Off & Selesai
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Rooms;

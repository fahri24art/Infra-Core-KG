import React, { useState, useEffect } from 'react';
import { Search, PieChart, Clock, FileText, CheckCircle2, ChevronRight, Hash } from 'lucide-react';
import axios from 'axios';
import { format, parseISO, differenceInMinutes } from 'date-fns';

const RoomAnalytics = ({ bookings, rooms, org, isGuest = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await axios.get(`/api/hr/rooms/knowledge-search?q=${encodeURIComponent(searchQuery)}`, {
                headers: { 'x-organization': org }
            });
            setSearchResults(res.data.data);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Analytics calculations based on current month's bookings
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
    const totalMeetings = bookings.length;
    const totalCompleted = completedBookings.length;
    
    let totalMinutes = 0;
    completedBookings.forEach(b => {
        totalMinutes += differenceInMinutes(parseISO(b.end_time), parseISO(b.start_time));
    });
    const avgDuration = totalCompleted > 0 ? Math.round(totalMinutes / totalCompleted) : 0;
    
    // Group by room to find most used
    const roomUsage = {};
    bookings.forEach(b => {
        roomUsage[b.room_name] = (roomUsage[b.room_name] || 0) + 1;
    });
    const mostUsedRoom = Object.entries(roomUsage).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

    // Live Room Status Logic
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update every minute
        return () => clearInterval(timer);
    }, []);

    const getRoomStatus = (roomId) => {
        const todayBookings = bookings.filter(b => b.room_id === roomId && b.status !== 'CANCELLED' && b.status !== 'COMPLETED');
        let currentBooking = null;
        let nextBooking = null;

        todayBookings.forEach(b => {
            const start = parseISO(b.start_time);
            const end = parseISO(b.end_time);
            if (currentTime >= start && currentTime <= end) {
                currentBooking = b;
            } else if (currentTime > end && b.status === 'IN_PROGRESS') {
                currentBooking = { ...b, isOvertime: true };
            } else if (start > currentTime) {
                if (!nextBooking || start < parseISO(nextBooking.start_time)) {
                    nextBooking = b;
                }
            }
        });

        if (currentBooking) {
            return {
                state: currentBooking.isOvertime ? 'OVERTIME' : 'OCCUPIED',
                booking: currentBooking
            };
        }
        return {
            state: 'VACANT',
            nextBooking: nextBooking
        };
    };

    return (
        <div className="space-y-3">
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><PieChart size={24}/></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Meeting (Bulan Ini)</p>
                        <p className="text-2xl font-black text-slate-800">{totalMeetings}</p>
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle2 size={24}/></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting Selesai</p>
                        <p className="text-2xl font-black text-slate-800">{totalCompleted}</p>
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Clock size={24}/></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rata-rata Durasi</p>
                        <p className="text-2xl font-black text-slate-800">{avgDuration} <span className="text-sm font-medium text-slate-500">menit</span></p>
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Hash size={24}/></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ruangan Terfavorit</p>
                        <p className="text-lg font-black text-slate-800 truncate" title={mostUsedRoom[0]}>{mostUsedRoom[0]}</p>
                    </div>
                </div>
            </div>

            {/* Live Room Status */}
            {rooms && rooms.length > 0 && (
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden p-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Live Room Status
                        </h2>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                            {format(currentTime, 'HH:mm')} WIB
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map(room => {
                            const status = getRoomStatus(room.id);
                            return (
                                <div key={room.id} className="border border-slate-200 rounded-xl p-4 flex flex-col relative overflow-hidden bg-white hover:shadow-md transition-shadow">
                                    <div className={`absolute top-0 right-0 w-1.5 h-full ${
                                        status.state === 'VACANT' ? 'bg-emerald-500' : 
                                        status.state === 'OVERTIME' ? 'bg-red-500' : 'bg-orange-500'
                                    }`}></div>
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{room.name}</h3>
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                            status.state === 'VACANT' ? 'bg-emerald-100 text-emerald-700' : 
                                            status.state === 'OVERTIME' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {status.state}
                                        </span>
                                    </div>
                                    
                                    {status.state === 'VACANT' ? (
                                        <div className="mt-auto pt-2 border-t border-slate-100">
                                            {status.nextBooking ? (
                                                <p className="text-xs font-medium text-slate-500">
                                                    Kosong hingga <strong className="text-slate-700">{format(parseISO(status.nextBooking.start_time), 'HH:mm')}</strong>
                                                </p>
                                            ) : (
                                                <p className="text-xs font-medium text-slate-500">Kosong sisa hari ini</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-auto pt-2 border-t border-slate-100 space-y-1">
                                            <p className="text-xs font-bold text-slate-800 truncate">{status.booking.title}</p>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500">{status.booking.booker_name}</span>
                                                <span className={`font-bold ${status.state === 'OVERTIME' ? 'text-red-600' : 'text-orange-600'}`}>
                                                    S/D {format(parseISO(status.booking.end_time), 'HH:mm')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {/* Knowledge Center */}
            {!isGuest && (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[400px]">
                {/* Search Sidebar */}
                <div className="w-full md:w-1/3 bg-slate-50/50 p-4 border-r border-slate-100">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-2"><Search size={20} className="text-blue-500"/> Knowledge Center</h2>
                    <p className="text-sm text-slate-500 mb-6">Cari riwayat diskusi, keputusan, atau action item dari semua notulensi rapat yang pernah ada.</p>
                    
                    <form onSubmit={handleSearch} className="relative mb-6">
                        <input 
                            type="text" 
                            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm font-medium"
                            placeholder="Ketik kata kunci pencarian..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                    </form>

                    {/* Search hints */}
                    {!searchQuery && searchResults.length === 0 && (
                        <div className="text-xs text-slate-400 space-y-2">
                            <p className="font-bold">Contoh Pencarian:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>"budget Q3"</li>
                                <li>"upgrade server"</li>
                                <li>"Budi Santoso"</li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Search Results */}
                <div className="w-full md:w-2/3 p-4 bg-white overflow-y-auto custom-scrollbar">
                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                            <p className="font-bold">Mencari ke seluruh riwayat rapat...</p>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Hasil Pencarian ({searchResults.length})</h3>
                            {searchResults.map((res, i) => (
                                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-blue-700 flex items-center gap-1"><FileText size={16}/> {res.title}</h4>
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{format(parseISO(res.start_time), 'dd MMM yyyy')}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">📍 {res.room_name} • 👤 Pimpinan: {res.booker_name}</p>
                                    
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <p className="text-sm text-slate-700 font-medium mb-2">Ringkasan Diskusi:</p>
                                        <p className="text-sm text-slate-600 line-clamp-3 italic">"{res.discussion || 'Tidak ada catatan diskusi'}"</p>
                                    </div>
                                    
                                    {res.action_items && res.action_items.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Action Items terkait:</p>
                                            <div className="space-y-1">
                                                {res.action_items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white border border-slate-100 rounded-md">
                                                        <span className="font-medium text-slate-700">{item.task}</span>
                                                        <span className="text-slate-500 flex gap-2">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded">PIC: {item.pic}</span>
                                                            <span className={`px-2 py-0.5 rounded font-bold ${item.status === 'Done' ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50'}`}>{item.status}</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : searchQuery ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                            <Search size={48} className="mb-4 text-slate-200" />
                            <p className="font-bold text-slate-600">Tidak ada hasil ditemukan.</p>
                            <p className="text-sm mt-1">Coba gunakan kata kunci lain.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center">
                            <FileText size={48} className="mb-4 opacity-50" />
                            <p className="font-bold">Knowledge Center siap.</p>
                            <p className="text-sm mt-1">Ketik di kolom pencarian untuk memulai.</p>
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
};

export default RoomAnalytics;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, MonitorPlay, Clock, CheckCircle2, LayoutGrid, CalendarDays, TrendingUp } from 'lucide-react';
import { format, isToday, parseISO, isAfter, isBefore, differenceInMinutes, startOfMonth, endOfMonth } from 'date-fns';
import bgImage from '../assets/space-background.jpg';

export default function PublicRoomDashboard() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const gridRef = useRef(null);
    
    const location = useLocation();
    const queryOrg = new URLSearchParams(location.search).get('org') || 'TCF-SG';
    const org = queryOrg;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = async () => {
        try {
            const [bRes, rRes] = await Promise.all([
                axios.get(`/api/hr/rooms/bookings?org=${org}`, { headers: { 'x-organization': org } }),
                axios.get(`/api/hr/rooms?org=${org}`, { headers: { 'x-organization': org } })
            ]);
            setBookings(bRes.data.data || []);
            setRooms(rRes.data.data || []);
        } catch (err) {
            console.error('Failed to fetch public room data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // 1 minute auto refresh
        return () => clearInterval(interval);
    }, [org]);

    // Auto-scroll logic for TV display
    useEffect(() => {
        const el = gridRef.current;
        if (!el || rooms.length === 0) return;
        
        let scrollPos = 0;
        let direction = 1;
        let isPaused = false;
        
        const scrollInterval = setInterval(() => {
            if (el.scrollHeight <= el.clientHeight) return; // No scroll needed
            if (isPaused) return;
            
            scrollPos += direction * 0.5; // slow smooth scroll
            el.scrollTo(0, scrollPos);
            
            if (scrollPos >= (el.scrollHeight - el.clientHeight)) {
                direction = -1;
                isPaused = true;
                setTimeout(() => { isPaused = false; }, 3000); // Pause at bottom for 3s
            } else if (scrollPos <= 0) {
                direction = 1;
                isPaused = true;
                setTimeout(() => { isPaused = false; }, 3000); // Pause at top for 3s
            }
        }, 30);
        
        return () => clearInterval(scrollInterval);
    }, [rooms]);

    // Analytics calculations
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthlyBookings = bookings.filter(b => {
        const d = parseISO(b.start_time);
        return d >= monthStart && d <= monthEnd && b.status !== 'Cancelled';
    });

    const completedBookings = monthlyBookings.filter(b => isBefore(parseISO(b.end_time), now));
    
    const avgDuration = monthlyBookings.length > 0 
        ? Math.round(monthlyBookings.reduce((acc, b) => acc + differenceInMinutes(parseISO(b.end_time), parseISO(b.start_time)), 0) / monthlyBookings.length)
        : 0;

    const roomCounts = monthlyBookings.reduce((acc, b) => {
        acc[b.room_id] = (acc[b.room_id] || 0) + 1;
        return acc;
    }, {});

    const topRoomId = Object.keys(roomCounts).sort((a, b) => roomCounts[b] - roomCounts[a])[0];
    const topRoom = rooms.find(r => r.id === parseInt(topRoomId));

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-[#020617] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <MonitorPlay size={48} className="text-blue-500 mb-4" />
                    <p className="text-slate-400 font-bold tracking-widest uppercase">Syncing Live Status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-[#020617] text-white font-sans overflow-hidden flex flex-col relative">
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-[-10%] z-0 bg-cover bg-center bg-no-repeat opacity-20 mix-blend-screen" style={{ backgroundImage: `url(${bgImage})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617]/90 to-[#020617] z-0"></div>
                
                {/* Glowing Orbs */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-500/10 blur-[120px] rounded-full"></div>
            </div>

            {/* Header - Fixed Height */}
            <div className="relative z-10 h-[10%] min-h-[80px] px-8 flex justify-between items-center border-b border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                            <MonitorPlay className="text-blue-500" size={24} /> 
                            Meeting Room <span className="text-blue-500">Command</span>
                        </h1>
                        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-1">Live Room Status & Analytics</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xl font-black text-white tracking-tight">
                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-xl font-black tracking-widest text-sm uppercase shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        {org}
                    </div>
                </div>
            </div>

            {/* Main Content Area - Remaining Height */}
            <div className="relative z-10 flex-1 p-4 flex flex-col gap-4 overflow-hidden">
                
                {/* TOP ROW: Analytics (Takes up 25% height) */}
                <div className="grid grid-cols-4 gap-4 h-[25%]">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-4 backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <CalendarDays size={28} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Meeting</p>
                            <p className="text-4xl font-black text-white tracking-tighter mt-1">{monthlyBookings.length}</p>
                            <p className="text-xs text-blue-400 font-medium mt-1">This month</p>
                        </div>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-4 backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={28} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Completed</p>
                            <p className="text-4xl font-black text-white tracking-tighter mt-1">{completedBookings.length}</p>
                            <p className="text-xs text-emerald-400 font-medium mt-1">Meetings done</p>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-4 backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <Clock size={28} className="text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Avg Duration</p>
                            <p className="text-4xl font-black text-white tracking-tighter mt-1">{avgDuration} <span className="text-lg font-bold text-slate-500">min</span></p>
                            <p className="text-xs text-amber-400 font-medium mt-1">Per meeting</p>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-4 backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                            <TrendingUp size={28} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Top Room</p>
                            <p className="text-xl font-black text-white tracking-tighter mt-1 truncate max-w-[150px]">{topRoom?.name || '-'}</p>
                            <p className="text-xs text-purple-400 font-medium mt-1">{topRoomId ? `${roomCounts[topRoomId]} uses` : 'No data'}</p>
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW: Live Room Grid (Takes up 75% height) */}
                <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-widest">
                            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span> Live Room Status
                        </h2>
                    </div>

                    {/* Room Grid */}
                    <div ref={gridRef} className="flex-1 grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] auto-rows-max gap-4 overflow-y-auto pb-4 pr-2" style={{ scrollbarWidth: 'none' }}>
                        {rooms.map(room => {
                            const roomBookingsToday = bookings.filter(b => 
                                b.room_id === room.id && 
                                isToday(parseISO(b.start_time)) && 
                                b.status !== 'Cancelled'
                            ).sort((a,b) => parseISO(a.start_time) - parseISO(b.start_time));

                            const currentBooking = roomBookingsToday.find(b => {
                                const start = parseISO(b.start_time);
                                const end = parseISO(b.end_time);
                                return isAfter(now, start) && isBefore(now, end);
                            });

                            const nextBooking = roomBookingsToday.find(b => isAfter(parseISO(b.start_time), now));
                            const isOccupied = !!currentBooking;

                            return (
                                <div key={room.id} className="bg-white/5 rounded-2xl border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden group min-h-[160px]">
                                    {isOccupied && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                                    )}
                                    {!isOccupied && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-xl font-black text-white tracking-tight truncate pr-4">{room.name}</h3>
                                        {isOccupied ? (
                                            <div className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-1 rounded-md text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 shrink-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div> IN USE
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-md text-[10px] font-black tracking-widest uppercase shrink-0">
                                                VACANT
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 flex flex-col justify-center">
                                        {isOccupied ? (
                                            <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
                                                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-0.5">Current Meeting</p>
                                                <p className="text-base font-black text-white truncate">{currentBooking.title}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Until {format(parseISO(currentBooking.end_time), 'HH:mm')}</p>
                                            </div>
                                        ) : nextBooking ? (
                                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Next Meeting</p>
                                                <div className="flex justify-between items-center gap-2">
                                                    <p className="text-base font-black text-white truncate flex-1">{nextBooking.title}</p>
                                                    <p className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-1 rounded shrink-0">
                                                        {format(parseISO(nextBooking.start_time), 'HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-center h-[70px]">
                                                <p className="text-xs font-medium text-slate-500 italic">No more meetings today</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {rooms.length === 0 && (
                            <div className="col-span-full flex items-center justify-center text-slate-500 italic h-32">
                                No rooms configured for this organization.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

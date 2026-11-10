import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, Zap, TrendingUp, ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TicketIntelligence({ data }) {
    // Oscilloscope-style view
    return (
        <div className="space-y-3">
            {/* Main Signal Display */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full -mr-32 -mt-32"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Activity className="text-blue-400 w-5 h-5 animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase transition-colors group-hover:text-blue-400">
                                Ticket <span className="italic">Signal Analysis</span>
                            </h2>
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] ml-10">Real-time support telemetry & frequency trace</p>
                    </div>

                    <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                        <MetricBadge label="Signals" value={data[data.length-1]?.Created || 0} color="#3b82f6" />
                        <div className="w-px h-8 bg-white/10"></div>
                        <MetricBadge label="Resolved" value={data[data.length-1]?.Closed || 0} color="#10b981" />
                        <div className="w-px h-8 bg-white/10"></div>
                        <MetricBadge label="Intensity" value="Active" color="#f59e0b" />
                    </div>
                </div>

                <div className="h-[400px] w-full relative z-10 flex items-center justify-center" style={{ height: '400px', minHeight: '400px' }}>
                    {data && data.length > 0 && data.some(d => (d.Created || d.Closed || d.Overdue)) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="signalGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    dy={10}
                                    fontStyle="italic"
                                />
                                <YAxis 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(12px)',
                                        padding: '16px'
                                    }}
                                    itemStyle={{ fontWeight: 'black', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="Created" 
                                    stroke="#3b82f6" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#signalGradient)" 
                                    animationDuration={2000}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="Closed" 
                                    stroke="#10b981" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#intensityGradient)" 
                                    strokeDasharray="5 5"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-slate-700 animate-pulse">
                            <Zap size={48} className="opacity-20" />
                            <p className="font-black text-xs uppercase tracking-[0.5em]">No Signal Detected</p>
                        </div>
                    )}
                </div>
                
                {/* Visual "Oscilloscope" decorative detail */}
                <div className="mt-6 flex justify-between items-center text-[9px] font-black tracking-widest text-slate-600 uppercase">
                    <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                        Phase: Terminal Sync
                    </span>
                    <span className="opacity-50">Frequency: 54Hz / Sample: 1024 / Drift: 0.02ms</span>
                </div>
            </div>

            {/* Matrix Pulse Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PulseCard 
                    icon={Zap} 
                    label="Command Velocity" 
                    value="98.2%" 
                    desc="Response integrity index"
                    color="text-amber-400"
                    bg="bg-amber-400/10"
                />
                <PulseCard 
                    icon={ShieldCheck} 
                    label="SLA Security" 
                    value="0.8h" 
                    desc="AVG Resolution Heartbeat"
                    color="text-emerald-400"
                    bg="bg-emerald-400/10"
                />
                <PulseCard 
                    icon={Clock} 
                    label="System Latency" 
                    value="12ms" 
                    desc="I/O Operation Delay"
                    color="text-cyan-400"
                    bg="bg-cyan-400/10"
                />
            </div>
        </div>
    );
}

function MetricBadge({ label, value, color }) {
    return (
        <div className="flex flex-col items-center px-4">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
            <span className="text-xl font-black" style={{ color }}>{value}</span>
        </div>
    );
}

function PulseCard({ icon: Icon, label, value, desc, color, bg }) {
    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl group cursor-pointer"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${bg} ${color} border border-white/5 transition-transform group-hover:scale-110`}>
                    <Icon size={20} />
                </div>
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active</div>
            </div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</h4>
            <div className="text-3xl font-black text-white tracking-tighter mb-1">{value}</div>
            <p className="text-[10px] text-slate-600 font-bold uppercase">{desc}</p>
        </motion.div>
    );
}

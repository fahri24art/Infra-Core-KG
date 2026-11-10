import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { MessageCircle, Mail, Users, BarChart3, Building2, Globe } from 'lucide-react';

export default function TicketSourcesDonut({ tickets = [], alerts = { whatsapp: [], email: [], teams: [] } }) {
    const colors = {
        'WhatsApp': '#25D366',
        'Email': '#3b82f6',
        'Teams': '#6264A7',
        'General': '#8b5cf6',
        'Hardware': '#3b82f6',
        'Software': '#6366f1',
        'Network': '#f43f5e',
        'Request': '#10b981'
    };

    // Calculate overall source counts
    const overallSourceData = [
        { name: 'WhatsApp', value: alerts.whatsapp?.length || 0, color: '#25D366' },
        { name: 'Email', value: alerts.email?.length || 0, color: '#3b82f6' },
        { name: 'Teams', value: alerts.teams?.length || 0, color: '#6264A7' }
    ].sort((a, b) => b.value - a.value);

    // Calculate category breakdown
    const categoryMap = {};
    tickets.forEach(ticket => {
        const category = ticket.category || 'General';
        categoryMap[category] = (categoryMap[category] || 0) + 1;
    });

    const categorySourceData = Object.entries(categoryMap)
        .map(([category, value]) => ({
            name: category,
            value,
            category
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

    return (
        <div className="card-unifi p-10 relative overflow-hidden group min-h-[480px] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-12">
                <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                            Signal <span className="text-blue-600">Intelligence</span>
                        </h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">Omnichannel Telemetry Analyzer</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-[#E1E1E1]">
                    <SourceBadge label="WA" value={overallSourceData.find(s => s.name === 'WhatsApp')?.value || 0} color="#25D366" icon={MessageCircle} />
                    <div className="w-px h-8 bg-slate-200"></div>
                    <SourceBadge label="Mail" value={overallSourceData.find(s => s.name === 'Email')?.value || 0} color="#3b82f6" icon={Mail} />
                    <div className="w-px h-8 bg-slate-200"></div>
                    <SourceBadge label="Teams" value={overallSourceData.find(s => s.name === 'Teams')?.value || 0} color="#6264A7" icon={Users} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 flex-1">
                {/* Visual Analytics */}
                <div className="relative flex items-center justify-center bg-[#F8F9FB] rounded-[2.5rem] border border-[#E1E1E1] p-5">
                    <div className="w-full h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={overallSourceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={8}
                                    dataKey="value"
                                    labelLine={false}
                                >
                                    {overallSourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={4} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        borderRadius: '16px',
                                        border: '1px solid #E1E1E1',
                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{ fontWeight: '900', fontSize: '11px', textTransform: 'uppercase', color: '#0F172A' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Center Info */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Stream</p>
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">
                            {overallSourceData.reduce((a, b) => a + b.value, 0)}
                        </p>
                    </div>
                </div>

                {/* Categories Matrix */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-4">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                             Distribution Matrix
                        </h3>
                        <Globe size={14} className="text-slate-300" />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {categorySourceData.length > 0 ? categorySourceData.map((item, i) => (
                            <div key={i} className="group flex items-center justify-between p-4 bg-[#F8F9FB] rounded-2xl border border-[#E1E1E1] hover:border-blue-600/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.category}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Infrastructure Segment</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900">{item.value}</p>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Reports</p>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center py-20 text-center">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Segregated Data Available</p>
                            </div>
                        )}
                    </div>

                    <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200">
                        View Detailed Metrics
                    </button>
                </div>
            </div>
        </div>
    );
}

function SourceBadge({ label, value, color, icon: Icon }) {
    return (
        <div className="flex flex-col items-center min-w-[50px]">
            <div className="flex items-center gap-2 mb-1.5">
                <Icon size={12} style={{ color }} />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-xl font-black tracking-tighter" style={{ color }}>{value}</span>
        </div>
    );
}

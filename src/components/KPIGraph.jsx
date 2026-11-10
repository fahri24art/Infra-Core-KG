import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Edit2, Save, X, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function KPIGraph({ kpiType, title, data, dataKeys, colors, tableLabels, onSave }) {
    const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
    ];

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState([]);
    const chartRef = React.useRef(null);

    // Initialize editData whenever the external data changes
    useEffect(() => {
        setEditData(JSON.parse(JSON.stringify(data)));
    }, [data, isEditing]);

    const handleCellChange = (monthIndex, key, value) => {
        const newData = [...editData];
        newData[monthIndex] = { ...newData[monthIndex], [key]: value === '' ? '' : Number(value) };
        setEditData(newData);
    };

    const handleSave = async () => {
        if (onSave) {
            await onSave(kpiType, editData);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditData(JSON.parse(JSON.stringify(data)));
        setIsEditing(false);
    };

    const handleDownload = async () => {
        if (!chartRef.current) return;
        try {
            const canvas = await html2canvas(chartRef.current, { scale: 2 });
            const link = document.createElement('a');
            link.download = `${title.replace(/\s+/g, '_')}_KPI.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to download image', err);
        }
    };

    const displayData = isEditing ? editData : data;

    const chartData = displayData.map(d => ({
        ...d,
        name: monthNames[d.month - 1]
    }));

    return (
        <div ref={chartRef} className="bg-white p-4 md:p-4 rounded-3xl shadow-sm border border-slate-100 mt-8 relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 text-center flex-1">{title}</h3>
                {kpiType && (
                    <div className="flex space-x-2 absolute right-6 top-6" data-html2canvas-ignore>
                        <button onClick={handleDownload} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" title="Download Image">
                            <Download size={18} />
                        </button>
                        {!isEditing ? (
                            <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Edit Manual">
                                <Edit2 size={18} />
                            </button>
                        ) : (
                            <>
                                <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Batal">
                                    <X size={18} />
                                </button>
                                <button onClick={handleSave} className="px-3 py-1.5 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 flex items-center transition-colors shadow-sm" title="Simpan Perubahan">
                                    <Save size={16} className="mr-1.5" /> Save
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            cursor={{ fill: '#f8fafc' }}
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                        {dataKeys.map((key, index) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                fill={colors[index]}
                                radius={[4, 4, 0, 0]}
                                name={tableLabels[index]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Excel-style Data Table */}
            <div className="mt-8 overflow-x-auto">
                <table className="w-full border-collapse text-[10px] md:text-xs">
                    <thead>
                        <tr>
                            <th className="border border-slate-200 bg-slate-50 px-1.5 py-2 md:p-2 text-left text-slate-500 font-medium" uppercase tracking-widest>Metric</th>
                            {monthNames.map(m => (
                                <th key={m} className="border border-slate-200 bg-slate-50 px-1 py-2 md:p-2 text-center text-slate-500 font-medium" uppercase tracking-widest>{m}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {dataKeys.map((key, index) => (
                            <tr key={key}>
                                <td className="border border-slate-200 px-1.5 py-1.5 font-bold text-slate-700 bg-slate-50/50 whitespace-nowrap">
                                    <div className="flex items-center space-x-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colors[index] }}></div>
                                        <span className="text-[10px] md:text-[11px] tracking-tighter">{tableLabels[index]}</span>
                                    </div>
                                </td>
                                {displayData.map((d, mIdx) => (
                                    <td key={d.month} className="border border-slate-200 px-0.5 py-1.5 text-center text-slate-600 font-medium tracking-tighter">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={d[key] !== undefined && d[key] !== null ? d[key] : ''}
                                                onChange={(e) => handleCellChange(mIdx, key, e.target.value)}
                                                className="w-12 px-0.5 py-1 text-center border font-bold text-blue-700 border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        ) : (
                                            typeof d[key] === 'number' ? d[key].toLocaleString() : d[key]
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {/* Always show percentage as the last row if it exists */}
                        {displayData[0]?.percentage !== undefined && (
                            <tr className="bg-slate-50">
                                <td className="border border-slate-200 px-1.5 py-1.5 font-bold text-slate-800 text-[10px] md:text-[11px] whitespace-nowrap">Persentase (%)</td>
                                {displayData.map((d, mIdx) => {
                                    // Live calculation if editing for visual feedback, else use provided percentage
                                    let displayPct = d.percentage;
                                    if (isEditing) {
                                        // Specific calculation rules could be inferred here based on dataKeys, but to be robust,
                                        // we'll rely on backend recalculation after save for exact accuracy. The UI will just show the old % visually until saved constraint.
                                        // For true live update, we'd need to know exactly which keys are numerator/denominator.
                                        if (d.actual !== undefined && d.target !== undefined) {
                                            displayPct = d.target > 0 ? ((d.actual / d.target) * 100).toFixed(2) : "0.00";
                                        } else if (d.uptime_minutes !== undefined && d.total_minutes !== undefined) {
                                            displayPct = d.total_minutes > 0 ? ((d.uptime_minutes / d.total_minutes) * 100).toFixed(2) : "0.00";
                                        } else if (d.resolved_tickets !== undefined && d.total_tickets !== undefined) {
                                            displayPct = d.total_tickets > 0 ? ((d.resolved_tickets / d.total_tickets) * 100).toFixed(2) : "0.00";
                                        } else if (d.iforte_uptime !== undefined && d.comnet_uptime !== undefined && d.total_minutes !== undefined) {
                                            displayPct = d.total_minutes > 0 ? (((d.iforte_uptime + d.comnet_uptime) / (d.total_minutes * 2)) * 100).toFixed(2) : "0.00";
                                        }
                                    }
                                    return (
                                        <td key={d.month} className="border border-slate-200 px-0.5 py-1.5 text-center font-black text-blue-600 tracking-tighter">
                                            {displayPct}%
                                        </td>
                                    );
                                })}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

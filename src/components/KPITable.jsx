
import React from 'react';
import { KPI_DATA_2026 } from '../services/kpiData';

export default function KPITable() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{KPI_DATA_2026.metadata.company}</h2>
                        <h1 className="text-4xl font-black text-blue-600 mt-1 uppercase tracking-tight">KEY PERFORMANCE INDICATOR</h1>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</p>
                        <p className="font-bold text-slate-700">{KPI_DATA_2026.metadata.department}</p>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Periode</p>
                            <p className="font-bold text-slate-700">{KPI_DATA_2026.metadata.period}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-800 text-white font-black uppercase tracking-widest text-[9px]">
                        <tr>
                            <th className="px-3 py-1.5 text-[10px] uppercase border-r border-white/10 row-span-2">No</th>
                            <th className="px-3 py-1.5 text-[10px] uppercase border-r border-white/10">KPI Category</th>
                            <th className="px-3 py-1.5 text-[10px] uppercase border-r border-white/10">Description</th>
                            <th className="px-3 py-1.5 text-[10px] uppercase border-r border-white/10 text-center">Measure</th>
                            <th className="px-3 py-1.5 text-[10px] uppercase border-r border-white/10 text-center">Target 2025</th>
                            <th className="px-3 py-1.5 text-[10px] uppercase border-r border-white/10 text-center">Achieve 2025</th>
                            <th className="px-3 py-1.5 text-[10px] uppercase border-r border-white/10 text-center">Target 2026</th>
                            <th className="px-2 py-4 border-r border-white/10 text-center" uppercase tracking-widest>P/A</th>
                            {months.map(m => (
                                <th key={m} className="px-2 py-4 border-r border-white/10 text-center" uppercase tracking-widest>{m}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {KPI_DATA_2026.sections.map((section, sIdx) => (
                            <React.Fragment key={section.id}>
                                {section.metrics.map((metric, mIdx) => (
                                    <React.Fragment key={metric.id}>
                                        {/* Plan Row */}
                                        <tr className="border-b border-slate-200 group hover:bg-blue-50/30 transition-colors">
                                            {mIdx === 0 && (
                                                <td rowSpan={section.metrics.length * 2} className="px-3 py-1.5 text-[11px] border-r border-slate-200 font-black text-slate-400 text-center bg-slate-50/50">
                                                    {section.id}
                                                </td>
                                            )}
                                            {mIdx === 0 && (
                                                <td rowSpan={section.metrics.length * 2} className="px-3 py-1.5 text-[11px] border-r border-slate-200 font-black text-slate-800 bg-slate-50/30">
                                                    {section.title}
                                                </td>
                                            )}
                                            <td className="px-3 py-1.5 text-[11px] border-r border-slate-200 font-bold text-slate-700">
                                                {metric.name}
                                                <p className="text-[10px] font-medium text-slate-400 mt-1">{metric.description}</p>
                                            </td>
                                            <td className="px-3 py-1.5 text-[11px] border-r border-slate-200 text-center font-bold text-slate-500 whitespace-nowrap">{metric.measurements}</td>
                                            <td className="px-3 py-1.5 text-[11px] border-r border-slate-200 text-center font-bold text-slate-600">{metric.target2025}</td>
                                            <td className="px-3 py-1.5 text-[11px] border-r border-slate-200 text-center font-bold text-slate-600">{metric.achievement2025}</td>
                                            <td className="px-3 py-1.5 text-[11px] border-r border-slate-200 text-center font-black text-blue-600 bg-blue-50/20">{metric.target2026}</td>
                                            <td className="px-2 py-4 border-r border-slate-200 text-center font-black text-slate-400 bg-slate-50">P</td>
                                            {months.map(m => (
                                                <td key={`${m}-p`} className="px-2 py-4 border-r border-slate-100 text-center font-bold text-slate-400 italic bg-slate-50/20">
                                                    {metric.monthly[m.toLowerCase()].p}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Achievement Row */}
                                        <tr className="border-b border-slate-200 hover:bg-green-50/30 transition-colors">
                                            <td className="px-3 py-1.5 border-r border-slate-200 italic text-slate-400 text-[10px]">Actual Performance</td>
                                            <td className="px-3 py-1.5 border-r border-slate-200 text-[11px]"></td>
                                            <td className="px-3 py-1.5 border-r border-slate-200 text-center"></td>
                                            <td className="px-3 py-1.5 border-r border-slate-200 text-center"></td>
                                            <td className="px-3 py-1.5 border-r border-slate-200 text-center"></td>
                                            <td className="px-2 py-2 border-r border-slate-200 text-center font-black text-green-600 bg-green-50/50">A</td>
                                            {months.map(m => {
                                                const val = metric.monthly[m.toLowerCase()].a;
                                                const isZero = val === "0" || val === "0%";
                                                return (
                                                    <td key={`${m}-a`} className={`px-2 py-2 border-r border-slate-100 text-center font-black ${isZero ? 'text-slate-200' : 'text-green-600 bg-green-50/30'}`}>
                                                        {val}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-10 py-6 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex justify-between items-center">
                <p>© 2026 {KPI_DATA_2026.metadata.company} - Infrastructure Governance Report</p>
                <div className="flex gap-4">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Planned Target</span>
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Actual Achievement</span>
                </div>
            </div>
        </div>
    );
}

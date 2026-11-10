import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Save, Users, Award, BookOpen, AlertCircle, Search, Filter } from 'lucide-react';

export default function SkillMatrix() {
    const [employees, setEmployees] = useState([
        { id: 1, name: 'Mulyana', role: 'IT Support', skills: { hardware: 4, network: 3, server: 2, software: 4, softskill: 3 }, lastUpdate: '2026-09-01' },
        { id: 2, name: 'Fahri', role: 'IT Programmer', skills: { hardware: 2, network: 2, server: 3, software: 4, softskill: 3 }, lastUpdate: '2026-09-05' },
        { id: 3, name: 'Anggit', role: 'IT Infrastructure', skills: { hardware: 4, network: 4, server: 4, software: 2, softskill: 4 }, lastUpdate: '2026-08-15' },
    ]);
    const [isApproved, setIsApproved] = useState(false);
    const [approvedBy, setApprovedBy] = useState('');
    const [approvedAt, setApprovedAt] = useState('');

    const skillLevels = {
        1: { label: 'Novice', color: 'bg-slate-200 text-slate-600' },
        2: { label: 'Intermediate', color: 'bg-blue-100 text-blue-700' },
        3: { label: 'Advanced', color: 'bg-indigo-100 text-indigo-700' },
        4: { label: 'Expert', color: 'bg-emerald-100 text-emerald-700' }
    };

    const handleApprove = () => {
        setIsApproved(true);
        setApprovedBy('Manager ICT');
        setApprovedAt(new Date().toLocaleString());
        alert('Skill Matrix approved successfully!');
    };

    return (
        <div className="p-4 md:p-5 space-y-3 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Award className="text-indigo-600" /> ICT Skill Matrix
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and approve technical competencies for the ICT Department.</p>
                </div>
                <div className="flex items-center gap-3">
                    {isApproved ? (
                        <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm font-bold">
                            <CheckCircle size={16} /> Approved by {approvedBy} on {approvedAt}
                        </div>
                    ) : (
                        <button 
                            onClick={handleApprove}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all text-sm font-bold flex items-center gap-2"
                        >
                            <Shield size={16} /> Approve Matrix
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-slate-700 flex items-center gap-2">
                        <Users size={18} /> Team Competencies
                    </h2>
                    <div className="flex gap-2 text-xs">
                        {Object.entries(skillLevels).map(([level, info]) => (
                            <span key={level} className={`px-2 py-1 rounded-md ${info.color} font-medium`}>
                                {level} - {info.label}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100/50 text-slate-600 uppercase tracking-widest">
                            <tr>
                                <th className="p-4 font-bold border-b border-slate-200 text-[10px] uppercase tracking-widest">Employee</th>
                                <th className="p-4 font-bold border-b border-slate-200 text-center" uppercase tracking-widest>Hardware & Ops</th>
                                <th className="p-4 font-bold border-b border-slate-200 text-center" uppercase tracking-widest>Network</th>
                                <th className="p-4 font-bold border-b border-slate-200 text-center" uppercase tracking-widest>Server & Security</th>
                                <th className="p-4 font-bold border-b border-slate-200 text-center" uppercase tracking-widest>Software / Dev</th>
                                <th className="p-4 font-bold border-b border-slate-200 text-center" uppercase tracking-widest>Soft Skills</th>
                                <th className="p-4 font-bold border-b border-slate-200 text-right" uppercase tracking-widest>Last Update</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-[11px]">
                                        <div className="font-bold text-slate-900">{emp.name}</div>
                                        <div className="text-xs text-slate-500">{emp.role}</div>
                                    </td>
                                    {Object.entries(emp.skills).map(([key, value]) => (
                                        <td key={key} className="p-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${skillLevels[value].color}`}>
                                                {value}
                                            </span>
                                        </td>
                                    ))}
                                    <td className="p-4 text-right text-slate-500 text-[11px] font-medium">
                                        {emp.lastUpdate}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">ISO 9001:2015 Compliance Note (Clause 7.2)</p>
                    <p>The skill matrix must be reviewed and approved by the Department Head at least once a year or whenever there are significant changes in personnel or technology requirements.</p>
                </div>
            </div>
        </div>
    );
}

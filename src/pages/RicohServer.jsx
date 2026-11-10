import React, { useState, useEffect } from 'react';
import { Printer, Settings, BarChart2, Shield, FileText, ExternalLink, Sparkles, Activity } from 'lucide-react';
import RicohDashboard from './ricoh/Dashboard';
import RicohDevices from './ricoh/Devices';
import RicohQuotas from './ricoh/QuotaManagement';
import RicohSettings from './ricoh/Settings';
import RicohJobHistory from './ricoh/JobHistory';

export default function RicohServer() {
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ricoh_active_tab') || 'quotas');

    useEffect(() => {
        localStorage.setItem('ricoh_active_tab', activeTab);
    }, [activeTab]);

    const tabs = [
        { id: 'quotas', label: 'Quota Management', icon: Shield, badge: 'Active' },
        { id: 'dashboard', label: 'Fleet Overview', icon: BarChart2 },
        { id: 'jobs', label: 'Print Job Logs', icon: FileText },
        { id: 'devices', label: 'Printers & Hardware', icon: Printer },
        { id: 'settings', label: 'System Configuration', icon: Settings },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
            {/* Top Navigation & Brand Header */}
            <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 py-4 transition-all">
                <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Brand & Status */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                            <Printer size={22} className="stroke-[2.2]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-lg font-black text-slate-900 tracking-tight font-heading">
                                    Ricoh Print Central
                                </h1>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live PG Engine
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                Unified Print Quotas, Accounting & Device Management
                            </p>
                        </div>
                    </div>

                    {/* Actions & Public View Link */}
                    <div className="flex items-center gap-3">
                        <a
                            href="/public/dashboard/view/ricoh"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100/80 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all shadow-sm group"
                        >
                            <Sparkles size={14} className="text-amber-500 group-hover:scale-110 transition-transform" />
                            <span>Public Display Kiosk</span>
                            <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-500" />
                        </a>
                    </div>
                </div>

                {/* Tab Switcher Pills */}
                <div className="max-w-[1720px] mx-auto mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all duration-200 whitespace-nowrap ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-600 scale-[1.02]'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                                }`}
                            >
                                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                                <span>{tab.label}</span>
                                {tab.badge && !isActive && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-blue-50 text-blue-600 border border-blue-200">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Main Content Workspace */}
            <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 lg:p-8">
                <div className="transition-all duration-300">
                    { activeTab === 'quotas' && <RicohQuotas /> }
                    { activeTab === 'dashboard' && <RicohDashboard /> }
                    { activeTab === 'jobs' && <RicohJobHistory /> }
                    { activeTab === 'devices' && <RicohDevices /> }
                    { activeTab === 'settings' && <RicohSettings setActiveTab={setActiveTab} /> }
                </div>
            </main>
        </div>
    );
}

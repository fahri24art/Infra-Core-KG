import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Settings, Shield, Globe, Building,
    UserCheck, Layers, ChevronRight, Activity,
    Terminal, Lock, Database, HardDrive, Cpu, Mail, FolderOpen, ClipboardList,
    Key, Package, FileText, BookOpen, Book
} from 'lucide-react';
import logo from '../assets/Logo_TCF_Sec_Processed.png';

export default function Admin() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: 0, departments: 0, divisions: 0 });
    const [loading, setLoading] = useState(true);
    const [telemetry, setTelemetry] = useState(null);

    useEffect(() => {
        fetchAdminStats();
        fetchTelemetry();
        const interval = setInterval(fetchTelemetry, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAdminStats = async () => {
        try {
            const [uRes, dRes, dvRes] = await Promise.all([
                fetch('/api/network/users'),
                fetch('/api/network/departments'),
                fetch('/api/network/divisions')
            ]);
            const users = await uRes.json();
            const depts = await dRes.json();
            const divs = await dvRes.json();
            setStats({
                users: Array.isArray(users) ? users.length : 0,
                departments: Array.isArray(depts) ? depts.length : 0,
                divisions: Array.isArray(divs) ? divs.length : 0
            });
        } catch (err) {
            console.error("Failed to load admin stats", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTelemetry = async () => {
        try {
            const res = await fetch('/api/network/telemetry');
            const data = await res.json();
            setTelemetry(data);
        } catch (err) {
            console.error("Failed to fetch telemetry", err);
        }
    };

    const menus = [
        {
            title: 'User Management',
            icon: UserCheck,
            desc: 'Configure accounts, roles, and security policies.',
            color: 'from-blue-600 to-blue-700',
            path: '/ict/admin/users',
            badge: stats.users
        },
        {
            title: 'Database Asset',
            icon: Database,
            desc: 'Live Excel-like Data Grid synced with Fleet Assets.',
            color: 'from-teal-500 to-emerald-600',
            path: '/ict/admin/database-asset'
        },
        {
            title: 'Department Mapping',
            icon: Building,
            desc: 'Organize assets by organizational structure.',
            color: 'from-blue-500 to-blue-600',
            path: '/ict/admin/departments',
            badge: stats.departments
        },
        {
            title: 'Division Hierarchy',
            icon: Layers,
            desc: 'Manage specific sub-groups and team clusters.',
            color: 'from-slate-800 to-slate-900',
            path: '/ict/admin/divisions',
            badge: stats.divisions
        },

        {
            title: 'System Settings',
            icon: Settings,
            desc: 'Global application parameters and API keys.',
            color: 'from-slate-900 to-black',
            path: '/ict/admin/settings'
        },

        {
            title: 'Consumables & Stock',
            icon: Package,
            desc: 'Manage spare parts, toners, and accessories.',
            color: 'from-emerald-500 to-teal-600',
            path: '/ict/glpi/consumables'
        },

        {
            title: 'Knowledge Base',
            icon: BookOpen,
            desc: 'FAQ and troubleshooting guides for users.',
            color: 'from-blue-400 to-cyan-500',
            path: '/ict/glpi/knowledge-base'
        }
    ];

    return (
        <div className="space-y-10 pb-20">
            {/* Header Hub Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-slate-200">
                        <Shield size={36} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Admin <span className="text-blue-600">Gateway</span></h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 px-1">System Core Control & Logic Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-[#E1E1E1] shadow-sm">
                    <div className="flex items-center gap-3 px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Root Access Verified</span>
                    </div>
                </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {menus.map((menu, idx) => (
                    <div
                        key={idx}
                        onClick={() => navigate(menu.path)}
                        className="card-unifi p-5 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group active:scale-[0.98] relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${menu.color} flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110`}>
                                    <menu.icon size={22} />
                                </div>
                                {menu.badge !== undefined && (
                                    <span className="text-xs font-black bg-slate-100 px-2.5 py-1 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {loading ? '...' : menu.badge}
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                    {menu.title}
                                </h3>
                                <p className="text-slate-500 text-xs mt-1.5 font-medium leading-relaxed mb-4">{menu.desc}</p>
                            </div>

                            <div className="pt-3 border-t border-[#F0F0F0] flex items-center justify-between mt-auto">
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Access Console</span>
                                <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* System Integrity & Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 card-unifi p-10">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                                <Database size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Infrastructure Matrix</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Core System Telemetry</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SystemStatusItem icon={Globe} label="Core API Gateway" value="v7.04-STABLE" status="Operational" type="success" />
                        <SystemStatusItem icon={Shield} label="Identity Provider" value="OAuth2 / Federated" status="Active" type="success" />
                        <SystemStatusItem icon={HardDrive} label="Persistent Storage" value="PostgreSQL Master" status="Syncing" type="info" />
                        <SystemStatusItem icon={Activity} label="Network Bridge" value="Port 8000" status="Healthy" type="info" />
                    </div>
                </div>

                <div className="lg:col-span-4 card-unifi p-10 flex flex-col justify-center text-center space-y-5 bg-slate-900 text-white">
                    <div className="w-20 h-20 bg-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10">
                        <Lock className="text-blue-400" size={32} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black tracking-tight">Security Protocol</h4>
                        <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed">All administrative actions are logged and encrypted using AES-256 standards.</p>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98]">
                        Access Audit Registry
                    </button>
                </div>
            </div>

            {/* Server Telemetry Monitoring */}
            <div className="card-unifi p-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Live Telemetry</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Server 3 & Server 66 Resource Monitor</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Server 66 */}
                    <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-5 hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-black text-slate-900">APP HOST (192.168.1.66)</h4>
                            <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black tracking-widest">ONLINE</div>
                        </div>
                        <div className="space-y-3">
                            <TelemetryRow icon={Cpu} label="CPU Core" value={telemetry?.s66?.cpu || 'Loading...'} />
                            <TelemetryRow icon={Database} label="Memory Usage" value={telemetry?.s66?.memory || 'Loading...'} />
                            <TelemetryRow icon={HardDrive} label="OS Base" value={telemetry?.s66?.os || 'Loading...'} />
                        </div>
                    </div>

                    {/* Server 3 */}
                    <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-5 hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-black text-slate-900">INFRA GUARD (192.168.1.3)</h4>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${telemetry?.s3?.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {telemetry?.s3?.status === 'online' ? 'ONLINE' : (telemetry?.s3?.status || 'LOADING...').toUpperCase()}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <TelemetryRow icon={Cpu} label="CPU Usage" value={telemetry?.s3?.cpu || 'Loading...'} />
                            <TelemetryRow icon={Database} label="Memory Usage" value={telemetry?.s3?.memory || 'Loading...'} />
                            <TelemetryRow icon={HardDrive} label="Storage (/)" value={telemetry?.s3?.storage || 'Loading...'} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SystemStatusItem({ icon: Icon, label, value, status, type }) {
    return (
        <div className="bg-[#F8F9FB] border border-[#E1E1E1] p-4 rounded-3xl flex items-center justify-between group hover:border-blue-200 transition-all">
            <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 border border-[#E1E1E1] shadow-sm group-hover:text-blue-600 group-hover:border-blue-600/30 transition-all">
                    <Icon size={24} />
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm font-black text-slate-900">{value}</p>
                </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
                {status}
            </div>
        </div>
    );
}

function TelemetryRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Icon size={18} />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-sm font-black text-slate-800">{value}</span>
        </div>
    );
}

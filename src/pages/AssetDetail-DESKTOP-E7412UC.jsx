import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Save, ArrowLeft, Trash2, Monitor, Activity, Shield,
    Cpu, HardDrive, Package, Clock, User, MapPin,
    Info, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';
import AssetLabel from '../components/AssetLabel';

export default function AssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [form, setForm] = useState({
        name: '',
        category: 'Computer',
        status: 'Active',
        serial_number: '',
        inventory_number: '',
        location: '',
        contact: '',
        manufacturer: '',
        model: '',
        specs: '',
        user_id: ''
    });

    const [users, setUsers] = useState([]);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [activeTab, setActiveTab] = useState('telemetry');
    const [loading, setLoading] = useState(true);
    const [showJsonEditor, setShowJsonEditor] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    const fetchInitialData = async () => {
        setLoading(true);
        await fetchUsers();
        if (!isNew) {
            await fetchAsset();
        } else {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch('/api/network/users');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    const fetchAsset = async () => {
        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch(`/api/network/assets/${id}`);
            const data = await res.json();

            let formattedSpecs = data.specs;
            if (typeof data.specs === 'object' && data.specs !== null) {
                formattedSpecs = JSON.stringify(data.specs, null, 2);
            }

            setForm({
                ...data,
                specs: formattedSpecs || '',
                user_id: data.user_id || ''
            });

            if (data.id) {
                fetchHistory(data.id);
            }
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch asset details', err);
            setLoading(false);
        }
    };

    const fetchHistory = async (assetId) => {
        try {
            setLoadingHistory(true);
            // UPDATED PATH: added /network prefix
            const res = await fetch(`/api/network/agents/${assetId}/history`);
            if (res.ok) {
                const data = await res.json();
                setHistoryLogs(data);
            }
        } catch (err) {
            console.error('Failed to fetch history', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        // UPDATED PATHS: added /network prefix
        const url = isNew ? '/api/network/assets' : `/api/network/assets/${id}`;
        const method = isNew ? 'POST' : 'PUT';

        let specsJson = null;
        try {
            if (form.specs) specsJson = JSON.parse(form.specs);
        } catch (e) {
            alert('Invalid JSON in Technical Specs. Please check formatting.');
            return;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, specs: specsJson })
            });
            if (res.ok) {
                navigate('/ict/assets');
            } else {
                alert('Commit failed. Server rejected the configuration.');
            }
        } catch (err) {
            console.error('Error saving asset', err);
        }
    };

    if (loading && !isNew) return (
        <div className="h-screen flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Syncing Asset Node...</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen font-sans p-4 md:p-10 space-y-10 animate-in fade-in duration-500 text-slate-100">
            {/* Header / Command Bar */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-6">
                    <button onClick={() => navigate('/ict/assets')} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-blue-400 shadow-sm transition-all active:scale-90">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <h1 className="text-3xl font-black text-white tracking-tight">
                                {isNew ? 'Initialize New Node' : form.name}
                            </h1>
                            {!isNew && (
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${form.agent_status === 'Online' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                    {form.agent_status || 'Disconnected'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <Package size={14} className="mr-2" /> {form.category} &bull; {form.inventory_number || 'SYSTEM-RESERVED'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {form.uuid && form.agent_status === 'Online' && (
                        <button
                            onClick={() => window.open(`/remote/${form.uuid}`, '_blank')}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center active:scale-95"
                        >
                            <Monitor size={18} className="mr-2" /> Remote Operator
                        </button>
                    )}
                    {!isNew && (
                        <button className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                            <Trash2 size={24} />
                        </button>
                    )}
                    <button onClick={handleSubmit} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center active:scale-95">
                        <Save size={18} className="mr-2" /> Commit Changes
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* Left Column: Management & Telemetry */}
                <div className="lg:col-span-2 space-y-10">

                    {/* Live Status Gauges (Only if Online) */}
                    {!isNew && form.agent_status === 'Online' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/5 backdrop-blur-xl p-4 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col justify-between">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CPU Compute</div>
                                    <Cpu size={18} className="text-blue-500" />
                                </div>
                                <div className="text-4xl font-black text-white tracking-tighter mb-4">{form.cpu_usage || 0}<span className="text-lg opacity-30">%</span></div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${form.cpu_usage || 0}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-white/5 backdrop-blur-xl p-4 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col justify-between">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Memory Matrix</div>
                                    <Activity size={18} className="text-emerald-500" />
                                </div>
                                <div className="text-4xl font-black text-white tracking-tighter mb-4">{form.ram_usage || 0}<span className="text-lg opacity-30">%</span></div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${form.ram_usage || 0}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-white/5 backdrop-blur-xl p-4 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col justify-between">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Disk Integrity</div>
                                    <HardDrive size={18} className="text-orange-500" />
                                </div>
                                <div className="text-4xl font-black text-white tracking-tighter mb-4">{form.disk_usage || 0}<span className="text-lg opacity-30">%</span></div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${form.disk_usage || 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Node Configuration Form */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden">
                        <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center">
                                <Info size={20} className="mr-3 text-blue-500" /> Identity & Logistics
                            </h3>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Node ID: {id}</div>
                        </div>

                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Nomenclature</label>
                                <input name="name" value={form.name} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-white placeholder-white/30" placeholder="Human-readable name" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Inventory Tag (QR)</label>
                                <input name="inventory_number" value={form.inventory_number} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-white placeholder-white/30" placeholder="TCF-IT-XXXXXX" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fleet Category</label>
                                <select name="category" value={form.category} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-white appearance-none">
                                    <option value="Computer" className="bg-slate-900">Computer</option>
                                    <option value="Printer" className="bg-slate-900">Printer</option>
                                    <option value="Network" className="bg-slate-900">Network</option>
                                    <option value="Server" className="bg-slate-900">Server</option>
                                    <option value="Other" className="bg-slate-900">Other Assets</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Status</label>
                                <select name="status" value={form.status} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-blue-400 appearance-none">
                                    <option value="Active" className="bg-slate-900">Active Duty</option>
                                    <option value="In Repair" className="bg-slate-900">In-Service (Maintenance)</option>
                                    <option value="In Stock" className="bg-slate-900">Standby (Inventory)</option>
                                    <option value="Disposed" className="bg-slate-900">Decommissioned</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Deployment Location</label>
                                <input name="location" value={form.location} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-white placeholder-white/30" placeholder="Building, Floor, Room" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Custodian / Assigned User</label>
                                <select name="user_id" value={form.user_id} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-white appearance-none">
                                    <option value="" className="bg-slate-900">Unassigned</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Serial Verification (OEM)</label>
                                <input name="serial_number" value={form.serial_number} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-white placeholder-white/30" placeholder="Manufacturer Serial Number" />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hardware Blueprint</label>
                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowJsonEditor(!showJsonEditor)}
                                            className="text-[8px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-tighter hover:bg-blue-100 transition-all"
                                        >
                                            {showJsonEditor ? 'View Grid' : 'Raw JSON'}
                                        </button>
                                    </div>
                                </div>

                                {showJsonEditor ? (
                                    <textarea
                                        name="specs"
                                        value={form.specs}
                                        onChange={handleChange}
                                        rows={8}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-6 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-xs text-blue-400 shadow-inner"
                                        placeholder='{"cpu": "...", "ram": "...", "storage": [...]}'
                                    />
                                ) : (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid grid-cols-2 gap-4">
                                        {(() => {
                                            let specs = {};
                                            try { specs = form.specs ? JSON.parse(form.specs) : {}; } catch (e) { specs = {}; }

                                            return (
                                                <>
                                                    <div className="col-span-2 md:col-span-1">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Operating System</div>
                                                        <div className="text-xs font-bold text-white truncate" title={specs.os}>{specs.os || 'N/A'}</div>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Processor (CPU)</div>
                                                        <div className="text-xs font-bold text-white truncate" title={specs.cpu}>{specs.cpu || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Memory (RAM)</div>
                                                        <div className="text-xs font-bold text-white">{specs.ram || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">IP Address</div>
                                                        <div className="text-xs font-bold text-white">{specs.ip || 'N/A'}</div>
                                                    </div>
                                                    <div className="col-span-2 border-t border-white/10 my-2"></div>
                                                    <div className="col-span-2 md:col-span-1">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Technician</div>
                                                        <div className="text-xs font-bold text-white">{specs.technician || 'Unassigned'}</div>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Detailed Location</div>
                                                        <div className="text-xs font-bold text-white">{specs.detailed_location || 'Unknown'}</div>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Department</div>
                                                        <div className="text-xs font-bold text-white">{specs.department || 'N/A'}</div>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Division (Entity)</div>
                                                        <div className="text-xs font-bold text-white">{specs.division || 'N/A'}</div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">UUID</div>
                                                        <div className="text-[10px] font-mono text-slate-500 break-all">{specs.uuid || 'N/A'}</div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Update Source</div>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-800">
                                                            {specs.last_update_source || 'Manual Input'}
                                                        </span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Insights & Media */}
                <div className="space-y-10">

                    {/* Compliance Profile */}
                    {!isNew && (
                        <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-5 text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 opacity-[0.03] rounded-bl-full group-hover:scale-150 transition-transform"></div>
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-blue-500/5">
                                    <Shield size={40} className="text-blue-500" />
                                </div>
                                <h3 className="text-xl font-black text-white mb-1">Node Integrity</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Security Compliance Profile</p>

                                <div className="flex justify-center space-x-2 mb-8">
                                    {['Firewall', 'Antivirus', 'Encrypted', 'Agent'].map((check, i) => (
                                        <div key={i} title={check} className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center border border-emerald-500/20">
                                            <Save size={14} />
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Compliance Score</div>
                                    <div className="text-5xl font-black text-blue-500 tracking-tighter">{form.compliance_score || 100}<span className="text-xl opacity-30">%</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* QR Asset Label (Printable) */}
                    {!isNew && (
                        <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden">
                            <div className="p-5 bg-white/5 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center">
                                    <Package size={16} className="mr-3 text-orange-500" /> Print Identity
                                </h3>
                                <button className="p-2 text-slate-400 hover:text-blue-400 transition-all"><RefreshCw size={18} /></button>
                            </div>
                            <div className="p-5 flex justify-center bg-transparent">
                                <div className="scale-90 origin-center transition-transform hover:scale-100">
                                    <AssetLabel asset={{ ...form, id }} />
                                </div>
                            </div>
                            <div className="px-8 pb-8">
                                <button className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center shadow-2xl active:scale-95">
                                    <Save size={16} className="mr-3" /> Execute Thermal Print
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Agent Activity Log */}
                    {!isNew && (
                        <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden">
                            <div className="p-5 bg-white/5 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center">
                                    <Clock size={16} className="mr-3 text-indigo-400" /> Node Activity
                                </h3>
                                <button onClick={() => setShowHistory(!showHistory)} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline">Full Log</button>
                            </div>
                            <div className="p-4 space-y-3">
                                {loadingHistory ? (
                                    <div className="p-10 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Accessing History...</div>
                                ) : historyLogs.slice(0, 4).map((log, i) => (
                                    <div key={i} className="flex items-start space-x-4 p-4 hover:bg-white/5 rounded-2xl transition-all group">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 opacity-20 group-hover:opacity-100 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-black text-white truncate">{log.title || 'System Process'}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">{new Date(log.last_visit).toLocaleDateString()} &bull; {log.visit_count} occurrences</div>
                                        </div>
                                    </div>
                                ))}
                                {historyLogs.length === 0 && (
                                    <div className="p-10 text-center text-slate-300 font-bold italic text-sm">No activity recorded for this node</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Mobile Command Bar (Visible on small screens) */}
            <div className="fixed bottom-6 left-6 right-6 md:hidden z-50">
                <button onClick={handleSubmit} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-2xl shadow-blue-500/50 flex items-center justify-center uppercase tracking-[0.2em] text-xs">
                    <Save size={18} className="mr-3" /> Commit Changes
                </button>
            </div>
        </div>
    );
}

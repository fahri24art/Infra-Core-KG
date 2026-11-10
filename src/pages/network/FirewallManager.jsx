import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Shield, Shuffle, Globe, Plus, Trash2, Power, Eye, EyeOff } from 'lucide-react';

export default function FirewallManager() {
    const [activeTab, setActiveTab] = useState('filter');
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const tabs = [
        { id: 'filter', label: 'Filter Rules', icon: Shield },
        { id: 'nat', label: 'NAT', icon: Globe },
        { id: 'mangle', label: 'Mangle', icon: Shuffle },
    ];

    const fetchRules = async () => {
        setLoading(true);
        try {
            let res;
            try {
                res = await fetch(`/api/network/firewall/${activeTab}`);
            } catch {
                res = await fetch(`/api/network/firewall/${activeTab}`);
            }
            const data = await res.json();
            setRules(Array.isArray(data) ? data : data[activeTab] || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, [activeTab]);

    const handleAction = async (action, data = {}) => {
        setSaving(true);
        try {
            // type = filter, nat, mangle
            await fetch('/api/network/firewall', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: activeTab,
                    action, // add, remove, enable, disable
                    data
                })
            });
            fetchRules();
        } catch (e) {
            console.error("Action failed", e);
        } finally {
            setSaving(false);
        }
    };

    const toggleRule = (rule) => {
        const action = rule.disabled === 'true' ? 'enable' : 'disable';
        handleAction(action, { id: rule['.id'] });
    };

    const handleAddRule = async () => {
        const src = prompt("Enter Source Address (e.g. 192.168.1.5):");
        if (!src) return;

        await handleAction('add', {
            chain: activeTab === 'filter' ? 'forward' : 'srcnat',
            action: activeTab === 'filter' ? 'drop' : 'masquerade',
            'src-address': src,
            comment: 'Added via Web UI'
        });
    };

    return (
        <Card className="min-h-[500px] p-0 bg-white shadow-xl shadow-slate-100/50 border border-slate-100 rounded-xl md:rounded-2xl overflow-hidden">
            {/* Header & Tabs */}
            <div className="px-4 py-3 md:px-5 md:py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3 bg-slate-50/20">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 md:px-4 py-1 rounded-md text-[11px] font-black transition-all ${activeTab === tab.id
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                        >
                            <tab.icon size={12} />
                            <span>{tab.label.toUpperCase()}</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleAddRule}
                    className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg font-black text-[11px] uppercase tracking-wider hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                >
                    <Plus size={14} />
                    <span>Deploy Rule</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-3 py-2 w-10 text-[10px] uppercase tracking-widest">ID</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-widest">Chain</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-widest">Policy</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-widest">Source</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-widest">Dest</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-widest">Proto</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-widest">Port</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-widest">Notes</th>
                                <th className="px-3 py-2 text-right" uppercase tracking-widest>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {rules.length === 0 && (
                                <tr><td colSpan="9" className="p-5 text-center text-slate-500 font-medium">No rules found in this chain.</td></tr>
                            )}
                            {rules.map((rule, idx) => (
                                <tr key={rule['.id']} className={`group hover:bg-slate-50/50 transition-colors ${rule.disabled === 'true' ? 'opacity-40 grayscale' : ''}`}>
                                    <td className="px-3 py-1.5 font-mono text-slate-700 text-[10px]">{idx}</td>
                                    <td className="px-3 py-1.5 font-black text-slate-600 text-[11px] uppercase">{rule.chain}</td>
                                    <td className="px-3 py-1.5 text-[11px]">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${rule.action === 'accept' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            rule.action === 'drop' ? 'bg-red-50 text-red-600 border-red-100' :
                                                rule.action === 'masquerade' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-slate-50 text-slate-500 border-slate-100'
                                            }`}>
                                            {rule.action}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-500 text-[11px] font-medium">{rule['src-address'] || '0.0.0.0/0'}</td>
                                    <td className="px-3 py-1.5 text-slate-500 text-[11px] font-medium">{rule['dst-address'] || '0.0.0.0/0'}</td>
                                    <td className="px-3 py-1.5 font-black text-slate-500 text-[10px] uppercase">{rule.protocol || 'any'}</td>
                                    <td className="px-3 py-1.5 text-slate-500 text-[11px] font-medium">{rule['dst-port'] || rule['src-port'] || 'any'}</td>
                                    <td className="px-3 py-1.5 text-slate-500 italic text-[10px] font-medium truncate max-w-[150px]">{rule.comment || '-'}</td>
                                    <td className="px-3 py-1.5 text-right">
                                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => toggleRule(rule)}
                                                className={`p-1.5 rounded ${rule.disabled === 'true' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:text-slate-600 hover:bg-slate-200'}`}
                                                title={rule.disabled === 'true' ? "Enable" : "Disable"}
                                            >
                                                {rule.disabled === 'true' ? <EyeOff size={11} /> : <Eye size={11} />}
                                            </button>
                                            <button
                                                onClick={() => handleAction('remove', { id: rule['.id'] })}
                                                className="p-1.5 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition"
                                                title="Delete Rule"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

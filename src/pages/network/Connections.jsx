import React, { useState, useEffect } from 'react';
import { Router, Wifi, Zap, Activity, Save, RefreshCw, CheckCircle, XCircle, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export default function Connections() {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(null);
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            let res;
            const org = JSON.parse(sessionStorage.getItem('user') || '{}')?.organization || 'TCF-SG';
            try {
                res = await fetch(`/api/system/config?organization=${org}`);
            } catch {
                res = await fetch(`/api/system/config?organization=${org}`);
            }
            if (res.ok) {
                const data = await res.json();
                setConfigs(data || {});
            }
        } catch (error) {
            console.error("Failed to load configs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setConfigs(prev => ({ ...prev, [key]: value }));
    };

    const getCategory = (key) => {
        if (key.startsWith('mikrotik')) return 'mikrotik';
        if (key.startsWith('unifi')) return 'unifi';
        if (key.startsWith('power_asset')) return 'power_asset';
        if (key.startsWith('agent')) return 'agent';
        if (key.startsWith('safety')) return 'safety';
        return 'general';
    };

    const handleSave = async () => {
        const payload = Object.keys(configs).map(key => ({
            key,
            value: configs[key],
            category: getCategory(key),
            is_encrypted: key.includes('password') || key.includes('secret') || key.includes('key')
        }));

        try {
            const org = JSON.parse(sessionStorage.getItem('user') || '{}')?.organization || 'TCF-SG';
            await fetch(`/api/system/config?organization=${org}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert("Connection settings saved!");
        } catch (e) {
            alert("Save failed: " + e.message);
        }
    };

    const handleTest = async (type) => {
        setTesting(type);
        setTestResult(null);
        try {
            const org = JSON.parse(sessionStorage.getItem('user') || '{}')?.organization || 'TCF-SG';
            const res = await fetch(`/api/system/test/connection?organization=${org}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, config: configs })
            });
            const data = await res.json();
            setTestResult({
                type: data.status === 'success' ? 'success' : 'error',
                message: data.message
            });
        } catch (e) {
            setTestResult({ type: 'error', message: "Test failed: " + e.message });
        } finally {
            setTesting(null);
        }
    };

    if (loading) return <div className="text-center p-20 text-slate-500">Loading connection settings...</div>;

    return (
        <div className="space-y-3 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white0 backdrop-blur-sm p-4 rounded-xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">Infrastructure Connections</h2>
                    <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Configure credentials for secure monitoring & automation</p>
                </div>
                <button
                    onClick={handleSave}
                    className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-black text-[11px] uppercase tracking-wider hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
                >
                    <Save size={14} />
                    <span>Save Configuration</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConfigCard
                    title="Mikrotik RouterOS"
                    icon={Router}
                    color="text-purple-600"
                    bg="bg-purple-50"
                    onTest={() => handleTest('mikrotik')}
                    testing={testing === 'mikrotik'}
                >
                    <Input label="Gateway Host / IP" value={configs['mikrotik_host']} onChange={(v) => handleChange('mikrotik_host', v)} placeholder="192.168.88.1" />
                    <Input label="API Port" value={configs['mikrotik_port']} onChange={(v) => handleChange('mikrotik_port', v)} placeholder="8728" />
                    <Input label="API Username" value={configs['mikrotik_user']} onChange={(v) => handleChange('mikrotik_user', v)} placeholder="admin" />
                    <Input label="API Password" type="password" value={configs['mikrotik_password']} onChange={(v) => handleChange('mikrotik_password', v)} placeholder="••••••" />
                </ConfigCard>

                <ConfigCard
                    title="Unifi Controller"
                    icon={Wifi}
                    color="text-blue-600"
                    bg="bg-blue-50"
                    onTest={() => handleTest('unifi')}
                    testing={testing === 'unifi'}
                >
                    <Input label="Controller URL" value={configs['unifi_url']} onChange={(v) => handleChange('unifi_url', v)} placeholder="https://192.168.1.2:8443" />
                    <Input label="Site ID" value={configs['unifi_site']} onChange={(v) => handleChange('unifi_site', v)} placeholder="default" />
                    <Input label="Username" value={configs['unifi_user']} onChange={(v) => handleChange('unifi_user', v)} placeholder="admin" />
                    <Input label="Password" type="password" value={configs['unifi_password']} onChange={(v) => handleChange('unifi_password', v)} placeholder="••••••" />
                </ConfigCard>

                <ConfigCard
                    title="Power Asset Integration"
                    icon={Zap}
                    color="text-amber-600"
                    bg="bg-amber-50"
                    onTest={() => handleTest('power_asset')}
                    testing={testing === 'power_asset'}
                >
                    <Input label="Application API URL" value={configs['power_asset_url']} onChange={(v) => handleChange('power_asset_url', v)} placeholder="http://192.168.1.67/api" />
                    <Input label="API Key / Token" type="password" value={configs['power_asset_key']} onChange={(v) => handleChange('power_asset_key', v)} placeholder="sk_live_..." />
                </ConfigCard>

                <ConfigCard
                    title="Agent Data Source"
                    icon={Activity}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    onTest={() => handleTest('agent')}
                    testing={testing === 'agent'}
                >
                    <Input label="Agent Collection Endpoint" value={configs['agent_endpoint']} onChange={(v) => handleChange('agent_endpoint', v)} placeholder="/api/agents/collect" />
                </ConfigCard>

                <ConfigCard
                    title="Safety Guardrails"
                    icon={ShieldAlert}
                    color="text-red-600"
                    bg="bg-red-50"
                >
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-3">
                        <p className="text-[9px] text-red-800 font-black uppercase flex items-center gap-1.5 tracking-tight">
                            <AlertTriangle size={12} /> Critical Protection
                        </p>
                        <p className="text-[9px] text-red-700/70 mt-1 font-medium italic overflow-hidden">IPs listed here are protected from automated block actions.</p>
                    </div>
                    <Input
                        label="Safety Whitelist IPs (Comma separated)"
                        value={configs['safety_whitelist_ips']}
                        onChange={(v) => handleChange('safety_whitelist_ips', v)}
                        placeholder="192.168.1.10, 10.0.0.5"
                    />
                </ConfigCard>
            </div>

            {testResult && (
                <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl border flex items-start gap-3 max-w-sm animate-in slide-in-from-bottom duration-300 ${testResult.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                    {testResult.type === 'success' ? <CheckCircle className="shrink-0 text-emerald-600" /> : <XCircle className="shrink-0 text-red-600" />}
                    <div className="flex-1">
                        <h4 className="font-bold text-sm">{testResult.type === 'success' ? 'Link established!' : 'Connection broken'}</h4>
                        <p className="text-xs mt-1 opacity-90">{testResult.message}</p>
                    </div>
                    <button onClick={() => setTestResult(null)} className="text-current opacity-50 hover:opacity-100"><XCircle size={14} /></button>
                </div>
            )}
        </div>
    );
}

function ConfigCard({ title, icon: Icon, children, color, bg, onTest, testing }) {
    return (
        <Card className="p-4 md:p-5 bg-white border border-slate-100 rounded-xl md:rounded-2xl shadow-md shadow-slate-100/30 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${bg} ${color}`}>
                        <Icon size={18} />
                    </div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h2>
                </div>
                {onTest && (
                    <button
                        onClick={onTest}
                        disabled={testing}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-slate-50 text-slate-500 border border-slate-100 rounded hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                    >
                        {testing ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        Test
                    </button>
                )}
            </div>
            <div className="space-y-3 flex-1">
                {children}
            </div>
        </Card>
    );
}

function Input({ label, type = "text", value, onChange, placeholder }) {
    return (
        <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</label>
            <input
                type={type}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-700"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}

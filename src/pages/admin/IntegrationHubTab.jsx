import React, { useState } from 'react';
import {
    Database, Server, CheckCircle2, XCircle, RefreshCw, Zap,
    Shield, Activity, ExternalLink, Key, Lock, Eye, EyeOff, Save,
    Globe, Terminal, Check, AlertTriangle, Cpu, Radio, Network
} from 'lucide-react';

export default function IntegrationHubTab({ settings, onChange, onSave, isSaving }) {
    // Local state for testing results
    const [testResults, setTestResults] = useState({});
    const [testingId, setTestingId] = useState(null);

    const infraServices = [
        {
            id: 'glpi_api',
            name: 'GLPI IT Asset Management API',
            desc: 'REST API GLPI Server 66 untuk inventaris PC, Printer, & Lisensi',
            host: '192.168.1.66',
            port: 80,
            urlKey: 'glpi_url',
            defaultUrl: 'http://192.168.1.66/glpi/apirest.php',
            icon: Server,
            color: 'text-indigo-600'
        },
        {
            id: 'adguard_dns',
            name: 'AdGuard Home DNS Shield',
            desc: 'DNS Filter, Malware & Phishing Blocker untuk Sadang & Karawang',
            host: '192.168.1.66',
            port: 3000,
            urlKey: 'adguard_url',
            defaultUrl: 'http://192.168.1.66:3000',
            icon: Shield,
            color: 'text-emerald-600'
        },
        {
            id: 'uptime_kuma',
            name: 'Uptime Kuma Health Hub',
            desc: 'Real-time Heartbeat & Network Uptime Monitoring Daemon',
            host: '192.168.1.66',
            port: 3001,
            urlKey: 'kuma_url',
            defaultUrl: 'http://192.168.1.66:3001',
            icon: Activity,
            color: 'text-rose-600'
        },
        {
            id: 'whatsapp_gateway',
            name: 'WhatsApp Bot Gateway Matrix',
            desc: 'Core Multi-Device WhatsApp Bot Dispatcher (Port 5002)',
            host: '192.168.1.66',
            port: 5002,
            urlKey: 'wa_gateway_url',
            defaultUrl: 'http://192.168.1.66:5002',
            icon: Radio,
            color: 'text-emerald-600'
        },
        {
            id: 'tailscale_headscale',
            name: 'Headscale VPN Mesh Controller',
            desc: 'WireGuard Interconnect Hub Sadang ↔ Karawang (Port 8080)',
            host: '192.168.1.66',
            port: 8080,
            urlKey: 'vpn_controller_url',
            defaultUrl: 'http://192.168.1.66:8080',
            icon: Network,
            color: 'text-cyan-600'
        }
    ];

    const currentServicesSettings = settings.services || {};

    // Live test TCP service port ping
    const testServicePing = async (service) => {
        setTestingId(service.id);
        try {
            const res = await fetch('/api/settings/test-ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host: service.host, port: service.port, timeoutMs: 3500 })
            });
            const data = await res.json();
            setTestResults(prev => ({
                ...prev,
                [service.id]: data
            }));
        } catch (err) {
            setTestResults(prev => ({
                ...prev,
                [service.id]: { success: false, error: err.message }
            }));
        } finally {
            setTestingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header / Intro */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                            <Zap size={28} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black tracking-tight">Pusat Konfigurasi & Integrasi Terpadu</h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Live Ops
                                </span>
                            </div>
                            <p className="text-slate-400 text-xs font-medium mt-1">
                                Kelola seluruh koneksi REST API, port mikroservice, dan verifikasi status realtime langsung tanpa skrip manual.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save size={16} />
                        <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Integrasi'}</span>
                    </button>
                </div>
            </div>

            {/* Section 2: Infrastructure & Security Endpoints */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                        <Server className="text-indigo-600" size={20} />
                        <h4 className="font-black text-slate-800 text-base uppercase tracking-wider">
                            Core Services & Microservices Port Matrix
                        </h4>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">
                        {infraServices.length} Microservices
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {infraServices.map((svc) => {
                        const IconComponent = svc.icon;
                        const isTesting = testingId === svc.id;
                        const testResult = testResults[svc.id];
                        const configuredUrl = currentServicesSettings[svc.urlKey] || svc.defaultUrl;

                        return (
                            <div
                                key={svc.id}
                                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                                                <IconComponent size={18} className={svc.color} />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-slate-800 text-xs">{svc.name}</h5>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {svc.host}:{svc.port}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mb-3">{svc.desc}</p>

                                    <div className="mb-3">
                                        <input
                                            type="text"
                                            value={configuredUrl}
                                            onChange={(e) => onChange('services', svc.urlKey, e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700"
                                            placeholder={svc.defaultUrl}
                                        />
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <div className="text-xs truncate flex-1">
                                        {testResult && (
                                            testResult.success ? (
                                                <span className="text-emerald-600 font-black flex items-center gap-1 text-[11px]">
                                                    <CheckCircle2 size={13} /> {testResult.latency}ms Online
                                                </span>
                                            ) : (
                                                <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px] truncate">
                                                    <XCircle size={13} className="shrink-0" /> {testResult.error || 'Down'}
                                                </span>
                                            )
                                        )}
                                        {!testResult && (
                                            <span className="text-[10px] text-slate-400">Belum diuji</span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => testServicePing(svc)}
                                        disabled={isTesting}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <RefreshCw size={12} className={isTesting ? 'animate-spin text-blue-600' : ''} />
                                        <span>Ping</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

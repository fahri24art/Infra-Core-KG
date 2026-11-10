import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Wrench, Radio, Network, FileText, CheckCircle, AlertCircle, RefreshCw,
    Globe, Layout, Laptop, Ticket, ArrowLeft, Save, Activity, Server,
    Mail, Users, User, Edit, Trash2, X, Plus, Bell, MessageCircle, HardDrive, Database,
    Video, Printer, Shield, Zap
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode';
import { generatePCPdf } from '../../utils/generatePCPdf';
import { generatePrinterPdf } from '../../utils/generatePrinterPdf';
import { generateNetworkPdf } from '../../utils/generateNetworkPdf';
import { generateBackupPdf } from '../../utils/generateBackupPdf';
import { generatePhonePdf } from '../../utils/generatePhonePdf';
import { generateHandoverPdf } from '../../utils/generateHandoverPdf';
import MasterDataConfigurator from './MasterDataConfigurator';
import IntegrationHubTab from './IntegrationHubTab';
import MikrotikOperationsTab from './MikrotikOperationsTab';
import RicohManagementTab from './RicohManagementTab';
import WhatsAppTesterDrawer from './WhatsAppTesterDrawer';

const WABotCard = ({ title, apiUrl, color }) => {
    const [waStatus, setWaStatus] = useState({ status: 'OFFLINE', qr: null });
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);

    useEffect(() => {
        const fetchWaStatus = async () => {
            try {
                const res = await fetch(`${apiUrl}/wa-status`);
                const data = await res.json();
                setWaStatus(data);
            } catch (err) {
                console.error(`WA Status Error [${title}]`, err);
            }
        };
        fetchWaStatus();
        const interval = setInterval(fetchWaStatus, 5000);
        return () => clearInterval(interval);
    }, [apiUrl]);

    useEffect(() => {
        if (waStatus.qr) {
            QRCode.toDataURL(waStatus.qr, { width: 256, margin: 2, errorCorrectionLevel: 'M' }, (err, url) => {
                if (!err) setQrCodeDataUrl(url);
            });
        } else {
            setQrCodeDataUrl(null);
        }
    }, [waStatus.qr]);

    const handleRestart = async () => {
        try {
            const res = await fetch(`${apiUrl}/wa-restart`, { method: 'POST' });
            if (res.ok) console.log(`${title} restart initiated`);
        } catch (err) {
            console.error(`Error restarting ${title}:`, err);
        }
    };

    const handleLogout = async () => {
        if (window.confirm(`Apakah Anda yakin ingin mereset sesi WhatsApp untuk ${title}?`)) {
            try {
                const res = await fetch(`${apiUrl}/wa-logout`, { method: 'POST' });
                if (res.ok) console.log(`${title} logout initiated`);
            } catch (err) {
                console.error(`Error resetting ${title}:`, err);
            }
        }
    };

    const colorConfig = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        violet: 'bg-violet-50 text-violet-600 border-violet-100',
    };
    const c = colorConfig[color] || colorConfig.blue;
    const btnColor = color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                     color === 'amber' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' :
                     color === 'violet' ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-200' :
                     'bg-blue-600 hover:bg-blue-700 shadow-blue-200';

    const [pairingPhone, setPairingPhone] = useState('');
    const [pairingCode, setPairingCode] = useState(null);
    const [isRequestingPair, setIsRequestingPair] = useState(false);

    const handlePairCode = async () => {
        if (!pairingPhone) return alert('Masukkan nomor HP Bot (contoh: 62812345678)');
        setIsRequestingPair(true);
        try {
            const res = await fetch(`${apiUrl}/wa-pair`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: pairingPhone })
            });
            const data = await res.json();
            if (res.ok) {
                setPairingCode(data.code);
            } else {
                alert('Gagal: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Gagal mengambil pairing code');
        } finally {
            setIsRequestingPair(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${c.split(' ')[0]}`}>
                <h3 className={`font-black text-sm uppercase tracking-wider ${c.split(' ')[1]}`}>{title}</h3>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white shadow-sm border border-slate-100 ${
                    waStatus.status === 'CONNECTED' ? 'text-emerald-500' : 
                    waStatus.status === 'WAITING_QR' ? 'text-blue-500 animate-pulse' : 
                    'text-red-500'
                }`}>
                    {waStatus.status}
                </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[300px] bg-slate-50/50">
                {waStatus.status === 'CONNECTED' ? (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                            <CheckCircle size={32} />
                        </div>
                        <p className="text-slate-700 font-bold text-sm">Bot Terhubung & Aktif</p>
                    </div>
                ) : waStatus.qr ? (
                        <div className="flex flex-col items-center animate-slide-up w-full">
                            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 mb-3">
                                {qrCodeDataUrl ? (
                                    <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                                ) : (
                                    <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-xl">
                                        <p className="text-xs text-slate-400 font-bold">Loading...</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide text-center mb-4">Scan QR Code</p>
                            
                            <div className="w-full bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-center">Atau Tautkan via Nomor HP</p>
                                {pairingCode ? (
                                    <div className="text-center">
                                        <div className="text-xl font-black text-blue-600 tracking-widest bg-blue-50 py-2 px-4 rounded-lg border border-blue-100">{pairingCode}</div>
                                        <p className="text-[9px] text-slate-400 mt-2">Pilih "Tautkan dengan nomor telepon" di WA HP</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 w-full">
                                        <input 
                                            type="text" 
                                            placeholder="628..." 
                                            value={pairingPhone}
                                            onChange={(e) => setPairingPhone(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold"
                                        />
                                        <button 
                                            onClick={handlePairCode}
                                            disabled={isRequestingPair}
                                            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase font-black tracking-wider rounded-lg shadow-sm disabled:opacity-50"
                                        >
                                            {isRequestingPair ? 'Meminta Kode...' : 'Dapatkan Kode'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                            <AlertCircle size={32} />
                        </div>
                        <p className="text-slate-500 font-bold text-sm mb-1">Status Offline</p>
                        <p className="text-[10px] text-slate-400 px-4">{waStatus.error || 'Silakan coba restart bot'}</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2 bg-white">
                <button onClick={handleRestart} className={`flex-1 px-4 py-2 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-wider ${btnColor}`}>
                    {waStatus.status === 'OFFLINE' || waStatus.status === 'LOGGED_OUT' ? 'Start Bot' : 'Restart'}
                </button>
                <button onClick={handleLogout} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-all active:scale-95 text-[10px] uppercase tracking-wider">
                    {waStatus.status === 'WAITING_QR' ? 'Stop QR' : 'Reset'}
                </button>
            </div>
        </div>
    );
};

export default function SystemSettings() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'integrations_hub';
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [newWaGroup, setNewWaGroup] = useState('');

    const userRole = JSON.parse(sessionStorage.getItem('user'))?.role?.toLowerCase();
    const isSuperAdmin = ['super_user', 'superuser', 'administrator', 'admin'].includes(userRole);

    const allTabs = [
        { id: 'integrations_hub', label: 'Pusat Konfigurasi & Integrasi', icon: Zap },
        { id: 'master_data', label: 'Master Data Configurator', icon: Database },
        { id: 'global', label: 'Global', icon: Globe },
        { id: 'dashboard', label: 'Dashboard', icon: Layout },
        { id: 'assets', label: 'Assets', icon: Laptop },
        { id: 'tickets', label: 'Tickets', icon: Ticket },
        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
        { id: 'agents', label: 'Agents', icon: Radio },
        { id: 'network', label: 'Network & MikroTik Hub', icon: Network },
        { id: 'virtualization', label: 'Virtualization', icon: Server },
        { id: 'cctv', label: 'CCTV Surveillance', icon: Video },
        { id: 'ricoh', label: 'Ricoh Copier & Kuota', icon: Printer },
        { id: 'security', label: 'Security & Auth', icon: Shield },
        { id: 'andon', label: 'Andon System', icon: Activity },
        { id: 'email', label: 'Email', icon: Mail },
        { id: 'teams', label: 'Teams', icon: Users },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'documents', label: 'Doc & Templates', icon: FileText },
        { id: 'monitoring', label: 'Monitoring & Alerts', icon: Activity },
        { id: 'notifications', label: 'Notification Routing', icon: MessageCircle },
    ];

    const tabs = isSuperAdmin ? allTabs : allTabs.filter(t => ['integrations_hub', 'network', 'virtualization', 'email', 'teams', 'documents'].includes(t.id));


    const fetchSettings = async () => {
        try {
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            const res = await fetch(`/api/network/settings?organization=${org}`, {
                headers: { 'X-Organization': org }
            });
            const data = await res.json();
            setSettings(data);
        } catch (err) {
            console.error("Failed to fetch settings", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleChange = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);
        try {
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            const res = await fetch(`/api/network/settings?organization=${org}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Organization': org
                },
                body: JSON.stringify({
                    section: activeTab,
                    settings: settings[activeTab] || {}
                })
            });
            if (res.ok) {
                setStatus({ type: 'success', message: 'Settings saved successfully' });
                setTimeout(() => setStatus(null), 3000);
            } else {
                setStatus({ type: 'error', message: 'Failed to save settings' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Network error occurred' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className={`p-5 mx-auto space-y-5 pb-20 animate-in fade-in duration-500 ${activeTab === 'users' ? 'w-full' : 'max-w-7xl'}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={() => navigate('/ict/admin')}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Configuration</h1>
                        <p className="text-slate-500 font-medium">Manage global flags and module-specific parameters</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {status && (
                        <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold animate-in zoom-in duration-300 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                            }`}>
                            {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            <span>{status.message}</span>
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Save size={20} />
                        <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 h-full">
                {/* Sidebar Navigation */}
                <Card className="lg:col-span-1 p-4 bg-slate-50/50 border-none rounded-[2rem]">
                    <div className="space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setSearchParams({ tab: tab.id }); setStatus(null); }}
                                className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-lg shadow-slate-200 border border-slate-100'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <tab.icon size={20} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Main Settings Area */}
                <Card className="lg:col-span-3 p-10 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 min-h-[600px]">
                    <div className={`space-y-10 ${['users', 'integrations_hub', 'network', 'ricoh'].includes(activeTab) ? 'w-full max-w-none' : 'max-w-2xl'}`}>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                {tabs.find(t => t.id === activeTab)?.label} Settings
                            </h2>
                            <p className="text-slate-500 font-medium text-sm">Configure parameters for the {activeTab} module.</p>
                        </div>

                        <div className="space-y-5 animate-in slide-in-from-right duration-300">
                            {activeTab === 'integrations_hub' && (
                                <IntegrationHubTab
                                    settings={settings}
                                    onChange={handleChange}
                                    onSave={handleSave}
                                    isSaving={saving}
                                />
                            )}

                            {activeTab === 'master_data' && (
                                <MasterDataConfigurator />
                            )}

                            {activeTab === 'global' && (
                                <>
                                    <SettingsInput
                                        label="Application Name"
                                        value={settings.global?.app_name || 'ICT Power Asset'}
                                        onChange={(v) => handleChange('global', 'app_name', v)}
                                        placeholder="e.g. Infraforce"
                                    />
                                    <SettingsInput
                                        label="Organization Logo URL"
                                        value={settings.global?.logo_url || ''}
                                        onChange={(v) => handleChange('global', 'logo_url', v)}
                                        placeholder="https://example.com/logo.png"
                                    />
                                    <SettingsToggle
                                        label="Maintenance Mode"
                                        desc="Disable access to all users except Administrators"
                                        value={settings.global?.maintenance_mode === true}
                                        onChange={(v) => handleChange('global', 'maintenance_mode', v)}
                                    />

                                 </>
                            )}

                            {activeTab === 'dashboard' && (
                                <>
                                    <SettingsInput
                                        label="Auto-Refresh Interval (Seconds)"
                                        type="number"
                                        value={settings.dashboard?.refresh_rate || 30}
                                        onChange={(v) => handleChange('dashboard', 'refresh_rate', parseInt(v))}
                                    />
                                    <SettingsToggle
                                        label="Show Detailed Stats"
                                        desc="Enable extended metrics on the main dashboard"
                                        value={settings.dashboard?.show_details === true}
                                        onChange={(v) => handleChange('dashboard', 'show_details', v)}
                                    />
                                </>
                            )}

                            {activeTab === 'assets' && (
                                <>
                                    <SettingsInput
                                        label="GLPI API URL"
                                        value={settings.assets?.glpi_url || ''}
                                        onChange={(v) => handleChange('assets', 'glpi_url', v)}
                                        placeholder="https://glpi.example.com/api"
                                    />
                                    <SettingsInput
                                        label="GLPI App-Token"
                                        type="password"
                                        value={settings.assets?.glpi_token || ''}
                                        onChange={(v) => handleChange('assets', 'glpi_token', v)}
                                    />
                                    <SettingsInput
                                        label="Inventory Number Prefix"
                                        value={settings.assets?.inv_prefix || 'INV-'}
                                        onChange={(v) => handleChange('assets', 'inv_prefix', v)}
                                    />
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">GLPI Synchronization</div>
                                                <div className="text-slate-600 font-bold text-sm italic opacity-70">"Pull assets, users, and departments from 192.168.1.66"</div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    setSaving(true);
                                                    setStatus(null);
                                                    try {
                                                        const org = sessionStorage.getItem('organization') || 'TCF-SG';
                                                        const res = await fetch(`/api/network/glpi/sync?organization=${org}`, { 
                                                            method: 'POST',
                                                            headers: { 'X-Organization': org }
                                                        });
                                                        const data = await res.json();
                                                        if (res.ok) {
                                                            setStatus({ type: 'success', message: 'GLPI Sync Completed Successfully' });
                                                            setTimeout(() => setStatus(null), 5000);
                                                        } else {
                                                            throw new Error(data.error || 'Sync Failed');
                                                        }
                                                    } catch (err) {
                                                        setStatus({ type: 'error', message: err.message });
                                                    } finally {
                                                        setSaving(false);
                                                    }
                                                }}
                                                disabled={saving}
                                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                <RefreshCw size={18} className={saving ? 'animate-spin' : ''} />
                                                <span>{saving ? 'Syncing...' : 'Sync Now'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'tickets' && (
                                <>
                                    <SettingsInput
                                        label="osTicket Bridge Endpoint"
                                        value={settings.tickets?.ost_url || ''}
                                        onChange={(v) => handleChange('tickets', 'ost_url', v)}
                                        placeholder="http://192.168.1.18/api"
                                    />
                                    <SettingsInput
                                        label="Default Ticket Priority"
                                        value={settings.tickets?.def_priority || 'Normal'}
                                        onChange={(v) => handleChange('tickets', 'def_priority', v)}
                                    />

                                    <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
                                        <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                            <Radio size={14} /> WhatsApp Bot Matrix
                                        </div>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="w-72 flex-shrink-0">
                                                <WABotCard title="ICT Bot (Utama)" apiUrl="/api" color="blue" />
                                            </div>
                                            <div className="w-72 flex-shrink-0">
                                                <WABotCard title="ICT Bot (Cadangan 1)" apiUrl="/api/bot2" color="indigo" />
                                            </div>
                                            <div className="w-72 flex-shrink-0">
                                                <WABotCard title="ICT Bot (Cadangan 2)" apiUrl="/api/bot3" color="violet" />
                                            </div>
                                        </div>
                                    </div>
                                        <div className="pt-4 mt-4 border-t border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-black uppercase px-4 leading-relaxed mt-4">
                                                * Note: WhatsApp Forwarding targets have been moved to the "Notification Routing" tab.
                                            </p>
                                        </div>
                                </>
                            )}

                            {activeTab === 'notifications' && (
                                <>
                                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                        <MessageCircle size={14} /> WhatsApp Routing Configuration
                                    </div>
                                    <p className="text-slate-500 font-medium text-sm mb-6">Setel nomor telepon atau Group ID target notifikasi untuk setiap modul. Bot hanya akan mem-forward notifikasi ke tujuan yang disetel di sini.</p>
                                    
                                    <SettingsInput
                                        label="ICT Helpdesk Target (Group / Number)"
                                        value={settings.notifications?.ict_target || ''}
                                        onChange={(v) => handleChange('notifications', 'ict_target', v)}
                                        placeholder="Misal: 6281220729559 atau 12036304XXXXXX@g.us"
                                    />
                                    <SettingsInput
                                        label="Andon System Target (Group / Number)"
                                        value={settings.notifications?.andon_target || ''}
                                        onChange={(v) => handleChange('notifications', 'andon_target', v)}
                                        placeholder="Misal: 6281220729559 atau 12036304XXXXXX@g.us"
                                    />
                                    <SettingsInput
                                        label="Infra Guard / Monitoring Target (Group / Number)"
                                        value={settings.notifications?.infraguard_target || ''}
                                        onChange={(v) => handleChange('notifications', 'infraguard_target', v)}
                                        placeholder="Misal: 6281220729559 atau 12036304XXXXXX@g.us"
                                    />
                                </>
                            )}

                            {activeTab === 'maintenance' && (
                                <>
                                    <SettingsInput
                                        label="Planning Interval (Months)"
                                        type="number"
                                        value={settings.maintenance?.interval || 6}
                                        onChange={(v) => handleChange('maintenance', 'interval', parseInt(v))}
                                    />
                                </>
                            )}

                            {activeTab === 'agents' && (
                                <>
                                    <SettingsInput
                                        label="Heartbeat Timeout (Minutes)"
                                        type="number"
                                        value={settings.agents?.timeout || 15}
                                        onChange={(v) => handleChange('agents', 'timeout', parseInt(v))}
                                    />
                                </>
                            )}

                            {activeTab === 'network' && (
                                <MikrotikOperationsTab
                                    settings={settings}
                                    onChange={handleChange}
                                    onSave={handleSave}
                                    isSaving={saving}
                                />
                            )}

                            {activeTab === 'virtualization' && (
                                <>
                                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                        <Server size={14} /> Proxmox Host 1
                                    </div>
                                    <SettingsInput
                                        label="API URL"
                                        value={settings.virtualization?.proxmox_url_1 || ''}
                                        onChange={(v) => handleChange('virtualization', 'proxmox_url_1', v)}
                                        placeholder="https://192.168.1.4:8006"
                                    />
                                    <SettingsInput
                                        label="Username"
                                        value={settings.virtualization?.proxmox_user_1 || ''}
                                        onChange={(v) => handleChange('virtualization', 'proxmox_user_1', v)}
                                        placeholder="root@pam"
                                    />
                                    <SettingsInput
                                        label="Password"
                                        type="password"
                                        value={settings.virtualization?.proxmox_pass_1 || ''}
                                        onChange={(v) => handleChange('virtualization', 'proxmox_pass_1', v)}
                                    />
                                    
                                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                        <Server size={14} /> Proxmox Host 2
                                    </div>
                                    <SettingsInput
                                        label="API URL"
                                        value={settings.virtualization?.proxmox_url_2 || ''}
                                        onChange={(v) => handleChange('virtualization', 'proxmox_url_2', v)}
                                        placeholder="https://192.168.1.5:8006"
                                    />
                                    <SettingsInput
                                        label="Username"
                                        value={settings.virtualization?.proxmox_user_2 || ''}
                                        onChange={(v) => handleChange('virtualization', 'proxmox_user_2', v)}
                                        placeholder="root@pam"
                                    />
                                    <SettingsInput
                                        label="Password"
                                        type="password"
                                        value={settings.virtualization?.proxmox_pass_2 || ''}
                                        onChange={(v) => handleChange('virtualization', 'proxmox_pass_2', v)}
                                    />

                                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                        <HardDrive size={14} /> Synology NAS 1
                                    </div>
                                    <SettingsInput
                                        label="IP Address"
                                        value={settings.virtualization?.nas_ip_1 || ''}
                                        onChange={(v) => handleChange('virtualization', 'nas_ip_1', v)}
                                        placeholder="192.168.1.102"
                                    />
                                    <SettingsInput
                                        label="Username"
                                        value={settings.virtualization?.nas_user_1 || ''}
                                        onChange={(v) => handleChange('virtualization', 'nas_user_1', v)}
                                    />
                                    <SettingsInput
                                        label="Password"
                                        type="password"
                                        value={settings.virtualization?.nas_pass_1 || ''}
                                        onChange={(v) => handleChange('virtualization', 'nas_pass_1', v)}
                                    />

                                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                        <HardDrive size={14} /> Synology NAS 2 (Backup)
                                    </div>
                                    <SettingsInput
                                        label="IP Address"
                                        value={settings.virtualization?.nas_ip_2 || ''}
                                        onChange={(v) => handleChange('virtualization', 'nas_ip_2', v)}
                                        placeholder="192.168.1.103"
                                    />
                                    <SettingsInput
                                        label="Username"
                                        value={settings.virtualization?.nas_user_2 || ''}
                                        onChange={(v) => handleChange('virtualization', 'nas_user_2', v)}
                                    />
                                    <SettingsInput
                                        label="Password"
                                        type="password"
                                        value={settings.virtualization?.nas_pass_2 || ''}
                                        onChange={(v) => handleChange('virtualization', 'nas_pass_2', v)}
                                    />
                                </>
                            )}

                            {activeTab === 'cctv' && (
                                <>
                                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                        <Video size={14} /> CCTV / NVR Integration
                                    </div>
                                    <SettingsInput
                                        label="NVR API URL (Stream Entry)"
                                        value={settings.cctv?.nvr_url || ''}
                                        onChange={(v) => handleChange('cctv', 'nvr_url', v)}
                                        placeholder="http://192.168.1.50/onvif"
                                    />
                                    <SettingsInput
                                        label="NVR Username"
                                        value={settings.cctv?.nvr_user || ''}
                                        onChange={(v) => handleChange('cctv', 'nvr_user', v)}
                                    />
                                    <SettingsInput
                                        label="NVR Password"
                                        type="password"
                                        value={settings.cctv?.nvr_pass || ''}
                                        onChange={(v) => handleChange('cctv', 'nvr_pass', v)}
                                    />
                                </>
                            )}

                            {activeTab === 'ricoh' && (
                                <RicohManagementTab
                                    settings={settings}
                                    onChange={handleChange}
                                    onSave={handleSave}
                                    isSaving={saving}
                                />
                            )}

                            {activeTab === 'security' && (
                                <>
                                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                        <Shield size={14} /> Security Modules
                                    </div>
                                    <SettingsInput
                                        label="Infra Guard (Native) URL"
                                        value={settings.security?.infraguard_url || ''}
                                        onChange={(v) => handleChange('security', 'infraguard_url', v)}
                                        placeholder="http://192.168.1.3"
                                    />
                                    <SettingsInput
                                        label="Endpoint Lockdown API"
                                        value={settings.security?.lockdown_url || ''}
                                        onChange={(v) => handleChange('security', 'lockdown_url', v)}
                                        placeholder="http://192.168.1.8:5000"
                                    />
                                    <SettingsInput
                                        label="Wazuh SIEM Manager IP"
                                        value={settings.security?.wazuh_ip || ''}
                                        onChange={(v) => handleChange('security', 'wazuh_ip', v)}
                                        placeholder="192.168.1.3"
                                    />
                                </>
                            )}

                            {activeTab === 'andon' && (
                                <>
                                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                        <Activity size={14} /> Andon System Integration
                                    </div>
                                    <SettingsInput
                                        label="Andon Gateway URL"
                                        value={settings.andon?.gateway_url || ''}
                                        onChange={(v) => handleChange('andon', 'gateway_url', v)}
                                        placeholder="http://192.168.1.20:3000"
                                    />
                                    <SettingsInput
                                        label="API Secret Token"
                                        type="password"
                                        value={settings.andon?.secret_token || ''}
                                        onChange={(v) => handleChange('andon', 'secret_token', v)}
                                    />
                                </>
                            )}

                            {activeTab === 'reports' && (
                                <>
                                    <SettingsInput
                                        label="Company Header Text"
                                        value={settings.reports?.header || 'PT. TRI CENTRUM FORTUNA'}
                                        onChange={(v) => handleChange('reports', 'header', v)}
                                    />
                                </>
                            )}

                            {activeTab === 'documents' && (
                                <>
                                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                        <FileText size={14} /> Document Numbering System
                                    </div>
                                    <p className="text-slate-500 font-medium text-sm mb-6">
                                        Atur kode dokumen untuk setiap jenis checksheet. Kode ini akan otomatis tercetak di pojok PDF hasil report maintenance.
                                    </p>
                                    <SettingsInput
                                        label="PC / Laptop Checksheet ID"
                                        value={settings.documents?.doc_pc || 'TCFSG-FM-ICT-01-03'}
                                        onChange={(v) => handleChange('documents', 'doc_pc', v)}
                                    />
                                    <SettingsInput
                                        label="Printer Checksheet ID"
                                        value={settings.documents?.doc_printer || 'TCFSG-FM-ICT-01-04'}
                                        onChange={(v) => handleChange('documents', 'doc_printer', v)}
                                    />
                                    <SettingsInput
                                        label="Network & CCTV Checksheet ID"
                                        value={settings.documents?.doc_network || 'TCFSG-FM-ICT-01-05'}
                                        onChange={(v) => handleChange('documents', 'doc_network', v)}
                                    />
                                    <SettingsInput
                                        label="Server & Backup Checksheet ID"
                                        value={settings.documents?.doc_backup || 'TCFSG-FM-ICT-01-06'}
                                        onChange={(v) => handleChange('documents', 'doc_backup', v)}
                                    />
                                    <SettingsInput
                                        label="Smartphone / Tablet Checksheet ID"
                                        value={settings.documents?.doc_phone || 'TCFSG-FM-ICT-01-08'}
                                        onChange={(v) => handleChange('documents', 'doc_phone', v)}
                                    />
                                    <SettingsInput
                                        label="Jadwal Pemeliharaan ID"
                                        value={settings.documents?.doc_schedule || 'TCFSG-FM-ICT-01-01'}
                                        onChange={(v) => handleChange('documents', 'doc_schedule', v)}
                                    />
                                    <SettingsInput
                                        label="Pelaksanaan Pemeliharaan ID"
                                        value={settings.documents?.doc_execution || 'TCFSG-FM-ICT-01-02'}
                                        onChange={(v) => handleChange('documents', 'doc_execution', v)}
                                    />
                                    <SettingsInput
                                        label="Ticket Helpdesk ID"
                                        value={settings.documents?.doc_ticket || 'TCFSG-FM-ICT-03-04'}
                                        onChange={(v) => handleChange('documents', 'doc_ticket', v)}
                                    />
                                    <SettingsInput
                                        label="Serah Terima Perangkat (BAST) ID"
                                        value={settings.documents?.doc_bast || 'TCFSG-FM-ICT-03-02'}
                                        onChange={(v) => handleChange('documents', 'doc_bast', v)}
                                    />
                                    <SettingsInput
                                        label="History Perangkat ID"
                                        value={settings.documents?.doc_history || 'TCFSG-FM-ICT-03-03'}
                                        onChange={(v) => handleChange('documents', 'doc_history', v)}
                                    />
                                    <SettingsInput
                                        label="ICT Job List ID"
                                        value={settings.documents?.doc_joblist || 'TCFSG-FM-ICT-01-07'}
                                        onChange={(v) => handleChange('documents', 'doc_joblist', v)}
                                    />
                                    <SettingsInput
                                        label="Asset List ID"
                                        value={settings.documents?.doc_asset_list || 'TCFSG-FM-ICT-03-01'}
                                        onChange={(v) => handleChange('documents', 'doc_asset_list', v)}
                                    />
                                    <SettingsInput
                                        label="KPI Jaringan & Server ID"
                                        value={settings.documents?.doc_kpi || 'TCFSG-FM-ICT-06-02'}
                                        onChange={(v) => handleChange('documents', 'doc_kpi', v)}
                                    />
                                    <SettingsInput
                                        label="Hak Akses Pengguna ID"
                                        value={settings.documents?.doc_access || 'TCFSG-FM-ICT-06-01'}
                                        onChange={(v) => handleChange('documents', 'doc_access', v)}
                                    />
                                    <SettingsInput
                                        label="Log Cyber Attack ID"
                                        value={settings.documents?.doc_cyber || 'TCFSG-FM-ICT-04-01'}
                                        onChange={(v) => handleChange('documents', 'doc_cyber', v)}
                                    />

                                    <div className="pt-6 mt-6 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                            <FileText size={14} /> Form Templates Management
                                        </div>
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4">
                                            <p className="text-slate-600 text-sm font-medium leading-relaxed mb-4">
                                                Saat ini sistem menggunakan hardcoded PDF generator layout untuk keamanan struktur dokumen.
                                                Dukungan untuk <b>Dynamic Form Builder</b> (seperti iDempiere/ERP) akan diimplementasikan pada module update selanjutnya agar Anda dapat melakukan <i>Drag and Drop</i> field secara bebas.
                                            </p>
                                        </div>
                                        <p className="text-slate-500 font-medium text-xs mb-3">Lihat Template Kosong (Preview):</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <button onClick={() => generatePCPdf({}, {}, 'view')} className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                                <Laptop size={14} /> PC / Laptop
                                            </button>
                                            <button onClick={() => generatePrinterPdf({}, {}, 'view')} className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                                <FileText size={14} /> Printer / Scanner
                                            </button>
                                            <button onClick={() => generateNetworkPdf({}, {}, 'view')} className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                                <Network size={14} /> Network & CCTV
                                            </button>
                                            <button onClick={() => generateBackupPdf({}, {}, 'view')} className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                                <Server size={14} /> Server & Backup
                                            </button>
                                            <button onClick={() => generatePhonePdf({}, {}, 'view')} className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                                <Radio size={14} /> Smartphone / Tab
                                            </button>
                                            <button onClick={() => generateHandoverPdf('Nama Karyawan', { id: 'SAMPLE-123', category: 'Laptop', manufacturer: 'Contoh Merk', model: 'Model X', serial_number: 'SN-000000000', inventory_number: 'INV-COMP-000', specs: { os: 'Windows 11', ram: '16 GB', cpu: 'Intel Core i5', storage: [{ designation: 'SSD', capacity: 512 * 1024 }] } }, 'Nama Departemen')} className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-blue-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors shadow-sm col-span-2 md:col-span-1">
                                                <User size={14} /> Serah Terima
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'monitoring' && (
                                <>
                                    {(() => {
                                        const waGroups = Array.isArray(settings.monitoring?.wa_groups) 
                                            ? settings.monitoring.wa_groups 
                                            : ['ICT - TCF', 'Tehnisi Helpdesk TCFKG', 'Tehnisi Helpdesk TCFSG'];
                                            
                                        return (
                                        <div className="space-y-6">
                                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <MessageCircle size={16} className="text-blue-500" />
                                                    WhatsApp Notification Groups (Contact List)
                                                </h4>
                                                <div className="flex gap-2 mb-4">
                                                    <input 
                                                        type="text" 
                                                        value={newWaGroup} 
                                                        onChange={(e) => setNewWaGroup(e.target.value)}
                                                        placeholder="Add new group name (e.g. Server Admins)"
                                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            if (newWaGroup && !waGroups.includes(newWaGroup)) {
                                                                handleChange('monitoring', 'wa_groups', [...waGroups, newWaGroup]);
                                                                setNewWaGroup('');
                                                            }
                                                        }}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-1"
                                                    >
                                                        <Plus size={16} /> Add Group
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {waGroups.map(g => (
                                                        <div key={g} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-3">
                                                            <span className="text-sm font-medium text-slate-700">{g}</span>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleChange('monitoring', 'wa_groups', waGroups.filter(x => x !== g))}
                                                                className="text-red-500 hover:text-red-600 p-1"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {waGroups.length === 0 && <p className="text-sm text-slate-400 col-span-2">No groups configured. Please add one.</p>}
                                                </div>
                                            </div>

                                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200">
                                                            <th className="py-3 px-4 font-semibold text-sm text-slate-700 w-1/3">Tipe Alert / Monitor</th>
                                                            <th className="py-3 px-4 font-semibold text-sm text-slate-700 w-24">Status</th>
                                                            <th className="py-3 px-4 font-semibold text-sm text-slate-700">Target WhatsApp Group</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {/* Mikrotik */}
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-slate-800 text-sm">Mikrotik Alert</div>
                                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                                    Max CPU Load:
                                                                    <input type="number" className="w-16 p-1 text-xs border rounded" value={settings.monitoring?.cpu_threshold || 85} onChange={(e) => handleChange('monitoring', 'cpu_threshold', parseInt(e.target.value))} />
                                                                    %
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={settings.monitoring?.enable_ig !== false} onChange={(e) => handleChange('monitoring', 'enable_ig', e.target.checked)} />
                                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                                </label>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <select value={settings.monitoring?.ig_target_group || waGroups[0] || ''} onChange={(e) => handleChange('monitoring', 'ig_target_group', e.target.value)} className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border">
                                                                    <option value="">-- Select Group --</option>
                                                                    {waGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                                                </select>
                                                            </td>
                                                        </tr>

                                                        {/* ISP */}
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-slate-800 text-sm">Kecepatan Jaringan (ISP)</div>
                                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                                    Max Latency:
                                                                    <input type="number" className="w-16 p-1 text-xs border rounded" value={settings.monitoring?.isp_latency_threshold || 150} onChange={(e) => handleChange('monitoring', 'isp_latency_threshold', parseInt(e.target.value))} />
                                                                    ms
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={settings.monitoring?.enable_isp !== false} onChange={(e) => handleChange('monitoring', 'enable_isp', e.target.checked)} />
                                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                                </label>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <select value={settings.monitoring?.isp_target_group || waGroups[0] || ''} onChange={(e) => handleChange('monitoring', 'isp_target_group', e.target.value)} className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border">
                                                                    <option value="">-- Select Group --</option>
                                                                    {waGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                                                </select>
                                                            </td>
                                                        </tr>

                                                        {/* Network Protection (AdGuard) */}
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-slate-800 text-sm">Network Protection (AdGuard)</div>
                                                                <div className="text-xs text-slate-500 mt-1">Real-time web activity tracking, DNS Filtering, and Threat Protection</div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={settings.monitoring?.enable_adguard !== false} onChange={(e) => handleChange('monitoring', 'enable_adguard', e.target.checked)} />
                                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                                </label>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <select value={settings.monitoring?.adguard_target_group || waGroups[0] || ''} onChange={(e) => handleChange('monitoring', 'adguard_target_group', e.target.value)} className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border">
                                                                    <option value="">-- Select Group --</option>
                                                                    {waGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                                                </select>
                                                            </td>
                                                        </tr>

                                                        {/* IRON DOME SECURITY CENTER */}
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-slate-800 text-sm">IRON DOME SECURITY CENTER</div>
                                                                <div className="text-xs text-slate-500 mt-1">Real-time Threat Neutralization & Monitoring (Level tertinggi)</div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={settings.monitoring?.enable_irondome !== false} onChange={(e) => handleChange('monitoring', 'enable_irondome', e.target.checked)} />
                                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                                </label>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <select value={settings.monitoring?.irondome_target_group || waGroups[0] || ''} onChange={(e) => handleChange('monitoring', 'irondome_target_group', e.target.value)} className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border">
                                                                    <option value="">-- Select Group --</option>
                                                                    {waGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                                                </select>
                                                            </td>
                                                        </tr>

                                                        {/* Endpoint Anti-Malware */}
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-slate-800 text-sm">Endpoint Anti-Malware</div>
                                                                <div className="text-xs text-slate-500 mt-1">Integrated with Wazuh, VirusTotal, ClamAV, and Windows Defender to protect IT Assets.</div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={settings.monitoring?.enable_wazuh !== false} onChange={(e) => handleChange('monitoring', 'enable_wazuh', e.target.checked)} />
                                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                                </label>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <select value={settings.monitoring?.wazuh_target_group || waGroups[0] || ''} onChange={(e) => handleChange('monitoring', 'wazuh_target_group', e.target.value)} className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border">
                                                                    <option value="">-- Select Group --</option>
                                                                    {waGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                                                </select>
                                                            </td>
                                                        </tr>

                                                        {/* BYOD & GUEST MONITORING */}
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-slate-800 text-sm">BYOD & GUEST MONITORING</div>
                                                                <div className="text-xs text-slate-500 mt-1">Pemantauan Khusus Perangkat Pribadi (Magang & Tamu)</div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={settings.monitoring?.enable_byod !== false} onChange={(e) => handleChange('monitoring', 'enable_byod', e.target.checked)} />
                                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                                </label>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <select value={settings.monitoring?.byod_target_group || waGroups[0] || ''} onChange={(e) => handleChange('monitoring', 'byod_target_group', e.target.value)} className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border">
                                                                    <option value="">-- Select Group --</option>
                                                                    {waGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                                                </select>
                                                            </td>
                                                        </tr>

                                                        {/* Maintenance Hub */}
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium text-slate-800 text-sm">Maintenance Hub</div>
                                                                <div className="text-xs text-slate-500 mt-1">Preventive maintenance and service life-cycle management</div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={settings.monitoring?.enable_maintenance !== false} onChange={(e) => handleChange('monitoring', 'enable_maintenance', e.target.checked)} />
                                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                                </label>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <select value={settings.monitoring?.maintenance_target_group || waGroups[0] || ''} onChange={(e) => handleChange('monitoring', 'maintenance_target_group', e.target.value)} className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border">
                                                                    <option value="">-- Select Group --</option>
                                                                    {waGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        );
                                    })()}
                                    <div className="pt-6 border-t border-slate-100">
                                        <WhatsAppTesterDrawer gatewayUrl={settings.services?.wa_gateway_url || 'http://192.168.1.66:5002'} />
                                    </div>
                                </>
                            )}

                            {activeTab === 'email' && (
                                <>
                                    <SettingsInput
                                        label="SMTP Host"
                                        value={settings.email?.smtp_host || ''}
                                        onChange={(v) => handleChange('email', 'smtp_host', v)}
                                        placeholder="smtp.gmail.com"
                                    />
                                    <SettingsInput
                                        label="SMTP Port"
                                        type="number"
                                        value={settings.email?.smtp_port || 587}
                                        onChange={(v) => handleChange('email', 'smtp_port', parseInt(v))}
                                    />
                                    <SettingsInput
                                        label="SMTP User"
                                        value={settings.email?.smtp_user || ''}
                                        onChange={(v) => handleChange('email', 'smtp_user', v)}
                                        placeholder="system@tcf.com"
                                    />
                                    <SettingsInput
                                        label="SMTP Password"
                                        type="password"
                                        value={settings.email?.smtp_pass || ''}
                                        onChange={(v) => handleChange('email', 'smtp_pass', v)}
                                    />
                                    <SettingsToggle
                                        label="Enable Email Alerts"
                                        desc="Send automated notifications via email"
                                        value={settings.email?.enabled === true}
                                        onChange={(v) => handleChange('email', 'enabled', v)}
                                    />
                                </>
                            )}

                            {activeTab === 'teams' && (
                                <>
                                    <SettingsInput
                                        label="Webhook URL"
                                        value={settings.teams?.webhook_url || ''}
                                        onChange={(v) => handleChange('teams', 'webhook_url', v)}
                                        placeholder="https://outlook.office.com/webhook/..."
                                    />
                                    <SettingsToggle
                                        label="Enable Teams Alerts"
                                        desc="Push notifications to Microsoft Teams channel"
                                        value={settings.teams?.enabled === true}
                                        onChange={(v) => handleChange('teams', 'enabled', v)}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function SettingsInput({ label, value, onChange, placeholder, type = "text" }) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
            />
        </div>
    );
}

function SettingsToggle({ label, desc, value, onChange }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
                <div className="text-slate-600 font-bold text-sm italic opacity-70">"{desc}"</div>
            </div>
            <button
                onClick={() => onChange(!value)}
                className={`w-14 h-8 rounded-full p-1 transition-all ${value ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all transform ${value ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
        </div>
    );
}

function SettingsSelect({ label, value, onChange, options }) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}


function UserManagementTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editUser, setEditUser] = useState(null);
    const [statusMsg, setStatusMsg] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            const res = await fetch(`/api/users?organization=${org}`, {
                headers: { 'X-Organization': org }
            });
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (user) => {
        if (!window.confirm(`Yakin ingin menghapus ${user.name}?`)) return;
        try {
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            await fetch(`/api/users/${user.id}?organization=${user.organization}`, { 
                method: 'DELETE',
                headers: { 'X-Organization': org }
            });
            fetchUsers();
            setStatusMsg({ type: 'success', text: 'User deleted' });
            setTimeout(() => setStatusMsg(null), 3000);
        } catch (err) {
            console.error(err);
            setStatusMsg({ type: 'error', text: 'Delete failed' });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                username: editUser.username,
                name: editUser.name,
                email: editUser.email,
                employee_id: editUser.employee_id,
                whatsapp: editUser.whatsapp,
                department: editUser.department,
                role: editUser.role,
                organization: editUser.organization,
                current_organization: editUser._originalOrganization
            };
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            
            let res;
            if (editUser.isNew) {
                payload.password = editUser.password;
                if (!payload.password) {
                    setStatusMsg({ type: 'error', text: 'Password is required for new user' });
                    return;
                }
                res = await fetch(`/api/users?organization=${org}`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Organization': org
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch(`/api/users/${editUser.id}?organization=${org}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Organization': org
                    },
                    body: JSON.stringify(payload)
                });
            }
            
            if (res.ok) {
                setStatusMsg({ type: 'success', text: editUser.isNew ? 'User created successfully' : 'User updated successfully' });
                setEditUser(null);
                fetchUsers();
            } else {
                const errData = await res.json();
                setStatusMsg({ type: 'error', text: errData.error || 'Update failed' });
            }
            setTimeout(() => setStatusMsg(null), 3000);
        } catch (err) {
            setStatusMsg({ type: 'error', text: 'Operation failed' });
        }
    };

    return (
        <div className="space-y-3">
            {statusMsg && (
                <div className={`p-4 rounded-xl text-sm font-bold ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {statusMsg.text}
                </div>
            )}
            
            {loading ? (
                <div className="text-slate-400 text-sm font-bold text-center py-10">Loading users...</div>
            ) : (
                <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div className="text-sm font-black text-slate-600 uppercase tracking-widest">Registered Users</div>
                        <button 
                            onClick={() => setEditUser({ isNew: true, username: '', name: '', email: '', employee_id: '', whatsapp: '', department: '', role: 'user', organization: 'TCF-KG', password: '' })}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all text-[11px] uppercase tracking-wider flex items-center gap-2"
                        >
                            <Plus size={14} /> Add User
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="px-3 py-1.5 text-[10px] uppercase">Name / ID</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase">Email / WA</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase">Department</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase">Organization</th>
                                    <th className="px-3 py-1.5 text-[10px] uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {users.map(u => (
                                    <tr key={u.id + u.organization} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-1.5 text-[11px]">{u.name}<br/><span className="text-xs text-slate-400 font-bold uppercase">{u.username || u.employee_id || '-'}</span></td>
                                        <td className="px-3 py-1.5 text-[11px]">{u.email}<br/><span className="text-xs text-slate-400">{u.whatsapp || '-'}</span></td>
                                        <td className="px-3 py-1.5 text-[11px]">{u.department}</td>
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${u.organization === 'TCF-SG' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {u.organization}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px] text-right space-x-2">
                                            <button onClick={() => setEditUser({...u, _originalOrganization: u.organization})} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(u)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {editUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] p-5 w-full max-w-lg shadow-2xl relative max-h-[90vh] flex flex-col">
                        <button onClick={() => setEditUser(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10 bg-white/80 backdrop-blur-sm">
                            <X size={20} />
                        </button>
                        <h3 className="text-2xl font-black text-slate-800 mb-6 shrink-0">{editUser.isNew ? 'Create User' : 'Edit User'}</h3>
                        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 pb-4">
                            <form onSubmit={handleSave} className="space-y-3">
                                <SettingsInput label="Username (Login ID)" value={editUser.username || ''} onChange={v => setEditUser({...editUser, username: v.toLowerCase().replace(/\s/g, '')})} />
                                <SettingsInput label="Name" value={editUser.name} onChange={v => setEditUser({...editUser, name: v})} />
                                {editUser.isNew && (
                                    <SettingsInput label="Password" type="password" value={editUser.password || ''} onChange={v => setEditUser({...editUser, password: v})} />
                                )}
                                <SettingsInput label="Employee ID" value={editUser.employee_id || ''} onChange={v => setEditUser({...editUser, employee_id: v})} />
                                <SettingsInput label="Email" value={editUser.email} onChange={v => setEditUser({...editUser, email: v})} />
                                <SettingsInput label="WhatsApp" value={editUser.whatsapp || ''} onChange={v => setEditUser({...editUser, whatsapp: v})} />
                                <SettingsInput label="Department" value={editUser.department || ''} onChange={v => setEditUser({...editUser, department: v})} />
                                <SettingsSelect 
                                    label="Organization" 
                                    value={editUser.organization} 
                                    onChange={v => setEditUser({...editUser, organization: v})}
                                    options={[
                                        {label: 'TCF-SG (Sadang)', value: 'TCF-SG'},
                                        {label: 'TCF-KG (Karanggan)', value: 'TCF-KG'}
                                    ]}
                                />
                                <SettingsSelect 
                                    label="Role" 
                                    value={editUser.role} 
                                    onChange={v => setEditUser({...editUser, role: v})}
                                    options={[
                                        {label: 'User', value: 'user'},
                                        {label: 'Admin', value: 'admin'},
                                        ...(sessionStorage.getItem('organization') === 'TCF-SG' ? [{label: 'Administrator (Super Admin)', value: 'administrator'}] : [])
                                    ]}
                                />
                                <button type="submit" className="w-full mt-6 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95">
                                    {editUser.isNew ? 'Create User' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState } from 'react';
import {
    Printer, Shield, AlertTriangle, CheckCircle2, XCircle,
    RefreshCw, Save, Lock, Zap, Clock, Activity, Power, HelpCircle
} from 'lucide-react';

export default function RicohManagementTab({ settings, onChange, onSave, isSaving }) {
    const [selectedPlant, setSelectedPlant] = useState('SG');
    const [isTesting, setIsTesting] = useState(false);
    const [pingResult, setPingResult] = useState(null);

    const prefix = selectedPlant === 'SG' ? 'sg' : 'kg';
    const currentRicoh = settings.ricoh || {};

    const hostKey = `copier_${prefix}_ip`;
    const defaultHost = selectedPlant === 'SG' ? '192.168.1.188' : '192.168.27.188';
    const host = currentRicoh[hostKey] ?? currentRicoh.host_ip ?? defaultHost;

    const communityKey = `copier_${prefix}_community`;
    const community = currentRicoh[communityKey] ?? 'public';

    const spikeGuardKey = `spike_guard_limit_${prefix}`;
    const spikeGuardLimit = currentRicoh[spikeGuardKey] ?? 500;

    const autoLockKey = `auto_lock_copier_${prefix}`;
    const autoLock = currentRicoh[autoLockKey] === true;

    const billingDayKey = `billing_cycle_day`;
    const billingDay = currentRicoh[billingDayKey] ?? 25;

    // Test copier reachability via HTTP port 80
    const handlePingCopier = async () => {
        setIsTesting(true);
        setPingResult(null);
        try {
            const res = await fetch('/api/settings/test-ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port: 80, timeoutMs: 3000 })
            });
            const data = await res.json();
            setPingResult(data);
        } catch (err) {
            setPingResult({ success: false, error: err.message });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header with Plant Switcher */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                        <Printer size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black tracking-tight">Pusat Pengaturan Ricoh Copier & Kuota</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Anti-Spam Guard
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs font-medium mt-1">
                            Konfigurasi scraper, batas proteksi anomali lonjakan counter, dan kebijakan auto-lock mesin fotocopy.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60">
                    <button
                        onClick={() => { setSelectedPlant('SG'); setPingResult(null); }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            selectedPlant === 'SG'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Plant Sadang (192.168.1.188)
                    </button>
                    <button
                        onClick={() => { setSelectedPlant('KG'); setPingResult(null); }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            selectedPlant === 'KG'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Plant Karawang (192.168.27.188)
                    </button>
                </div>
            </div>

            {/* Section 1: Device Configuration & Live Ping */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <div>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                            Kredensial & Jaringan Mesin ({selectedPlant === 'SG' ? 'Sadang' : 'Karawang'})
                        </h4>
                        <p className="text-xs text-slate-400">Parameter koneksi SNMP & Web Image Monitor (WIM).</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                        >
                            <Save size={14} />
                            <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                        </button>
                        <button
                            onClick={handlePingCopier}
                            disabled={isTesting}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
                            <span>{isTesting ? 'Memeriksa...' : '⚡ Ping Copier'}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            IP Address Mesin Fotocopy
                        </label>
                        <input
                            type="text"
                            value={host}
                            onChange={(e) => onChange('ricoh', hostKey, e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            SNMP Community String
                        </label>
                        <input
                            type="text"
                            value={community}
                            onChange={(e) => onChange('ricoh', communityKey, e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Siklus Reset Billing (Tanggal)
                        </label>
                        <select
                            value={billingDay}
                            onChange={(e) => onChange('ricoh', billingDayKey, parseInt(e.target.value) || 25)}
                            className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                        >
                            <option value={1}>Tanggal 1 (Awal Bulan)</option>
                            <option value={20}>Tanggal 20</option>
                            <option value={25}>Tanggal 25 (Standar TCF)</option>
                            <option value={28}>Tanggal 28</option>
                        </select>
                    </div>
                </div>

                {pingResult && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        {pingResult.success ? (
                            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-200">
                                <CheckCircle2 size={16} />
                                <span>Copier Online & Terhubung ({pingResult.latency}ms) ke port 80 HTTP</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-rose-700 bg-rose-50 px-3 py-2 rounded-xl text-xs font-bold border border-rose-200">
                                <XCircle size={16} />
                                <span>Gagal Terhubung: {pingResult.error}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Section 2: Anti-Spike Anomaly Guard (Saturday Fix Protection) */}
            <div className="bg-white rounded-3xl border border-amber-200/80 p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 shrink-0">
                        <Shield size={22} />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <span>Anti-Spike Anomaly Guard (Proteksi Spam Notifikasi)</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                Urgent Fix Protection
                            </span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                            Fitur ini memastikan sistem tidak akan membombardir grup WhatsApp dengan notifikasi berulang jika counter mesin mengalami lonjakan data yang tidak wajar (seperti insiden Sabtu lalu).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                            Batas Maksimal Kenaikan Counter Per Siklus (Lembar)
                        </label>
                        <input
                            type="number"
                            value={spikeGuardLimit}
                            onChange={(e) => onChange('ricoh', spikeGuardKey, parseInt(e.target.value) || 500)}
                            className="w-full px-3 py-2 text-xs font-mono font-black bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                            Jika kenaikan melebihi batas ini (misal 500 lembar/interval), notifikasi otomatis dihentikan dan dicatat sebagai anomali scraper.
                        </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                Kebijakan Pemblokiran Otomatis (Auto-Lock Copier)
                            </div>
                            <p className="text-xs text-slate-500 font-medium max-w-xs">
                                Kunci akun mesin fotocopy secara otomatis jika kuota bulanan departemen telah habis 100%.
                            </p>
                        </div>
                        <button
                            onClick={() => onChange('ricoh', autoLockKey, !autoLock)}
                            className={`w-14 h-8 rounded-full p-1 transition-all ${autoLock ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all transform ${autoLock ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

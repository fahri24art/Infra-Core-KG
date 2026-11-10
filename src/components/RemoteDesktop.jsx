import React, { useEffect, useState } from 'react';
import {
    RefreshCw, Monitor, ArrowLeft, ExternalLink, Copy, Check,
    ShieldCheck, Wrench, Key, Wifi, Terminal, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export default function RemoteDesktop({ asset, onBack }) {
    const { id: routeId } = useParams();
    const navigate = useNavigate();

    const [status, setStatus] = useState('Memuat konfigurasi remote...');
    const [loading, setLoading] = useState(true);
    const [healing, setHealing] = useState(false);
    const [healMessage, setHealMessage] = useState('');
    const [copiedKey, setCopiedKey] = useState('');
    const [customPass, setCustomPass] = useState('Tcf*Remote2026');
    const [details, setDetails] = useState({
        asset_id: asset?.id || null,
        asset_name: asset?.name || 'Remote Device',
        ip_address: asset?.ip_address || '',
        agent_status: asset?.agent_status || 'Online',
        rustdesk_id: asset?.rustdesk_id || '',
        connectionLink: asset?.rustdesk_id ? `rustdesk://${asset.rustdesk_id}` : null,
        directIpLink: asset?.ip_address ? `rustdesk://${asset.ip_address}` : null,
        unattended_password: 'Tcf*Remote2026',
        peer_registered_on_server: false,
        server_config: {
            id_server: '192.168.1.66',
            relay_server: '192.168.1.66',
            public_domain: 'server.tricentrumfortuna.com',
            key: 'goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4='
        }
    });

    const assetId = asset?.id || asset?.uuid || routeId;

    const getHeaders = () => {
        const org = sessionStorage.getItem('organization') || 'TCF-SG';
        let token = '';
        try {
            const u = JSON.parse(sessionStorage.getItem('user') || '{}');
            token = u.token || '';
        } catch (e) {}
        return {
            'Content-Type': 'application/json',
            'x-organization': org,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    };

    useEffect(() => {
        if (!assetId) {
            setStatus('Perangkat belum dipilih');
            setLoading(false);
            return;
        }
        connectToRustDesk();
    }, [assetId]);

    const connectToRustDesk = async () => {
        setLoading(true);
        try {
            setStatus('Mengambil jalur enkripsi RustDesk Server 66...');
            const res = await fetch(`/api/rustdesk/connection/${assetId}`, {
                headers: getHeaders()
            });
            const data = await res.json();

            if (!res.ok) {
                setStatus(data.error || 'Gagal memuat koneksi');
                setLoading(false);
                return;
            }

            setDetails((prev) => ({
                ...prev,
                ...data
            }));
            if (data.unattended_password) {
                setCustomPass(data.unattended_password);
            }
            setStatus(data.rustdesk_id || data.ip_address ? 'Siap Terhubung (Ready)' : 'Menunggu Sinkronisasi ID');
        } catch (err) {
            console.error('[RustDesk] Connection error:', err);
            setStatus('Gagal menghubungi server RustDesk');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text, keyName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(keyName);
        setTimeout(() => setCopiedKey(''), 2000);
    };

    const handleLaunchById = () => {
        if (details.rustdesk_id) {
            // Auto-copy unattended password to clipboard so technician can simply Ctrl+V if prompted!
            if (details.unattended_password) {
                navigator.clipboard.writeText(details.unattended_password).catch(() => {});
                setCopiedKey('auto_pass');
                setTimeout(() => setCopiedKey(''), 3500);
            }
            window.location.href = `rustdesk://${details.rustdesk_id}`;
        }
    };

    const handleLaunchByIp = () => {
        if (details.ip_address) {
            if (details.unattended_password) {
                navigator.clipboard.writeText(details.unattended_password).catch(() => {});
                setCopiedKey('auto_pass');
                setTimeout(() => setCopiedKey(''), 3500);
            }
            window.location.href = `rustdesk://${details.ip_address}`;
        }
    };

    const handleRemoteHealAndPassword = async () => {
        if (!assetId) return;
        setHealing(true);
        setHealMessage('');
        try {
            const res = await fetch(`/api/rustdesk/remote-action/${assetId}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    action: 'heal_rustdesk',
                    password: customPass
                })
            });
            const data = await res.json();
            if (res.ok) {
                setHealMessage(data.message || 'Perintah konfigurasi otomatis & set password telah dikirim ke Agent!');
                setDetails((prev) => ({ ...prev, unattended_password: customPass }));
                setTimeout(() => connectToRustDesk(), 8000);
            } else {
                setHealMessage(data.error || 'Gagal mengirim perintah ke Agent');
            }
        } catch (err) {
            setHealMessage('Gagal menghubungi server untuk mengirim perintah Agent.');
        } finally {
            setHealing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col text-white font-sans overflow-y-auto">
            {/* Top Bar */}
            <div className="h-16 border-b border-white/10 bg-slate-900/90 flex items-center justify-between px-6 shadow-lg flex-none">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => (onBack ? onBack() : navigate(-1))}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-sm sm:text-base font-black tracking-wide text-white flex items-center gap-2">
                            <span>TCF RustDesk Remote Console:</span>
                            <span className="text-cyan-400">{details.asset_name}</span>
                        </h1>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${details.rustdesk_id || details.ip_address ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                                <span className="text-slate-200 font-semibold">{status}</span>
                            </span>
                            {details.ip_address && (
                                <>
                                    <span>•</span>
                                    <span className="font-mono text-cyan-300">LAN IP: {details.ip_address}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={connectToRustDesk}
                        disabled={loading}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer transition-all"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
                        <span>Refresh Status</span>
                    </button>
                </div>
            </div>

            {/* Main Console Content */}
            <div className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col justify-center gap-6">

                {/* Auto-Copied Toast Banner */}
                {copiedKey === 'auto_pass' && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span>Password Unattended ({details.unattended_password}) otomatis disalin ke Clipboard! Tinggal tekan Ctrl+V di jendela RustDesk.</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Primary 1-Click Remote Launchers (7 Cols) */}
                    <div className="lg:col-span-7 rounded-3xl bg-slate-900/90 border border-cyan-500/25 p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-6">
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                                        <Monitor size={26} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white">Koneksi Remote Instan (1-Click)</h2>
                                        <p className="text-xs text-slate-400">Pilih jalur koneksi via ID Server 66 atau Direct LAN IP.</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                                    Zero-Lag LAN
                                </span>
                            </div>

                            {/* ID & Password Credentials Box */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="p-4 rounded-2xl bg-slate-950/90 border border-white/10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                                        RustDesk ID Perangkat
                                    </span>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-base sm:text-lg font-black text-cyan-300">
                                            {details.rustdesk_id || 'Belum Terdaftar'}
                                        </span>
                                        {details.rustdesk_id && (
                                            <button
                                                onClick={() => handleCopy(details.rustdesk_id, 'id')}
                                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
                                            >
                                                {copiedKey === 'id' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                                <span>{copiedKey === 'id' ? 'Disalin' : 'Salin'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-950/90 border border-white/10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                                        Password Unattended ICT
                                    </span>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-base sm:text-lg font-black text-emerald-300">
                                            {details.unattended_password}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(details.unattended_password, 'pass')}
                                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
                                        >
                                            {copiedKey === 'pass' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                            <span>{copiedKey === 'pass' ? 'Disalin' : 'Salin'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Action Launch Buttons */}
                            <div className="space-y-3 pt-1">
                                <button
                                    onClick={handleLaunchById}
                                    disabled={!details.rustdesk_id}
                                    className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                                        details.rustdesk_id
                                            ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:brightness-110 text-white shadow-xl shadow-cyan-500/20'
                                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    <ExternalLink size={17} />
                                    <span>
                                        {details.rustdesk_id
                                            ? `Buka RustDesk via ID (${details.rustdesk_id}) + Auto-Copy Password`
                                            : 'ID RustDesk Belum Tersedia (Gunakan Direct IP atau Tombol Auto-Fix di Kanan)'}
                                    </span>
                                </button>

                                {details.ip_address && (
                                    <button
                                        onClick={handleLaunchByIp}
                                        className="w-full py-3 px-5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <Wifi size={16} className="text-emerald-400" />
                                        <span>Buka RustDesk via Direct LAN IP ({details.ip_address}) — Tanpa Perlu ID!</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
                            <span>💡 Saat tombol diklik, password otomatis disalin ke Clipboard (tinggal tekan <b>Ctrl+V</b>).</span>
                        </div>
                    </div>

                    {/* Right Column: Self-Healing Agent Controls & Server 66 Config (5 Cols) */}
                    <div className="lg:col-span-5 space-y-5">

                        {/* Card 1: Remote Auto-Fix & Set Password via TCF Agent */}
                        <div className="rounded-3xl bg-slate-900/90 border border-white/15 p-6 space-y-4">
                            <div className="flex items-center gap-2.5">
                                <Wrench size={18} className="text-amber-400" />
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                    Perbaikan & Set Password via Agent
                                </h3>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Jika PC target gagal di-remote atau meminta konfirmasi, klik tombol di bawah untuk memerintahkan <b>TCF Agent</b> mengatur ulang Server 66, membuka Firewall LAN, mengaktifkan <i>Direct IP</i>, dan memasang password otomatis.
                            </p>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                                    Set Password Unattended Baru
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customPass}
                                        onChange={(e) => setCustomPass(e.target.value)}
                                        className="flex-1 bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white outline-none focus:border-cyan-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoteHealAndPassword}
                                        disabled={healing}
                                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer transition-all shrink-0"
                                    >
                                        {healing ? 'Mengirim...' : 'Auto-Fix & Set Pass'}
                                    </button>
                                </div>
                            </div>

                            {healMessage && (
                                <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-xs text-cyan-200 font-semibold">
                                    {healMessage}
                                </div>
                            )}
                        </div>

                        {/* Card 2: Server 66 Configuration for Admin Laptop */}
                        <div className="rounded-3xl bg-slate-900/90 border border-white/15 p-6 space-y-3">
                            <div className="flex items-center gap-2.5">
                                <Key size={17} className="text-cyan-400" />
                                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                                    Konfigurasi RustDesk Server 66 (Untuk Laptop Admin)
                                </h3>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Pastikan aplikasi RustDesk di laptop Anda menggunakan ID Server & Key berikut:
                            </p>

                            <div className="space-y-2 text-xs font-mono">
                                <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-slate-500 block">ID / Relay Server:</span>
                                        <span className="text-white font-bold">{details.server_config.id_server}</span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(details.server_config.id_server, 'srv')}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                                    >
                                        {copiedKey === 'srv' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                    </button>
                                </div>

                                <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between gap-2">
                                    <div className="truncate">
                                        <span className="text-[10px] text-slate-500 block">Public Key (Server 66):</span>
                                        <span className="text-cyan-300 font-bold truncate block">{details.server_config.key}</span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(details.server_config.key, 'pkey')}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer shrink-0"
                                    >
                                        {copiedKey === 'pkey' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}

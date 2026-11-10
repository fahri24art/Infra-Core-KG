import React, { useState, useEffect } from 'react';
import {
    Network, ShieldAlert, ShieldCheck, RefreshCw, Plus, Trash2,
    CheckCircle2, XCircle, Search, Power, AlertTriangle, Cpu,
    Clock, Activity, HardDrive, Filter, Copy, Check, Save, Lock, Eye, EyeOff
} from 'lucide-react';

export default function MikrotikOperationsTab({ settings, onChange, onSave, isSaving }) {
    // Current Plant: 'SG' (Sadang) or 'KG' (Karawang)
    const [selectedPlant, setSelectedPlant] = useState('SG');

    // Live API test state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Address-list state
    const [addressLists, setAddressLists] = useState([]);
    const [listCounts, setListCounts] = useState({});
    const [totalEntries, setTotalEntries] = useState(0);
    const [selectedListFilter, setSelectedListFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [actionStatus, setActionStatus] = useState(null);

    // New Entry Form State
    const [newAddress, setNewAddress] = useState('');
    const [newList, setNewList] = useState('BLOCKED_ISOLATED');
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Router config keys based on plant
    const configPrefix = selectedPlant === 'SG' ? 'sg' : 'kg';
    const hostKey = `mikrotik_${configPrefix}_ip`;
    const portKey = `mikrotik_${configPrefix}_port`;
    const userKey = `mikrotik_${configPrefix}_user`;
    const passKey = `mikrotik_${configPrefix}_pass`;

    const defaultHost = selectedPlant === 'SG' ? '192.168.1.1' : '192.168.27.1';
    const defaultPort = 8728;
    const defaultUser = 'api_mikrotik';
    const defaultPass = selectedPlant === 'SG' ? 'Nevergiveup572!!!' : 'Nevergiveup572!!!';

    const currentNetwork = settings.network || {};
    const host = currentNetwork[hostKey] ?? currentNetwork.mikrotik_ip ?? defaultHost;
    const port = currentNetwork[portKey] ?? currentNetwork.mikrotik_port ?? defaultPort;
    const user = currentNetwork[userKey] ?? currentNetwork.mikrotik_user ?? defaultUser;
    const pass = currentNetwork[passKey] ?? currentNetwork.mikrotik_pass ?? currentNetwork.mikrotik_password ?? defaultPass;

    // Run connection test
    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/settings/test-mikrotik', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port, user, password: pass })
            });
            const data = await res.json();
            setTestResult(data);
        } catch (err) {
            setTestResult({ success: false, error: err.message });
        } finally {
            setIsTesting(false);
        }
    };

    // Fetch address list from MikroTik
    const fetchAddressList = async (listFilter = selectedListFilter) => {
        setIsLoadingList(true);
        setActionStatus(null);
        try {
            const res = await fetch('/api/settings/mikrotik/address-list/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host,
                    port,
                    user,
                    password: pass,
                    listName: listFilter
                })
            });
            const data = await res.json();
            if (data.success) {
                setAddressLists(data.items || []);
                setListCounts(data.listCounts || {});
                setTotalEntries(data.totalEntries || 0);
            } else {
                setActionStatus({ type: 'error', message: data.error || 'Gagal memuat address-list' });
            }
        } catch (err) {
            setActionStatus({ type: 'error', message: err.message });
        } finally {
            setIsLoadingList(false);
        }
    };

    useEffect(() => {
        fetchAddressList(selectedListFilter);
    }, [selectedPlant, selectedListFilter]);

    // Add entry to address-list
    const handleAddEntry = async (e) => {
        e.preventDefault();
        if (!newAddress.trim()) {
            return setActionStatus({ type: 'error', message: 'IP Address / Subnet tidak boleh kosong' });
        }

        setIsSubmitting(true);
        setActionStatus(null);
        try {
            const res = await fetch('/api/settings/mikrotik/address-list/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host,
                    port,
                    user,
                    password: pass,
                    action: 'add',
                    list: newList,
                    address: newAddress.trim(),
                    comment: newComment.trim() || `Added via UI [${selectedPlant}]`
                })
            });
            const data = await res.json();
            if (data.success) {
                setActionStatus({ type: 'success', message: data.message });
                setNewAddress('');
                setNewComment('');
                fetchAddressList(selectedListFilter);
            } else {
                setActionStatus({ type: 'error', message: data.error });
            }
        } catch (err) {
            setActionStatus({ type: 'error', message: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Remove entry from address list
    const handleRemoveEntry = async (item) => {
        if (!window.confirm(`Yakin ingin menghapus ${item.address} dari daftar ${item.list}?`)) return;

        setActionStatus(null);
        try {
            const res = await fetch('/api/settings/mikrotik/address-list/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host,
                    port,
                    user,
                    password: pass,
                    action: 'remove',
                    id: item.id
                })
            });
            const data = await res.json();
            if (data.success) {
                setActionStatus({ type: 'success', message: `Berhasil menghapus ${item.address}` });
                fetchAddressList(selectedListFilter);
            } else {
                setActionStatus({ type: 'error', message: data.error });
            }
        } catch (err) {
            setActionStatus({ type: 'error', message: err.message });
        }
    };

    // Toggle enable/disable entry
    const handleToggleEntry = async (item) => {
        try {
            const res = await fetch('/api/settings/mikrotik/address-list/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host,
                    port,
                    user,
                    password: pass,
                    action: 'toggle',
                    id: item.id,
                    disabled: item.disabled
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchAddressList(selectedListFilter);
            }
        } catch (err) {
            setActionStatus({ type: 'error', message: err.message });
        }
    };

    // Filtered items by search query
    const filteredItems = addressLists.filter(item => {
        const query = searchQuery.toLowerCase();
        return (
            item.address?.toLowerCase().includes(query) ||
            item.list?.toLowerCase().includes(query) ||
            item.comment?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Switcher: Plant Sadang vs Plant Karawang */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-3xl shadow-xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                        <Network size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight">MikroTik RouterOS Central Controller</h3>
                        <p className="text-slate-400 text-xs">Pilih router target untuk memantau status API dan aturan firewall pemblokiran.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60">
                    <button
                        onClick={() => setSelectedPlant('SG')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            selectedPlant === 'SG'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Plant Sadang (192.168.1.1)
                    </button>
                    <button
                        onClick={() => setSelectedPlant('KG')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            selectedPlant === 'KG'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Plant Karawang (192.168.27.1)
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {actionStatus && (
                <div
                    className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-200 ${
                        actionStatus.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {actionStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span>{actionStatus.message}</span>
                    </div>
                    <button onClick={() => setActionStatus(null)} className="text-slate-400 hover:text-slate-600 text-xs font-black">
                        ✕
                    </button>
                </div>
            )}

            {/* Card 1: Router Connection & Diagnostics */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <div>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                            Parameter API RouterOS ({selectedPlant === 'SG' ? 'Sadang' : 'Karawang'})
                        </h4>
                        <p className="text-xs text-slate-400">Kredensial API port 8728 untuk komunikasi otomatis sistem.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                        >
                            <Save size={14} />
                            <span>{isSaving ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
                        </button>
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
                            <span>{isTesting ? 'Menghubungkan...' : '⚡ Test MikroTik API'}</span>
                        </button>
                    </div>
                </div>

                {/* Configuration Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Router IP Address
                        </label>
                        <input
                            type="text"
                            value={host}
                            onChange={(e) => onChange('network', hostKey, e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            API Port (Default: 8728)
                        </label>
                        <input
                            type="number"
                            value={port}
                            onChange={(e) => onChange('network', portKey, parseInt(e.target.value) || 8728)}
                            className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-center"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Username API
                        </label>
                        <input
                            type="text"
                            value={user}
                            onChange={(e) => onChange('network', userKey, e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="relative">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Password API
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={pass}
                                onChange={(e) => onChange('network', passKey, e.target.value)}
                                className="w-full pl-3 pr-8 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Test Result Display */}
                {testResult && (
                    <div className="mt-5 pt-4 border-t border-slate-100">
                        {testResult.success ? (
                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-emerald-800 text-sm">{testResult.identity}</span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                                                RouterOS v{testResult.version}
                                            </span>
                                            <span className="text-xs text-emerald-600 font-bold">
                                                ({testResult.latency}ms)
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-4 font-medium">
                                            <span>Uptime: <b className="text-slate-800 font-mono">{testResult.uptime}</b></span>
                                            <span>CPU Load: <b className="text-slate-800 font-mono">{testResult.cpuLoad}%</b></span>
                                            <span>Free RAM: <b className="text-slate-800 font-mono">{testResult.freeMemory} / {testResult.totalMemory}</b></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700">
                                <XCircle size={20} className="shrink-0" />
                                <div>
                                    <div className="font-black text-xs uppercase tracking-wider">Koneksi API Gagal</div>
                                    <div className="text-xs font-mono mt-0.5">{testResult.error}</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Card 2: Interactive Firewall Address-List & Blocking Manager */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-rose-600" size={20} />
                            <h4 className="font-black text-slate-800 text-base uppercase tracking-wider">
                                Pusat Pemblokiran & Firewall Address-List
                            </h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Kelola daftar IP yang diblokir, dikarantina, atau dibypass dari filter firewall secara instan tanpa login ke WinBox.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                            Total {totalEntries} Aturan
                        </span>
                        <button
                            onClick={() => fetchAddressList(selectedListFilter)}
                            disabled={isLoadingList}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all"
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className={isLoadingList ? 'animate-spin text-blue-600' : ''} />
                        </button>
                    </div>
                </div>

                {/* Add Entry Form */}
                <form onSubmit={handleAddEntry} className="bg-slate-50 border border-slate-200/70 p-4 rounded-2xl">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                        <Plus size={14} className="text-blue-600" />
                        Tambah Target Pemblokiran / Address List Baru
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                Kategori / Address List
                            </label>
                            <select
                                value={newList}
                                onChange={(e) => setNewList(e.target.value)}
                                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                            >
                                <option value="BLOCKED_ISOLATED">BLOCKED_ISOLATED (Blokir Total)</option>
                                <option value="IP-Proxy-Block">IP-Proxy-Block (Blokir Akses Internet)</option>
                                <option value="QUARANTINE_ISOLATED">QUARANTINE_ISOLATED (Karantina Segmen)</option>
                                <option value="Shopfloor-Clients">Shopfloor-Clients (Bypass Mesin Produksi)</option>
                                <option value="Shopfloor-Destination">Shopfloor-Destination (Server Produksi)</option>
                                <option value="Bypass_Microsoft">Bypass_Microsoft</option>
                            </select>
                        </div>
                        <div className="md:col-span-4">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                IP Address atau CIDR Subnet
                            </label>
                            <input
                                type="text"
                                placeholder="Contoh: 192.168.1.185 atau 192.168.2.0/24"
                                value={newAddress}
                                onChange={(e) => setNewAddress(e.target.value)}
                                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                Keterangan / Alasan
                            </label>
                            <input
                                type="text"
                                placeholder="Contoh: Infeksi Malware / PC Anomali"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                            />
                        </div>
                        <div className="md:col-span-2 flex items-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                <Plus size={14} />
                                <span>{isSubmitting ? 'Menerapkan...' : 'Terapkan'}</span>
                            </button>
                        </div>
                    </div>
                </form>

                {/* Filter Tabs & Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {['ALL', 'BLOCKED_ISOLATED', 'IP-Proxy-Block', 'Shopfloor-Clients', 'Shopfloor-Destination', 'port_scanners'].map((tab) => {
                            const count = tab === 'ALL' ? totalEntries : (listCounts[tab] || 0);
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setSelectedListFilter(tab)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                        selectedListFilter === tab
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <span>{tab}</span>
                                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari IP, kategori, atau catatan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                        />
                    </div>
                </div>

                {/* Table of Entries */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[450px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3">IP / Subnet Target</th>
                                    <th className="px-4 py-3">Address List</th>
                                    <th className="px-4 py-3">Catatan / Alasan</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {isLoadingList ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                                            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                                            Memuat data address list dari router...
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-slate-400 font-bold">
                                            Tidak ada data address list yang cocok dengan filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                                <span className="flex items-center gap-2">
                                                    {item.address}
                                                    {item.dynamic && (
                                                        <span className="px-1.5 py-0.2 bg-amber-50 text-amber-600 border border-amber-200 text-[9px] rounded font-sans uppercase">
                                                            Dynamic
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        item.list.includes('Block') || item.list.includes('BLOCKED')
                                                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                            : item.list.includes('QUARANTINE')
                                                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                            : item.list.includes('Shopfloor')
                                                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                            : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    {item.list}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 font-normal">
                                                {item.comment || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        !item.disabled
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : 'bg-slate-100 text-slate-400'
                                                    }`}
                                                >
                                                    {!item.disabled ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-1">
                                                <button
                                                    onClick={() => handleToggleEntry(item)}
                                                    className={`p-1.5 rounded-lg transition-all ${
                                                        !item.disabled
                                                            ? 'text-amber-600 hover:bg-amber-50'
                                                            : 'text-emerald-600 hover:bg-emerald-50'
                                                    }`}
                                                    title={!item.disabled ? 'Nonaktifkan Rule' : 'Aktifkan Rule'}
                                                >
                                                    <Power size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveEntry(item)}
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Hapus / Unblock"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Shield, Lock, Usb, Terminal, Download, AlertTriangle, CheckCircle, Info, Settings, Server } from 'lucide-react';

export default function EndpointLockdown() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [logs, setLogs] = useState([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [policies, setPolicies] = useState({
        removeLocalAdmin: true,
        blockUsbStorage: false,
        blockUnsignedExe: false,
        disableControlPanel: false
    });

    const handlePolicyChange = (key) => {
        setPolicies(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/lockdown/logs');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            const res = await fetch('/api/lockdown/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-organization': user.organization || 'TCF-SG'
                },
                body: JSON.stringify({ policies })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to generate script');
            }

            // Download the blob
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            // Create dynamic filename with full timestamp
            const ts = new Date().toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
            a.download = `TCF_Endpoint_Hardening_v${ts}.ps1`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            alert('Script generated successfully! Please check your downloads.');
        } catch (error) {
            console.error('Error generating script:', error);
            alert('Error generating script: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-3">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Shield size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Endpoint Hardening</h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Zero Trust & Device Lockdown Configuration (Administrator Keras)
                        </p>
                    </div>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={24} />
                <div>
                    <h3 className="font-bold text-amber-900 text-lg">Perhatian! (Warning)</h3>
                    <p className="text-amber-800 font-medium text-sm mt-1 leading-relaxed">
                        Fitur ini akan menghasilkan skrip PowerShell tingkat tinggi (High Privilege) yang akan mengunci fungsi dasar Windows pada PC target. 
                        Pastikan Anda hanya menjalankan skrip ini pada PC karyawan yang bersangkutan, dan <b>JANGAN</b> menjalankannya di Server Utama!
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Policy Selection */}
                <div className="lg:col-span-2 space-y-3">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Lock size={20} className="text-blue-600" /> Pilih Kebijakan (Security Policies)
                    </h2>

                    {/* Policy 1 */}
                    <div 
                        onClick={() => handlePolicyChange('removeLocalAdmin')}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                            policies.removeLocalAdmin ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                policies.removeLocalAdmin ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                            }`}>
                                {policies.removeLocalAdmin && <CheckCircle size={16} />}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${policies.removeLocalAdmin ? 'text-blue-900' : 'text-slate-700'}`}>
                                    Cabut Hak Local Admin (LAPS Mode)
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Mencegah karyawan melakukan instalasi software secara sembarangan. Skrip akan menghapus semua user lokal dari grup 'Administrators' kecuali akun IT.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Policy 2 */}
                    <div 
                        onClick={() => handlePolicyChange('blockUsbStorage')}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                            policies.blockUsbStorage ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                policies.blockUsbStorage ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                            }`}>
                                {policies.blockUsbStorage && <CheckCircle size={16} />}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg flex items-center gap-2 ${policies.blockUsbStorage ? 'text-blue-900' : 'text-slate-700'}`}>
                                    Blokir USB Flashdisk <Usb size={18} />
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Mengubah Registry Windows (USBSTOR) agar PC menolak membaca Flashdisk/Hardisk Eksternal. Mouse dan Keyboard USB tetap berfungsi normal.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Policy 3 */}
                    <div 
                        onClick={() => handlePolicyChange('blockUnsignedExe')}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                            policies.blockUnsignedExe ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                policies.blockUnsignedExe ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                            }`}>
                                {policies.blockUnsignedExe && <CheckCircle size={16} />}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg flex items-center gap-2 ${policies.blockUnsignedExe ? 'text-blue-900' : 'text-slate-700'}`}>
                                    AppLocker Lite (Blokir .EXE Liar) <Terminal size={18} />
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Menolak eksekusi aplikasi dari folder sementara (seperti Downloads atau Desktop). Hanya mengizinkan eksekusi dari C:\Program Files dan C:\Windows.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Policy 4 */}
                    <div 
                        onClick={() => handlePolicyChange('disableControlPanel')}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                            policies.disableControlPanel ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                policies.disableControlPanel ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                            }`}>
                                {policies.disableControlPanel && <CheckCircle size={16} />}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg flex items-center gap-2 ${policies.disableControlPanel ? 'text-blue-900' : 'text-slate-700'}`}>
                                    Kunci Control Panel & Regedit <Settings size={18} />
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Memblokir akses karyawan ke Control Panel, Registry Editor (regedit.exe), dan Command Prompt (cmd.exe).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Action */}
                <div className="space-y-3">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
                        <h3 className="font-black text-slate-900 text-lg mb-4 border-b pb-4">Tindakan Lanjutan</h3>
                        
                        <div className="space-y-3">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-sm text-slate-600 font-medium">
                                    Total Kebijakan Terpilih: 
                                    <span className="font-black text-blue-600 ml-2 text-lg">
                                        {Object.values(policies).filter(Boolean).length}
                                    </span>
                                </p>
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || Object.values(policies).filter(Boolean).length === 0}
                                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold shadow-lg transition-all ${
                                    isGenerating || Object.values(policies).filter(Boolean).length === 0
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:-translate-y-1'
                                }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Generate Hardening Agent
                                    </>
                                )}
                            </button>

                            <div className="text-xs text-slate-500 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                                <Info className="text-blue-600 shrink-0" size={16} />
                                <span>
                                    File hasil generate bisa disebarkan melalui Flashdisk atau via Group Policy (GPO). 
                                    Klik kanan pada file .ps1 dan pilih <b>Run with PowerShell</b> di PC target.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Telemetry */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Server className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Daftar PC Terkunci (Telemetry)</h2>
                            <p className="text-sm text-slate-500">Laporan otomatis dari script agent yang berhasil dieksekusi</p>
                        </div>
                    </div>
                    <button onClick={fetchLogs} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Refresh
                    </button>
                </div>
                
                <div className="p-4">
                    {isLoadingLogs ? (
                        <div className="text-center py-8 text-slate-500">Memuat data...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Belum ada laporan PC yang di-lockdown.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-sm font-medium text-slate-500">
                                        <th className="pb-3 px-4 text-[10px] uppercase tracking-widest">Hostname (PC Name)</th>
                                        <th className="pb-3 px-4 text-[10px] uppercase tracking-widest">IP Address</th>
                                        <th className="pb-3 px-4 text-[10px] uppercase tracking-widest">Waktu Eksekusi</th>
                                        <th className="pb-3 px-4 text-[10px] uppercase tracking-widest">Kebijakan Diterapkan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => {
                                        let pol = {};
                                        try { pol = JSON.parse(log.policies || '{}'); } catch(e){}
                                        return (
                                            <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-1.5 font-medium text-slate-800">
                                                    <div className="flex items-center gap-2">
                                                        <Terminal className="w-4 h-4 text-slate-400" />
                                                        {log.hostname}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-slate-600 font-mono text-[11px]">{log.ip_address}</td>
                                                <td className="px-3 py-1.5 text-slate-500 text-[11px]">
                                                    {new Date(log.created_at).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-3 py-1.5 text-[11px]">
                                                    <div className="flex gap-2 flex-wrap">
                                                        {pol.removeLocalAdmin && <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-md font-medium border border-red-100">No Admin</span>}
                                                        {pol.blockUsbStorage && <span className="px-2 py-1 bg-orange-50 text-orange-600 text-xs rounded-md font-medium border border-orange-100">No USB</span>}
                                                        {pol.blockUnsignedExe && <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md font-medium border border-blue-100">AppLocker</span>}
                                                        {pol.disableControlPanel && <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-md font-medium border border-purple-100">Locked CP</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

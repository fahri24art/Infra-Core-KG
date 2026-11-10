import React, { useState } from 'react';
import {
    MessageCircle, Send, CheckCircle2, XCircle, RefreshCw,
    Radio, AlertCircle, Phone, FileText
} from 'lucide-react';

export default function WhatsAppTesterDrawer({ gatewayUrl }) {
    const [targetPhone, setTargetPhone] = useState('6282135353242');
    const [testMessage, setTestMessage] = useState('Uji coba integrasi bot WhatsApp dari Pusat Konfigurasi Admin TCF Power Asset');
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState(null);

    const handleSendTest = async (e) => {
        e.preventDefault();
        if (!targetPhone.trim() || !testMessage.trim()) return;

        setIsSending(true);
        setResult(null);
        try {
            const res = await fetch('/api/settings/test-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gatewayUrl: gatewayUrl || 'http://192.168.1.66:5002',
                    phone: targetPhone.trim(),
                    message: testMessage.trim()
                })
            });
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setResult({ success: false, error: err.message });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <MessageCircle size={18} />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                            Live WhatsApp Dispatcher & Gateway Tester
                        </h4>
                        <p className="text-xs text-slate-400">Kirim pesan uji coba langsung ke nomor HP teknisi / grup untuk memverifikasi bot.</p>
                    </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                    {gatewayUrl || 'http://192.168.1.66:5002'}
                </span>
            </div>

            <form onSubmit={handleSendTest} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                <div className="md:col-span-4">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Nomor HP Target (Format: 628...)
                    </label>
                    <input
                        type="text"
                        value={targetPhone}
                        onChange={(e) => setTargetPhone(e.target.value)}
                        placeholder="628123456789"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                    />
                </div>
                <div className="md:col-span-6">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Pesan Uji Coba
                    </label>
                    <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Ketik isi pesan..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                    />
                </div>
                <div className="md:col-span-2 flex items-end">
                    <button
                        type="submit"
                        disabled={isSending}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        <Send size={13} className={isSending ? 'animate-pulse' : ''} />
                        <span>{isSending ? 'Mengirim...' : 'Kirim Uji'}</span>
                    </button>
                </div>
            </form>

            {result && (
                <div className="pt-2">
                    {result.success ? (
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-200">
                            <CheckCircle2 size={16} />
                            <span>Pesan berhasil dikirim via WhatsApp Gateway ({result.latency}ms latency). Status bot: {result.status}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-rose-700 bg-rose-50 px-3 py-2 rounded-xl text-xs font-bold border border-rose-200">
                            <XCircle size={16} />
                            <span>Gagal Mengirim: {result.error}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info, RefreshCw, Zap, ShieldAlert, X, Terminal, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export default function MikrotikAudit() {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [executingFix, setExecutingFix] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(null);

    const fetchInsights = async () => {
        setLoading(true);
        try {
            let res;
            try { res = await fetch('/api/security/intel/ai/insights'); }
            catch { res = await fetch('/api/security/intel/ai/insights'); }

            if (res.ok) {
                const data = await res.json();
                setInsights(data || []);
            }
        } catch (error) {
            console.error("Failed to fetch AI insights", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFix = async (analysisId) => {
        setExecutingFix(analysisId);
        try {
            let res;
            try {
                res = await fetch(`/api/security/intel/ai/apply-fix/${analysisId}`, { method: 'POST' });
            } catch {
                res = await fetch(`/api/security/intel/ai/apply-fix/${analysisId}`, { method: 'POST' });
            }

            const data = await res.json();
            if (data.status === 'success') {
                alert("Fix applied successfully! Mikrotik configuration has been hardened.");
                fetchInsights(); // Refresh to mark as resolved
            } else {
                alert("Failed to apply fix: " + (data.message || "Unknown error"));
            }
        } catch (error) {
            alert("Error connecting to server to apply fix.");
        } finally {
            setExecutingFix(null);
            setShowConfirmModal(null);
        }
    };

    useEffect(() => {
        fetchInsights();
        const interval = setInterval(fetchInsights, 60000);
        return () => clearInterval(interval);
    }, []);

    const getSeverityColor = (sev) => {
        switch (sev?.toLowerCase()) {
            case 'critical': return 'text-red-600 bg-red-50 border-red-100';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
            default: return 'text-blue-600 bg-blue-50 border-blue-100';
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-3 animate-in fade-in duration-500">
                {/* AI Status Header */}
                <div className="bg-white rounded-xl md:rounded-2xl p-5 md:p-4 text-white relative overflow-hidden shadow-2xl border border-slate-100">
                    <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none">
                        <Activity size={100} />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
                            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl  animate-pulse">
                                <ShieldAlert className="text-indigo-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-base md:text-lg font-black tracking-tight">Global Security AI Intelligence</h2>
                                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-0.5">Autonomous Infrastructure Hardening & Wazuh Threat Detection</p>
                            </div>
                        </div>

                        <button
                            onClick={fetchInsights}
                            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-all font-black text-[10px] uppercase tracking-tight"
                        >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            Rescan Configuration
                        </button>
                    </div>
                </div>

                {loading && insights.length === 0 ? (
                    <div className="text-center p-20 text-slate-500 font-bold uppercase tracking-widest text-xs">AI is analyzing configuration...</div>
                ) : insights.filter(i => i.status !== 'Resolved').length === 0 ? (
                    <Card className="p-10 md:p-16 flex flex-col items-center text-center bg-emerald-50/20 border-dashed border border-emerald-100 rounded-xl md:rounded-2xl">
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-full mb-3 shadow-sm">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-lg font-black text-emerald-900 tracking-tight">Vulnerability Audit Passed</h3>
                        <p className="text-emerald-700/60 max-w-sm mt-1.5 text-[11px] font-medium leading-relaxed">The AI has audited your Mikrotik and found no critical security flaws or configuration conflicts.</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {insights.filter(i => i.status !== 'Resolved').map((insight, idx) => {
                            const severityObj = {
                                'Critical': { text: 'Sangat Bahaya', border: 'border-l-red-500', bg: 'bg-red-50/30 hover:bg-red-50/50', textClr: 'text-red-600', iconBg: 'bg-red-100 text-red-600', icon: ShieldAlert },
                                'High': { text: 'Bahaya', border: 'border-l-orange-500', bg: 'bg-orange-50/30 hover:bg-orange-50/50', textClr: 'text-orange-600', iconBg: 'bg-orange-100 text-orange-600', icon: AlertTriangle },
                                'Medium': { text: 'Waspada', border: 'border-l-amber-500', bg: 'bg-amber-50/30 hover:bg-amber-50/50', textClr: 'text-amber-600', iconBg: 'bg-amber-100 text-amber-600', icon: AlertTriangle },
                                'Low': { text: 'Tidak Bahaya', border: 'border-l-emerald-500', bg: 'bg-emerald-50/30 hover:bg-emerald-50/50', textClr: 'text-emerald-600', iconBg: 'bg-emerald-100 text-emerald-600', icon: Info }
                            };
                            
                            const sevKey = insight.severity || 'Low';
                            const sevConfig = severityObj[sevKey] || severityObj['Low'];
                            const IconComponent = sevConfig.icon;

                            return (
                                <div key={idx} className={`group rounded-xl border border-slate-100 shadow-sm transition-all duration-300 overflow-hidden border-l-4 ${sevConfig.bg} ${sevConfig.border}`}>
                                    <details className="group/details">
                                        <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer list-none select-none">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${sevConfig.iconBg}`}>
                                                    <IconComponent size={14} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-700 text-[11px] md:text-xs flex items-center gap-2">
                                                        {insight.threat_type}
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-current bg-white ${sevConfig.textClr}`}>
                                                            {sevConfig.text}
                                                        </span>
                                                    </h3>
                                                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium italic opacity-70">
                                                        {insight.pattern_detected}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {insight.technical_commands ? (
                                                    <span className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                                        <Zap size={10} fill="currentColor" /> AI-FIX
                                                    </span>
                                                ) : (
                                                    <span className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 text-slate-500 text-[8px] font-black uppercase tracking-widest border border-slate-100">
                                                        MANUAL
                                                    </span>
                                                )}
                                                <div className="transform group-open/details:rotate-180 transition-transform duration-300 text-slate-700">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                </div>
                                            </div>
                                        </summary>

                                        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-300">
                                            <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-4">
                                                <div className="flex-1 space-y-3">
                                                    {insight.rationale && (
                                                        <div>
                                                            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 leading-none">
                                                                <Activity size={10} /> Risk Analysis
                                                            </h4>
                                                            <p className="text-[11px] text-slate-500 leading-normal bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 font-medium">
                                                                {insight.rationale}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 leading-none">Recommendation</h4>
                                                        <p className="text-[11px] font-black text-indigo-700 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50">
                                                            {insight.recommendation}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="md:w-48 flex flex-col justify-end gap-2">
                                                    <div className="text-[9px] text-slate-500 font-mono italic opacity-60">
                                                        ID: {insight.id}
                                                    </div>
                                                    {insight.technical_commands ? (
                                                        <button
                                                            onClick={() => setShowConfirmModal(insight)}
                                                            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 active:scale-[0.98] flex items-center justify-center gap-1.5"
                                                        >
                                                            <Zap size={12} fill="currentColor" />
                                                            Deploy Fix
                                                        </button>
                                                    ) : (
                                                        <button disabled className="w-full py-2 bg-slate-50 text-slate-700 rounded-lg font-black text-[10px] uppercase tracking-widest cursor-not-allowed border border-slate-100 flex items-center justify-center gap-1.5 opacity-60">
                                                            <ShieldAlert size={12} />
                                                            Manual Required
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            );
                        })}
                    </div>
                )}

                {showConfirmModal && (
                    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="max-w-xl w-full p-5 md:p-4 space-y-3 animate-in zoom-in-95 duration-300 rounded-xl md:rounded-2xl border border-slate-200">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-200">
                                        <Terminal size={18} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">AI Deployment Confirmation</h3>
                                </div>
                                <button onClick={() => setShowConfirmModal(null)} className="text-slate-700 hover:text-slate-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                    <p className="text-[10px] text-amber-800 font-black flex items-center gap-1.5 uppercase tracking-tight">
                                        <AlertTriangle size={14} /> Safety Guardrails Active
                                    </p>
                                    <p className="text-[10px] text-amber-700/70 mt-0.5 font-medium leading-normal italic">Infra Guard will perform an automated configuration snapshot before execution.</p>
                                </div>

                                <div className="bg-white rounded-xl p-4 overflow-hidden border border-slate-200">
                                    <div className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Proposed RouterOS Directives</div>
                                    <pre className="text-emerald-400/90 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[200px] no-scrollbar">
                                        {JSON.stringify(JSON.parse(showConfirmModal.technical_commands), null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowConfirmModal(null)}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-500 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={() => handleApplyFix(showConfirmModal.id)}
                                    disabled={executingFix === showConfirmModal.id}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {executingFix === showConfirmModal.id ? (
                                        <>
                                            <Loader2 className="animate-spin" size={12} />
                                            PROVISIONING...
                                        </>
                                    ) : (
                                        "COMMIT CHANGES"
                                    )}
                                </button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

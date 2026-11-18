import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Printer, ArrowLeft, RefreshCw, BarChart3, Building2, Sparkles, Activity, ShieldCheck, Clock, FileText, Calendar, X, Download } from 'lucide-react';
import bgImage from '../assets/space-background.jpg';
import MonthlyAnalytics from './ricoh/MonthlyAnalytics';
import PublicDepartmentQuotas from './ricoh/PublicDepartmentQuotas';
import RicohDashboard from './ricoh/Dashboard';
import RicohJobHistory from './ricoh/JobHistory';
import { generateRicohManagementPdf } from '../utils/generateRicohManagementPdf';

export default function PublicRicohDashboard() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');

  // PDF Management Export Modal State (No-Login Executive Access)
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfMeta, setPdfMeta] = useState({ billingCycle: null, availableMonths: [] });
  const [pdfMode, setPdfMode] = useState('active'); // 'active' | 'months' | 'custom'
  const [pdfSelectedMonths, setPdfSelectedMonths] = useState([]);
  const [pdfStartDate, setPdfStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pdfStartTime, setPdfStartTime] = useState('00:00');
  const [pdfEndDate, setPdfEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pdfEndTime, setPdfEndTime] = useState('23:59');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfBilling, setPdfBilling] = useState({
    rateBw: 100,
    rateColor: 1400,
    monthlyBaseFee: 1900000,
    freeBwPerMonth: 1000,
    freeColorPerMonth: 100,
    includeTax: false
  });

  const queryOrg = new URLSearchParams(window.location.search).get('org') || 'TCF-SG';
  const plantLabel = queryOrg === 'TCF-KG' ? 'Plant Karawang' : 'Plant Sadang - Purwakarta';

  const handleOpenPdfModal = async () => {
    setShowPdfModal(true);
    try {
      const res = await axios.get(`/api/ricoh/management-report-data?mode=meta&org=${encodeURIComponent(queryOrg)}`);
      const cycle = res.data?.billingCycle;
      const avail = res.data?.availableMonths || [];
      setPdfMeta({ billingCycle: cycle, availableMonths: avail });
      if (cycle?.billingMonth) {
        setPdfSelectedMonths([cycle.billingMonth]);
        setPdfStartDate(cycle.startDate || new Date().toISOString().split('T')[0]);
        setPdfEndDate(new Date().toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error('Failed to load PDF report metadata:', e);
    }
  };

  const handleGeneratePdf = async () => {
    setPdfGenerating(true);
    try {
      const orgParam = `&org=${encodeURIComponent(queryOrg)}`;
      const deptRes = await axios.get(`/api/ricoh/departments?org=${encodeURIComponent(queryOrg)}`);
      const deptList = deptRes.data || [];

      let targetDevices = [];
      const pdfOrgLabel = queryOrg === 'TCF-KG' ? 'PLANT KARAWANG' : 'PLANT SADANG - PURWAKARTA';
      let reportMeta = { mode: pdfMode, orgName: pdfOrgLabel, billingCycle: pdfMeta.billingCycle, hidePin: true };

      if (pdfMode === 'active') {
        const quotaRes = await axios.get(`/api/ricoh/devices/quotas?org=${encodeURIComponent(queryOrg)}`);
        targetDevices = quotaRes.data || [];
        reportMeta = {
          ...reportMeta,
          mode: 'active',
          monthsCount: 1,
          selectedMonths: pdfMeta.billingCycle?.billingMonth ? [pdfMeta.billingCycle.billingMonth] : [],
          startDate: pdfMeta.billingCycle?.startDate,
          endDate: pdfMeta.billingCycle?.endDate
        };
      } else if (pdfMode === 'months') {
        const monthsToFetch = pdfSelectedMonths.length > 0 ? pdfSelectedMonths : (pdfMeta.availableMonths.slice(0, 1));
        const res = await axios.get(`/api/ricoh/management-report-data?mode=months&months=${encodeURIComponent(monthsToFetch.join(','))}${orgParam}`);
        targetDevices = res.data?.devices || [];
        reportMeta = {
          ...reportMeta,
          mode: 'months',
          selectedMonths: res.data?.selectedMonths || monthsToFetch,
          monthsCount: res.data?.monthsCount || monthsToFetch.length,
          monthlyBreakdown: res.data?.monthlyBreakdown || [],
          deptMonthlyBreakdown: res.data?.deptMonthlyBreakdown || []
        };
      } else {
        const res = await axios.get(`/api/ricoh/management-report-data?mode=custom&startDate=${encodeURIComponent(pdfStartDate)}&endDate=${encodeURIComponent(pdfEndDate)}${orgParam}`);
        targetDevices = res.data?.devices || [];
        reportMeta = {
          ...reportMeta,
          mode: 'custom',
          startDate: pdfStartDate,
          startTime: pdfStartTime,
          endDate: pdfEndDate,
          endTime: pdfEndTime,
          dailyCopierCaveat: Boolean(res.data?.dailyCopierCaveat),
          monthsCount: 1
        };
      }

      await generateRicohManagementPdf({
        devices: targetDevices,
        departments: deptList,
        reportMeta,
        billingConfig: pdfBilling
      });
      setShowPdfModal(false);
    } catch (err) {
      console.error('Gagal membuat PDF Manajemen:', err);
      alert('Gagal generate PDF: ' + (err.response?.data?.error || err.message));
    } finally {
      setPdfGenerating(false);
    }
  };

  const fetchData = async () => {
    try {
      const deviceRes = await axios.get(`/api/ricoh/devices/status`);
      setDevices(deviceRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard statistics:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white font-black tracking-widest uppercase gap-3">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
        <span className="text-xs text-slate-400">Connecting to Ricoh Network Telemetry...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative overflow-x-hidden p-4 sm:p-8 lg:p-10">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-[-10%] z-0 bg-cover bg-center bg-no-repeat opacity-20 mix-blend-screen animate-drift" style={{ backgroundImage: `url(${bgImage})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617]/85 to-[#020617] z-0"></div>
      </div>

      <div className="max-w-[1720px] mx-auto relative z-10 space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <button 
                onClick={() => navigate('/public')}
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group text-xs font-black uppercase tracking-widest"
            >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Main Portal
            </button>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                <span>{queryOrg}</span>
                <span className="text-blue-500 font-rubik italic">Print & Copy Telemetry</span>
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenPdfModal}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all cursor-pointer border border-emerald-400/30"
            >
              <Download size={14} />
              <span>PDF Manajemen</span>
            </button>
            <div className="flex items-center gap-2 bg-blue-500/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-blue-400/20 text-blue-300">
              <Clock size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-wider">{plantLabel} • Reset Tgl 21</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 shadow-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ricoh Telemetry Live</span>
                <span className="text-[9px] text-slate-400 font-mono">PostgreSQL Network Monitor</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 w-fit">
          {[
            { id: 'live', label: 'Fleet Live Analytics', icon: Activity },
            { id: 'jobs', label: 'Job List Print', icon: FileText },
            { id: 'departments', label: 'Department Quotas', icon: Building2 },
            { id: 'monthly', label: 'Monthly Reports', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Views */}
        <div className="w-full">
          {activeTab === 'live' && (
            <div className="bg-[#F8FAFC] p-4 sm:p-6 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 text-slate-800">
              <RicohDashboard onOpenPdfModal={handleOpenPdfModal} />
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="bg-[#F8FAFC] p-4 sm:p-6 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 text-slate-800">
              <RicohJobHistory readOnly={true} />
            </div>
          )}

          {activeTab === 'departments' && (
            <PublicDepartmentQuotas />
          )}

          {activeTab === 'monthly' && (
            <div className="bg-[#F8FAFC] p-4 sm:p-6 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 text-slate-800">
              <MonthlyAnalytics />
            </div>
          )}
        </div>

      </div>

      {/* Modal Export PDF Laporan Manajemen (Public Access - Tanpa Login) */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Cetak PDF Laporan Manajemen</h3>
                  <p className="text-[11px] text-slate-300">{queryOrg} • {plantLabel} • Kontrak PT. Sakura Jaya Solusi</p>
                </div>
              </div>
              <button onClick={() => setShowPdfModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Mode Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Pilih Periode Laporan</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'active', label: 'Siklus Aktif', desc: 'Tgl 21 – Berjalan' },
                    { id: 'months', label: 'Pilih Bulan', desc: '1 atau Multi-Bulan' },
                    { id: 'custom', label: 'Rentang Tanggal', desc: 'Tanggal & Jam' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPdfMode(m.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        pdfMode === m.id
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="text-xs font-black">{m.label}</div>
                      <div className="text-[10px] opacity-75">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {pdfMode === 'active' && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900">
                  Menampilkan pemakaian & estimasi biaya siklus berjalan:{' '}
                  <strong className="font-black">
                    {pdfMeta.billingCycle?.startDate || '-'} s/d {pdfMeta.billingCycle?.endDate || '-'}
                  </strong>{' '}
                  ({pdfMeta.billingCycle?.billingMonth || 'Aktif'}).
                </div>
              )}

              {pdfMode === 'months' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Centang Bulan yang Digabung ({pdfSelectedMonths.length} dipilih)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(pdfMeta.availableMonths || []).map((m) => {
                      const checked = pdfSelectedMonths.includes(m);
                      return (
                        <button
                          key={m}
                          onClick={() =>
                            setPdfSelectedMonths((prev) =>
                              prev.includes(m)
                                ? prev.length > 1 ? prev.filter((x) => x !== m) : prev
                                : [...prev, m].sort()
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            checked
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {m} {m === pdfMeta.billingCycle?.billingMonth ? '(Aktif)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {pdfMode === 'custom' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Dari Tanggal & Jam</label>
                    <div className="flex gap-1.5">
                      <input type="date" value={pdfStartDate} onChange={(e) => setPdfStartDate(e.target.value)} className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white" />
                      <input type="time" value={pdfStartTime} onChange={(e) => setPdfStartTime(e.target.value)} className="w-24 px-2 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Sampai Tanggal & Jam</label>
                    <div className="flex gap-1.5">
                      <input type="date" value={pdfEndDate} onChange={(e) => setPdfEndDate(e.target.value)} className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white" />
                      <input type="time" value={pdfEndTime} onChange={(e) => setPdfEndTime(e.target.value)} className="w-24 px-2 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Sakura Cost Parameters (Non-PPN Default) */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">Parameter Biaya Sewa Sakura</span>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdfBilling.includeTax}
                      onChange={(e) => setPdfBilling((p) => ({ ...p, includeTax: e.target.checked }))}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Sertakan PPN 12% & PPh 23
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Tarif B/W (Rp)</label>
                    <input type="number" value={pdfBilling.rateBw} onChange={(e) => setPdfBilling((p) => ({ ...p, rateBw: Number(e.target.value) || 0 }))} className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-white font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Tarif Color (Rp)</label>
                    <input type="number" value={pdfBilling.rateColor} onChange={(e) => setPdfBilling((p) => ({ ...p, rateColor: Number(e.target.value) || 0 }))} className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-white font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Sewa / Bln (Rp)</label>
                    <input type="number" value={pdfBilling.monthlyBaseFee} onChange={(e) => setPdfBilling((p) => ({ ...p, monthlyBaseFee: Number(e.target.value) || 0 }))} className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-white font-bold" />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleGeneratePdf}
                disabled={pdfGenerating}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {pdfGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                <span>{pdfGenerating ? 'Menyiapkan PDF...' : 'Download PDF Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

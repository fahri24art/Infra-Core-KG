import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Printer, ShieldCheck, Lock, CheckCircle2, AlertTriangle, ArrowRight,
  User, Building2, Smartphone, FileText, Check, ChevronRight, RefreshCw, KeyRound, Copy
} from 'lucide-react';
import http from '../../services/http';
import infracoreLogo from '../../assets/infracore_logo.png';

export default function QuotaRequestForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const deviceParam = searchParams.get('device') || '';

  // Step 1: Verification Form State
  const [computerName, setComputerName] = useState(deviceParam);
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifiedData, setVerifiedData] = useState(null);

  // Autocomplete devices list
  const [allDevices, setAllDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);

  // Step 2: Request Form State
  const [requestType, setRequestType] = useState('BW'); // 'BW' | 'COLOR' | 'COPIER_BW' | 'COPIER_COLOR' | 'CUSTOM'
  const [amountBw, setAmountBw] = useState(50);
  const [amountColor, setAmountColor] = useState(0);
  const [amountCopierBw, setAmountCopierBw] = useState(0);
  const [amountCopierColor, setAmountCopierColor] = useState(0);
  const [reason, setReason] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedResult, setSubmittedResult] = useState(null);

  // Fetch device list for easy selection
  useEffect(() => {
    http.get('/api/ricoh/public-devices')
      .then(res => {
        if (Array.isArray(res.data)) {
          setAllDevices(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Filter devices as user types
  useEffect(() => {
    if (!computerName || verifiedData) {
      setFilteredDevices([]);
      return;
    }
    const q = computerName.toLowerCase();
    const matches = allDevices.filter(d => 
      (d.computer_name || '').toLowerCase().includes(q) ||
      (d.user_name || '').toLowerCase().includes(q) ||
      (d.department_name || '').toLowerCase().includes(q)
    ).slice(0, 8);
    setFilteredDevices(matches);
  }, [computerName, allDevices, verifiedData]);

  // Quick preset handler
  const handlePresetSelect = (type, bw, col, copBw, copCol = 0) => {
    setRequestType(type);
    setAmountBw(bw);
    setAmountColor(col);
    setAmountCopierBw(copBw);
    setAmountCopierColor(copCol);
  };

  // Perform device & PIN verification
  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!computerName.trim()) {
      setVerifyError('Nama perangkat/komputer wajib diisi.');
      return;
    }
    if (!pin.trim()) {
      setVerifyError('PIN Ricoh (User Code) wajib diisi.');
      return;
    }

    setVerifying(true);
    setVerifyError('');

    try {
      const res = await http.post('/api/ricoh/request-verify', {
        computer_name: computerName.trim(),
        pin: pin.trim(),
        password: password.trim()
      });

      if (res.data && res.data.verified) {
        setVerifiedData(res.data);
        setPhone(res.data.user_phone || '');
        // Default request: if BW exhausted, default to +50 BW, if copier exhausted, +30 copier
        if (res.data.remaining_bw <= 5) {
          handlePresetSelect('BW', 50, 0, 0, 0);
        } else if ((res.data.remaining_copier_bw ?? res.data.remaining_copier) <= 5) {
          handlePresetSelect('COPIER_BW', 0, 0, 30, 0);
        } else if ((res.data.remaining_copier_color ?? 999) <= 5) {
          handlePresetSelect('COPIER_COLOR', 0, 0, 0, 20);
        } else {
          handlePresetSelect('BW', 50, 0, 0, 0);
        }
      } else {
        setVerifyError('Verifikasi gagal. Periksa kembali nama komputer dan PIN Ricoh Anda.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setVerifyError(err.response?.data?.error || 'Gagal memverifikasi perangkat. Pastikan PIN Ricoh benar.');
    } finally {
      setVerifying(false);
    }
  };

  // Submit Quota Request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setSubmitError('Alasan / keperluan penambahan kuota wajib diisi.');
      return;
    }

    const totalRequested = (Number(amountBw) || 0) + (Number(amountColor) || 0) + (Number(amountCopierBw) || 0) + (Number(amountCopierColor) || 0);
    if (totalRequested <= 0) {
      setSubmitError('Jumlah tambahan kuota minimal harus lebih dari 0 lembar.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        device_id: verifiedData.device_id,
        computer_name: verifiedData.computer_name,
        pin: pin.trim(),
        applicant_name: verifiedData.user_name || 'Pemohon',
        applicant_nik: verifiedData.user_nik || '',
        applicant_phone: phone.trim(),
        request_type: requestType,
        amount_bw: Number(amountBw) || 0,
        amount_color: Number(amountColor) || 0,
        amount_copier_bw: Number(amountCopierBw) || 0,
        amount_copier_color: Number(amountCopierColor) || 0,
        amount_copier: (Number(amountCopierBw) || 0) + (Number(amountCopierColor) || 0),
        reason: reason.trim()
      };

      const res = await http.post('/api/ricoh/request-submit', payload);
      setSubmittedResult({
        ...payload,
        request_id: res.data.request_id,
        message: res.data.message
      });
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err.response?.data?.error || 'Gagal mengirim pengajuan kuota.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Background Glow Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[130px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-4 py-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                <Printer size={20} className="text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Power Asset</span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Ricoh Quota</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">PT. Tri Centrum Fortuna • Plant Sadang</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Verifikasi Resmi Tim ICT</span>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="relative z-10 flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 my-4">
        {/* SUCCESS VIEW */}
        {submittedResult ? (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={36} />
            </div>

            <div className="text-center space-y-2 mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Pengajuan Berhasil Dikirim</span>
              <h2 className="text-2xl font-black text-white">Menunggu Persetujuan ICT</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Pengajuan penambahan kuota Anda telah tercatat di sistem dan notifikasi otomatis telah dikirim ke Tim ICT Helpdesk.
              </p>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 mb-6 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">ID Pengajuan</span>
                <span className="font-mono font-bold text-blue-400">#REQ-{submittedResult.request_id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Pemohon</span>
                <span className="font-bold text-slate-200">{submittedResult.applicant_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Perangkat</span>
                <span className="font-mono font-bold text-slate-200">{submittedResult.computer_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Tambahan Diajukan</span>
                <div className="font-bold text-emerald-400 text-right space-y-0.5">
                  {submittedResult.amount_bw > 0 && <div>+ {submittedResult.amount_bw} lembar (Print B/W)</div>}
                  {submittedResult.amount_color > 0 && <div>+ {submittedResult.amount_color} lembar (Print Color)</div>}
                  {submittedResult.amount_copier_bw > 0 && <div>+ {submittedResult.amount_copier_bw} lembar (Copy B/W)</div>}
                  {submittedResult.amount_copier_color > 0 && <div>+ {submittedResult.amount_copier_color} lembar (Copy Color)</div>}
                </div>
              </div>
              <div className="py-1">
                <span className="text-slate-400 block mb-1">Keperluan / Alasan:</span>
                <p className="text-slate-300 italic bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 font-medium">"{submittedResult.reason}"</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs mb-6 flex items-start gap-3">
              <Smartphone size={18} className="shrink-0 text-blue-400 mt-0.5" />
              <span>Notifikasi status persetujuan akan dikirimkan otomatis ke WhatsApp Anda <strong>({submittedResult.applicant_phone || 'WhatsApp Terdaftar'})</strong> begitu disetujui.</span>
            </div>

            <button
              onClick={() => {
                setSubmittedResult(null);
                setVerifiedData(null);
                setPin('');
                setPassword('');
                setReason('');
              }}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition-all text-xs sm:text-sm active:scale-[0.99]"
            >
              Ajukan Penambahan Lain
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* STEP 1: VERIFICATION CARD */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black">
                  1
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Verifikasi Identitas & Perangkat</h2>
                  <p className="text-xs text-slate-400 font-medium">Masukkan nama perangkat dan PIN Ricoh Anda untuk memvalidasi kepemilikan.</p>
                </div>
              </div>

              {verifyError && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Form Verifikasi */}
              <form onSubmit={handleVerify} className="space-y-4">
                {/* Nama Perangkat */}
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">
                    Nama Komputer / Perangkat <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!!verifiedData}
                      placeholder="Contoh: DESKTOP-B0QJ9O3 atau LAPTOP-KID7Q8VF"
                      value={computerName}
                      onChange={(e) => {
                        setComputerName(e.target.value.toUpperCase());
                        setShowDeviceDropdown(true);
                      }}
                      onFocus={() => setShowDeviceDropdown(true)}
                      className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all uppercase placeholder:normal-case placeholder:text-slate-600 disabled:opacity-60"
                      required
                    />
                    {verifiedData && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-bold flex items-center gap-1">
                        <Check size={14} /> Terverifikasi
                      </span>
                    )}
                  </div>

                  {/* Device search dropdown */}
                  {showDeviceDropdown && filteredDevices.length > 0 && !verifiedData && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-800">
                      {filteredDevices.map(d => (
                        <div
                          key={d.id}
                          onClick={() => {
                            setComputerName(d.computer_name);
                            setShowDeviceDropdown(false);
                          }}
                          className="p-3 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-white">{d.computer_name}</div>
                            <div className="text-[11px] text-slate-400 font-medium">{d.user_name} • {d.department_name}</div>
                          </div>
                          <ChevronRight size={14} className="text-slate-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PIN Ricoh (User Code) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">
                      PIN Ricoh (User Code) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        disabled={!!verifiedData}
                        placeholder="Contoh: 8352"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600 disabled:opacity-60"
                        required
                      />
                      <KeyRound size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-500 ml-1">PIN yang biasa Anda tekan di mesin fotokopi Ricoh.</p>
                  </div>

                  {/* NIK / Password Akun Pemohon (Opsional untuk validasi ekstra) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">
                      NIK Pemohon (Password Login)
                    </label>
                    <input
                      type="password"
                      disabled={!!verifiedData}
                      placeholder="NIK tanpa titik (Contoh: 772070324)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600 disabled:opacity-60"
                    />
                    <p className="text-[10px] text-slate-500 ml-1">NIK untuk memastikan Anda adalah pemohon yang sah.</p>
                  </div>
                </div>

                {!verifiedData ? (
                  <button
                    type="submit"
                    disabled={verifying}
                    className="w-full mt-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Memverifikasi PIN & Perangkat...</span>
                      </>
                    ) : (
                      <>
                        <span>Verifikasi & Periksa Kuota</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <ShieldCheck size={16} /> Perangkat & PIN Cocok
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifiedData(null);
                        setPin('');
                        setPassword('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 underline font-medium"
                    >
                      Ganti Perangkat / Login Ulang
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* STEP 2: VERIFIED USER & REAL-TIME QUOTA STATS */}
            {verifiedData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* User Info Bar */}
                <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900/40 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-black text-sm">
                      {verifiedData.user_name ? verifiedData.user_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm sm:text-base">{verifiedData.user_name}</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Departemen: <span className="text-slate-200 font-semibold">{verifiedData.department_name}</span> • Perangkat: <span className="font-mono text-blue-300">{verifiedData.computer_name}</span>
                      </div>
                    </div>
                  </div>
                  {verifiedData.user_phone && (
                    <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                      <Smartphone size={13} />
                      <span>{verifiedData.user_phone}</span>
                    </div>
                  )}
                </div>

                {/* Quota Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Card B/W */}
                  <div className={`p-4 rounded-2xl border transition-all ${verifiedData.remaining_bw <= 0 ? 'bg-rose-950/20 border-rose-500/30' : verifiedData.remaining_bw <= 10 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900/80 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Print B&W</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${verifiedData.remaining_bw <= 0 ? 'bg-rose-500/20 text-rose-400' : verifiedData.remaining_bw <= 10 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {verifiedData.remaining_bw <= 0 ? 'Habis' : `${verifiedData.remaining_bw} sisa`}
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {verifiedData.usage_bw} <span className="text-xs font-normal text-slate-500">/ {verifiedData.quota_bw} lbr</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${verifiedData.remaining_bw <= 0 ? 'bg-rose-500' : verifiedData.remaining_bw <= 10 ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, Math.round((verifiedData.usage_bw / (verifiedData.quota_bw || 1)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Card Color */}
                  <div className={`p-4 rounded-2xl border transition-all ${verifiedData.remaining_color <= 0 ? 'bg-rose-950/20 border-rose-500/30' : verifiedData.remaining_color <= 5 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900/80 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Print Warna</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${verifiedData.remaining_color <= 0 ? 'bg-rose-500/20 text-rose-400' : verifiedData.remaining_color <= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {verifiedData.remaining_color <= 0 ? 'Habis' : `${verifiedData.remaining_color} sisa`}
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {verifiedData.usage_color} <span className="text-xs font-normal text-slate-500">/ {verifiedData.quota_color} lbr</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${verifiedData.remaining_color <= 0 ? 'bg-rose-500' : verifiedData.remaining_color <= 5 ? 'bg-amber-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.min(100, Math.round((verifiedData.usage_color / (verifiedData.quota_color || 1)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Card Copy B/W */}
                  {(() => {
                    const remBwCopy = verifiedData.remaining_copier_bw ?? verifiedData.remaining_copier ?? 0;
                    const useBwCopy = verifiedData.usage_copier_bw ?? verifiedData.usage_copier ?? 0;
                    const quoBwCopy = verifiedData.quota_copier_bw ?? verifiedData.quota_copier ?? 0;
                    return (
                      <div className={`p-4 rounded-2xl border transition-all ${remBwCopy <= 0 ? 'bg-rose-950/20 border-rose-500/30' : remBwCopy <= 5 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900/80 border-slate-800'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Copy B&W</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remBwCopy <= 0 ? 'bg-rose-500/20 text-rose-400' : remBwCopy <= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {remBwCopy <= 0 ? 'Habis' : `${remBwCopy} sisa`}
                          </span>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          {useBwCopy} <span className="text-xs font-normal text-slate-500">/ {quoBwCopy} lbr</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${remBwCopy <= 0 ? 'bg-rose-500' : remBwCopy <= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, Math.round((useBwCopy / (quoBwCopy || 1)) * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card Copy Color */}
                  {(() => {
                    const remColCopy = verifiedData.remaining_copier_color ?? 0;
                    const useColCopy = verifiedData.usage_copier_color ?? 0;
                    const quoColCopy = verifiedData.quota_copier_color ?? 0;
                    return (
                      <div className={`p-4 rounded-2xl border transition-all ${remColCopy <= 0 ? 'bg-rose-950/20 border-rose-500/30' : remColCopy <= 5 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900/80 border-slate-800'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Copy Color</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remColCopy <= 0 ? 'bg-rose-500/20 text-rose-400' : remColCopy <= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                            {remColCopy <= 0 ? 'Habis' : `${remColCopy} sisa`}
                          </span>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          {useColCopy} <span className="text-xs font-normal text-slate-500">/ {quoColCopy} lbr</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${remColCopy <= 0 ? 'bg-rose-500' : remColCopy <= 5 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                            style={{ width: `${Math.min(100, Math.round((useColCopy / (quoColCopy || 1)) * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* STEP 3: FORM PENGAJUAN TAMBAHAN KUOTA */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl">
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800/80">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black">
                      2
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Formulir Tambahan Kuota</h2>
                      <p className="text-xs text-slate-400 font-medium">Pilih jumlah dan jenis kuota yang ingin diajukan ke Tim ICT.</p>
                    </div>
                  </div>

                  {submitError && (
                    <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2.5">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitRequest} className="space-y-5">
                    {/* Preset Buttons */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">
                        Pilihan Cepat Tambahan Kuota
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePresetSelect('BW', 25, 0, 0, 0)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all ${requestType === 'BW' && amountBw === 25 ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                        >
                          +25 Print B/W
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetSelect('BW', 50, 0, 0, 0)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all ${requestType === 'BW' && amountBw === 50 ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                        >
                          +50 Print B/W
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetSelect('BW', 100, 0, 0, 0)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all ${requestType === 'BW' && amountBw === 100 ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                        >
                          +100 Print B/W
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetSelect('COPIER_BW', 0, 0, 50, 0)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all ${requestType === 'COPIER_BW' && amountCopierBw === 50 ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                        >
                          +50 Copy B/W
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetSelect('COPIER_COLOR', 0, 0, 0, 25)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all ${requestType === 'COPIER_COLOR' && amountCopierColor === 25 ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-500/30' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                        >
                          +25 Copy Color
                        </button>
                      </div>
                    </div>

                    {/* Fine-grained Custom inputs */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Atau Sesuaikan Jumlah Lembar:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Print B/W</label>
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            value={amountBw}
                            onChange={(e) => {
                              setAmountBw(Math.max(0, parseInt(e.target.value) || 0));
                              setRequestType('CUSTOM');
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Print Color</label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={amountColor}
                            onChange={(e) => {
                              setAmountColor(Math.max(0, parseInt(e.target.value) || 0));
                              setRequestType('CUSTOM');
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-400">Copy B/W</label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={amountCopierBw}
                            onChange={(e) => {
                              setAmountCopierBw(Math.max(0, parseInt(e.target.value) || 0));
                              setRequestType('CUSTOM');
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-cyan-400">Copy Color</label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={amountCopierColor}
                            onChange={(e) => {
                              setAmountCopierColor(Math.max(0, parseInt(e.target.value) || 0));
                              setRequestType('CUSTOM');
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Notif Target */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">
                        Nomor WhatsApp Pemohon (Untuk Notifikasi Status)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0812xxxxxxxx"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                        />
                        <Smartphone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" />
                      </div>
                      <p className="text-[10px] text-slate-500 ml-1">Bot WA akan mengabari Anda begitu kuota selesai disetujui ICT.</p>
                    </div>

                    {/* Alasan / Keperluan (Wajib) */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">
                        Keperluan / Alasan Pengajuan <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows="3"
                        required
                        placeholder="Contoh: Kebutuhan cetak drawing engineering revisi customer, faktur delivery urgent akhir bulan, dokumen audit ISO..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-600 transition-all resize-none"
                      ></textarea>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-black rounded-2xl text-xs sm:text-sm shadow-xl shadow-indigo-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          <span>Mengirim Pengajuan ke Tim ICT...</span>
                        </>
                      ) : (
                        <>
                          <Printer size={18} />
                          <span>Kirim Pengajuan Penambahan Kuota</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-[11px] text-slate-500 font-medium">
        Power Asset Management • PT. Tri Centrum Fortuna Sadang • ICT Infrastructure & Network
      </footer>
    </div>
  );
}

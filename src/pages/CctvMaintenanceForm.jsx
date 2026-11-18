import React, { useState, useEffect } from 'react';
import { Camera, Save, CheckCircle } from 'lucide-react';

export default function CctvMaintenanceForm({ asset, formData: propFormData, onChange, onSubmit }) {
    const [loading, setLoading] = useState(false);

    const assetInfo = asset || {};

    const initialFormData = {
        // Fisik & Optik Kamera
        housingBracket: 'Kokoh, Bersih & Aman',
        lensGlass: 'Bersih, Jernih & Bebas Debu',
        angleFocus: 'Presisi & Sesuai Area Pantau',
        irNightVision: 'Menyala Normal Saat Gelap',

        // Kelistrikan, Kabel & Koneksi
        cablingConnector: 'Terpasang Kencang & Bebas Korosi',
        powerSupplyPoe: 'Tegangan Stabil & Normal',
        junctionConduit: 'Tertutup Rapat & Rapi',

        // NVR/DVR & Rekaman
        liveViewQuality: 'Jernih & Tanpa Noise/Flicker',
        recordingPlayback: 'Merekam Normal & HDD Sehat',
        ntpSystemTime: 'Sesuai Waktu Aktual (WIB)',

        notes: ''
    };

    const isPropEmpty = !propFormData || Object.keys(propFormData).length === 0;
    const formData = isPropEmpty ? initialFormData : { ...initialFormData, ...propFormData };

    useEffect(() => {
        if (isPropEmpty && onChange) {
            onChange(initialFormData);
        }
    }, [isPropEmpty]);

    const handleChange = (key, value) => {
        if (onChange) {
            onChange({ ...formData, [key]: value });
        }
    };

    const handleFormSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        try {
            if (onSubmit) {
                await onSubmit({ ...formData });
            }
        } finally {
            setLoading(false);
        }
    };

    const CheckRow = ({ label, fieldKey, standard }) => (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 py-3 border-b border-slate-100 last:border-0 items-center text-sm">
            <div className="md:col-span-5 font-bold text-slate-700">{label}</div>
            <div className="md:col-span-3 text-slate-400 italic text-[10px] font-black uppercase tracking-wider">{standard}</div>
            <div className="md:col-span-4">
                <select
                    className="w-full rounded-xl border border-[#E1E1E1] px-3 py-2 text-xs font-black uppercase tracking-wider bg-[#F8F9FB] text-slate-700 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                    value={formData[fieldKey] || standard}
                    onChange={(e) => handleChange(fieldKey, e.target.value)}
                >
                    <option value={standard}>{standard} (OK)</option>
                    <option value="Perlu Pembersihan / Adjust">ADJUST / BERSIHKAN</option>
                    <option value="Perlu Perbaikan">PERLU PERBAIKAN</option>
                    <option value="Rusak / Mati">RUSAK / MATI</option>
                    <option value="N/A">N/A</option>
                </select>
            </div>
        </div>
    );

    const SectionHeader = ({ title }) => (
        <h3 className="text-[10px] font-black text-slate-500 bg-slate-50 px-4 py-2 rounded-xl mt-6 mb-3 border border-[#E1E1E1] uppercase tracking-[0.2em] shadow-sm">
            {title}
        </h3>
    );

    return (
        <div className="max-w-none mx-auto text-slate-900">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 pb-6 border-b border-[#F0F0F0] gap-4">
                <div className="flex gap-4 items-center">
                    <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-lg">
                        <Camera size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black uppercase tracking-widest">
                                NON-KPI • SECURITY SURVEILLANCE
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mt-1">
                            CCTV & Surveillance <span className="text-blue-600 italic">Checksheet</span>
                        </h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
                            Document ID: TCFSG-FM-ICT-01-05 • {assetInfo.inventory_number || assetInfo.name || '-'}
                        </p>
                    </div>
                </div>
                <div className="text-left md:text-right text-xs font-medium text-slate-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/80">
                    <div><span className="font-black uppercase tracking-widest text-[9px] text-slate-400 mr-2">Lokasi:</span><span className="text-slate-900 font-bold">{assetInfo.location || assetInfo.user_department || '-'}</span></div>
                    <div className="mt-0.5"><span className="font-black uppercase tracking-widest text-[9px] text-slate-400 mr-2">Unit / IP:</span><span className="text-slate-900 font-bold">{assetInfo.ip_address || assetInfo.model || assetInfo.name || '-'}</span></div>
                </div>
            </div>

            <SectionHeader title="1. Kamera, Optik & Fisik" />
            <div className="bg-white rounded-2xl border border-slate-100 px-4">
                <CheckRow label="Fisik Body, Bracket & Housing" fieldKey="housingBracket" standard="Kokoh, Bersih & Aman" />
                <CheckRow label="Kebersihan Lensa & Kaca Dome/Cover" fieldKey="lensGlass" standard="Bersih, Jernih & Bebas Debu" />
                <CheckRow label="Sudut Pandang & Fokus Kamera" fieldKey="angleFocus" standard="Presisi & Sesuai Area Pantau" />
                <CheckRow label="Infra Red (IR) / Night Vision" fieldKey="irNightVision" standard="Menyala Normal Saat Gelap" />
            </div>

            <SectionHeader title="2. Kabel, Power & Konektivitas" />
            <div className="bg-white rounded-2xl border border-slate-100 px-4">
                <CheckRow label="Kabel UTP / Coaxial & Konektor RJ45/BNC" fieldKey="cablingConnector" standard="Terpasang Kencang & Bebas Korosi" />
                <CheckRow label="Adaptor / Power Supply / PoE Switch" fieldKey="powerSupplyPoe" standard="Tegangan Stabil & Normal" />
                <CheckRow label="Junction Box & Pelindung Conduit" fieldKey="junctionConduit" standard="Tertutup Rapat & Rapi" />
            </div>

            <SectionHeader title="3. NVR / DVR & Status Rekaman" />
            <div className="bg-white rounded-2xl border border-slate-100 px-4">
                <CheckRow label="Live View & Kualitas Video" fieldKey="liveViewQuality" standard="Jernih & Tanpa Noise/Flicker" />
                <CheckRow label="Status Rekaman & Playback Storage" fieldKey="recordingPlayback" standard="Merekam Normal & HDD Sehat" />
                <CheckRow label="Sinkronisasi Tanggal & Jam Sistem" fieldKey="ntpSystemTime" standard="Sesuai Waktu Aktual (WIB)" />
            </div>

            <SectionHeader title="4. Catatan / Temuan Teknisi" />
            <textarea
                className="w-full p-4 bg-[#F8F9FB] border border-[#E1E1E1] rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 min-h-[100px] resize-none"
                placeholder="Catat hasil pengecekan, posisi kamera, penggantian konektor/adaptor, atau temuan lainnya..."
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
            />

            <div className="flex justify-end items-center gap-3 mt-8 pt-6 border-t border-slate-100 print:hidden">
                <button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={loading}
                    className="btn-primary-unifi px-8 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2"
                >
                    <Save size={16} />
                    {loading ? 'Menyimpan...' : 'Simpan Checksheet CCTV'}
                </button>
            </div>
        </div>
    );
}


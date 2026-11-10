import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, ArrowLeft, Heart, Calendar, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HSEStatsInput({ org = 'TCF-SG' }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total_karyawan: 0,
        total_jam_kerja: 0,
        total_jam_kerja_aman: 0,
        total_kecelakaan_hilang_hari: 0,
        rekor_jam_kerja_aman: 0,
        first_aid: 0,
        medical_treatment: 0,
        fatality: 0,
        date_updated: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('/api/hse/statistics', { headers: { 'x-organization': org } });
                if (res.data.success && res.data.data) {
                    const data = res.data.data;
                    setStats({
                        ...data,
                        date_updated: data.date_updated ? new Date(data.date_updated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                    });
                }
            } catch (err) {
                console.error('Failed to fetch stats', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [org]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setStats(prev => ({ ...prev, [name]: name === 'date_updated' ? value : Number(value) }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/hse/statistics', stats, { headers: { 'x-organization': org } });
            alert('Berhasil menyimpan data statistik HSE!');
        } catch (err) {
            console.error('Failed to save stats', err);
            alert('Gagal menyimpan data.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Memuat Data...</div>;

    const inputFields = [
        { label: 'Total Karyawan (Orang)', name: 'total_karyawan' },
        { label: 'Total Jam Kerja (Jam)', name: 'total_jam_kerja' },
        { label: 'Total Jam Kerja Aman (Jam)', name: 'total_jam_kerja_aman' },
        { label: 'Total Kecelakaan Hilang Hari (Jam)', name: 'total_kecelakaan_hilang_hari' },
        { label: 'Rekor Jam Kerja Aman (Jam)', name: 'rekor_jam_kerja_aman' },
        { label: 'First Aid (Kasus)', name: 'first_aid' },
        { label: 'Medical Treatment (Kasus)', name: 'medical_treatment' },
        { label: 'Fatality (Kasus)', name: 'fatality' },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-3">
            <button 
                onClick={() => navigate('/hrd')}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
            >
                <ArrowLeft size={20} /> Kembali ke Hub
            </button>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0">
                        <Heart size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Statistic Board Data</h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Data yang diinput akan ditampilkan pada TV Public Dashboard HSE 
                            <span className="font-bold text-emerald-600 ml-1">({org})</span>.
                        </p>
                    </div>
                </div>

                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800">
                    <AlertTriangle size={24} className="shrink-0 text-amber-500 mt-1" />
                    <div>
                        <h4 className="font-bold">Panduan Input Hilang Jam Kerja (LTI)</h4>
                        <p className="text-sm mt-1">Hilang Jam Kerja (Lost Time Injury) hanya dicatat jika kecelakaan menyebabkan pekerja tidak dapat bekerja selama <b>lebih dari 2x24 jam</b>. Jika kurang dari itu, maka tidak dihitung sebagai kehilangan jam kerja dan Jam Kerja Aman tidak diriset.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={16} /> Tanggal Update
                        </label>
                        <input
                            type="date"
                            name="date_updated"
                            value={stats.date_updated}
                            onChange={handleChange}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-lg font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                    </div>

                    {inputFields.map((field, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 focus-within:ring-4 ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">{field.label}</label>
                            <input
                                type="number"
                                name={field.name}
                                value={stats[field.name] || ''}
                                onChange={handleChange}
                                className="w-full bg-transparent text-slate-900 text-3xl font-black focus:outline-none"
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-black tracking-widest uppercase transition-all disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : <><Save size={20} /> Simpan Perubahan</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

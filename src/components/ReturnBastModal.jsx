import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Eye, RotateCcw } from 'lucide-react';
import { generateReturnHandoverPdf } from '../utils/generateReturnHandoverPdf';

const ALASAN_OPTIONS = [
    'Resign / Putus Hubungan Kerja',
    'Mutasi / Rotasi Karyawan',
    'Penggantian / Upgrade Perangkat',
    'Perbaikan / Tarik ke Gudang ICT',
    'Selesai Peminjaman',
    'Lainnya',
];

const KONDISI_OPTIONS = [
    'Baik & Berfungsi Normal',
    'Baik (Ada Lecet Pemakaian Wajar)',
    'Rusak Ringan / Perlu Perbaikan',
    'Rusak Berat / Mati Total',
    'Tidak Lengkap (Ada Komponen Hilang)',
];

const KELENGKAPAN_ITEMS = [
    'Unit Utama',
    'Charger / Adaptor',
    'Kabel Power',
    'Kabel USB / LAN',
    'Mouse',
    'Keyboard',
    'Tas Laptop',
];

const getDefaultKelengkapanItems = (assets) => {
    const first = Array.isArray(assets) ? assets[0] : assets;
    const cat = (first?.category || '').toLowerCase();
    if (cat.includes('pc') || cat.includes('desktop')) {
        return ['Unit Utama', 'Kabel Power', 'Mouse', 'Keyboard'];
    }
    if (cat.includes('laptop') || cat.includes('notebook')) {
        return ['Unit Utama', 'Charger / Adaptor', 'Mouse', 'Tas Laptop'];
    }
    if (cat.includes('printer') || cat.includes('scanner')) {
        return ['Unit Utama', 'Kabel Power', 'Kabel USB / LAN'];
    }
    if (cat.includes('phone') || cat.includes('mobile') || cat.includes('tablet')) {
        return ['Unit Utama', 'Charger / Adaptor'];
    }
    return ['Unit Utama', 'Kabel Power'];
};

export default function ReturnBastModal({ isOpen, onClose, userName = '', assets = [], initialData = {} }) {
    const [formState, setFormState] = useState({
        userName: '',
        nik: '',
        divisi: '',
        jabatan: '',
        alasanPreset: ALASAN_OPTIONS[0],
        alasanCustom: '',
        kondisi: KONDISI_OPTIONS[0],
        selectedItems: [],
        kelengkapanText: '',
        snCharger: '',
        catatanIct: '',
        penerimaIct: '',
        tanggalPengembalian: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (!isOpen) return;
        const loggedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        const defaultItems = getDefaultKelengkapanItems(assets);
        setFormState({
            userName: userName || initialData.userName || '',
            nik: initialData.nik || '',
            divisi: initialData.divisi || '',
            jabatan: initialData.jabatan || '',
            alasanPreset: ALASAN_OPTIONS[0],
            alasanCustom: '',
            kondisi: KONDISI_OPTIONS[0],
            selectedItems: defaultItems,
            kelengkapanText: defaultItems.join(', '),
            snCharger: initialData.snCharger || '',
            catatanIct: '',
            penerimaIct: initialData.penerimaIct || loggedUser?.name || '',
            tanggalPengembalian: new Date().toISOString().split('T')[0],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleKelengkapanItem = (item) => {
        setFormState((prev) => {
            const exists = prev.selectedItems.includes(item);
            const nextItems = exists
                ? prev.selectedItems.filter((x) => x !== item)
                : [...prev.selectedItems, item];
            return {
                ...prev,
                selectedItems: nextItems,
                kelengkapanText: nextItems.join(', '),
            };
        });
    };

    const handleGenerate = async (action) => {
        const alasanFinal = formState.alasanPreset === 'Lainnya'
            ? (formState.alasanCustom.trim() || 'Pengembalian Perangkat ICT')
            : formState.alasanPreset;

        await generateReturnHandoverPdf(
            formState.userName || 'User',
            assets,
            {
                nik: formState.nik,
                divisi: formState.divisi,
                jabatan: formState.jabatan,
                alasan: alasanFinal,
                kondisi: formState.kondisi,
                kelengkapan: formState.kelengkapanText,
                snCharger: formState.snCharger,
                catatanIct: formState.catatanIct,
                penerimaIct: formState.penerimaIct,
                tanggalPengembalian: formState.tanggalPengembalian,
            },
            action
        );
        onClose();
    };

    const assetCount = Array.isArray(assets) ? assets.length : (assets ? 1 : 0);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[1.75rem] p-6 w-full max-w-xl shadow-2xl border border-slate-100 my-auto">
                <div className="flex items-start justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                            <RotateCcw size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900">BAST Pengembalian Perangkat ICT</h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Serah terima balik {assetCount} perangkat dari User ke ICT (Format 2 Kolom TTD)
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Nama User (Yang Menyerahkan)
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.userName}
                                onChange={(e) => setFormState({ ...formState, userName: e.target.value })}
                                placeholder="Nama lengkap karyawan"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                N.I.K
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.nik}
                                onChange={(e) => setFormState({ ...formState, nik: e.target.value })}
                                placeholder="Kosongkan jika tidak ada"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Department / Divisi
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.divisi}
                                onChange={(e) => setFormState({ ...formState, divisi: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Jabatan
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.jabatan}
                                onChange={(e) => setFormState({ ...formState, jabatan: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Alasan Pengembalian
                            </label>
                            <select
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.alasanPreset}
                                onChange={(e) => setFormState({ ...formState, alasanPreset: e.target.value })}
                            >
                                {ALASAN_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Kondisi Saat Dikembalikan
                            </label>
                            <select
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.kondisi}
                                onChange={(e) => setFormState({ ...formState, kondisi: e.target.value })}
                            >
                                {KONDISI_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {formState.alasanPreset === 'Lainnya' && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Keterangan Alasan Lainnya
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.alasanCustom}
                                onChange={(e) => setFormState({ ...formState, alasanCustom: e.target.value })}
                                placeholder="Tuliskan alasan pengembalian..."
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                            Kelengkapan yang Dikembalikan
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {KELENGKAPAN_ITEMS.map((item) => {
                                const active = formState.selectedItems.includes(item);
                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => toggleKelengkapanItem(item)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                            active
                                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {active ? '✓ ' : '+ '}{item}
                                    </button>
                                );
                            })}
                        </div>
                        <input
                            type="text"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-amber-500"
                            value={formState.kelengkapanText}
                            onChange={(e) => setFormState({ ...formState, kelengkapanText: e.target.value })}
                            placeholder="Contoh: Unit Laptop, Charger, Mouse, Tas"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                SN Charger (Opsional)
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.snCharger}
                                onChange={(e) => setFormState({ ...formState, snCharger: e.target.value })}
                                placeholder="SN Adaptor"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Penerima ICT
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.penerimaIct}
                                onChange={(e) => setFormState({ ...formState, penerimaIct: e.target.value })}
                                placeholder="Nama petugas ICT"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Tanggal Kembali
                            </label>
                            <input
                                type="date"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                                value={formState.tanggalPengembalian}
                                onChange={(e) => setFormState({ ...formState, tanggalPengembalian: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            Catatan Pemeriksaan ICT (Opsional)
                        </label>
                        <textarea
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500 resize-none"
                            value={formState.catatanIct}
                            onChange={(e) => setFormState({ ...formState, catatanIct: e.target.value })}
                            placeholder="Contoh: Layar & keyboard normal, data user sudah dibackup ke NAS..."
                        />
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={() => handleGenerate('preview')}
                        className="px-4 py-2.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl font-black flex items-center gap-2 transition-all text-xs uppercase tracking-widest"
                    >
                        <Eye size={15} /> Preview PDF
                    </button>
                    <button
                        type="button"
                        onClick={() => handleGenerate('download')}
                        className="px-5 py-2.5 text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200 rounded-xl font-black flex items-center gap-2 transition-all text-xs uppercase tracking-widest"
                    >
                        <Download size={15} /> Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

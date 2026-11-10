import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    FileText, Download, Printer, Save, Plus, Trash2, ArrowUp, ArrowDown, 
    FileSpreadsheet, Sparkles, BookOpen, Layers, RefreshCw, Eye, Edit3, 
    Sliders, Check, ZoomIn, ZoomOut, Maximize2, ShieldAlert, X, FilePlus2, 
    ClipboardList, CheckCircle2
} from 'lucide-react';
import { exportIkExcel } from '../../utils/exportIkExcel';

// PRESETS RESMI ICT TCF (Preset #1 adalah Persis Dokumen Gambar User)
const PRESETS = [
    {
        id: 'ik-repair',
        name: 'IK-02-02: Perbaikan PC / Laptop (Official ISO Template)',
        type: 'IK',
        data: {
            title: 'Perbaikan PC / Laptop',
            docNumber: 'TCFSG-IK-ICT-02-02',
            issueDate: '1 Oktober 2021',
            revNo: '01',
            page: '1 / 1',
            processOwner: 'ICT',
            footerCode: 'TCFSG-FM-MR-01-02a (Rev 01, 11 Maret 2025)',
            safety: true,
            quality: true,
            cost: true,
            showApd: true,
            showStamp: false,
            preparedBy: 'Mulyana',
            checkedBy: 'Hery Hermawan',
            approvedBy: 'Herno Aji Sanjaya',
            revisions: [
                { no: '1', date: '01 Oktober 2021', rev: '0', desc: 'New Issue', pic: 'Mulyana' },
                { no: '2', date: '11 Maret 2025', rev: '1', desc: 'Perubahan kode perusahaan', pic: 'Mulyana' }
            ],
            steps: [
                { 
                    flowLeft: 'Start', 
                    flowRight: 'Diagnosa Awal', 
                    desc: '1. Identifikasi keluhan user: layar gelap, keyboard rusak, baterai soak, tidak bisa nyala, dll', 
                    pic: 'USER' 
                },
                { 
                    flowLeft: 'Pemeriksaan Komponen Umum', 
                    flowRight: '', 
                    desc: '2. Cek adaptor, baterai, RAM, HDD/SSD, keyboard, touchpad, layar', 
                    pic: 'ICT Support' 
                },
                { 
                    flowLeft: '', 
                    flowRight: 'Pengujian Hardware', 
                    desc: '3. Gunakan tool/software (HDD Sentinel, RAM Test, Battery Info View) untuk cek komponen', 
                    pic: 'ICT Support' 
                },
                { 
                    flowLeft: 'Penggantian Spare Part', 
                    flowRight: '', 
                    desc: '4. Ganti part seperti RAM, HDD, keyboard, fan, layar, baterai jika tersedia', 
                    pic: 'ICT Support' 
                },
                { 
                    flowLeft: '', 
                    flowRight: 'Perakitan Kembali & Pembersihan', 
                    desc: '5. Pasang kembali dengan rapi, bersihkan debu & ganti thermal paste jika perlu', 
                    pic: 'ICT Support' 
                },
                { 
                    flowLeft: 'Pengujian Fungsional', 
                    flowRight: '', 
                    desc: '6. Uji semua fungsi: booting OS, display, input device, koneksi jaringan', 
                    pic: 'ICT Support' 
                },
                { 
                    flowLeft: '', 
                    flowRight: 'Konfirmasi ke User', 
                    desc: '7. Pastikan user menyetujui hasil perbaikan', 
                    pic: 'ICT Support' 
                },
                { 
                    flowLeft: 'Dokumentasi Perbaikan', 
                    flowRight: 'Finish', 
                    desc: '8. Catat semua tindakan dan komponen diganti dalam form maintenance', 
                    pic: 'ICT Support' 
                }
            ]
        }
    },
    {
        id: 'ik-server',
        name: 'IK-01-05: Pengelolaan Komputer Server (Proxmox)',
        type: 'IK',
        data: {
            title: 'Pengelolaan Komputer Server',
            docNumber: 'TCFSG-IK-ICT-01-05',
            issueDate: '11 Maret 2025',
            revNo: '01',
            page: '1 / 1',
            processOwner: 'ICT',
            footerCode: 'TCFSG-IK-ICT-28 (Rev 00, 11 Maret 2025)',
            safety: true,
            quality: true,
            cost: false,
            showApd: true,
            showStamp: false,
            preparedBy: 'Mulyana',
            checkedBy: 'Hery Hermawan',
            approvedBy: 'Fauzia Fajrin',
            revisions: [
                { no: '1', date: '11 Maret 2025', rev: '0', desc: 'New Issue', pic: 'ICT Infrastruktur' }
            ],
            steps: [
                { flowLeft: 'Start', flowRight: 'Akses ke Web UI', desc: '1. Akses melalui browser ke https://192.168.1.4:8006', pic: 'ICT Infrastruktur' },
                { flowLeft: 'Login Admin Proxmox', flowRight: 'Monitoring VM Aktif', desc: '2. Masuk menggunakan akun admin, cek dashboard status CPU, RAM, Storage', pic: 'ICT Infrastruktur' },
                { flowLeft: '', flowRight: '', desc: '3. Pantau performa VM (CPU, Disk I/O, Network) dan uptime VM', pic: 'ICT Infrastruktur' },
                { flowLeft: 'Start / Stop / Reboot VM', flowRight: '', desc: '4. Gunakan tombol kontrol VM di Web UI untuk menjalankan atau menghentikan VM', pic: 'ICT Infrastruktur' },
                { flowLeft: 'Backup Manual / Terjadwal VM', flowRight: '', desc: '5. Lakukan backup VM (snapshot/full) ke storage khusus, set jadwal otomatis', pic: 'ICT Infrastruktur' },
                { flowLeft: 'Restore VM dari Backup', flowRight: 'Update Proxmox VE', desc: '6. Restore dari backup jika VM bermasalah, melalui wizard Proxmox', pic: 'ICT Infrastruktur' },
                { flowLeft: '', flowRight: '', desc: '7. Jalankan update apt update && apt dist-upgrade secara berkala', pic: 'ICT Infrastruktur' },
                { flowLeft: 'Penambahan / Hapus VM', flowRight: 'Dokumentasi Aktivitas', desc: '8. Deploy VM baru dengan template ISO, konfigurasi resource, IP, dan hostname', pic: 'ICT Infrastruktur' },
                { flowLeft: '', flowRight: 'Finish', desc: '9. Catat setiap perubahan dan backup ke log internal dan sistem monitoring GLPI', pic: 'ICT Infrastruktur' }
            ]
        }
    },
    {
        id: 'ik-rolling',
        name: 'IK-03-02: Alokasi & Peremajaan Perangkat (Rolling Waterfall)',
        type: 'IK',
        data: {
            title: 'Instruksi Kerja Alokasi dan Peremajaan Perangkat',
            docNumber: 'TCFSG-IK-ICT-03-02',
            issueDate: '13 Oktober 2026',
            revNo: '00',
            page: '1 / 1',
            processOwner: 'ICT',
            footerCode: 'TCFSG-IK-ICT-03-02 (Rev 00, 13 Okt 2026)',
            safety: false,
            quality: true,
            cost: true,
            showApd: false,
            showStamp: false,
            preparedBy: 'Mulyana',
            checkedBy: 'Hery Hermawan',
            approvedBy: 'Fauzia Fajrin',
            revisions: [
                { no: '1', date: '13 Oktober 2026', rev: '0', desc: 'Standarisasi Alokasi Laptop vs PC & Skema Rolling Waterfall', pic: 'IT Support' }
            ],
            steps: [
                { flowLeft: 'Identifikasi Kebutuhan', flowRight: 'Verifikasi Mobilitas', desc: '1. Verifikasi matriks mobilitas pemohon (Laptop khusus Manajemen & Sales luar)', pic: 'IT Support' },
                { flowLeft: 'Cek Fleet Power Asset', flowRight: 'Evaluasi Rolling Unit', desc: '2. Periksa ketersediaan unit di modul Fleet Inventory Power Asset', pic: 'IT Support' },
                { flowLeft: 'Rolling Waterfall', flowRight: 'Refurbish Perangkat', desc: '3. Alokasikan unit baru ke level Manajerial; unit eks-manajer diremajakan untuk level Staff', pic: 'IT Support' },
                { flowLeft: 'Uji Kelayakan', flowRight: 'Serah Terima (BAST)', desc: '4. Lakukan pembersihan internal, upgrade RAM/SSD jika diperlukan, dan instalasi baseline', pic: 'IT Support' },
                { flowLeft: 'Dokumentasi', flowRight: 'Finish', desc: '5. Buat BAST digital di Power Asset dan sinkronisasi status ke master inventory', pic: 'IT Support' }
            ]
        }
    }
];

export default function DocumentStudio() {
    const user = JSON.parse((typeof window !== 'undefined' && sessionStorage.getItem('user')) || 'null');
    const isSuperAdmin = user && ['super_user', 'superuser', 'administrator', 'admin'].includes(user.role?.toLowerCase());
    const userOrg = user?.organization || 'TCF-SG';
    const currentOrg = isSuperAdmin 
        ? ((typeof window !== 'undefined' && sessionStorage.getItem('organization')) || userOrg)
        : userOrg;
    const initialPlant = currentOrg.toUpperCase().includes('KG') ? 'KG' : 'SG';
    const [activePlant, setActivePlant] = useState(initialPlant);

    const applyPlantToDoc = (doc, targetPlant) => {
        if (!doc) return doc;
        const cloned = JSON.parse(JSON.stringify(doc));
        const toCode = targetPlant === 'KG' ? 'TCFKG' : 'TCFSG';
        const fromCode = targetPlant === 'KG' ? 'TCFSG' : 'TCFKG';
        const regex = new RegExp(fromCode, 'g');

        if (cloned.docNumber) cloned.docNumber = cloned.docNumber.replace(regex, toCode);
        if (cloned.footerCode) cloned.footerCode = cloned.footerCode.replace(regex, toCode);
        if (cloned.title) cloned.title = cloned.title.replace(regex, toCode);
        if (Array.isArray(cloned.revisions)) {
            cloned.revisions = cloned.revisions.map(r => ({
                ...r,
                desc: r.desc ? r.desc.replace(regex, toCode) : r.desc
            }));
        }
        return cloned;
    };

    const handlePlantChange = (newPlant) => {
        if (!isSuperAdmin) return;
        setActivePlant(newPlant);
        setDocData(prev => applyPlantToDoc(prev, newPlant));
    };

    const [selectedPresetId, setSelectedPresetId] = useState('ik-repair');
    const [docData, setDocData] = useState(() => applyPlantToDoc(PRESETS[0].data, initialPlant));
    const [viewMode, setViewMode] = useState('landscape'); // 'landscape' | 'editor' | 'split'
    const [zoomLevel, setZoomLevel] = useState(90); // 75, 90, 100
    const [exporting, setExporting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showNewDocModal, setShowNewDocModal] = useState(false);

    useEffect(() => {
        if (searchParams.get('action') === 'new') {
            setShowNewDocModal(true);
        }
    }, [searchParams]);

    // Create New Document Helper
    const handleCreateNewDocument = (docType = 'IK') => {
        const today = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
        let newDoc;
        
        if (docType === 'SOP') {
            newDoc = {
                title: 'Standar Operasional Prosedur Baru',
                docNumber: 'TCFSG-SOP-ICT-00-00',
                issueDate: today,
                revNo: '00',
                page: '1 / 1',
                processOwner: 'ICT',
                footerCode: `TCFSG-FM-MR-01-01a (Rev 00, ${today})`,
                safety: true,
                quality: true,
                cost: false,
                showApd: false,
                showStamp: false,
                preparedBy: 'Mulyana',
                checkedBy: 'Hery Hermawan',
                approvedBy: 'Fauzia Fajrin',
                revisions: [
                    { no: '1', date: today, rev: '0', desc: 'Terbitan Baru', pic: 'ICT' }
                ],
                steps: [
                    { flowLeft: 'Start', flowRight: 'Identifikasi Kebutuhan', desc: '1. Mengidentifikasi kebutuhan permohonan atau tiket layanan.', pic: 'Pemohon' },
                    { flowLeft: 'Verifikasi & Validasi', flowRight: '', desc: '2. Melakukan pemeriksaan kelaikan teknis dan otorisasi.', pic: 'ICT Support' },
                    { flowLeft: '', flowRight: 'Eksekusi Prosedur', desc: '3. Menjalankan aktivitas teknis sesuai spesifikasi standar.', pic: 'ICT Support' },
                    { flowLeft: 'Serah Terima (BAST)', flowRight: 'Finish', desc: '4. Melakukan pengetesan akhir dan penandatanganan serah terima.', pic: 'ICT & User' }
                ]
            };
        } else if (docType === 'FM') {
            newDoc = {
                title: 'Formulir Kendali & Checklist',
                docNumber: 'TCFSG-FM-ICT-00-00',
                issueDate: today,
                revNo: '00',
                page: '1 / 1',
                processOwner: 'ICT',
                footerCode: `TCFSG-FM-MR-01-02a (Rev 00, ${today})`,
                safety: false,
                quality: true,
                cost: false,
                showApd: false,
                showStamp: false,
                preparedBy: 'Mulyana',
                checkedBy: 'Hery Hermawan',
                approvedBy: 'Herno Aji Sanjaya',
                revisions: [
                    { no: '1', date: today, rev: '0', desc: 'Terbitan Baru', pic: 'ICT' }
                ],
                steps: [
                    { flowLeft: 'Pencatatan Data', flowRight: '', desc: '1. Mengisi nomor inventaris, tipe perangkat, dan pemohon.', pic: 'Teknisi' },
                    { flowLeft: '', flowRight: 'Inspeksi Kondisi', desc: '2. Memeriksa kondisi fisik, kelistrikan, dan operasional unit.', pic: 'Teknisi' },
                    { flowLeft: 'Verifikasi Hasil', flowRight: 'Selesai', desc: '3. Menentukan status kelayakan dan membubuhkan persetujuan.', pic: 'Supervisor' }
                ]
            };
        } else if (docType === 'BLANK') {
            newDoc = {
                title: 'Dokumen Baru',
                docNumber: 'TCFSG-IK-ICT-00-00',
                issueDate: today,
                revNo: '00',
                page: '1 / 1',
                processOwner: 'ICT',
                footerCode: `TCFSG-FM-MR-01-02a (Rev 00, ${today})`,
                safety: false,
                quality: false,
                cost: false,
                showApd: false,
                showStamp: false,
                preparedBy: 'Mulyana',
                checkedBy: 'Hery Hermawan',
                approvedBy: 'Herno Aji Sanjaya',
                revisions: [
                    { no: '1', date: today, rev: '0', desc: 'New Issue (Terbitan Baru)', pic: 'ICT' }
                ],
                steps: [
                    { flowLeft: 'Start', flowRight: '', desc: '1. Tulis instruksi langkah kerja pertama di sini...', pic: 'ICT Support' }
                ]
            };
        } else {
            // Default: Instruksi Kerja (IK) Kosong
            newDoc = {
                title: 'Instruksi Kerja Baru',
                docNumber: 'TCFSG-IK-ICT-00-00',
                issueDate: today,
                revNo: '00',
                page: '1 / 1',
                processOwner: 'ICT',
                footerCode: `TCFSG-FM-MR-01-02a (Rev 00, ${today})`,
                safety: true,
                quality: true,
                cost: true,
                showApd: true,
                showStamp: false,
                preparedBy: 'Mulyana',
                checkedBy: 'Hery Hermawan',
                approvedBy: 'Herno Aji Sanjaya',
                revisions: [
                    { no: '1', date: today, rev: '0', desc: 'New Issue (Terbitan Baru)', pic: 'ICT' }
                ],
                steps: [
                    { flowLeft: 'Start', flowRight: 'Langkah Awal', desc: '1. Tulis instruksi langkah kerja pertama di sini...', pic: 'ICT Support' },
                    { flowLeft: 'Pemeriksaan Unit', flowRight: '', desc: '2. Tulis instruksi langkah kerja kedua di sini...', pic: 'ICT Support' },
                    { flowLeft: '', flowRight: 'Eksekusi Teknis', desc: '3. Tulis instruksi langkah kerja ketiga di sini...', pic: 'ICT Support' },
                    { flowLeft: 'Pengujian & Selesai', flowRight: 'Finish', desc: '4. Dokumentasikan tindakan dan pastikan fungsi berjalan normal.', pic: 'ICT Support' }
                ]
            };
        }

        setDocData(applyPlantToDoc(newDoc, activePlant));
        setSelectedPresetId('custom-new');
        setShowNewDocModal(false);
        setViewMode('split');
    };

    // Preset selection
    const handleSelectPreset = (presetId) => {
        setSelectedPresetId(presetId);
        if (presetId === 'custom-new') {
            handleCreateNewDocument('IK');
            return;
        }
        const found = PRESETS.find(p => p.id === presetId);
        if (found) {
            setDocData(applyPlantToDoc(found.data, activePlant));
        }
    };

    // Step handlers
    const handleStepChange = (index, field, value) => {
        const newSteps = [...docData.steps];
        newSteps[index][field] = value;
        setDocData({ ...docData, steps: newSteps });
    };

    const handleAddStep = () => {
        const newSteps = [
            ...docData.steps,
            { 
                flowLeft: `Langkah ${docData.steps.length + 1}`,
                flowRight: '',
                desc: `${docData.steps.length + 1}. Tulis instruksi teknis...`, 
                pic: 'ICT Support' 
            }
        ];
        setDocData({ ...docData, steps: newSteps });
    };

    const handleRemoveStep = (index) => {
        if (docData.steps.length <= 1) return alert('Dokumen harus memiliki minimal 1 langkah kerja.');
        const newSteps = docData.steps.filter((_, i) => i !== index);
        setDocData({ ...docData, steps: newSteps });
    };

    const handleMoveStep = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= docData.steps.length) return;
        const newSteps = [...docData.steps];
        const temp = newSteps[index];
        newSteps[index] = newSteps[targetIndex];
        newSteps[targetIndex] = temp;
        setDocData({ ...docData, steps: newSteps });
    };

    // Export Excel
    const handleExportExcel = async () => {
        setExporting(true);
        try {
            await exportIkExcel(docData);
        } catch (err) {
            console.error('Export Excel failed:', err);
            alert('Gagal mengekspor file Excel: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    // Print
    const handlePrint = () => {
        window.print();
    };

    // Save
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/network/raw-documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: docData.title,
                    type: 'IK',
                    description: `Template Interaktif Landscape: ${docData.docNumber} (${docData.processOwner})`,
                    content_json: JSON.stringify(docData)
                })
            });
            alert('Draft dokumen berhasil disimpan ke server!');
        } catch (err) {
            alert('Draft tersimpan di sesi lokal.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5 max-w-[1500px] mx-auto pb-16 animate-in fade-in duration-300">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-indigo-500/20 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                        <Layers size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                            TCF Document Studio
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                A4 Landscape ISO
                            </span>
                        </h1>
                        <p className="text-slate-300 text-xs font-medium">
                            Format Formulir Instruksi Kerja 100% Sesuai Template Standar Mutu PT Tri Centrum Fortuna.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Plant Switcher / Indicator */}
                    {isSuperAdmin ? (
                        <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                            <button
                                onClick={() => handlePlantChange('SG')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                                    activePlant === 'SG' 
                                        ? 'bg-indigo-600 text-white shadow-sm' 
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Plant SG (Sadang)
                            </button>
                            <button
                                onClick={() => handlePlantChange('KG')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                                    activePlant === 'KG' 
                                        ? 'bg-amber-500 text-slate-950 shadow-sm' 
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                                Plant KG (Karawang)
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-200" title="Plant terkunci sesuai hak akses user">
                            <span className={`w-2 h-2 rounded-full ${activePlant === 'KG' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            <span>{activePlant === 'KG' ? 'Plant KG (Karawang)' : 'Plant SG (Sadang)'}</span>
                            <span className="text-[10px] text-slate-400 font-normal">🔒 Locked</span>
                        </div>
                    )}

                    <button
                        onClick={() => setShowNewDocModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 border border-indigo-400/30"
                        title="Buat Dokumen Baru (IK, SOP, Form)"
                    >
                        <FilePlus2 size={16} /> + Buat Dokumen Baru
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
                        title="Unduh file Excel Landscape asli"
                    >
                        <FileSpreadsheet size={15} />
                        {exporting ? 'Mengekspor...' : 'Export ke Excel (.xlsx)'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                        <Printer size={15} /> Cetak / PDF
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 rounded-xl font-bold text-xs transition-all active:scale-95"
                    >
                        <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Draft'}
                    </button>
                </div>
            </div>

            {/* Sub-Bar: Preset & View Controls */}
            <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-600" /> Template Preset:
                    </span>
                    <select
                        value={selectedPresetId}
                        onChange={(e) => handleSelectPreset(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="custom-new" className="text-indigo-600 font-bold bg-indigo-50">✨ + Buat Dokumen Kosong Baru</option>
                        <optgroup label="Template Resmi ICT TCF">
                            {PRESETS.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </optgroup>
                    </select>

                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer ml-2">
                        <input
                            type="checkbox"
                            checked={docData.showApd}
                            onChange={(e) => setDocData({ ...docData, showApd: e.target.checked })}
                            className="rounded text-emerald-600 w-3.5 h-3.5"
                        />
                        <span>Tampilkan Kotak APD</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={docData.showStamp}
                            onChange={(e) => setDocData({ ...docData, showStamp: e.target.checked })}
                            className="rounded text-red-600 w-3.5 h-3.5"
                        />
                        <span>Stempel QMR Asli</span>
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                            onClick={() => setViewMode('landscape')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                                viewMode === 'landscape' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Landscape Full
                        </button>
                        <button
                            onClick={() => setViewMode('split')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                                viewMode === 'split' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Split Editor
                        </button>
                        <button
                            onClick={() => setViewMode('editor')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                                viewMode === 'editor' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Form Editor
                        </button>
                    </div>

                    {/* Zoom */}
                    {viewMode !== 'editor' && (
                        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                            <button
                                onClick={() => setZoomLevel(Math.max(65, zoomLevel - 10))}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600"
                                title="Zoom Out"
                            >
                                <ZoomOut size={13} />
                            </button>
                            <span className="text-[11px] font-bold text-slate-600 min-w-[36px] text-center">{zoomLevel}%</span>
                            <button
                                onClick={() => setZoomLevel(Math.min(110, zoomLevel + 10))}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600"
                                title="Zoom In"
                            >
                                <ZoomIn size={13} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Layout Grid */}
            <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
                
                {/* Form Editor (Visible when mode is 'editor' or 'split') */}
                {(viewMode === 'editor' || viewMode === 'split') && (
                    <div className={`${viewMode === 'split' ? 'lg:col-span-4' : 'max-w-4xl mx-auto w-full'} space-y-4 print:hidden`}>
                        {/* Header Inputs */}
                        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
                            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                                <Edit3 size={14} className="text-indigo-600" /> Header Dokumen
                            </h3>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Judul Instruksi Kerja</label>
                                <input
                                    type="text"
                                    value={docData.title}
                                    onChange={(e) => setDocData({ ...docData, title: e.target.value })}
                                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">No. Dokumen</label>
                                    <input
                                        type="text"
                                        value={docData.docNumber}
                                        onChange={(e) => setDocData({ ...docData, docNumber: e.target.value })}
                                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tanggal Terbit</label>
                                    <input
                                        type="text"
                                        value={docData.issueDate}
                                        onChange={(e) => setDocData({ ...docData, issueDate: e.target.value })}
                                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">No. Rev</label>
                                    <input
                                        type="text"
                                        value={docData.revNo}
                                        onChange={(e) => setDocData({ ...docData, revNo: e.target.value })}
                                        className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-center"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Halaman</label>
                                    <input
                                        type="text"
                                        value={docData.page}
                                        onChange={(e) => setDocData({ ...docData, page: e.target.value })}
                                        className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-center"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Pemilik Proses</label>
                                    <input
                                        type="text"
                                        value={docData.processOwner}
                                        onChange={(e) => setDocData({ ...docData, processOwner: e.target.value })}
                                        className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Steps Editor */}
                        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                                    Langkah Kerja ({docData.steps.length})
                                </h3>
                                <button
                                    onClick={handleAddStep}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1"
                                >
                                    <Plus size={13} /> Tambah
                                </button>
                            </div>
                            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                                {docData.steps.map((st, idx) => (
                                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                                        <div className="flex items-center justify-between font-bold text-slate-500 text-[11px]">
                                            <span>Poin #{idx + 1}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleMoveStep(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded">
                                                    <ArrowUp size={11} />
                                                </button>
                                                <button onClick={() => handleMoveStep(idx, 1)} disabled={idx === docData.steps.length - 1} className="p-1 hover:bg-slate-200 rounded">
                                                    <ArrowDown size={11} />
                                                </button>
                                                <button onClick={() => handleRemoveStep(idx)} className="p-1 hover:bg-red-100 text-red-500 rounded">
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Flow Kiri</label>
                                                <input
                                                    type="text"
                                                    value={st.flowLeft || ''}
                                                    onChange={(e) => handleStepChange(idx, 'flowLeft', e.target.value)}
                                                    placeholder="Kotak Kiri..."
                                                    className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Flow Kanan</label>
                                                <input
                                                    type="text"
                                                    value={st.flowRight || ''}
                                                    onChange={(e) => handleStepChange(idx, 'flowRight', e.target.value)}
                                                    placeholder="Kotak Kanan..."
                                                    className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Keterangan Teknis</label>
                                            <textarea
                                                rows={2}
                                                value={st.desc}
                                                onChange={(e) => handleStepChange(idx, 'desc', e.target.value)}
                                                className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">PIC / Remarks</label>
                                            <input
                                                type="text"
                                                value={st.pic}
                                                onChange={(e) => handleStepChange(idx, 'pic', e.target.value)}
                                                className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Approvals */}
                        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-2.5 text-xs">
                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100">
                                Matriks Tanda Tangan
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Disetujui</label>
                                    <input
                                        type="text"
                                        value={docData.approvedBy}
                                        onChange={(e) => setDocData({ ...docData, approvedBy: e.target.value })}
                                        className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center font-bold text-[11px]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Diperiksa</label>
                                    <input
                                        type="text"
                                        value={docData.checkedBy}
                                        onChange={(e) => setDocData({ ...docData, checkedBy: e.target.value })}
                                        className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center font-bold text-[11px]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Dibuat</label>
                                    <input
                                        type="text"
                                        value={docData.preparedBy}
                                        onChange={(e) => setDocData({ ...docData, preparedBy: e.target.value })}
                                        className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center font-bold text-[11px]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Landscape A4 Canvas Preview (Visible when mode is 'landscape' or 'split') */}
                {viewMode !== 'editor' && (
                    <div className={`${viewMode === 'split' ? 'lg:col-span-8' : 'w-full'} flex justify-center overflow-x-auto pb-8`}>
                        <div 
                            style={{ 
                                transform: `scale(${zoomLevel / 100})`, 
                                transformOrigin: 'top center',
                                width: '1160px',
                                minWidth: '1160px'
                            }}
                            className="bg-white border-2 border-slate-400 shadow-2xl p-7 text-black font-sans relative transition-transform duration-200 print:transform-none print:shadow-none print:border-none print:p-0 print:w-full"
                        >
                            {/* Outer Document Border Frame */}
                            <div className="border border-black relative">
                                
                                {/* 1. HEADER SECTION */}
                                <div className="border-b border-black grid grid-cols-12 divide-x divide-black">
                                    {/* Logo TCF Box (Left ~12%) */}
                                    <div className="col-span-2 flex items-center justify-center p-1.5 bg-white">
                                        <img 
                                            src="/tcf_logo.png" 
                                            alt="TCF Logo" 
                                            className="w-24 h-24 object-contain" 
                                        />
                                    </div>

                                    {/* Center Header (~68%) */}
                                    <div className="col-span-7 flex flex-col justify-between text-center divide-y divide-black">
                                        <div className="py-1 text-sm md:text-base font-extrabold tracking-wider text-black">
                                            PT. TRI CENTRUM FORTUNA
                                        </div>
                                        <div className="py-1 text-xs md:text-sm font-bold text-blue-700 underline tracking-wide">
                                            INTRUKSI KERJA
                                        </div>
                                        <div className="py-2 px-3 bg-[#FCE4D6] font-black text-lg md:text-xl text-black tracking-tight">
                                            {docData.title}
                                        </div>
                                        <div className="py-1 px-4 text-left text-xs font-medium text-black">
                                            Pemilik Proses &nbsp;: &nbsp;<span className="font-bold">{docData.processOwner}</span>
                                        </div>
                                    </div>

                                    {/* Right Metadata Box (~20%) */}
                                    <div className="col-span-3 text-[11px] divide-y divide-black">
                                        <div className="flex items-center py-1 px-3">
                                            <span className="w-20 text-slate-700">No. Doc</span>
                                            <span className="font-bold text-black">: {docData.docNumber}</span>
                                        </div>
                                        <div className="flex items-center py-1 px-3">
                                            <span className="w-20 text-slate-700">Issue Date</span>
                                            <span className="font-bold text-black">: {docData.issueDate}</span>
                                        </div>
                                        <div className="flex items-center py-1 px-3">
                                            <span className="w-20 text-slate-700">Rev. No</span>
                                            <span className="font-bold text-black">: {docData.revNo}</span>
                                        </div>
                                        <div className="flex items-center py-1 px-3">
                                            <span className="w-20 text-slate-700">Page</span>
                                            <span className="font-bold text-black">: {docData.page}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Spacing */}
                                <div className="h-2 bg-white"></div>

                                {/* 2. BODY TABLE HEADERS */}
                                <div className="border-t border-b border-black grid grid-cols-12 divide-x divide-black text-xs font-black text-center bg-slate-50 py-1.5">
                                    <div className="col-span-3 uppercase tracking-wider">FLOW PROSES</div>
                                    <div className="col-span-6 uppercase tracking-wider">GAMBAR / KETERANGAN</div>
                                    <div className="col-span-3 uppercase tracking-wider">PIC / REMARKS</div>
                                </div>

                                {/* 3. BODY TABLE CONTENT */}
                                <div className="grid grid-cols-12 divide-x divide-black relative">
                                    
                                    {/* QMR Red Stamp Watermark (Only if explicitly enabled) */}
                                    {docData.showStamp && (
                                        <div className="absolute right-[28%] top-[38%] pointer-events-none transform -rotate-12 border-2 border-red-500/80 rounded px-3 py-1.5 text-center text-red-500/90 font-mono select-none z-20 shadow-xs">
                                            <div className="text-lg font-black tracking-widest leading-none">ORIGINAL</div>
                                            <div className="text-[10px] font-bold tracking-tight">DC/TCF/24/03/2025</div>
                                            <div className="text-[9px] font-bold">PT. TRI CENTRUM FORTUNA</div>
                                        </div>
                                    )}

                                    {/* Column 1: FLOW PROSES (col-span-3) with Continuous SVG Flow Arrows */}
                                    <div 
                                        className="col-span-3 relative bg-white py-0 flex flex-col justify-between" 
                                        style={{ minHeight: `${docData.steps.length * 54}px` }}
                                    >
                                        {/* Dynamic SVG Connector Arrows */}
                                        <svg 
                                            className="absolute inset-0 w-full h-full pointer-events-none" 
                                            viewBox={`0 0 280 ${docData.steps.length * 54}`}
                                            preserveAspectRatio="none"
                                        >
                                            <defs>
                                                <marker id="flow-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
                                                </marker>
                                            </defs>
                                            {docData.steps.map((st, idx) => {
                                                const H = 54;
                                                const yCenter = idx * H + 27;
                                                const boxBot = yCenter + 15;
                                                const elements = [];

                                                // 1. Same-row horizontal arrow
                                                if (st.flowLeft && st.flowRight) {
                                                    elements.push(
                                                        <line 
                                                            key={`h-${idx}`} 
                                                            x1="114" y1={yCenter} 
                                                            x2="164" y2={yCenter} 
                                                            stroke="#000000" strokeWidth="1.5" 
                                                            markerEnd="url(#flow-arrow)" 
                                                        />
                                                    );
                                                }

                                                // 2. Inter-row connector to next step
                                                if (idx < docData.steps.length - 1) {
                                                    const nextSt = docData.steps[idx + 1];
                                                    const nextYCenter = (idx + 1) * H + 27;
                                                    const nextTop = nextYCenter - 15;
                                                    const midY = (boxBot + nextTop) / 2;

                                                    const startX = st.flowRight ? 216 : (st.flowLeft ? 64 : null);
                                                    const endX = nextSt.flowLeft ? 64 : (nextSt.flowRight ? 216 : null);

                                                    if (startX !== null && endX !== null) {
                                                        if (startX === endX) {
                                                            elements.push(
                                                                <line 
                                                                    key={`v-${idx}`} 
                                                                    x1={startX} y1={boxBot} 
                                                                    x2={endX} y2={nextTop - 2} 
                                                                    stroke="#000000" strokeWidth="1.5" 
                                                                    markerEnd="url(#flow-arrow)" 
                                                                />
                                                            );
                                                        } else {
                                                            elements.push(
                                                                <path 
                                                                    key={`z-${idx}`} 
                                                                    d={`M ${startX} ${boxBot} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${nextTop - 2}`} 
                                                                    fill="none" stroke="#000000" strokeWidth="1.5" 
                                                                    strokeLinejoin="round" 
                                                                    markerEnd="url(#flow-arrow)" 
                                                                />
                                                            );
                                                        }
                                                    }
                                                }
                                                return elements;
                                            })}
                                        </svg>

                                        {/* HTML Flowchart Node Boxes */}
                                        {docData.steps.map((st, idx) => (
                                            <div key={idx} className="flex items-center justify-between px-3.5 h-[54px] z-10 relative">
                                                <div className="w-[100px] flex justify-center">
                                                    {st.flowLeft ? (
                                                        <div className={`w-full px-1.5 py-1.5 border border-black text-[9px] font-bold text-center bg-white shadow-xs leading-tight ${
                                                            st.flowLeft.toLowerCase() === 'start' ? 'rounded-full' : 'rounded'
                                                        }`}>
                                                            {st.flowLeft}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="w-[100px] flex justify-center">
                                                    {st.flowRight ? (
                                                        <div className={`w-full px-1.5 py-1.5 border border-black text-[9px] font-bold text-center bg-white shadow-xs leading-tight ${
                                                            st.flowRight.toLowerCase() === 'finish' ? 'rounded-full' : 'rounded'
                                                        }`}>
                                                            {st.flowRight}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Column 2 & 3: GAMBAR / KETERANGAN & PIC / REMARKS (col-span-9) */}
                                    <div className="col-span-9 divide-y divide-black/10">
                                        {docData.steps.map((st, idx) => (
                                             <div key={idx} className="grid grid-cols-9 divide-x divide-black h-[54px] items-stretch text-xs">
                                                 {/* Column 2: Gambar / Keterangan */}
                                                 <div className="col-span-6 p-2 text-black leading-relaxed font-normal flex items-center">
                                                     {st.desc}
                                                 </div>

                                                 {/* Column 3: PIC / Remarks */}
                                                 <div className="col-span-3 p-2 flex items-center justify-center text-center font-bold text-slate-800 text-[11px]">
                                                     {st.pic}
                                                 </div>
                                             </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. KRITERIA PROSES & STANDARISASI ALAT PELINDUNG DIRI (APD) */}
                                <div className="border-t border-black grid grid-cols-12 divide-x divide-black items-stretch bg-white">
                                    
                                    {/* Left: Safety / Quality / Cost Bar (~55%) */}
                                    <div className="col-span-7 p-3 flex items-center justify-around text-xs font-black">
                                        <div className="flex items-center gap-2">
                                            <img src="/k3_gear.jpeg" onError={(e) => { e.target.src = '/k3_logo.png'; }} alt="Safety K3" className="w-9 h-9 object-contain" />
                                            <span className="text-sm">: SAFETY</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-yellow-300 border-2 border-black rotate-45 transform scale-75 shadow-xs"></div>
                                            <span className="text-sm">: QUALITY</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full border-2 border-black bg-white shadow-xs"></div>
                                            <span className="text-sm">: COST</span>
                                        </div>
                                    </div>

                                    {/* Right: STANDARISASI ALAT PELINDUNG DIRI (APD) (~45%) */}
                                    {docData.showApd ? (
                                        <div className="col-span-5 flex flex-col justify-between">
                                            <div className="bg-[#065F46] text-white text-[10px] font-black uppercase text-center py-1 tracking-wider">
                                                STANDARISASI ALAT PELINDUNG DIRI
                                            </div>
                                            <div className="grid grid-cols-4 divide-x divide-emerald-600 p-1.5 bg-emerald-50/50">
                                                <div className="p-1 flex flex-col items-center justify-center">
                                                    <img src="/apd_sepatu.jpeg" alt="Sepatu Safety" className="h-10 object-contain rounded border border-emerald-500 bg-white p-0.5" />
                                                    <span className="text-[8px] font-bold text-emerald-900 mt-1">Sepatu</span>
                                                </div>
                                                <div className="p-1 flex flex-col items-center justify-center">
                                                    <img src="/apd_helm.jpeg" alt="Helm Safety" className="h-10 object-contain rounded border border-emerald-500 bg-white p-0.5" />
                                                    <span className="text-[8px] font-bold text-emerald-900 mt-1">Helm</span>
                                                </div>
                                                <div className="p-1 flex flex-col items-center justify-center">
                                                    <img src="/apd_sarung_tangan.png" alt="Sarung Tangan" className="h-10 object-contain rounded border border-emerald-500 bg-white p-0.5" />
                                                    <span className="text-[8px] font-bold text-emerald-900 mt-1">Sarung Tgn</span>
                                                </div>
                                                <div className="p-1 flex flex-col items-center justify-center">
                                                    <img src="/apd_esd.png" alt="ESD Strap" className="h-10 object-contain rounded border border-emerald-500 bg-white p-0.5" />
                                                    <span className="text-[8px] font-bold text-emerald-900 mt-1">ESD Strap</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="col-span-5 p-3 flex items-center justify-center text-xs text-slate-400 italic">
                                            Standarisasi APD tidak dipersyaratkan untuk prosedur ini
                                        </div>
                                    )}
                                </div>

                                {/* 5. REVISION TABLE & APPROVAL MATRIX */}
                                <div className="border-t border-black grid grid-cols-12 divide-x divide-black text-[11px]">
                                    
                                    {/* Left: Riwayat Revisi (~60%) */}
                                    <div className="col-span-7 flex flex-col justify-between">
                                        <div className="grid grid-cols-12 border-b border-black text-[10px] font-black text-center bg-slate-100 py-1 divide-x divide-black">
                                            <div className="col-span-1">No.</div>
                                            <div className="col-span-3">Tanggal</div>
                                            <div className="col-span-2">Rev.</div>
                                            <div className="col-span-4">Isi Revisi</div>
                                            <div className="col-span-2">PIC</div>
                                        </div>
                                        <div className="divide-y divide-black text-[10px]">
                                            {(docData.revisions || []).map((rev, rIdx) => (
                                                <div key={rIdx} className="grid grid-cols-12 py-1 divide-x divide-black text-center items-center">
                                                    <div className="col-span-1">{rev.no}</div>
                                                    <div className="col-span-3">{rev.date}</div>
                                                    <div className="col-span-2">{rev.rev}</div>
                                                    <div className="col-span-4 px-1.5 text-left font-medium">{rev.desc}</div>
                                                    <div className="col-span-2">{rev.pic}</div>
                                                </div>
                                            ))}
                                            {/* Blank row filler */}
                                            <div className="grid grid-cols-12 py-1.5 divide-x divide-black text-transparent select-none">
                                                <div className="col-span-1">-</div>
                                                <div className="col-span-3">-</div>
                                                <div className="col-span-2">-</div>
                                                <div className="col-span-4">-</div>
                                                <div className="col-span-2">-</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Approval Matrix 3 Kolom (~40%) */}
                                    <div className="col-span-5 grid grid-cols-3 divide-x divide-black text-center text-[10px]">
                                        <div className="flex flex-col justify-between">
                                            <div className="py-1 border-b border-black font-bold bg-slate-100">Disetujui</div>
                                            <div className="h-14">
                                                {/* Ruang tanda tangan fisik */}
                                            </div>
                                            <div className="py-1 border-t border-black font-bold text-black">{docData.approvedBy}</div>
                                        </div>
                                        <div className="flex flex-col justify-between">
                                            <div className="py-1 border-b border-black font-bold bg-slate-100">Diperiksa</div>
                                            <div className="h-14">
                                                {/* Ruang tanda tangan fisik */}
                                            </div>
                                            <div className="py-1 border-t border-black font-bold text-black">{docData.checkedBy}</div>
                                        </div>
                                        <div className="flex flex-col justify-between">
                                            <div className="py-1 border-b border-black font-bold bg-slate-100">Dibuat</div>
                                            <div className="h-14">
                                                {/* Ruang tanda tangan fisik */}
                                            </div>
                                            <div className="py-1 border-t border-black font-bold text-black">{docData.preparedBy}</div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer Line Outside Border (Bottom-Left) */}
                            <div className="pt-2 text-[10px] text-slate-600 font-medium tracking-tight">
                                {docData.footerCode}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Modal Pilih Format Dokumen Baru */}
            {showNewDocModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <FilePlus2 size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Buat Dokumen Baru</h3>
                                    <p className="text-xs text-slate-500">Pilih tipe template standar ISO PT Tri Centrum Fortuna</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowNewDocModal(false)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* IK */}
                            <button
                                onClick={() => handleCreateNewDocument('IK')}
                                className="group text-left p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all flex flex-col justify-between space-y-3 cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                        IK
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Landscape ISO</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                                        Instruksi Kerja (IK)
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Template 2-lane flowchart (Kiri & Kanan), kriteria Safety/Quality/Cost, APD, dan deskripsi teknis per langkah.
                                    </p>
                                </div>
                            </button>

                            {/* SOP */}
                            <button
                                onClick={() => handleCreateNewDocument('SOP')}
                                className="group text-left p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/40 transition-all flex flex-col justify-between space-y-3 cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                                        SOP
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Prosedur Dept</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                                        Standard Operating Procedure
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Alur prosedur operasional lengkap, alur verifikasi, serta persetujuan hierarkis manajemen.
                                    </p>
                                </div>
                            </button>

                            {/* FM / Form Checklist */}
                            <button
                                onClick={() => handleCreateNewDocument('FM')}
                                className="group text-left p-4 rounded-xl border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50/40 transition-all flex flex-col justify-between space-y-3 cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xs">
                                        FM
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Checklist & Form</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 group-hover:text-amber-600 transition-colors">
                                        Formulir Kendali & Checklist
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Format formulir verifikasi, serah terima BAST, dan checklist pemeliharaan berkala unit.
                                    </p>
                                </div>
                            </button>

                            {/* Blank Sheet */}
                            <button
                                onClick={() => handleCreateNewDocument('BLANK')}
                                className="group text-left p-4 rounded-xl border-2 border-slate-100 hover:border-slate-500 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-3 cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs">
                                        BLANK
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Mulai dari Nol</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 group-hover:text-slate-900 transition-colors">
                                        Kanvas Kosong (Clean Sheet)
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Mulai dokumen kosong dari awal dengan 1 langkah dasar untuk diisi manual.
                                    </p>
                                </div>
                            </button>
                        </div>

                        <div className="text-right pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setShowNewDocModal(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

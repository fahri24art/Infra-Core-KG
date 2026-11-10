import React, { useState, useEffect } from 'react';
import { X, Save, ArrowUpCircle, Printer } from 'lucide-react';
import Swal from 'sweetalert2';
import { generateUpgradePdf } from '../utils/generateUpgradePdf';

export default function AssetUpgradeModal({ isOpen, onClose, asset, onSuccess }) {
    const [formData, setFormData] = useState({
        user_name: '',
        department: '',
        job_title: '',
        manager_name: '',
        current_specs: '',
        purchase_year: '',
        justification: '',
        requested_specs: '',
        priority: 'Normal',
        technician_notes: '',
        estimated_cost: ''
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (asset && isOpen) {
            let parsedSpecs = {};
            try {
                if (typeof asset.specs === 'string') {
                    parsedSpecs = JSON.parse(asset.specs);
                } else if (typeof asset.specs === 'object' && asset.specs !== null) {
                    parsedSpecs = asset.specs;
                }
            } catch (e) {}

            const cpu = parsedSpecs.cpu || parsedSpecs.processor || parsedSpecs.Processor || asset.processor || '';
            const ram = parsedSpecs.ram || parsedSpecs.memory || parsedSpecs.Memory || asset.memory || '';
            
            let storageStr = '';
            const storageData = parsedSpecs.storage_summary || parsedSpecs.storage || parsedSpecs.disk || asset.storage;
            if (Array.isArray(storageData)) {
                storageStr = storageData.map(d => typeof d === 'object' ? `${d.model || 'Disk'} (${d.capacity_gb || d.capacity_mb || 0} GB)` : d).join(', ');
            } else if (typeof storageData === 'string') {
                storageStr = storageData;
            }

            let currentSpecsStr = '';
            if (cpu) currentSpecsStr += `Processor: ${cpu}\n`;
            if (ram) currentSpecsStr += `RAM Card: ${ram}\n`;
            if (storageStr) currentSpecsStr += `Storage: ${storageStr}\n`;
            
            const osStr = parsedSpecs.os || parsedSpecs.OperatingSystem || asset.os_info;
            if (osStr) currentSpecsStr += `OS: ${osStr}\n`;

            currentSpecsStr = currentSpecsStr.trim();
            if (!currentSpecsStr && typeof asset.specs === 'string' && !asset.specs.startsWith('{')) {
                currentSpecsStr = asset.specs.trim();
            }

            const year = asset.purchase_date ? new Date(asset.purchase_date).getFullYear() : new Date().getFullYear();

            setFormData({
                user_name: asset.user_name || asset.contact || '',
                department: asset.user_department || '',
                job_title: '',
                manager_name: '',
                current_specs: currentSpecsStr || '',
                purchase_year: year || '',
                justification: '',
                requested_specs: '',
                priority: 'Normal',
                technician_notes: '',
                estimated_cost: '',
                existingTicket: ''
            });
        }
    }, [asset, isOpen]);

    if (!isOpen || !asset) return null;

    const currentOrg = (typeof window !== 'undefined' && sessionStorage.getItem('organization')) || '';
    const isKG = asset?.organization === 'TCF-KG' || currentOrg.toUpperCase().includes('KG');
    const plantCode = isKG ? 'TCFKG' : 'TCFSG';
    const now = new Date();
    const ymd = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const activeTicketPreview = (formData.existingTicket && formData.existingTicket.trim()) 
        ? formData.existingTicket.trim() 
        : `ICT-${plantCode}-UPG-${ymd}-[AUTO]`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Save to database first
            const res = await fetch('/api/network/assets/upgrades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...formData, 
                    asset_id: asset.id,
                    inventory_number: asset.inventory_number 
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to submit');
            }

            const savedData = await res.json();
            
            const realTicketNumber = (formData.existingTicket && formData.existingTicket.trim())
                || savedData.ticketNumber 
                || `ICT-${plantCode}-UPG-${ymd}-${Date.now().toString().slice(-3)}`;

            // Generate & Download PDF with the real ticket number
            await generateUpgradePdf(asset, formData, realTicketNumber);

            Swal.fire('Berhasil!', 'Permintaan berhasil disimpan & PDF Formulir telah diunduh.', 'success');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Submit error:', err);
            Swal.fire('Gagal!', err.message || 'Terjadi kesalahan saat mengirim permintaan.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <ArrowUpCircle className="text-blue-600" /> Form Permintaan Upgrade Perangkat
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="upgradeForm" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Section: Optional Existing Ticket */}
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                            <label className="block text-xs font-black text-blue-800 uppercase tracking-widest mb-1.5">Nomor Tiket Helpdesk (Opsional)</label>
                            <input type="text" placeholder="Contoh: ICT-TCFSG-UPG-20261021-001 atau ICT-TCFSG-03-00102" value={formData.existingTicket} onChange={e => setFormData({...formData, existingTicket: e.target.value})} className="w-full bg-white border border-blue-200 text-blue-900 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder:font-normal placeholder:text-blue-300" />
                            <p className="text-[11px] text-blue-600 font-medium mt-2">Isi jika tiket sudah dibuat di Helpdesk. Kosongkan untuk bikin tiket baru.</p>
                        </div>

                        {/* Section: Asset Info (Read Only Info) */}
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                            <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3">Informasi Asset</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">No. Asset / Inventory</p>
                                    <p className="text-sm font-black text-slate-800">{asset.inventory_number || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Kategori</p>
                                    <p className="text-sm font-black text-slate-800">{asset.category || '-'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Merk / Model</p>
                                    <p className="text-sm font-black text-slate-800">{asset.manufacturer} {asset.model}</p>
                                </div>
                            </div>
                        </div>

                        {/* Section: User Info */}
                        <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Informasi Pemohon</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Nama Pemegang Asset</label>
                                    <input required type="text" value={formData.user_name} onChange={e => setFormData({...formData, user_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Departemen</label>
                                    <input required type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Jabatan Pemohon</label>
                                    <input required type="text" value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Contoh: Staff HR, Operator" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Atasan Langsung (Sect/Dept Head)</label>
                                    <input required type="text" value={formData.manager_name} onChange={e => setFormData({...formData, manager_name: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Nama Atasan Langsung" />
                                </div>
                            </div>
                        </div>

                        {/* Section: Technical Specs */}
                        <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Detail Perangkat & Upgrade</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Spesifikasi Saat Ini</label>
                                        <textarea rows="5" value={formData.current_specs} onChange={e => setFormData({...formData, current_specs: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Tahun Pembelian</label>
                                        <input type="number" value={formData.purchase_year} onChange={e => setFormData({...formData, purchase_year: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Alasan Permintaan Upgrade <span className="text-red-500">*</span></label>
                                    <textarea required rows="3" value={formData.justification} onChange={e => setFormData({...formData, justification: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Jelaskan kendala saat ini. Contoh: RAM kurang memadai untuk aplikasi desain, sering hang, dll."></textarea>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Target Spesifikasi yang Diminta <span className="text-red-500">*</span></label>
                                    <textarea required rows="2" value={formData.requested_specs} onChange={e => setFormData({...formData, requested_specs: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Contoh: Tambah RAM menjadi 16GB, Ganti ke SSD 512GB"></textarea>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Prioritas</label>
                                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all">
                                        <option value="Low">Low (Bisa ditunda)</option>
                                        <option value="Normal">Normal</option>
                                        <option value="High">High (Mengganggu Pekerjaan)</option>
                                        <option value="Urgent">Urgent (Pekerjaan Terhenti)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section: Evaluasi ICT */}
                        <div className="mt-6 border-t border-slate-100 pt-6">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Evaluasi ICT (Opsional - Diisi oleh Tim IT)</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Catatan Teknisi</label>
                                    <textarea rows="3" value={formData.technician_notes} onChange={e => setFormData({...formData, technician_notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Catatan teknis tim IT..."></textarea>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Estimasi Biaya (Rp)</label>
                                    <input type="text" value={formData.estimated_cost} onChange={e => setFormData({...formData, estimated_cost: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Contoh: 1.500.000" />
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all">Batal</button>
                    <button type="button" onClick={() => generateUpgradePdf(asset, formData, activeTicketPreview)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-bold rounded-xl flex items-center gap-2 transition-all">
                        <Printer size={16} /> Print Saja (Tanpa Simpan)
                    </button>
                    <button type="submit" form="upgradeForm" disabled={loading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
                        <Save size={16} /> {loading ? 'Memproses...' : 'Simpan & Print Formulir'}
                    </button>
                </div>
            </div>
        </div>
    );
}

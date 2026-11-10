import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, Save, CheckSquare } from 'lucide-react';
import SignatureModal from '../components/ui/SignatureModal';

export default function PhoneMaintenanceForm({ asset, formData, onChange, onSubmit }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formStatus, setFormStatus] = useState('New');
    const [currentRole, setCurrentRole] = useState('Technician');
    const [signatureModal, setSignatureModal] = useState(null);

    const defaultData = {
        fisik: 'Bersih & Normal',
        layar: 'Bening & Touch Responsif',
        baterai: 'Normal / Tidak Kembung',
        charger: 'Berfungsi Normal',
        jaringan: 'Wifi & Seluler Konek',
        kamera: 'Hasil Jelas / Fokus',
        suara: 'Speaker & Mic Jelas',
        aplikasi: 'Berjalan Normal',
        notes: ''
    };

    const isNew = !formData || Object.keys(formData).length === 0;
    const data = isNew ? defaultData : formData;

    useEffect(() => {
        if (isNew && onChange) {
            onChange(defaultData);
        }
    }, [isNew, onChange]);

    useEffect(() => {
        if (data.sign_manager) {
            setFormStatus('Done');
            setCurrentRole('Manager');
        } else if (data.sign_user) {
            setFormStatus('Pending Manager');
            setCurrentRole('Manager');
        } else if (data.sign_technician) {
            setFormStatus('Pending User');
            setCurrentRole('User');
        }
    }, [data.sign_manager, data.sign_user, data.sign_technician]);

    const handleChange = (key, value) => {
        if (onChange) onChange({ ...data, [key]: value });
    };

    const handleSignSave = (signData) => {
        const role = signatureModal?.role;
        setSignatureModal(null);
        if (!role) return;

        const updated = { ...data };
        if (role === 'Technician') {
            updated.sign_technician = signData;
            if (onChange) onChange(updated);
            submitTechnician(updated);
        } else if (role === 'User') {
            updated.sign_user = signData;
            if (onChange) onChange(updated);
            approveRole('User', updated);
        } else if (role === 'Manager') {
            updated.sign_manager = signData;
            if (onChange) onChange(updated);
            approveRole('Manager', updated);
        }
    };

    const submitTechnician = (updatedData) => {
        setIsSubmitting(true);
        if (onSubmit) onSubmit(updatedData);
        setTimeout(() => {
            setIsSubmitting(false);
            setFormStatus('Pending User');
            alert('Phone Maintenance Submitted! Waiting for User Approval.');
        }, 800);
    };

    const approveRole = (role, updatedData) => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            if (role === 'User') {
                setFormStatus('Pending Manager');
                alert('Approved by User!');
                if (onSubmit) onSubmit(updatedData);
            } else if (role === 'Manager') {
                setFormStatus('Done');
                alert('Approved by Section Head!');
                if (onSubmit) onSubmit(updatedData);
            }
        }, 500);
    };

    const FieldSelect = ({ label, fieldKey, standard }) => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-3 border-b border-[#F0F0F0] last:border-0 items-center text-sm">
            <div className="font-bold text-slate-700">{label}</div>
            <div className="text-slate-400 italic hidden md:block text-[10px] font-black uppercase tracking-widest">{standard}</div>
            <div>
                <select
                    className="w-full rounded-xl border border-[#E1E1E1] px-4 py-2 text-xs font-black uppercase tracking-widest bg-[#F8F9FB] text-slate-700 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all disabled:opacity-50"
                    value={data[fieldKey]}
                    onChange={(e) => handleChange(fieldKey, e.target.value)}
                    disabled={formStatus !== 'New'}
                >
                    <option value={standard}>{standard} (OK)</option>
                    <option value="Perlu Perbaikan">REPAIR REQUIRED</option>
                    <option value="Rusak / Error">BROKEN / ERROR</option>
                    <option value="N/A">NOT APPLICABLE</option>
                </select>
            </div>
        </div>
    );

    const SectionHeader = ({ title }) => (
        <h3 className="text-[10px] font-black text-slate-500 bg-slate-50 px-4 py-2 rounded-xl mt-8 mb-4 border border-[#E1E1E1] uppercase tracking-[0.2em] shadow-sm">{title}</h3>
    );

    return (
        <div className="max-w-none mx-auto print:bg-white text-slate-900">
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-10 print:hidden">
                <div className="flex gap-2 p-1.5 bg-white border border-[#E1E1E1] rounded-2xl shadow-sm">
                    <button
                        type="button"
                        onClick={() => setCurrentRole('Technician')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentRole === 'Technician' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                        Technician
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentRole('User')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentRole === 'User' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                        User
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentRole('Manager')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentRole === 'Manager' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                        Manager
                    </button>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${formStatus === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    Status: {formStatus}
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start justify-between mb-8 pb-8 border-b border-[#F0F0F0]">
                <div className="flex gap-4 items-center">
                    <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl">
                        <Smartphone size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Phone / Tablet <span className="text-blue-600 italic">Checksheet</span></h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Document ID: TCFSG-FM-ICT-01-07</p>
                    </div>
                </div>
                <div className="text-right text-xs mt-4 md:mt-0 font-medium text-slate-500">
                    <div className="grid grid-cols-2 gap-x-4 text-left">
                        <span className="font-black uppercase tracking-widest text-[9px]">Asset Code:</span>
                        <span className="text-slate-900 font-bold">{asset?.code || asset?.id}</span>
                        <span className="font-black uppercase tracking-widest text-[9px]">Location:</span>
                        <span className="text-slate-900 font-bold">{asset?.location || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div>
                <div className="space-y-3">
                    <SectionHeader title="Hardware & Fisik" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                        <div>
                            <FieldSelect label="Fisik Body & Casing" fieldKey="fisik" standard="Bersih & Normal" />
                            <FieldSelect label="Layar / Touchscreen" fieldKey="layar" standard="Bening & Touch Responsif" />
                        </div>
                        <div>
                            <FieldSelect label="Baterai (Health / Ketahanan)" fieldKey="baterai" standard="Normal / Tidak Kembung" />
                            <FieldSelect label="Konektor & Charger" fieldKey="charger" standard="Berfungsi Normal" />
                        </div>
                    </div>

                    <SectionHeader title="Sistem & Konektivitas" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                        <div>
                            <FieldSelect label="Koneksi Jaringan (Wifi/Seluler)" fieldKey="jaringan" standard="Wifi & Seluler Konek" />
                            <FieldSelect label="Kamera (Depan / Belakang)" fieldKey="kamera" standard="Hasil Jelas / Fokus" />
                        </div>
                        <div>
                            <FieldSelect label="Speaker & Microphone" fieldKey="suara" standard="Speaker & Mic Jelas" />
                            <FieldSelect label="Aplikasi Standar (WA, Email)" fieldKey="aplikasi" standard="Berjalan Normal" />
                        </div>
                    </div>

                    <SectionHeader title="Technical Observations" />
                    <textarea
                        className="w-full p-5 bg-[#F8F9FB] border border-[#E1E1E1] rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 min-h-[120px] resize-none"
                        placeholder="Detail any technical issues, repairs performed, or critical findings..."
                        value={data.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        disabled={formStatus !== 'New'}
                    ></textarea>
                </div>

                {/* Signatures */}
                <div className="mt-12 pt-12 border-t border-[#F0F0F0]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <div className="flex flex-col items-center gap-4 group">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commissioned By</span>
                            <div className="w-full aspect-video rounded-3xl bg-[#F8F9FB] border border-[#E1E1E1] flex items-center justify-center relative overflow-hidden group-hover:border-blue-300 transition-all shadow-inner">
                                {data.sign_technician ? (
                                    <img src={data.sign_technician} alt="Technician Signature" className="h-20 object-contain" />
                                ) : (
                                    <CheckCircle size={32} className="text-slate-200" />
                                )}
                            </div>
                            <div className="text-center font-black uppercase text-[10px] text-slate-900 tracking-widest border-t border-slate-900 pt-2 w-full">
                                ICT TECHNICIAN
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-4 group">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified By (User)</span>
                            <div className="w-full aspect-video rounded-3xl bg-[#F8F9FB] border border-[#E1E1E1] flex items-center justify-center relative overflow-hidden group-hover:border-blue-300 transition-all shadow-inner">
                                {data.sign_user ? (
                                    <img src={data.sign_user} alt="User Signature" className="h-20 object-contain" />
                                ) : (
                                    <CheckCircle size={32} className="text-slate-200" />
                                )}
                            </div>
                            <div className="text-center font-black uppercase text-[10px] text-slate-900 tracking-widest border-t border-slate-900 pt-2 w-full">
                                {asset?.user || 'END USER'}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-4 group">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved By</span>
                            <div className="w-full aspect-video rounded-3xl bg-[#F8F9FB] border border-[#E1E1E1] flex items-center justify-center relative overflow-hidden group-hover:border-blue-300 transition-all shadow-inner">
                                {data.sign_manager ? (
                                    <img src={data.sign_manager} alt="Manager Signature" className="h-20 object-contain" />
                                ) : (
                                    <CheckCircle size={32} className="text-slate-200" />
                                )}
                            </div>
                            <div className="text-center font-black uppercase text-[10px] text-slate-900 tracking-widest border-t border-slate-900 pt-2 w-full">
                                SECTION HEAD
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end items-center gap-4 mt-12 mb-10 print:hidden">
                    {formStatus === 'New' && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e?.preventDefault?.();
                                setSignatureModal({ role: 'Technician', title: 'Tanda Tangan Teknisi' });
                            }}
                            disabled={isSubmitting}
                            className="btn-primary-unifi px-10 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2"
                        >
                            <Save size={16} /> Submit Checksheet
                        </button>
                    )}

                    {formStatus === 'Pending User' && currentRole === 'User' && (
                        <button
                            type="button"
                            onClick={() => setSignatureModal({ role: 'User', title: 'Tanda Tangan User' })}
                            disabled={isSubmitting}
                            className="btn-primary-unifi bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 px-10 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <CheckSquare size={16} /> Approve Checksheet
                        </button>
                    )}

                    {formStatus === 'Pending Manager' && currentRole === 'Manager' && (
                        <button
                            type="button"
                            onClick={() => setSignatureModal({ role: 'Manager', title: 'Tanda Tangan Manager' })}
                            disabled={isSubmitting}
                            className="btn-primary-unifi bg-purple-600 hover:bg-purple-700 shadow-purple-100 px-10 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <CheckCircle size={16} /> Section Approval
                        </button>
                    )}
                </div>
            </div>

            {signatureModal && (
                <SignatureModal
                    isOpen={true}
                    title={signatureModal.title}
                    onSave={handleSignSave}
                    onClose={() => setSignatureModal(null)}
                />
            )}
        </div>
    );
}

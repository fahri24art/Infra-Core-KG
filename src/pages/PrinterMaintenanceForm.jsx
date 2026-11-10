import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Save, Printer, UserCheck, ShieldCheck } from 'lucide-react';
import SignatureModal from '../components/ui/SignatureModal';

export default function PrinterMaintenanceForm({ asset, formData: propFormData, onChange, onSubmit }) {
    // asset passed from parent
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('New');
    const [currentRole, setCurrentRole] = useState('Technician');
    const [signatureConfig, setSignatureConfig] = useState(null);

    // Use passed asset or fallback
    const assetInfo = asset || {};
    const assetId = assetInfo.id; // derived

    const initialFormData = {
        // Dot Matrix Specific
        physicalCondition: 'Bersih & Normal',
        coverMika: 'Bersih & Utuh',
        knob: 'Berfungsi Normal',
        tractor: 'Berfungsi Normal',
        sandaranKertas: 'Utuh & Terpasang',
        pita: 'Jelas & Tidak Kering',
        head: 'Tidak Patah',

        // Deskjet / Laserjet
        toner: 'Tinta Cukup',
        roller: 'Bersih & Normal',
        paperTray: 'Berfungsi Normal',
        cabling: 'Rapi',
        driver: 'Terinstall & Update',
        testPrint: 'Hasil Jelas',

        notes: ''
    };

    // Use prop form data if provided and not empty, otherwise fallback to local initial state
    const isPropFormEmpty = !propFormData || Object.keys(propFormData).length === 0;
    const formData = isPropFormEmpty ? initialFormData : propFormData;

    // Initialize parent with initial data if it's empty
    useEffect(() => {
        if (isPropFormEmpty && onChange) {
            onChange(initialFormData);
        }
    }, [isPropFormEmpty, onChange]);

    // Derive status based on existing signatures
    useEffect(() => {
        if (formData.sign_manager) {
            setStatus('Done');
            setCurrentRole('Manager');
        } else if (formData.sign_user) {
            setStatus('Pending Manager');
            setCurrentRole('Manager');
        } else if (formData.sign_technician) {
            setStatus('Pending User');
            setCurrentRole('User');
        }
    }, [formData.sign_manager, formData.sign_user, formData.sign_technician]);

    const handleChange = (key, value) => {
        if (onChange) {
            onChange({ ...formData, [key]: value });
        }
    };

    const onSignatureSave = (base64) => {
        const role = signatureConfig?.role;
        setSignatureConfig(null);
        if (!role) return;

        const newData = { ...formData };
        if (role === 'Technician') {
            newData.sign_technician = base64;
            if (onChange) onChange(newData);
            executeSubmit(newData);
        } else if (role === 'User') {
            newData.sign_user = base64;
            if (onChange) onChange(newData);
            executeApprove('User', newData);
        } else if (role === 'Manager') {
            newData.sign_manager = base64;
            if (onChange) onChange(newData);
            executeApprove('Manager', newData);
        }
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setSignatureConfig({ role: 'Technician', title: 'Tanda Tangan Teknisi' });
    };

    const executeSubmit = (dataToSubmit) => {
        setLoading(true);

        if (onSubmit) {
            // Pass data to real backend
            onSubmit(dataToSubmit);
        }

        setTimeout(() => {
            setLoading(false);
            setStatus('Pending User');
            alert('Printer Maintenance Submitted! Waiting for User Approval.');
        }, 800);
    };

    const handleApprove = (role) => {
        setSignatureConfig({ role, title: `Tanda Tangan ${role}` });
    };

    const executeApprove = (role, dataToSubmit) => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            if (role === 'User') {
                setStatus('Pending Manager');
                alert('Approved by User!');
                if (onSubmit) onSubmit(dataToSubmit);
            } else if (role === 'Manager') {
                setStatus('Done');
                alert('Approved by Section Head!');
                if (onSubmit) onSubmit(dataToSubmit);
                navigate('/ict/maintenance');
            }
        }, 500);
    };

    const handlePrint = () => {
        window.print();
    };

    const CheckRow = ({ label, fieldKey, standard }) => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-3 border-b border-[#F0F0F0] last:border-0 items-center text-sm">
            <div className="font-bold text-slate-700">{label}</div>
            <div className="text-slate-400 italic hidden md:block text-[10px] font-black uppercase tracking-widest">{standard}</div>
            <div>
                <select
                    className="w-full rounded-xl border border-[#E1E1E1] px-4 py-2 text-xs font-black uppercase tracking-widest bg-[#F8F9FB] text-slate-700 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all disabled:opacity-50"
                    value={formData[fieldKey]}
                    onChange={(e) => handleChange(fieldKey, e.target.value)}
                    disabled={status !== 'New'}
                >
                    <option value={standard}>{standard} (OK)</option>
                    <option value="Perlu Perbaikan">REPAIR REQUIRED</option>
                    <option value="Rusak / Tidak Ada">BROKEN / MISSING</option>
                    <option value="N/A">NOT APPLICABLE</option>
                </select>
            </div>
        </div>
    );

    const SectionHeader = ({ title }) => (
        <h3 className="text-[10px] font-black text-slate-500 bg-slate-50 px-4 py-2 rounded-xl mt-8 mb-4 border border-[#E1E1E1] uppercase tracking-[0.2em] shadow-sm">
            {title}
        </h3>
    );

    return (
        <div className="max-w-none mx-auto print:bg-white text-slate-900">
            {/* Simulation Header */}
            <div className="flex justify-between items-center mb-10 print:hidden">
                <div className="flex gap-2 p-1.5 bg-white border border-[#E1E1E1] rounded-2xl shadow-sm">
                    <button type="button" onClick={() => setCurrentRole('Technician')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentRole === 'Technician' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>Technician</button>
                    <button type="button" onClick={() => setCurrentRole('User')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentRole === 'User' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>User</button>
                    <button type="button" onClick={() => setCurrentRole('Manager')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentRole === 'Manager' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>Manager</button>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    Status: {status}
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-start justify-between mb-8 pb-8 border-b border-[#F0F0F0]">
                <div className="flex gap-4 items-center">
                    <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl">
                        <Printer size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Printer Maintenance <span className="text-blue-600 italic">Checksheet</span></h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Document ID: TCFSG-FM-ICT-01-04</p>
                    </div>
                </div>
                <div className="text-right text-xs mt-4 md:mt-0 font-medium text-slate-500">
                    <div className="grid grid-cols-2 gap-x-4 text-left">
                        <span className="font-black uppercase tracking-widest text-[9px]">Asset Code:</span>
                        <span className="text-slate-900 font-bold">{assetInfo ? assetInfo.code : assetId}</span>
                        <span className="font-black uppercase tracking-widest text-[9px]">Location:</span>
                        <span className="text-slate-900 font-bold">{assetInfo?.location || '-'}</span>
                    </div>
                </div>
            </div>

            <div>
                <div className="space-y-3">
                    <SectionHeader title="Dot Matrix Core Systems" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                        <div>
                            <CheckRow label="Cabinet & Housing" fieldKey="physicalCondition" standard="Bersih & Normal" />
                            <CheckRow label="Cover Plate" fieldKey="coverMika" standard="Utuh" />
                            <CheckRow label="Manual Control Knob" fieldKey="knob" standard="Berfungsi" />
                        </div>
                        <div>
                            <CheckRow label="Tractor Feeder Module" fieldKey="tractor" standard="Berfungsi" />
                            <CheckRow label="Paper Rest" fieldKey="sandaranKertas" standard="Utuh" />
                            <CheckRow label="Thermal/IM Head" fieldKey="head" standard="Utuh" />
                        </div>
                    </div>

                    <SectionHeader title="High-Speed Deskjet / Laserjet" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                        <div>
                            <CheckRow label="Consumables Level" fieldKey="toner" standard="Cukup" />
                            <CheckRow label="Paper Pickup Roller" fieldKey="roller" standard="Bersih" />
                            <CheckRow label="Input Paper Tray" fieldKey="paperTray" standard="Normal" />
                        </div>
                        <div>
                            <CheckRow label="Signal/Power Cabling" fieldKey="cabling" standard="Rapi" />
                            <CheckRow label="Spooler/Driver Ver." fieldKey="driver" standard="Update" />
                            <CheckRow label="Verification Print" fieldKey="testPrint" standard="OK" />
                        </div>
                    </div>

                    <SectionHeader title="Technical Observations" />
                    <textarea
                        className="w-full p-5 bg-[#F8F9FB] border border-[#E1E1E1] rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 min-h-[120px] resize-none"
                        placeholder="Detail any technical issues, repairs performed, or critical findings..."
                        value={formData.notes}
                        onChange={e => handleChange('notes', e.target.value)}
                        disabled={status !== 'New'}
                    ></textarea>
                </div>

                {/* Signature Module */}
                <div className="mt-12 pt-12 border-t border-[#F0F0F0]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <div className="flex flex-col items-center gap-4 group">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commissioned By</span>
                            <div className="w-full aspect-video rounded-3xl bg-[#F8F9FB] border border-[#E1E1E1] flex items-center justify-center relative overflow-hidden group-hover:border-blue-300 transition-all shadow-inner">
                                {formData.sign_technician ? (
                                    <img src={formData.sign_technician} alt="Technician Signature" className="h-20 object-contain" />
                                ) : (
                                    <ShieldCheck size={32} className="text-slate-200" />
                                )}
                            </div>
                            <div className="text-center font-black uppercase text-[10px] text-slate-900 tracking-widest border-t border-slate-900 pt-2 w-full">ICT TECHNICIAN</div>
                        </div>

                        <div className="flex flex-col items-center gap-4 group">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified By (User)</span>
                            <div className="w-full aspect-video rounded-3xl bg-[#F8F9FB] border border-[#E1E1E1] flex items-center justify-center relative overflow-hidden group-hover:border-blue-300 transition-all shadow-inner">
                                {formData.sign_user ? (
                                    <img src={formData.sign_user} alt="User Signature" className="h-20 object-contain" />
                                ) : (
                                    <UserCheck size={32} className="text-slate-200" />
                                )}
                            </div>
                            <div className="text-center font-black uppercase text-[10px] text-slate-900 tracking-widest border-t border-slate-900 pt-2 w-full">{assetInfo?.user || 'END USER'}</div>
                        </div>

                        <div className="flex flex-col items-center gap-4 group">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved By</span>
                            <div className="w-full aspect-video rounded-3xl bg-[#F8F9FB] border border-[#E1E1E1] flex items-center justify-center relative overflow-hidden group-hover:border-blue-300 transition-all shadow-inner">
                                {formData.sign_manager ? (
                                    <img src={formData.sign_manager} alt="Manager Signature" className="h-20 object-contain" />
                                ) : (
                                    <ShieldCheck size={32} className="text-slate-200" />
                                )}
                            </div>
                            <div className="text-center font-black uppercase text-[10px] text-slate-900 tracking-widest border-t border-slate-900 pt-2 w-full">SECTION HEAD</div>
                        </div>
                    </div>
                </div>

                {/* Unified Footer Actions */}
                <div className="flex justify-end items-center gap-4 mt-12 mb-10 print:hidden">
                    <button type="button" onClick={handlePrint} className="px-6 py-3 bg-white border border-[#E1E1E1] rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-all shadow-sm flex items-center gap-2">
                        <Printer size={16} /> Print Preview
                    </button>

                    {status === 'New' && (
                        <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary-unifi px-10 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2">
                            <Save size={16} /> Submit Checksheet
                        </button>
                    )}

                    {status === 'Pending User' && currentRole === 'User' && (
                        <button type="button" onClick={() => handleApprove('User')} disabled={loading} className="btn-primary-unifi bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 px-10 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <UserCheck size={16} /> Approve Checksheet
                        </button>
                    )}

                    {status === 'Pending Manager' && currentRole === 'Manager' && (
                        <button type="button" onClick={() => handleApprove('Manager')} disabled={loading} className="btn-primary-unifi bg-purple-600 hover:bg-purple-700 shadow-purple-100 px-10 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck size={16} /> Section Approval
                        </button>
                    )}
                </div>
            </div>

            {/* Signature Modal */}
            {signatureConfig && (
                <SignatureModal
                    isOpen={true}
                    title={signatureConfig.title}
                    onSave={onSignatureSave}
                    onClose={() => setSignatureConfig(null)}
                />
            )}
        </div>
    );
}

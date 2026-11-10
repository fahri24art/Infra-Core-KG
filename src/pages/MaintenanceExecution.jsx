import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import autoTable from 'jspdf-autotable';
import { Save, ArrowLeft, Printer, CheckCircle, CheckSquare, Clock, Monitor, Network } from 'lucide-react';
import PCMaintenanceForm from './PCMaintenanceForm';
import PrinterMaintenanceForm from './PrinterMaintenanceForm';
import PhoneMaintenanceForm from './PhoneMaintenanceForm';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';

const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

const PCChecksheet = ({ data, onChange, type }) => {
    let items = [
        { category: 'HARDWARE', label: 'Kondisi Fisik (Body, Keyboard, Layar)', key: 'body' },
        { category: 'HARDWARE', label: 'Motherboard & Slot', key: 'motherboard' },
        { category: 'HARDWARE', label: 'RAM / Memory', key: 'ram' },
        { category: 'HARDWARE', label: 'Hard Disk (Defrag/Bad Sector)', key: 'hdd' },
        { category: 'HARDWARE', label: 'Fan / Kipas (Processor/Casing)', key: 'fan' },
        { category: 'HARDWARE', label: 'Cabling Internal (Rapi)', key: 'cabling' },
        { category: 'HARDWARE', label: 'Keyboard & Mouse', key: 'peripherals' },
        { category: 'SOFTWARE', label: 'OS Windows / Linux Update', key: 'os' },
        { category: 'SOFTWARE', label: 'Temp / Prefetch Folder Clean', key: 'temp' },
        { category: 'SOFTWARE', label: 'Antivirus Update', key: 'antivirus' },
        { category: 'SOFTWARE', label: 'Office Applications', key: 'office' },
        { category: 'SOFTWARE', label: 'Browsers (Chrome/Edge)', key: 'browser' },
    ];

    if (type === 'Daily') {
        items = items.filter(i => ['body', 'peripherals', 'browser'].includes(i.key));
    } else if (type === 'Weekly') {
        items = items.filter(i => ['body', 'fan', 'cabling', 'peripherals', 'antivirus', 'os'].includes(i.key));
    } else if (type === 'Monthly') {
        items = items.filter(i => !['motherboard', 'hdd'].includes(i.key)); // Most but not deep HW
    }

    const handleChange = (key, field, value) => {
        const current = data[key] || { status: 'OK', note: '' };
        onChange({ ...data, [key]: { ...current, [field]: value } });
    };

    return (
        <div className="space-y-3">
            <h3 className="font-bold text-slate-700 border-b pb-2 flex items-center"><Monitor className="mr-2" /> PC / Laptop Checksheet</h3>
            <div className="grid gap-4">
                {items.map((item) => (
                    <div key={item.key} className="grid grid-cols-12 gap-2 items-center text-sm border-b border-slate-100 pb-2">
                        <div className="col-span-1 text-xs font-bold text-slate-500">{item.category}</div>
                        <div className="col-span-5">{item.label}</div>
                        <div className="col-span-2">
                            <select
                                className="w-full border rounded p-1 text-xs"
                                value={data[item.key]?.status || 'OK'}
                                onChange={(e) => handleChange(item.key, 'status', e.target.value)}
                            >
                                <option value="OK">OK</option>
                                <option value="Not OK">Not OK</option>
                                <option value="Fixed">Fixed</option>
                            </select>
                        </div>
                        <div className="col-span-4">
                            <input
                                type="text"
                                className="w-full border rounded p-1 text-xs"
                                placeholder="Notes..."
                                value={data[item.key]?.note || ''}
                                onChange={(e) => handleChange(item.key, 'note', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PrinterChecksheet = ({ data, onChange }) => {
    const items = [
        { label: 'Casing Printer & Power Supply', key: 'casing' },
        { label: 'Kabel Power & USB', key: 'cabling' },
        { label: 'Roller / Penarik Kertas', key: 'roller' },
        { label: 'Head / Cartridge / Ribbon', key: 'head' },
        { label: 'Hasil Cetak (Test Page)', key: 'print_test' },
        { label: 'Kebersihan Dalam Printer', key: 'internal_clean' }
    ];

    const handleChange = (key, field, value) => {
        const current = data[key] || { status: 'OK', note: '' };
        onChange({ ...data, [key]: { ...current, [field]: value } });
    };

    return (
        <div className="space-y-3">
            <h3 className="font-bold text-slate-700 border-b pb-2 flex items-center"><Printer className="mr-2" /> Printer Checksheet</h3>
            <div className="grid gap-4">
                {items.map((item) => (
                    <div key={item.key} className="grid grid-cols-12 gap-2 items-center text-sm border-b border-slate-100 pb-2">
                        <div className="col-span-6">{item.label}</div>
                        <div className="col-span-2">
                            <select
                                className="w-full border rounded p-1 text-xs"
                                value={data[item.key]?.status || 'OK'}
                                onChange={(e) => handleChange(item.key, 'status', e.target.value)}
                            >
                                <option value="OK">OK</option>
                                <option value="Not OK">Not OK</option>
                                <option value="Fixed">Fixed</option>
                            </select>
                        </div>
                        <div className="col-span-4">
                            <input
                                type="text"
                                className="w-full border rounded p-1 text-xs"
                                placeholder="Notes..."
                                value={data[item.key]?.note || ''}
                                onChange={(e) => handleChange(item.key, 'note', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const NetworkChecksheet = ({ data, onChange }) => {
    const items = [
        { label: 'Power Supply Device', key: 'power' },
        { label: 'Port Ethernet Functionality', key: 'port' },
        { label: 'Kabel UTP / Fiber Optic', key: 'cable' },
        { label: 'Grounding System', key: 'grounding' },
        { label: 'Mounting & Rack Cleanliness', key: 'rack' },
        { label: 'Status LED Indicators', key: 'led' }
    ];

    const handleChange = (key, field, value) => {
        const current = data[key] || { status: 'OK', note: '' };
        onChange({ ...data, [key]: { ...current, [field]: value } });
    };

    return (
        <div className="space-y-3">
            <h3 className="font-bold text-slate-700 border-b pb-2 flex items-center"><Network className="mr-2" /> Network Device Checksheet</h3>
            <div className="grid gap-4">
                {items.map((item) => (
                    <div key={item.key} className="grid grid-cols-12 gap-2 items-center text-sm border-b border-slate-100 pb-2">
                        <div className="col-span-6">{item.label}</div>
                        <div className="col-span-2">
                            <select
                                className="w-full border rounded p-1 text-xs"
                                value={data[item.key]?.status || 'OK'}
                                onChange={(e) => handleChange(item.key, 'status', e.target.value)}
                            >
                                <option value="OK">OK</option>
                                <option value="Not OK">Not OK</option>
                                <option value="Fixed">Fixed</option>
                            </select>
                        </div>
                        <div className="col-span-4">
                            <input
                                type="text"
                                className="w-full border rounded p-1 text-xs"
                                placeholder="Notes..."
                                value={data[item.key]?.note || ''}
                                onChange={(e) => handleChange(item.key, 'note', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function MaintenanceExecution() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useState(new URLSearchParams(window.location.search));
    const [form, setForm] = useState({
        asset_id: '',
        maintenance_date: new Date().toISOString().split('T')[0],
        pic_name: '',
        department: 'IT',
        condition_before: '',
        condition_after: '',
        status: 'Completed',
        checksheet_data: {},
        plan_id: searchParams.get('planId') || null,
        week_key: searchParams.get('weekKey') || null,
        maintenance_type: searchParams.get('type') || 'Semester',
        checked_by: null,
        checked_at: null,
        approved_by: null,
        approved_at: null
    });
    const [asset, setAsset] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const userStr = sessionStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            // Auto-fill PIC if empty
            setForm(prev => {
                if (!prev.pic_name) return { ...prev, pic_name: user.name };
                return prev;
            });
        }
    }, []);

    useEffect(() => {
        if (id) {
            fetchAsset(id);
            setForm(prev => ({ ...prev, asset_id: id }));

            // Fetch existing record if weekKey is present
            const weekKey = searchParams.get('weekKey');
            const type = searchParams.get('type') || 'Semester';
            if (weekKey) {
                fetchRecord(id, weekKey, new Date().getFullYear(), type);
            }
        }
    }, [id]);

    const fetchRecord = async (assetId, weekKey, year, type) => {
        try {
            const res = await fetch(`/api/network/maintenance/record?asset_id=${assetId}&week_key=${weekKey}&year=${year}&maintenance_type=${type}&_t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setForm(prev => ({
                        ...prev,
                        ...data,
                        checksheet_data: typeof data.checksheet_data === 'string' ? JSON.parse(data.checksheet_data) : data.checksheet_data
                    }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch existing record', err);
        }
    };

    const handleSign = (role) => {
        if (!currentUser) {
            alert('Please login to sign.');
            return;
        }
        const now = new Date(); // timestamp
        if (role === 'check') {
            setForm(prev => ({ ...prev, checked_by: currentUser.name, checked_at: now }));
        } else if (role === 'approve') {
            setForm(prev => ({ ...prev, approved_by: currentUser.name, approved_at: now }));
        }
    };

    const fetchAsset = async (assetId) => {
        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch(`/api/network/assets/${assetId}`);
            const data = await res.json();
            setAsset(data);
            setForm(prev => ({ ...prev, department: 'IT' }));
        } catch (err) {
            console.error('Failed to fetch asset', err);
        }
    };

    const handleChecksheetChange = (newData) => {
        setForm(prev => ({ ...prev, checksheet_data: newData }));
    };

    const generatePDF = async () => {
        if (!asset) return;
        const doc = new jsPDF();
        const imgData = await loadImage(logoTCF);

        // Determine Header based on Category
        let docNo = 'TCFSG-FM-ICT-01-02'; // Default: Pelaksanaan
        let title = 'PELAKSANAAN PEMELIHARAAN PERANGKAT ICT';
        const cat = (asset.category || '').toLowerCase();

        if (cat.includes('computer') || cat.includes('laptop') || cat.includes('desktop')) {
            docNo = 'TCFSG-FM-ICT-01-03';
            title = 'CHECKSHEET PEMELIHARAAN PC / LAPTOP';
        } else if (cat.includes('printer')) {
            docNo = 'TCFSG-FM-ICT-01-04';
            title = 'CHECKSHEET PEMELIHARAAN PRINTER';
        } else if (cat.includes('network') || cat.includes('server')) {
            docNo = 'TCFSG-FM-ICT-01-05';
            title = 'CHECKSHEET PEMELIHARAAN JARINGAN & CCTV';
        } else if (cat.includes('backup')) {
            docNo = 'TCFSG-FM-ICT-01-06';
            title = 'CHECKSHEET BACKUP DATA';
        }

        if (imgData) doc.addImage(imgData, 'PNG', 14, 10, 26, 23);
        
        // SOP Header
        doc.setFontSize(10);
        doc.text("PT. TRI CENTRUM FORTUNA", 14, 38);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(title, 14, 45);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`No. Dokumen: ${docNo}`, 140, 38);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString()}`, 140, 43);

        doc.setLineWidth(0.5);
        doc.line(14, 48, 196, 48);

        // Asset Info Box
        doc.setDrawColor(0);
        doc.setFillColor(250, 250, 250);
        doc.rect(14, 53, 182, 25, 'F');
        doc.setFontSize(10);
        doc.text(`Asset Name: ${asset.name}`, 20, 61);
        doc.text(`Model: ${asset.manufacturer} ${asset.model}`, 100, 61);
        doc.text(`Serial No: ${asset.serial_number}`, 20, 71);
        doc.text(`Inventory ID: ${asset.inventory_number}`, 100, 71);

        // Checksheet Table
        const checksheetBody = Object.entries(form.checksheet_data).map(([key, val]) => {
            let status = '-';
            let note = '-';
            if (typeof val === 'object' && val !== null) {
                status = val.status || '-';
                note = val.note || '-';
            } else {
                status = val;
            }
            // Format camelCase key to readable text
            const formattedKey = key.replace(/([A-Z])/g, ' $1').toUpperCase();
            
            return [
                formattedKey,
                status,
                note
            ];
        });

        autoTable(doc, {
            startY: 82,
            head: [['Item Pemeriksaan', 'Status', 'Catatan / Temuan']],
            body: checksheetBody,
            headStyles: { fillColor: [40, 40, 40] },
            styles: { fontSize: 9 }
        });

        // Maintenance Notes
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 100;
        doc.text("Kondisi Sebelum:", 14, finalY + 10);
        doc.setFont("helvetica", "italic");
        doc.text(form.condition_before || '-', 14, finalY + 16);

        doc.setFont("helvetica", "bold");
        doc.text("Kondisi Sesudah:", 100, finalY + 10);
        doc.setFont("helvetica", "italic");
        doc.text(form.condition_after || '-', 100, finalY + 16);

        // Signatures
        doc.setFont("helvetica", "normal");
        const signY = finalY + 40;
        doc.rect(14, signY, 182, 30); // Box
        doc.line(75, signY, 75, signY + 30); // Vertical 1
        doc.line(135, signY, 135, signY + 30); // Vertical 2

        doc.setFontSize(8);
        doc.text("Dibuat Oleh (IT Support)", 18, signY + 5);
        doc.text("Diperiksa Oleh (User/SPV)", 80, signY + 5);
        doc.text("Disetujui Oleh (Atasan)", 140, signY + 5);

        if (form.pic_name) doc.text(form.pic_name, 18, signY + 25);
        if (form.checked_by) doc.text(form.checked_by, 80, signY + 25);
        if (form.approved_by) doc.text(form.approved_by, 140, signY + 25);

        window.open(doc.output('bloburl'), '_blank');
    };

    const handleSubmit = async (eOrData) => {
        if (eOrData && typeof eOrData.preventDefault === 'function') {
            eOrData.preventDefault();
        }

        const currentChecksheetData = (eOrData && typeof eOrData.preventDefault !== 'function' && Object.keys(eOrData).length > 0)
            ? eOrData 
            : form.checksheet_data;

        const payload = {
            ...form,
            checksheet_data: currentChecksheetData
        };

        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch('/api/network/maintenance/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                navigate('/ict/maintenance');
            } else {
                console.error('Failed to save record.');
            }
        } catch (err) {
            console.error('Error saving record', err);
        }
    };

    const renderChecksheetContent = () => {
        if (!asset || !form) return { content: null, isCustom: false };

        const cat = (asset.category || '').toLowerCase();
        if (cat.includes('computer') || cat.includes('laptop') || cat.includes('desktop')) {
            return {
                content: <PCMaintenanceForm asset={asset} formData={form.checksheet_data} onChange={handleChecksheetChange} onSubmit={handleSubmit} />,
                isCustom: true
            };
        } else if (cat.includes('printer')) {
            return {
                content: <PrinterMaintenanceForm asset={asset} formData={form.checksheet_data} onChange={handleChecksheetChange} onSubmit={handleSubmit} />,
                isCustom: true
            };
        } else if (cat.includes('network') || cat.includes('server')) {
            return {
                content: <NetworkChecksheet data={form.checksheet_data} onChange={handleChecksheetChange} />,
                isCustom: false
            };
        } else if (cat.includes('phone') || cat.includes('mobile') || cat.includes('tablet')) {
            return {
                content: <PhoneMaintenanceForm asset={asset} formData={form.checksheet_data} onChange={handleChecksheetChange} onSubmit={handleSubmit} />,
                isCustom: true
            };
        }

        return {
            content: (
                <div className="space-y-3">
                    <p className="text-sm text-slate-500">No specific checksheet found for this asset category. Displaying raw data:</p>
                    <pre className="bg-slate-50 p-4 rounded-xl text-xs overflow-auto border border-[#E1E1E1]">
                        {JSON.stringify(form.checksheet_data, null, 2)}
                    </pre>
                </div>
            ),
            isCustom: false
        };
    };

    if (!asset) return <div className="p-20 text-center font-bold text-slate-400">Loading Execution Environment...</div>;

    const renderedChecksheet = renderChecksheetContent();

    const mode = searchParams.get('mode');
    const isViewMode = mode === 'view';

    return (
        <div className="flex flex-col space-y-3">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/ict/maintenance')} className="p-3 bg-white hover:bg-slate-50 border border-[#E1E1E1] rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Terminal <span className="text-blue-600 italic">Execution</span></h1>
                        <p className="text-slate-500 text-sm font-medium">Technical validation and system reporting.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 print:hidden">
                    <button type="button" onClick={generatePDF} className="px-6 py-3 bg-white border border-[#E1E1E1] rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-all shadow-sm flex items-center gap-2">
                        <Printer size={16} /> Export PDF
                    </button>
                    {!isViewMode && (
                        <button onClick={handleSubmit} className="btn-primary-unifi px-8 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2">
                            <Save size={16} /> Update Record
                        </button>
                    )}
                </div>
            </div>

            {/* Asset Meta Box */}
            <div className="card-unifi p-5 bg-slate-900 border-none shadow-xl flex flex-col md:flex-row justify-between items-center gap-5">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{asset.category} UNIT</span>
                    <h2 className="text-3xl font-black text-white tracking-tight leading-none">{asset.inventory_number || asset.name}</h2>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">{asset.manufacturer} {asset.model} • {asset.serial_number || 'S/N UNKNOWN'}</p>
                </div>
                <div className="h-12 w-px bg-white/10 hidden md:block"></div>
                <div className="flex flex-col gap-1 text-center md:text-left">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned User</span>
                    <p className="text-lg font-bold text-white">{asset.user_name || 'Generic Endpoint'}</p>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{asset.user_department || 'General Operations'}</p>
                </div>
                <div className="h-12 w-px bg-white/10 hidden md:block"></div>
                <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl">
                    {['Daily', 'Weekly', 'Monthly', 'Semester'].map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setForm({ ...form, maintenance_type: t })}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${form.maintenance_type === t
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Form Elements */}
                <div className="lg:col-span-12">
                    {isViewMode && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 print:hidden">
                            <CheckSquare className="text-emerald-500" size={24} />
                            <div>
                                <h4 className="font-bold text-emerald-800 text-sm">Checksheet Completed</h4>
                                <p className="text-emerald-600 text-xs">This record is in read-only mode. Use Export PDF to view or print the final document.</p>
                            </div>
                        </div>
                    )}
                    <div className={`space-y-5 ${isViewMode ? 'pointer-events-none' : ''}`}>
                        <div className="card-unifi p-10 shadow-sm border-[#E1E1E1]">
                            {renderedChecksheet.content}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-12 pt-12 border-t border-[#F0F0F0]">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={12} /> Condition Before
                                    </label>
                                    <textarea
                                        className="w-full p-5 bg-[#F8F9FB] border border-[#E1E1E1] rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 min-h-[140px]"
                                        placeholder="Describe the state of the asset before maintenance..."
                                        value={form.condition_before}
                                        onChange={(e) => setForm({ ...form, condition_before: e.target.value })}
                                        disabled={!!form.checksheet_data?.sign_technician}
                                    ></textarea>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle size={12} className="text-emerald-500" /> Condition After
                                    </label>
                                    <textarea
                                        className="w-full p-5 bg-[#F8F9FB] border border-[#E1E1E1] rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300 min-h-[140px]"
                                        placeholder="Describe final state after technical intervention..."
                                        value={form.condition_after}
                                        onChange={(e) => setForm({ ...form, condition_after: e.target.value })}
                                        disabled={!!form.checksheet_data?.sign_technician}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        {!renderedChecksheet.isCustom && (
                            <div className="flex justify-end gap-3 pb-20">
                                <button type="button" onClick={handleSubmit} className="btn-primary-unifi px-12 py-4 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-3">
                                    <Save size={18} /> Finalize Maintenance Record
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}



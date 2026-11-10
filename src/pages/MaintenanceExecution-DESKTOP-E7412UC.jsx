import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Printer, Monitor, Network } from 'lucide-react';

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
        pic_name: 'Mulyana',
        department: 'IT',
        condition_before: '',
        condition_after: '',
        status: 'Completed',
        checksheet_data: {},
        plan_id: searchParams.get('planId') || null,
        week_key: searchParams.get('weekKey') || null,
        maintenance_type: searchParams.get('type') || 'Semester'
    });
    const [asset, setAsset] = useState(null);

    useEffect(() => {
        if (id) {
            fetchAsset(id);
            setForm(prev => ({ ...prev, asset_id: id }));
        }
    }, [id]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // UPDATED PATH: added /network prefix
            const res = await fetch('/api/network/maintenance/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert('Maintenance Record Saved!');
                navigate('/ict/maintenance');
            } else {
                alert('Failed to save record.');
            }
        } catch (err) {
            console.error('Error saving record', err);
        }
    };

    if (!asset) return <div className="p-4">Loading Asset Data...</div>;

    const renderChecksheet = () => {
        const cat = asset.category?.toLowerCase() || '';
        if (cat.includes('printer')) return <PrinterChecksheet data={form.checksheet_data} onChange={handleChecksheetChange} />;
        if (cat.includes('network') || cat.includes('server')) return <NetworkChecksheet data={form.checksheet_data} onChange={handleChecksheetChange} />;
        return <PCChecksheet data={form.checksheet_data} onChange={handleChecksheetChange} type={form.maintenance_type} />;
    };

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-3">
            <button onClick={() => navigate('/ict/maintenance')} className="flex items-center text-slate-500 hover:text-slate-800">
                <ArrowLeft size={18} className="mr-2" /> Back to Schedule
            </button>

            <div className="bg-white p-5 rounded-lg shadow-lg border border-slate-200 print:shadow-none print:border-none">
                <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2">
                            <div className="bg-slate-900 text-white p-2 rounded text-xs font-bold">TCF</div>
                        </div>
                        <div className="text-right text-xs">
                            <p>No. Dokumen: TCFSG-FM-ICT-01-02</p>
                            <p>Rev: 01, 11 Maret 2025</p>
                        </div>
                    </div>
                    <h1 className="text-xl font-bold uppercase">Pelaksanaan Pemeliharaan - {asset.category}</h1>
                    <div className="flex justify-center mt-4">
                        <div className="flex bg-slate-800 p-1 rounded-lg border border-white/5 print:hidden">
                            {['Daily', 'Weekly', 'Monthly', 'Semester'].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setForm({ ...form, maintenance_type: t })}
                                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${form.maintenance_type === t
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {t.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-left bg-slate-100 p-4 rounded-lg text-sm">
                        <div>
                            <p className="font-bold text-slate-500 text-xs uppercase flex justify-between">
                                ASSET INFO
                            </p>
                            <p><span className="font-semibold">Name:</span> {asset.name}</p>
                            <p><span className="font-semibold">Model:</span> {asset.manufacturer} {asset.model}</p>
                            <p><span className="font-semibold">Serial:</span> {asset.serial_number}</p>
                            <p><span className="font-semibold">Inventory:</span> {asset.inventory_number}</p>
                        </div>
                        <div>
                            <p className="font-bold text-slate-500 text-xs">USER INFO</p>
                            <p><span className="font-semibold">User:</span> {asset.user_name || asset.contact || 'Unassigned'}</p>
                            <p><span className="font-semibold">Email:</span> {asset.user_email || '-'}</p>
                            <p><span className="font-semibold">Loc:</span> {asset.location}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="bg-slate-50 p-4 rounded border border-slate-200">
                        {renderChecksheet()}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">Kondisi Sebelum</label>
                            <textarea
                                className="w-full p-2 border rounded h-24 text-sm"
                                placeholder="Deskripsi kondisi awal..."
                                value={form.condition_before}
                                onChange={(e) => setForm({ ...form, condition_before: e.target.value })}
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Kondisi Sesudah</label>
                            <textarea
                                className="w-full p-2 border rounded h-24 text-sm"
                                placeholder="Deskripsi hasil maintenance..."
                                value={form.condition_after}
                                onChange={(e) => setForm({ ...form, condition_after: e.target.value })}
                            ></textarea>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-5 mt-8 text-center pt-8 border-t border-slate-200">
                        <div className="border border-slate-300 p-4 rounded h-32 flex flex-col justify-between">
                            <span className="font-semibold text-xs text-slate-900">Disetujui (Atasan)</span>
                            <span className="text-xs h-10 border-b border-dotted border-slate-400 mb-2"></span>
                            <span className="text-xs text-slate-900">(Herno Aji Sanjaya)</span>
                        </div>
                        <div className="border border-slate-300 p-4 rounded h-32 flex flex-col justify-between">
                            <span className="font-semibold text-xs text-slate-900">Diperiksa (User/SPV)</span>
                            <span className="text-xs h-10 border-b border-dotted border-slate-400 mb-2"></span>
                            <span className="text-xs text-slate-900">(Hery Hermawan)</span>
                        </div>
                        <div className="border border-slate-300 p-4 rounded h-32 flex flex-col justify-between">
                            <span className="font-semibold text-xs text-slate-900">Dibuat (IT Support)</span>
                            <span className="text-xs h-10 border-b border-dotted border-slate-400 mb-2"></span>
                            <span className="font-bold text-slate-900">{form.pic_name}</span>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg">
                            <Save size={18} className="mr-2" /> Save Maintenance Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

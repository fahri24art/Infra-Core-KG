import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Printer, CheckCircle, Clock, PenTool, FileText, Settings, ShieldAlert, FileCheck, Target } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AccordionSection = ({ title, icon: Icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div className="border border-slate-200 rounded-2xl overflow-hidden mb-4 bg-white shadow-sm">
            <button 
                type="button"
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Icon size={18} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">{title}</h3>
                </div>
                <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </button>
            {isOpen && (
                <div className="p-4 border-t border-slate-100">
                    {children}
                </div>
            )}
        </div>
    );
};

const StandardCheckTable = ({ section, items, data, onChange, hasAction = false }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-12">No</th>
                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Item</th>
                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-32 text-center">Standard</th>
                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Actual</th>
                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Status</th>
                        {hasAction && <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-48">Action</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => {
                        const key = `${section}_${index}`;
                        const currentData = data[key] || { actual: '', status: 'OK', action: '' };
                        
                        return (
                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 text-[11px] font-bold text-slate-400">{index + 1}</td>
                                <td className="p-3 text-[11px] font-bold text-slate-700">{item.label}</td>
                                <td className="p-3 text-[11px] font-bold text-slate-500 text-center">{item.std || '-'}</td>
                                <td className="p-3 text-[11px]">
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Actual..."
                                        value={currentData.actual}
                                        onChange={(e) => onChange(key, { ...currentData, actual: e.target.value })}
                                    />
                                </td>
                                <td className="p-3 text-[11px]">
                                    <select 
                                        className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={currentData.status}
                                        onChange={(e) => onChange(key, { ...currentData, status: e.target.value })}
                                    >
                                        <option value="OK">OK</option>
                                        <option value="NG">NG</option>
                                    </select>
                                </td>
                                {hasAction && (
                                    <td className="p-3 text-[11px]">
                                        <select 
                                            className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={currentData.action}
                                            onChange={(e) => onChange(key, { ...currentData, action: e.target.value })}
                                        >
                                            <option value="">- Select Action -</option>
                                            <option value="Clean">Clean</option>
                                            <option value="Regrind">Regrind</option>
                                            <option value="Replace">Replace</option>
                                        </select>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default function DiesMaintenanceExecution() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useState(new URLSearchParams(window.location.search));
    const [asset, setAsset] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    
    // Checksheet sections layout based on user template
    const checkLists = {
        structure: [
            { label: 'Upper Die Plate Condition', std: 'Good' },
            { label: 'Lower Die Plate Condition', std: 'Good' },
            { label: 'Retaining Plate Condition', std: 'Good' },
            { label: 'Stripper Plate Condition', std: 'Good' },
            { label: 'Back Plate Condition', std: 'Good' },
            { label: 'Bolts Tightness', std: 'Good' },
            { label: 'Dowel Pin Condition', std: 'Good' },
            { label: 'Rust / Corrosion', std: 'None' },
        ],
        punch: [
            { label: 'Punch Height', std: '____' },
            { label: 'Punch Wear', std: '<0.02' },
            { label: 'Chipping', std: 'None' },
            { label: 'Crack', std: 'None' },
            { label: 'Punch Alignment', std: 'Good' },
            { label: 'Surface Condition', std: 'Good' },
        ],
        insert: [
            { label: 'Insert Wear', std: '<0.02' },
            { label: 'Chipping', std: 'None' },
            { label: 'Crack', std: 'None' },
            { label: 'Cutting Edge Radius', std: '____' },
            { label: 'Clearance', std: '____' },
        ],
        guide: [
            { label: 'Guide Post Diameter', std: '____' },
            { label: 'Guide Bush Diameter', std: '____' },
            { label: 'Vertical Play', std: '<0.01' },
            { label: 'Horizontal Play', std: '<0.01' },
            { label: 'Lubrication', std: 'Good' },
        ],
        spring: [
            { label: 'Spring Free Length', std: '____' },
            { label: 'Spring Crack', std: 'None' },
            { label: 'Spring Set', std: '<5%' },
            { label: 'Gas Pressure', std: '____' },
            { label: 'Gas Leakage', std: 'None' },
        ],
        function: [
            { label: 'Pilot Pin Function', std: 'OK/NG' },
            { label: 'Feed Release Function', std: 'OK/NG' },
            { label: 'Sensor Function', std: 'OK/NG' },
            { label: 'Misfeed Detector', std: 'OK/NG' },
            { label: 'Cam Function', std: 'OK/NG' },
            { label: 'Lifter Function', std: 'OK/NG' },
            { label: 'Stopper Function', std: 'OK/NG' },
        ],
        dimension: [
            { label: 'Shut Height', std: '____' },
            { label: 'Die Height', std: '____' },
            { label: 'Parallelism', std: '____' },
            { label: 'Flatness', std: '____' },
        ],
        tryout: [
            { label: 'Burr', std: 'OK/NG' },
            { label: 'Scratch', std: 'OK/NG' },
            { label: 'Dent', std: 'OK/NG' },
            { label: 'Forming Shape', std: 'OK/NG' },
            { label: 'Hole Position', std: 'OK/NG' },
            { label: 'Product Dimension', std: 'OK/NG' },
        ]
    };

    const [form, setForm] = useState({
        asset_id: '',
        maintenance_date: new Date().toISOString().split('T')[0],
        pic_name: '',
        department: 'Engineering',
        maintenance_type: searchParams.get('type') || '100K',
        
        // Die Info
        die_no: '',
        part_name: '',
        customer: '',
        process: 'BL',
        machine_tonnage: '',
        current_stroke: '',
        
        // Checklist data map
        checksheet_data: {},
        
        // Remarks and actions
        structure_remarks: '',
        corrective_action: '',
        spare_parts_used: '',
        sample_qty: '',
        measurement_report_attached: 'NO',
        
        // Final Decision
        final_decision: 'RELEASE FOR PRODUCTION',
        
        // Die Life
        life_management: [
            { comp: 'Punch #1', current: '', limit: '', status: 'OK' },
            { comp: 'Punch #2', current: '', limit: '', status: 'OK' },
            { comp: 'Insert #1', current: '', limit: '', status: 'OK' },
            { comp: 'Insert #2', current: '', limit: '', status: 'OK' },
            { comp: 'Guide Post', current: '', limit: '', status: 'OK' },
            { comp: 'Spring', current: '', limit: '', status: 'OK' },
        ],

        checked_by: '',
        approved_by: ''
    });

    useEffect(() => {
        const userStr = sessionStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            setForm(prev => ({ ...prev, pic_name: user.name || '' }));
        }
    }, []);

    useEffect(() => {
        if (id) {
            fetchAsset(id);
            setForm(prev => ({ ...prev, asset_id: id }));
        }
    }, [id]);

    const fetchAsset = async (assetId) => {
        try {
            // Using network prefix if available, or just mock it for now since dies route might differ
            const res = await fetch(`/api/network/assets/${assetId}`);
            if (res.ok) {
                const data = await res.json();
                setAsset(data);
                setForm(prev => ({ 
                    ...prev, 
                    die_no: data.inventory_number || `DIES-000${assetId}`,
                    part_name: data.name || 'Unknown Part'
                }));
            } else {
                // Mock asset for UI building
                const mock = { inventory_number: `DIES-100${assetId}`, name: 'Mock Progressive Die', category: 'Dies', manufacturer: 'TCF Internal' };
                setAsset(mock);
                setForm(prev => ({ 
                    ...prev, 
                    die_no: mock.inventory_number,
                    part_name: mock.name
                }));
            }
        } catch (err) {
            console.error('Failed to fetch asset', err);
        }
    };

    const handleDataChange = (key, data) => {
        setForm(prev => ({
            ...prev,
            checksheet_data: {
                ...prev.checksheet_data,
                [key]: data
            }
        }));
    };

    const handleLifeChange = (index, field, value) => {
        const newLife = [...form.life_management];
        newLife[index][field] = value;
        setForm(prev => ({ ...prev, life_management: newLife }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        alert('Checksheet Data Saved Successfully (Simulation)');
        navigate('/dies/maintenance'); // Adjust this to actual dies maintenance route
    };

    const generatePDF = () => {
        if (!asset) return;
        const doc = new jsPDF();
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("AUTOMOTIVE DIE PREVENTIVE MAINTENANCE CHECK SHEET", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.text("(TIER-1 / OEM STANDARD)", 105, 26, { align: "center" });
        
        doc.setLineWidth(0.5);
        doc.line(14, 32, 196, 32);

        // Die Info
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        doc.text(`Die No: ${form.die_no}`, 14, 40);
        doc.text(`Part Name: ${form.part_name}`, 14, 45);
        doc.text(`Customer: ${form.customer}`, 14, 50);
        doc.text(`Process: ${form.process}`, 14, 55);
        doc.text(`Machine Tonnage: ${form.machine_tonnage}`, 14, 60);

        doc.text(`Current Stroke: ${form.current_stroke}`, 120, 40);
        doc.text(`PM Type: ${form.maintenance_type}`, 120, 45);
        doc.text(`Date: ${form.maintenance_date}`, 120, 50);
        doc.text(`Technician: ${form.pic_name}`, 120, 55);

        // Print final decision
        doc.setFont("helvetica", "bold");
        doc.text(`FINAL DECISION: ${form.final_decision}`, 14, 70);
        
        doc.setFont("helvetica", "normal");
        doc.text(`Remarks: ${form.corrective_action || '-'}`, 14, 80);

        doc.save(`PM_Dies_${form.die_no}_${form.maintenance_date}.pdf`);
    };

    if (!asset) return <div className="p-20 text-center font-bold text-slate-400">Loading Execution Environment...</div>;

    return (
        <div className="flex flex-col space-y-3 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dies/maintenance')} className="p-3 bg-white hover:bg-slate-50 border border-[#E1E1E1] rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Dies PM <span className="text-blue-600 italic">Execution</span></h1>
                        <p className="text-slate-500 text-sm font-medium">Tier-1 / OEM Standard Automotive Die Checklist</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button type="button" onClick={generatePDF} className="px-6 py-3 bg-white border border-[#E1E1E1] rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-all shadow-sm flex items-center gap-2">
                        <Printer size={16} /> Export PDF
                    </button>
                    <button onClick={handleSubmit} className="btn-primary-unifi px-8 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                        <Save size={16} /> Update Record
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Die Information Box */}
                <div className="bg-slate-900 p-4 md:p-5 rounded-3xl shadow-xl flex flex-col md:flex-row gap-5 mb-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                    
                    <div className="flex-1 space-y-3 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <PenTool size={16} className="text-blue-400" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Die Information</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Die No</label>
                                <input type="text" value={form.die_no} onChange={e => setForm({...form, die_no: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Part Name</label>
                                <input type="text" value={form.part_name} onChange={e => setForm({...form, part_name: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Customer</label>
                                <input type="text" value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Process</label>
                                <select value={form.process} onChange={e => setForm({...form, process: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none [&>option]:text-slate-900">
                                    <option value="BL">BL (Blanking)</option>
                                    <option value="PI">PI (Piercing)</option>
                                    <option value="DR">DR (Drawing)</option>
                                    <option value="TR">TR (Trimming)</option>
                                    <option value="FL">FL (Flanging)</option>
                                    <option value="CAM">CAM</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Machine Tonnage</label>
                                <input type="text" value={form.machine_tonnage} onChange={e => setForm({...form, machine_tonnage: e.target.value})} placeholder="e.g. 500T" className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">PM Type</label>
                                <select value={form.maintenance_type} onChange={e => setForm({...form, maintenance_type: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none [&>option]:text-slate-900">
                                    <option value="50K">50K Strokes</option>
                                    <option value="100K">100K Strokes</option>
                                    <option value="300K">300K Strokes</option>
                                    <option value="500K">500K Strokes</option>
                                    <option value="O/H">Overhaul</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Current Stroke</label>
                                <input type="number" value={form.current_stroke} onChange={e => setForm({...form, current_stroke: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Date</label>
                                <input type="date" value={form.maintenance_date} onChange={e => setForm({...form, maintenance_date: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Technician</label>
                                <input type="text" value={form.pic_name} onChange={e => setForm({...form, pic_name: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ACCORDION SECTIONS */}
                <AccordionSection title="A. Die Structure Inspection" icon={PenTool} defaultOpen={true}>
                    <StandardCheckTable section="structure" items={checkLists.structure} data={form.checksheet_data} onChange={handleDataChange} />
                    <div className="mt-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Remarks (Structure)</label>
                        <input type="text" className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Notes on die structure..." value={form.structure_remarks} onChange={e => setForm({...form, structure_remarks: e.target.value})} />
                    </div>
                </AccordionSection>

                <AccordionSection title="B. Punch Inspection" icon={Target}>
                    <StandardCheckTable section="punch" items={checkLists.punch} data={form.checksheet_data} onChange={handleDataChange} hasAction={true} />
                </AccordionSection>

                <AccordionSection title="C. Die Insert Inspection" icon={FileText}>
                    <StandardCheckTable section="insert" items={checkLists.insert} data={form.checksheet_data} onChange={handleDataChange} hasAction={true} />
                </AccordionSection>

                <AccordionSection title="D. Guide System Inspection" icon={Target}>
                    <StandardCheckTable section="guide" items={checkLists.guide} data={form.checksheet_data} onChange={handleDataChange} />
                </AccordionSection>

                <AccordionSection title="E. Spring / Gas Spring Inspection" icon={Settings}>
                    <StandardCheckTable section="spring" items={checkLists.spring} data={form.checksheet_data} onChange={handleDataChange} />
                </AccordionSection>

                <AccordionSection title="F. Function Check" icon={ShieldAlert}>
                    <StandardCheckTable section="function" items={checkLists.function} data={form.checksheet_data} onChange={handleDataChange} />
                </AccordionSection>

                <AccordionSection title="G. Dimension Check" icon={Target}>
                    <StandardCheckTable section="dimension" items={checkLists.dimension} data={form.checksheet_data} onChange={handleDataChange} />
                </AccordionSection>

                <AccordionSection title="H. Try Out Result" icon={FileCheck}>
                    <div className="flex items-center gap-4 mb-4">
                        <label className="text-xs font-bold text-slate-700">Sample Qty (pcs):</label>
                        <input type="number" className="border border-slate-200 rounded p-1.5 w-24 text-xs" value={form.sample_qty} onChange={e => setForm({...form, sample_qty: e.target.value})} />
                    </div>
                    <StandardCheckTable section="tryout" items={checkLists.tryout} data={form.checksheet_data} onChange={handleDataChange} />
                    <div className="mt-4 flex items-center gap-4">
                        <label className="text-xs font-bold text-slate-700">Measurement Report Attached?</label>
                        <select className="border border-slate-200 rounded p-1.5 text-xs" value={form.measurement_report_attached} onChange={e => setForm({...form, measurement_report_attached: e.target.value})}>
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                        </select>
                    </div>
                </AccordionSection>

                <AccordionSection title="I. Die Life Management" icon={Clock}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Component</th>
                                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-48">Current Life (Strokes)</th>
                                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-48">Limit Life (Strokes)</th>
                                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {form.life_management.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50/50">
                                        <td className="p-3 text-[11px] font-bold text-slate-700">{item.comp}</td>
                                        <td className="p-3 text-[11px]">
                                            <input type="number" className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={item.current} onChange={(e) => handleLifeChange(index, 'current', e.target.value)} />
                                        </td>
                                        <td className="p-3 text-[11px]">
                                            <input type="number" className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={item.limit} onChange={(e) => handleLifeChange(index, 'limit', e.target.value)} />
                                        </td>
                                        <td className="p-3 text-[11px]">
                                            <select className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={item.status} onChange={(e) => handleLifeChange(index, 'status', e.target.value)}>
                                                <option value="OK">OK</option>
                                                <option value="NG">NG</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </AccordionSection>

                {/* FINAL SECTION */}
                <div className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border border-slate-200 mb-8">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase mb-6 flex items-center gap-3">
                        <CheckCircle className="text-blue-600" /> J. Corrective Action & Final Decision
                    </h3>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Corrective Actions Taken</label>
                            <textarea className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]" placeholder="Describe what was repaired/changed..." value={form.corrective_action} onChange={e => setForm({...form, corrective_action: e.target.value})} />
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Spare Parts Used</label>
                            <input type="text" className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="List any spare parts consumed..." value={form.spare_parts_used} onChange={e => setForm({...form, spare_parts_used: e.target.value})} />
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">FINAL DECISION</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                {['RELEASE FOR PRODUCTION', 'CONDITIONAL RELEASE', 'REPAIR REQUIRED'].map((decision) => (
                                    <label key={decision} className={`flex-1 flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${form.final_decision === decision ? 'border-blue-600 bg-blue-50 text-blue-700 font-black shadow-sm' : 'border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-50'}`}>
                                        <input type="radio" name="final_decision" value={decision} checked={form.final_decision === decision} onChange={(e) => setForm({...form, final_decision: e.target.value})} className="sr-only" />
                                        <span className="text-xs uppercase tracking-widest text-center">{decision}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pb-10">
                    <button type="submit" className="btn-primary-unifi px-12 py-4 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-transform active:scale-95">
                        <Save size={18} /> Submit Maintenance Record
                    </button>
                </div>
            </form>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Edit, Save, Trash2, Camera, MapPin, 
    Layers, Settings, Info, Activity, Clock, FileText, CheckCircle, Wrench
} from 'lucide-react';

export default function DiesAssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [asset, setAsset] = useState(null);
    const [activeTab, setActiveTab] = useState('info');
    const [isHitModalOpen, setIsHitModalOpen] = useState(false);
    const [addHitValue, setAddHitValue] = useState('');

    const fetchDetail = async () => {
        try {
            const res = await fetch(`/api/dies/inventory/${id}`);
            const json = await res.json();
            if (json.success) {
                setAsset(json.data);
            } else {
                console.error('Failed to fetch:', json.error);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const handleAddHit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/dies/inventory/${id}/hit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ add_hit: parseInt(addHitValue) })
            });
            if (res.ok) {
                setIsHitModalOpen(false);
                setAddHitValue('');
                fetchDetail();
            }
        } catch (err) {
            console.error('Error updating hit:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Activity size={40} className="text-blue-500 animate-pulse" />
                <p className="font-bold text-slate-500">Loading Dies Data...</p>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <p className="font-bold text-slate-500">Dies not found</p>
                <button onClick={() => navigate(-1)} className="text-blue-600 font-bold hover:underline">Go Back</button>
            </div>
        );
    }

    const { specifications, location, hit_counter } = asset;
    const currentHit = hit_counter ? hit_counter.current_hit : 0;
    const targetHit = hit_counter ? hit_counter.target_pm_hit : 100000;
    const toolLifePercent = Math.max(0, 100 - ((currentHit / targetHit) * 100)).toFixed(1);
    const pmDue = Math.max(0, targetHit - currentHit);

    const tabs = [
        { id: 'info', label: 'General Info', icon: Info },
        { id: 'spec', label: 'Specifications', icon: Settings },
        { id: 'location', label: 'Location Tracking', icon: MapPin },
        { id: 'pm', label: 'PM History', icon: CheckCircle },
    ];

    return (
        <div className="space-y-3 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                {asset.asset_code || `DIES-${asset.id.toString().padStart(4, '0')}`}
                            </h1>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-lg border border-emerald-200">
                                {asset.status}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-slate-400 mt-1">{asset.item_name} ({asset.dies_number || 'N/A'})</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigate(`/dies/maintenance/execution/${asset.id}`)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        <Wrench size={16} /> Start Maintenance
                    </button>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
                        <Edit size={16} /> Edit Data
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Hit</p>
                            <p className="text-xl font-black text-slate-800">{currentHit.toLocaleString()} <span className="text-xs text-slate-400 font-medium">strokes</span></p>
                        </div>
                    </div>
                    <button onClick={() => setIsHitModalOpen(true)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors">
                        <Edit size={14} />
                    </button>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <Layers size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tool Life</p>
                        <p className={`text-xl font-black ${toolLifePercent < 20 ? 'text-rose-600' : 'text-slate-800'}`}>{toolLifePercent}%</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pmDue < 5000 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-amber-50 text-amber-600'}`}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Next PM Due In</p>
                        <p className={`text-lg font-black ${pmDue < 5000 ? 'text-rose-600' : 'text-slate-800'}`}>{pmDue.toLocaleString()} <span className="text-xs text-slate-400 font-medium">hits</span></p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Breakdowns</p>
                        <p className="text-xl font-black text-slate-800">0</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Left Sidebar - Photo & QR */}
                <div className="w-full lg:w-1/3 space-y-3">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="aspect-square bg-slate-100 flex items-center justify-center relative group overflow-hidden">
                            {(asset.asset_code === 'DIES-SP-001') ? (
                                <img src="/dies_photos/small_press.png" alt="Small Press Die" className="w-full h-full object-cover" />
                            ) : (asset.asset_code === 'DIES-BP-002') ? (
                                <img src="/dies_photos/big_press.png" alt="Big Press Die" className="w-full h-full object-cover" />
                            ) : (
                                <Camera size={48} className="text-slate-300" />
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <span className="text-white font-bold flex items-center gap-2"><Camera size={18}/> Upload Photo</span>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                            <p className="text-sm font-bold text-slate-700 mb-2">QR Code / Barcode</p>
                            <div className="w-full h-24 bg-white border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold">
                                {asset.asset_code || `DIES-${asset.id.toString().padStart(4, '0')}`}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content - Tabs */}
                <div className="w-full lg:w-2/3 flex flex-col">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                                    activeTab === tab.id 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                                        : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                                }`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 p-4">
                        {activeTab === 'info' && (
                            <div className="space-y-3">
                                <h3 className="font-black text-slate-900 border-b border-slate-100 pb-3">Master Dies Information</h3>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Customer</p>
                                        <p className="font-medium text-slate-800">{asset.customer || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Project</p>
                                        <p className="font-medium text-slate-800">{asset.project || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Model / Part Name</p>
                                        <p className="font-medium text-slate-800">{asset.model || '-'} / {asset.part_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Part Number</p>
                                        <p className="font-medium text-slate-800">{asset.part_number || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Maker / Vendor</p>
                                        <p className="font-medium text-slate-800">{asset.maker || '-'} / {asset.vendor || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Manufacture Year</p>
                                        <p className="font-medium text-slate-800">{asset.manufacture_year || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Press Machine</p>
                                        <p className="font-medium text-slate-800">{asset.press_machine || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Production Line</p>
                                        <p className="font-medium text-slate-800">{asset.production_line || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'spec' && (
                            <div className="space-y-3">
                                <h3 className="font-black text-slate-900 border-b border-slate-100 pb-3">Dies Specifications</h3>
                                {specifications && Object.keys(specifications).length > 0 ? (
                                    <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dimensions (L x W x H)</p>
                                            <p className="font-medium text-slate-800">
                                                {specifications.length || 0} x {specifications.width || 0} x {specifications.height || 0} mm
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Weight</p>
                                            <p className="font-medium text-slate-800">{specifications.weight || 0} kg</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Shut Height</p>
                                            <p className="font-medium text-slate-800">{specifications.shut_height || 0} mm</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Stroke</p>
                                            <p className="font-medium text-slate-800">{specifications.stroke || 0} mm</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Press Capacity</p>
                                            <p className="font-medium text-slate-800">{specifications.press_capacity || 0} Ton</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Die Set Type</p>
                                            <p className="font-medium text-slate-800">{specifications.die_set_type || '-'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-slate-400 font-bold mb-4">No specifications data recorded.</p>
                                        <button className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg border border-blue-100">Add Specifications</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'location' && (
                            <div className="space-y-3">
                                <h3 className="font-black text-slate-900 border-b border-slate-100 pb-3">Storage Location</h3>
                                {location && Object.keys(location).length > 0 ? (
                                    <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Plant / Building</p>
                                            <p className="font-medium text-slate-800">{location.plant || '-'} / {location.building || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Area / Zone</p>
                                            <p className="font-medium text-slate-800">{location.area || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rack / Shelf No.</p>
                                            <p className="font-medium text-slate-800">{location.rack_number || '-'} - {location.shelf_number || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Position</p>
                                            <p className="font-medium text-slate-800">{location.current_position || 'STORAGE'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-slate-400 font-bold mb-4">No location data recorded.</p>
                                        <button className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg border border-blue-100">Update Location</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'pm' && (
                            <div className="text-center py-20 opacity-50">
                                <CheckCircle size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="font-black text-slate-600 text-lg">PM History (Coming Soon)</h3>
                                <p className="text-sm font-bold text-slate-400">Log history will be displayed here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hit Counter Input Modal */}
            {isHitModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="font-black text-slate-800">Input Manual Hit Counter</h2>
                            <button onClick={() => setIsHitModalOpen(false)} className="text-slate-400 hover:text-rose-500">
                                <Trash2 size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddHit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Total Produksi Shift Ini (Strokes/Hits)</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="1"
                                    value={addHitValue}
                                    onChange={e => setAddHitValue(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono text-center text-lg font-bold"
                                    placeholder="e.g. 5000"
                                    autoFocus
                                />
                                <p className="text-[10px] text-slate-400 mt-2 text-center">Hit ini akan diakumulasikan ke Current Hit dan mengurangi umur sisa PM.</p>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsHitModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                                    <Save size={16} /> Update Hit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

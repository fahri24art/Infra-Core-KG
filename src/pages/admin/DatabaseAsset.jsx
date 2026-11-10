import React, { useState, useEffect } from 'react';
import { Database, Search, Save, X, Edit2, AlertCircle } from 'lucide-react';

export default function DatabaseAsset() {
    const [assets, setAssets] = useState([]);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    
    // Status
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [assetRes, userRes, deptRes] = await Promise.all([
                fetch('/api/assets'),
                fetch('/api/network/users'),
                fetch('/api/network/departments')
            ]);
            
            const assetData = await assetRes.json();
            const userData = await userRes.json();
            const deptData = await deptRes.json();
            
            setAssets(assetData || []);
            setUsers(Array.isArray(userData) ? userData : []);
            setDepartments(Array.isArray(deptData) ? deptData : []);
            
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (asset) => {
        setEditingId(asset.id);
        
        // Find user_id if we match by name
        let matchedUserId = asset.user_id;
        if (!matchedUserId && asset.user_name) {
            const u = users.find(u => u.name === asset.user_name);
            if (u) matchedUserId = u.id;
        }

        setEditForm({
            name: asset.name || '',
            user_id: matchedUserId || '',
            user_name: asset.user_name || '',
            department: asset.user_department || asset.location || '',
            inventory_number: asset.inventory_number || '',
            purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : ''
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async (id) => {
        try {
            setIsSaving(true);
            
            // Format data for save
            const updatePayload = {
                name: editForm.name,
                inventory_number: editForm.inventory_number,
                purchase_date: editForm.purchase_date || null
            };
            
            if (editForm.user_id) {
                updatePayload.user_id = editForm.user_id;
                // find the user to get name and dept
                const u = users.find(u => u.id.toString() === editForm.user_id.toString());
                if (u) {
                    updatePayload.contact = u.name;
                    updatePayload.location = u.department || editForm.department;
                }
            } else {
                updatePayload.contact = editForm.user_name;
                updatePayload.location = editForm.department;
            }

            const response = await fetch(`/api/assets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });

            if (!response.ok) throw new Error('Failed to update');

            setSaveStatus({ type: 'success', message: 'Saved successfully' });
            setTimeout(() => setSaveStatus(null), 3000);
            
            // Refresh data
            fetchData();
            setEditingId(null);
        } catch (err) {
            console.error('Save error:', err);
            setSaveStatus({ type: 'error', message: 'Failed to save data' });
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredAssets = assets.filter(a => 
        (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.inventory_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-3 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                        <Database size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Database Asset</h1>
                        <p className="text-slate-500 font-medium mt-1">Live Excel-like Data Grid synced with Fleet Assets</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search assets..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-64 text-sm font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Notification */}
            {saveStatus && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    <AlertCircle size={20} />
                    <span className="font-bold">{saveStatus.message}</span>
                </div>
            )}

            {/* Grid Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 sticky top-0 z-10 outline outline-1 outline-slate-200 text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50">Aksi</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50">Nama Perangkat</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50">Serial Number</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50">MAC Address</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50">IP Address</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50">User Pemegang</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50">Department</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50">Kode Asset</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50">Tgl Pembelian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-slate-500 font-medium">Loading data...</td>
                                </tr>
                            ) : filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-slate-500 font-medium">No assets found</td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => {
                                    const isEditing = editingId === asset.id;
                                    
                                    return (
                                        <tr key={asset.id} className={`hover:bg-blue-50/50 transition-colors ${isEditing ? 'bg-blue-50/50' : ''}`}>
                                            <td className="px-3 py-1.5 text-[11px]">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => handleSave(asset.id)}
                                                            disabled={isSaving}
                                                            className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                                                            title="Save"
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={handleCancelEdit}
                                                            className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                                            title="Cancel"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleEditClick(asset)}
                                                        className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-bold"
                                                    >
                                                        <Edit2 size={14} /> Edit
                                                    </button>
                                                )}
                                            </td>
                                            
                                            {/* Nama Perangkat */}
                                            <td className="px-3 py-1.5 text-[11px]">
                                                {isEditing ? (
                                                    <input 
                                                        type="text" 
                                                        value={editForm.name} 
                                                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                                    />
                                                ) : (
                                                    <span className="font-bold text-slate-800">{asset.name || '-'}</span>
                                                )}
                                            </td>
                                            
                                            {/* Serial Number */}
                                            <td className="px-3 py-1.5 text-[11px]">
                                                <span className="font-mono text-xs text-slate-600">
                                                    {asset.serial_number || '-'}
                                                </span>
                                            </td>

                                            {/* MAC Address */}
                                            <td className="px-3 py-1.5 text-[11px]">
                                                <span className="font-mono text-xs text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {asset.specs && typeof asset.specs === 'string' 
                                                        ? (JSON.parse(asset.specs).mac_addresses?.[0] || '-')
                                                        : (asset.specs?.mac_addresses?.[0] || '-')}
                                                </span>
                                            </td>

                                            {/* IP Address */}
                                            <td className="px-3 py-1.5 text-[11px]">
                                                <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                    {asset.specs && typeof asset.specs === 'string' 
                                                        ? (JSON.parse(asset.specs).ip || '-')
                                                        : (asset.specs?.ip || '-')}
                                                </span>
                                            </td>
                                            
                                            {/* User Pemegang */}
                                            <td className="px-3 py-1.5 text-[11px]">
                                                {isEditing ? (
                                                    <select 
                                                        value={editForm.user_id || ''}
                                                        onChange={(e) => {
                                                            const uId = e.target.value;
                                                            const uName = e.target.options[e.target.selectedIndex].text;
                                                            const u = users.find(x => x.id.toString() === uId);
                                                            setEditForm({
                                                                ...editForm, 
                                                                user_id: uId, 
                                                                user_name: uName,
                                                                department: u ? (u.department || editForm.department) : editForm.department
                                                            });
                                                        }}
                                                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                                    >
                                                        <option value="">-- Select User --</option>
                                                        {users.map(u => (
                                                            <option key={u.id} value={u.id}>{u.name || u.username}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                            {(asset.user_name || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-slate-700">{asset.user_name || '-'}</span>
                                                    </div>
                                                )}
                                            </td>
                                            
                                            {/* Department */}
                                            <td className="px-3 py-1.5 text-[11px]">
                                                {isEditing ? (
                                                    <select 
                                                        value={editForm.department || ''}
                                                        onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                                                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                                    >
                                                        <option value="">-- Select Dept --</option>
                                                        {departments.map(d => (
                                                            <option key={d.id} value={d.name}>{d.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">
                                                        {asset.user_department || asset.location || '-'}
                                                    </span>
                                                )}
                                            </td>
                                            
                                            {/* Kode Asset */}
                                            <td className="px-3 py-1.5 text-[11px]">
                                                {isEditing ? (
                                                    <input 
                                                        type="text" 
                                                        value={editForm.inventory_number} 
                                                        onChange={(e) => setEditForm({...editForm, inventory_number: e.target.value})}
                                                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-600 uppercase"
                                                    />
                                                ) : (
                                                    <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                                        {asset.inventory_number || '-'}
                                                    </span>
                                                )}
                                            </td>
                                            
                                            {/* Tgl Pembelian */}
                                            <td className="px-3 py-1.5 text-[11px]">
                                                {isEditing ? (
                                                    <input 
                                                        type="date" 
                                                        value={editForm.purchase_date} 
                                                        onChange={(e) => setEditForm({...editForm, purchase_date: e.target.value})}
                                                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                                    />
                                                ) : (
                                                    <span className="text-slate-600 font-medium">
                                                        {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('id-ID') : '-'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 border-t border-slate-200 p-4 text-xs font-bold text-slate-500 flex justify-between z-20 sticky bottom-0">
                    <span>Total {filteredAssets.length} assets found.</span>
                    <span>Modifications sync automatically in real-time.</span>
                </div>
            </div>
        </div>
    );
}

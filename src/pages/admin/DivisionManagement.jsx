import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Layers, Trash2, Edit, Building2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import http from '../../services/http';

export default function DivisionManagement() {
    const navigate = useNavigate();
    const [divisions, setDivisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [formData, setFormData] = useState({ name: '', department_id: '', description: '' });
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchDivisions = async () => {
        try {
            const res = await http.get('/api/network/divisions');
            setDivisions(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch divisions", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepts = async () => {
        try {
            const res = await http.get('/api/network/departments');
            setDepartments(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    useEffect(() => {
        fetchDivisions();
        fetchDepts();
    }, []);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const url = editingId ? `/api/network/divisions/${editingId}` : '/api/network/divisions';
        const method = editingId ? 'PUT' : 'POST';

        try {
            if (method === 'POST') {
                await http.post(url, formData);
            } else {
                await http.put(url, formData);
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', department_id: '', description: '' });
            fetchDivisions();
        } catch (err) {
            console.error("Error submitting division", err);
            alert(err.response?.data?.error || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (div) => {
        setEditingId(div.id);
        setFormData({
            name: div.name,
            department_id: div.department_id,
            description: div.description || ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteDivision = async (id, name) => {
        if (window.confirm(`Delete division "${name}"?`)) {
            try {
                await http.delete(`/api/network/divisions/${id}`);
                fetchDivisions();
            } catch (err) {
                console.error("Error deleting division", err);
                alert("Failed to delete division");
            }
        }
    };

    const filtered = divisions.filter(d =>
        (d.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (d.description?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="p-5 max-w-7xl mx-auto space-y-5 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={() => navigate('/ict/admin')}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Divisions</h1>
                        <p className="text-slate-500 font-medium">Sub-units and functional team breakdown</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search divisions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all w-full md:w-64 font-medium"
                        />
                    </div>
                    <button
                        onClick={() => { setEditingId(null); setFormData({ name: '', department_id: '', description: '' }); setIsModalOpen(true); }}
                        className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Add Division</span>
                    </button>
                </div>
            </div>

            {/* Add Division Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-md p-5 bg-white rounded-[2.5rem] shadow-2xl border-none">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingId ? 'Edit Team Division' : 'Add Team Division'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-2 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Division Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Infrastructure & Security"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Parent Department</label>
                                <select
                                    required
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700"
                                    value={formData.department_id}
                                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                >
                                    <option value="">Select Department...</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Responsibilities</label>
                                <textarea
                                    rows="2"
                                    placeholder="What does this team handle?"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 resize-none"
                                />
                            </div>
                            <button
                                disabled={submitting}
                                type="submit"
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Processing...' : (editingId ? 'Save Changes' : 'Confirm Division')}
                            </button>
                        </form>
                    </Card>
                </div>
            )}

            {/* List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center space-y-3">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Mapping Teams...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                        <div className="text-slate-300 font-black text-xl mb-2">No divisions mapped</div>
                        <p className="text-slate-400 text-sm font-medium">Link specific teams to their parent departments</p>
                    </div>
                ) : filtered.map(div => (
                    <Card key={div.id} className="p-5 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.12)] transition-all group border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-150 transition-transform">
                            <Layers size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-indigo-200 group-hover:shadow-xl">
                                    <Layers size={24} />
                                </div>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditModal(div)}
                                        className="p-2 text-slate-400 hover:text-blue-600"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteDivision(div.id, div.name)}
                                        className="p-2 text-slate-400 hover:text-red-600"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 mb-1.5 group-hover:text-indigo-700 transition-colors">{div.name}</h3>
                                <div className="flex items-center text-xs font-bold text-slate-400">
                                    <Building2 size={12} className="mr-1.5" />
                                    {div.department_name || 'Unassigned Dept'}
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2">
                                {div.description || 'Core functional unit within the organization.'}
                            </p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

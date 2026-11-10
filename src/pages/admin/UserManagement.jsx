import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, MoreHorizontal, User, Mail, Shield, Building, Trash2, Edit, Users, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import http from '../../services/http';

export default function UserManagement() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [hrEmployees, setHrEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHrModalOpen, setIsHrModalOpen] = useState(false);
    const [hrSearch, setHrSearch] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        password: '',
        role: 'user',
        department: '',
        division: '',
        whatsapp: '',
        hr_employee_id: '',
        organization: sessionStorage.getItem('organization') || 'TCF-SG'
    });
    const [departments, setDepartments] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const activeOrg = sessionStorage.getItem('organization') || 'TCF-SG';

    const fetchUsers = async () => {
        try {
            const res = await http.get(`/api/network/users?organization=${activeOrg}`);
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepts = async () => {
        try {
            const res = await http.get(`/api/network/departments?organization=${activeOrg}`);
            setDepartments(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    const fetchHrEmployees = async () => {
        try {
            const res = await http.get(`/api/hr/employees?organization=${activeOrg}`);
            setHrEmployees(res.data?.data || (Array.isArray(res.data) ? res.data : []));
        } catch (err) {
            console.error("Failed to fetch hr employees", err);
        }
    };

    const fetchDivs = async () => {
        try {
            const res = await http.get(`/api/network/divisions?organization=${activeOrg}`);
            setDivisions(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch divisions", err);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchDepts();
        fetchDivs();
        fetchHrEmployees();
    }, []);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const url = editingId ? `/api/network/users/${editingId}` : '/api/network/users';
        const method = editingId ? 'PUT' : 'POST';

        try {
            if (method === 'POST') {
                await http.post(url, formData);
            } else {
                await http.put(url, formData);
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ username: '', name: '', email: '', password: '', role: 'user', department: '', division: '', whatsapp: '', hr_employee_id: '', organization: sessionStorage.getItem('organization') || 'TCF-SG' });
            fetchUsers();
        } catch (err) {
            console.error("Error submitting user", err);
            alert(err.response?.data?.error || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (user) => {
        setEditingId(user.id);
        setFormData({
            username: user.username || '',
            name: user.name,
            email: user.email,
            password: '', // Optionally leave empty or mask
            role: user.role,
            department: user.department || '',
            division: user.division || '',
            whatsapp: user.whatsapp || '',
            hr_employee_id: user.hr_employee_id || '',
            organization: user.organization || sessionStorage.getItem('organization') || 'TCF-SG'
        });
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) {
            try {
                await http.delete(`/api/network/users/${id}?organization=${activeOrg}`);
                fetchUsers();
            } catch (err) {
                console.error("Error deleting user", err);
                alert("Failed to delete user: " + (err.response?.data?.error || err.message));
            }
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (u.username?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (u.department?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const availableDivisions = divisions.filter(d => d.department_name === formData.department);

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
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
                        <p className="text-slate-500 font-medium">Manage organization access and profile data</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all w-full md:w-64 font-medium"
                        />
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setIsHrModalOpen(true)}
                            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
                        >
                            <Users size={20} />
                            <span>Add User From HRD</span>
                        </button>
                        <button
                            onClick={() => { setEditingId(null); setFormData({ username: '', name: '', email: '', password: '', role: 'user', department: '', division: '', whatsapp: '', hr_employee_id: '', organization: sessionStorage.getItem('organization') || 'TCF-SG' }); setIsModalOpen(true); }}
                            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"
                        >
                            <Plus size={20} />
                            <span>Add Manual</span>
                        </button>
                    </div>
                </div>
            </div>

            
            {/* HRD Import Modal */}
            {isHrModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-none flex flex-col" style={{maxHeight: '90vh'}}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Import from HR Database</h2>
                            <button onClick={() => setIsHrModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 shrink-0">
                            <div className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search HR employees by name or NIK..."
                                    value={hrSearch}
                                    onChange={(e) => setHrSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto p-2 grow">
                            {hrEmployees
                                .filter(hr => !users.some(u => String(u.hr_employee_id) === String(hr.id)))
                                .filter(hr => (hr.name||'').toLowerCase().includes(hrSearch.toLowerCase()) || (hr.nik||'').toLowerCase().includes(hrSearch.toLowerCase()))
                                .map(hr => (
                                <div key={hr.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border-b border-slate-50 last:border-0 group">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                                            {hr.name ? hr.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{hr.name}</div>
                                            <div className="text-xs font-bold text-slate-400">{hr.nik} • {hr.department}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingId(null);
                                            setFormData({ 
                                                username: hr.nik || '', 
                                                name: hr.name || '', 
                                                email: hr.email || '', 
                                                password: '', 
                                                role: 'user', 
                                                department: hr.department || '', 
                                                division: '', 
                                                whatsapp: hr.phone || '', 
                                                hr_employee_id: hr.id, 
                                                organization: sessionStorage.getItem('organization') || 'TCF-SG' 
                                            });
                                            setIsHrModalOpen(false);
                                            setIsModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-white border-2 border-indigo-100 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        Import
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Add User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-md p-4 bg-white rounded-3xl shadow-2xl border-none">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">{editingId ? 'Edit Profile' : 'Create Identity'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Username (Login ID)</label>
                                <input
                                    type="text"
                                    placeholder="johndoe123"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="john@example.com (Optional)"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Initial Password</label>
                                <input
                                    required={!editingId}
                                    type="password"
                                    placeholder={editingId ? 'Leave blank to keep current' : '••••••••'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp Number (e.g. 628123...)</label>
                                <input
                                    type="text"
                                    placeholder="628..."
                                    value={formData.whatsapp || ''}
                                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/[^0-9]/g, '') })}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Link to HR Employee (Optional)</label>
                                <select
                                    value={formData.hr_employee_id || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const updates = { hr_employee_id: val };
                                        if (val) {
                                            const emp = hrEmployees.find(h => String(h.id) === String(val));
                                            if (emp) {
                                                if (!formData.name) updates.name = emp.name || '';
                                                if (!formData.email) updates.email = emp.email || '';
                                                if (!formData.department) updates.department = emp.department || '';
                                                if (!formData.whatsapp) updates.whatsapp = emp.phone || '';
                                                if (!formData.username) updates.username = emp.nik || '';
                                            }
                                        }
                                        setFormData({ ...formData, ...updates });
                                    }}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                >
                                    <option value="">-- No HR Link --</option>
                                    {hrEmployees.map(hr => (
                                        <option key={hr.id} value={hr.id}>{hr.nik} - {hr.name} ({hr.department})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Role</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="user">User</option>
                                        <option value="technician">Technician</option>
                                        {['admin', 'administrator', 'super_user', 'superuser'].includes(sessionStorage.getItem('user') ? JSON.parse(sessionStorage.getItem('user')).role : '') && (
                                            <>
                                                <option value="hrga">Admin HRGA</option>
                                                <option value="ict">Admin ICT</option>
                                            </>
                                        )}
                                        {['administrator', 'super_user', 'superuser'].includes(sessionStorage.getItem('user') ? JSON.parse(sessionStorage.getItem('user')).role : '') && (
                                            <option value="superuser">Administrator (Super Admin)</option>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Organization</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                        value={formData.organization || sessionStorage.getItem('organization')}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                    >
                                        <option value="TCF-SG">TCF-SG (Sadang)</option>
                                        <option value="TCF-KG">TCF-KG (Karawang)</option>
                                    </select>
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Department</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value, division: '' })}
                                    >
                                        <option value="">Select Dept...</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {availableDivisions.length > 0 && (
                                    <div className="space-y-1 col-span-2 sm:col-span-1 animate-in fade-in duration-300">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Division</label>
                                        <select
                                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                            value={formData.division}
                                            onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                        >
                                            <option value="">Select Division (Optional)</option>
                                            {availableDivisions.map(d => (
                                                <option key={d.id} value={d.name}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <button
                                disabled={submitting}
                                type="submit"
                                className="w-full mt-2 py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
                            >
                                {submitting ? 'Processing...' : (editingId ? 'Save Changes' : 'Complete Registration')}
                            </button>
                        </form>
                    </Card>
                </div>
            )}

            {/* Content Table */}
            <Card className="overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-[2.5rem]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <th className="px-8 py-6 text-[10px] uppercase tracking-widest">Identity / Role</th>
                                <th className="text-[10px] uppercase tracking-widest">Department</th>
                                <th className="text-[10px] uppercase tracking-widest">Access Status</th>
                                <th className="px-8 text-right" uppercase tracking-widest>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="py-20 text-center">
                                        <div className="flex flex-col items-center space-y-3">
                                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Personnel...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-20 text-center">
                                        <div className="text-slate-300 font-black text-xl mb-2">No users found</div>
                                        <div className="text-slate-400 font-medium text-sm">Try adjusting your search query</div>
                                    </td>
                                </tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6 text-[11px]">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-800 group-hover:text-blue-700 transition-colors">{user.name}</div>
                                                <div className="text-xs font-bold text-slate-400 flex items-center mt-0.5">
                                                    <Mail size={12} className="mr-1.5" />
                                                    {user.email || 'no-email'}
                                                </div>
                                                <div className="text-xs font-bold text-slate-400 flex items-center mt-0.5">
                                                    <User size={12} className="mr-1.5" />
                                                    {user.username || 'No Username'}
                                                </div>
                                                <div className="text-xs font-bold flex items-center mt-0.5">
                                                    <span className="mr-1.5 font-bold text-green-500">WA:</span>
                                                    <span className={user.whatsapp ? "text-slate-600" : "text-slate-300"}>{user.whatsapp || 'Not Registered'}</span>
                                                </div>
                                                {user.hr_nik && (
                                                    <div className="text-[10px] font-bold flex items-center mt-1 space-x-2 bg-blue-50 text-blue-700 px-2 py-0.5 rounded w-fit">
                                                        <span>NIK: {user.hr_nik}</span>
                                                        <span>|</span>
                                                        <span>{user.hr_position}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-[11px]">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center space-x-2 text-slate-500 font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 w-fit">
                                                <Building size={14} className="text-slate-400" />
                                                <span>{user.department || 'General'}</span>
                                            </div>
                                            {user.division && (
                                                <div className="text-xs font-bold text-slate-400 ml-2 border-l-2 border-slate-200 pl-2">
                                                    {user.division}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-[11px]">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                            <Shield size={10} className="mr-1.5" />
                                            {user.role || 'user_only'}
                                        </span>
                                    </td>
                                    <td className="px-8 text-[11px]">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => navigate(`/ict/admin/users/profile/${user.id}`)}
                                                className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-90"
                                                title="View Profile"
                                            >
                                                <User size={16} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all active:scale-90"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-red-600 hover:shadow-lg transition-all active:scale-90"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

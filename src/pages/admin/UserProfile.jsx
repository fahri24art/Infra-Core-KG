import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, Briefcase, Building, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export default function UserProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`/api/network/users/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                } else {
                    console.error("User not found");
                }
            } catch (err) {
                console.error("Failed to fetch user", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
                <AlertCircle size={48} className="text-slate-400" />
                <h2 className="text-2xl font-black text-slate-700">User Not Found</h2>
                <button 
                    onClick={() => navigate('/ict/admin/users')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                    Back to Directory
                </button>
            </div>
        );
    }

    return (
        <div className="p-5 max-w-5xl mx-auto space-y-5 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={() => navigate('/ict/admin/users')}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Profile</h1>
                        <p className="text-slate-500 font-medium">Detailed Identity & Contact Information</p>
                    </div>
                </div>
                {user.is_active ? (
                    <div className="flex items-center space-x-2 bg-green-50 text-green-600 px-4 py-2 rounded-xl font-bold border border-green-100">
                        <CheckCircle2 size={18} />
                        <span>Active Account</span>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold border border-red-100">
                        <AlertCircle size={18} />
                        <span>Inactive</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Left Column: Avatar & Basic Info */}
                <div className="md:col-span-1 space-y-5">
                    <Card className="p-5 flex flex-col items-center text-center bg-white rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-lg shadow-blue-200 mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-300 overflow-hidden">
                            {user.hr_photo_url ? (
                                <img src={user.hr_photo_url.startsWith('http') ? user.hr_photo_url : `/api/network${user.hr_photo_url}`} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user.name ? user.name.charAt(0).toUpperCase() : <User size={48} />
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-1">
                            {user.first_name || user.last_name 
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
                                : user.name}
                        </h2>
                        <p className="text-slate-500 font-bold mb-4">@{user.name}</p>
                        
                        <div className="w-full flex justify-center space-x-2 mb-6">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-black uppercase tracking-widest border border-slate-200">
                                {user.role || 'User'}
                            </span>
                            {user.category && (
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
                                    {user.category}
                                </span>
                            )}
                        </div>

                        {user.hr_nik && (
                            <div className="w-full bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2">
                                <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">NIK (Employee ID)</p>
                                <p className="font-bold text-blue-700">{user.hr_nik}</p>
                            </div>
                        )}
                        {(user.hr_position || user.title) && (
                            <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Job Title</p>
                                <p className="font-bold text-slate-700">{user.hr_position || user.title}</p>
                            </div>
                        )}
                    </Card>

                    <Card className="p-5 bg-white rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                            <Shield size={16} className="mr-2 text-blue-500" />
                            System Details
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GLPI ID</p>
                                <p className="font-bold text-slate-700">{user.glpi_id || 'Not Linked'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Organization</p>
                                <p className="font-bold text-slate-700">{user.organization || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Update</p>
                                <p className="font-bold text-slate-700">{new Date(user.updated_at).toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Contact & Organization */}
                <div className="md:col-span-2 space-y-5">
                    <Card className="p-5 bg-white rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                            <Mail size={16} className="mr-2 text-blue-500" />
                            Contact Information
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start space-x-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-blue-500">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                                    <p className="font-bold text-slate-700">{user.email || '-'}</p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start space-x-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-green-500">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp / Phone</p>
                                    <p className="font-bold text-slate-700">{user.hr_phone || user.whatsapp || user.phone || '-'}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start space-x-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-purple-500">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cell Phone (GLPI)</p>
                                    <p className="font-bold text-slate-700">{user.cell_phone || '-'}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start space-x-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-orange-500">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                                    <p className="font-bold text-slate-700">{user.location || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 bg-white rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                            <Briefcase size={16} className="mr-2 text-blue-500" />
                            Organizational Hierarchy
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <div className="flex items-center space-x-3 mb-2">
                                    <Building size={16} className="text-slate-400" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department / Division</p>
                                </div>
                                <p className="font-bold text-slate-700 text-lg ml-7">{user.department || '-'}</p>
                            </div>
                            
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <div className="flex items-center space-x-3 mb-2">
                                    <User size={16} className="text-slate-400" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supervisor / Manager</p>
                                </div>
                                <p className="font-bold text-slate-700 text-lg ml-7">{user.supervisor || '-'}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

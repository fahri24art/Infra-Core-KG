import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Loader2, RefreshCw, UserPlus, X, Pencil, Search, Filter, 
  Calendar, FileText, Printer, Copy, AlertTriangle, CheckCircle2, 
  ChevronLeft, ChevronRight, Laptop, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RicohJobHistory() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateFilter, setDateFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all' | 'double' | 'print' | 'copy'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    
    // Assign User Modal State
    const [showModal, setShowModal] = useState(false);
    const [rawDeviceId, setRawDeviceId] = useState('');
    const [assetsList, setAssetsList] = useState([]);
    const [selectedAssetId, setSelectedAssetId] = useState('');
    const [usersList, setUsersList] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState(null);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const url = dateFilter ? `/api/ricoh/jobs?date=${dateFilter}` : '/api/ricoh/jobs?limit=500';
            const res = await axios.get(url);
            setJobs(res.data);
            setCurrentPage(1);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [dateFilter]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get('/api/network/users');
                setUsersList(res.data);
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        const fetchAssets = async () => {
            try {
                const res = await axios.get('/api/network/assets');
                setAssetsList(res.data);
            } catch (err) {
                console.error("Failed to fetch assets", err);
            }
        };
        fetchUsers();
        fetchAssets();
    }, []);

    const openAssignModal = (rawId, assetId, employeeId) => {
        setRawDeviceId(rawId);
        setSelectedAssetId(assetId || '');
        setSelectedUserId(employeeId || '');
        setAssignError(null);
        setShowModal(true);
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!selectedAssetId) {
            setAssignError("Please select a device");
            return;
        }
        if (!selectedUserId) {
            setAssignError("Please select an employee");
            return;
        }
        try {
            setAssigning(true);
            setAssignError(null);
            await axios.post('/api/ricoh/assign-user', {
                rawId: rawDeviceId,
                assetId: selectedAssetId,
                userId: selectedUserId
            });
            setShowModal(false);
            fetchJobs();
        } catch (err) {
            setAssignError(err.response?.data?.error || err.message);
        } finally {
            setAssigning(false);
        }
    };

    // Double print detection
    const duplicateCounts = useMemo(() => {
        const counts = {};
        jobs.forEach(j => {
            if (!j.document_name || j.document_name === 'Photocopy Job') return;
            const dateStr = (j.timestamp || j.created_at || '').substring(0, 10);
            const key = `${j.user_name}|${j.document_name}|${dateStr}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [jobs]);

    const isDouble = (j) => {
        if (!j.document_name || j.document_name === 'Photocopy Job') return false;
        const dateStr = (j.timestamp || j.created_at || '').substring(0, 10);
        const key = `${j.user_name}|${j.document_name}|${dateStr}`;
        return (duplicateCounts[key] || 0) > 1;
    };

    // Filtered Jobs
    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            // Text search
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchDoc = (job.document_name || '').toLowerCase().includes(q);
                const matchUser = (job.user_name || '').toLowerCase().includes(q);
                const matchEmp = (job.employee_name || job.inventory_contact || '').toLowerCase().includes(q);
                const matchPC = (job.asset_computer_name || '').toLowerCase().includes(q);
                if (!matchDoc && !matchUser && !matchEmp && !matchPC) return false;
            }

            // Filter Preset
            if (filterType === 'double') {
                return isDouble(job);
            }
            if (filterType === 'copy') {
                return (job.document_name || '').toLowerCase().includes('copy');
            }
            if (filterType === 'print') {
                return !(job.document_name || '').toLowerCase().includes('copy');
            }

            return true;
        });
    }, [jobs, searchQuery, filterType, duplicateCounts]);

    // KPI Summary
    const metrics = useMemo(() => {
        let totalPages = 0;
        let doubleCount = 0;
        let unassignedCount = 0;

        jobs.forEach(j => {
            totalPages += Number(j.pages || 0);
            if (isDouble(j)) doubleCount++;
            if (!j.employee_name && !j.inventory_contact) unassignedCount++;
        });

        return {
            totalJobs: jobs.length,
            totalPages,
            doubleCount,
            unassignedCount
        };
    }, [jobs, duplicateCounts]);

    // Pagination
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    const indexOfLastJob = currentPage * itemsPerPage;
    const indexOfFirstJob = indexOfLastJob - itemsPerPage;
    const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);

    return (
        <div className="space-y-6">
            
            {/* Top KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Print Logs</span>
                        <FileText size={16} className="text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{metrics.totalJobs.toLocaleString()}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Recorded audit jobs</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">Total Page Output</span>
                        <Printer size={16} className="text-indigo-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{metrics.totalPages.toLocaleString()}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Sheets consumed</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">Possible Duplicates</span>
                        <AlertTriangle size={16} className="text-rose-500" />
                    </div>
                    <h3 className="text-2xl font-black text-rose-600">{metrics.doubleCount.toLocaleString()}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Same file printed same day</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-purple-600">Unassigned Devices</span>
                        <UserPlus size={16} className="text-purple-500" />
                    </div>
                    <h3 className="text-2xl font-black text-purple-600">{metrics.unassignedCount.toLocaleString()}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Awaiting employee link</p>
                </div>
            </div>

            {/* Filter and Control Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                
                {/* Search & Type Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search document, user, PC..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            All ({jobs.length})
                        </button>
                        <button
                            onClick={() => setFilterType('double')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                filterType === 'double' ? 'bg-rose-50 text-rose-700 shadow-xs border border-rose-200' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Duplicates
                        </button>
                        <button
                            onClick={() => setFilterType('print')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                filterType === 'print' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Prints
                        </button>
                        <button
                            onClick={() => setFilterType('copy')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                filterType === 'copy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Copies
                        </button>
                    </div>
                </div>

                {/* Date Picker & Refresh */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input 
                            type="date" 
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 shadow-xs"
                        />
                    </div>
                    {dateFilter && (
                        <button
                            onClick={() => setDateFilter('')}
                            className="px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl"
                        >
                            Clear Date
                        </button>
                    )}
                    <button 
                        onClick={fetchJobs} 
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>

            </div>

            {/* Main Table */}
            {loading && jobs.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-72 text-slate-400 gap-3">
                    <Loader2 size={36} className="animate-spin text-blue-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Loading Print Logs...</span>
                </div>
            ) : error ? (
                <div className="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-200 text-xs font-bold">
                    Error loading print jobs: {error}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="px-5 py-3.5">ID</th>
                                    <th className="px-5 py-3.5">Computer / Login</th>
                                    <th className="px-5 py-3.5">Employee Assignment</th>
                                    <th className="px-5 py-3.5 min-w-[240px]">Document Name</th>
                                    <th className="px-5 py-3.5 text-center">Output</th>
                                    <th className="px-5 py-3.5">Timestamp</th>
                                    <th className="px-5 py-3.5">Printer Machine</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentJobs.map((job) => {
                                    const double = isDouble(job);
                                    const isCopy = (job.document_name || '').toLowerCase().includes('copy');

                                    return (
                                        <tr 
                                            key={job.id} 
                                            className={`hover:bg-slate-50/80 transition-colors ${
                                                double ? 'bg-rose-50/30 border-l-4 border-l-rose-500' : ''
                                            }`}
                                        >
                                            <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                                                #{job.job_id}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                    <Laptop size={14} className="text-slate-400" />
                                                    <span>{job.asset_computer_name || job.user_name || '-'}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                                    {job.user_name}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {job.employee_name || job.inventory_contact ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">
                                                            {job.employee_name || job.inventory_contact}
                                                        </span>
                                                        <button 
                                                            onClick={() => openAssignModal(job.user_name, job.asset_id, job.employee_id)}
                                                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                                            title="Edit Assignment"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => openAssignModal(job.user_name, job.asset_id, job.employee_id)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                                    >
                                                        <UserPlus size={11} />
                                                        <span>Link Employee</span>
                                                    </button>
                                                )}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800 line-clamp-1 max-w-[280px]" title={job.document_name}>
                                                        {job.document_name || 'System Print Job'}
                                                    </span>
                                                    {double && (
                                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-200 tracking-wider uppercase shrink-0">
                                                            Duplicate
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 text-center">
                                                <span className="font-black text-slate-900 text-sm">{job.pages}</span>
                                                <span className="text-[10px] text-slate-400 block font-semibold">pgs</span>
                                            </td>

                                            <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-semibold text-[11px]">
                                                {job.timestamp || new Date(job.created_at).toLocaleString('en-GB')}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                    <Printer size={13} className="text-slate-400" />
                                                    <span>{job.printer_name || 'Ricoh MPC'}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                                    {job.printer_ip || '192.168.2.11'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredJobs.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-bold">
                                            No print job records matched the current criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredJobs.length > 0 && (
                        <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3 text-slate-600 font-semibold">
                                <span>
                                    Showing <strong className="text-slate-900">{indexOfFirstJob + 1}</strong> to <strong className="text-slate-900">{Math.min(indexOfLastJob, filteredJobs.length)}</strong> of <strong className="text-slate-900">{filteredJobs.length}</strong>
                                </span>
                                <select 
                                    value={itemsPerPage} 
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 py-1 px-2 outline-none"
                                >
                                    <option value={25}>25 per page</option>
                                    <option value={50}>50 per page</option>
                                    <option value={100}>100 per page</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                        currentPage === 1 
                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                
                                <span className="px-3 py-1 font-bold text-slate-800">
                                    Page {currentPage} of {totalPages || 1}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                        currentPage === totalPages || totalPages === 0
                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Assign User Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 border border-slate-100"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-black text-lg text-slate-900">Assign Computer to Employee</h3>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Link PC print logs with HR personnel</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleAssignSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Raw PC Identifier</label>
                                    <input 
                                        type="text" 
                                        value={rawDeviceId} 
                                        disabled 
                                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Select Fixed Asset (Device)</label>
                                    <select 
                                        value={selectedAssetId}
                                        onChange={(e) => {
                                            const newAssetId = e.target.value;
                                            setSelectedAssetId(newAssetId);
                                            const asset = assetsList.find(a => a.id.toString() === newAssetId);
                                            if (asset && asset.user_id) {
                                                setSelectedUserId(asset.user_id);
                                            }
                                        }}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                                        required
                                    >
                                        <option value="" disabled>-- Choose Device --</option>
                                        {assetsList.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Select Employee (HR)</label>
                                    <select 
                                        value={selectedUserId}
                                        onChange={(e) => {
                                            const newUserId = e.target.value;
                                            setSelectedUserId(newUserId);
                                            if (!selectedAssetId) {
                                                const asset = assetsList.find(a => a.user_id && a.user_id.toString() === newUserId);
                                                if (asset) setSelectedAssetId(asset.id);
                                            }
                                        }}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                                        required
                                    >
                                        <option value="" disabled>-- Choose Employee --</option>
                                        {usersList.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.department || 'N/A'})</option>
                                        ))}
                                    </select>
                                </div>

                                {assignError && (
                                    <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
                                        {assignError}
                                    </div>
                                )}

                                <div className="pt-3 flex justify-end gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={assigning}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {assigning && <Loader2 size={14} className="animate-spin" />}
                                        Save Link
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

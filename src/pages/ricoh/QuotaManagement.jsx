import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Edit2, Trash2, Shield, Plus, X, Laptop, RefreshCw, 
  Download, ArrowUpDown, Building2, BarChart2, Search, 
  CheckCircle2, AlertTriangle, Copy, Check, Hash, ArrowUpRight,
  Filter, Layers, Printer, Sparkles, FileText
} from 'lucide-react';
import MonthlyAnalytics from './MonthlyAnalytics';

// Compact & Modern Progress Bar
const QuotaProgressBar = ({ current = 0, max = 1, label = 'Prints' }) => {
  const percentage = Math.min((Number(current) / Math.max(Number(max), 1)) * 100, 100) || 0;
  const isDanger = percentage >= 85;
  const isWarning = percentage >= 60 && percentage < 85;

  let barGradient = 'from-slate-600 to-slate-800';
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  
  if (isDanger) {
    barGradient = 'from-rose-500 to-red-600';
    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (isWarning) {
    barGradient = 'from-amber-500 to-amber-600';
    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (label.toLowerCase().includes('color')) {
    barGradient = 'from-indigo-500 to-violet-600';
    badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (label.toLowerCase().includes('copy') || label.toLowerCase().includes('photo') || label.toLowerCase().includes('kopi')) {
    barGradient = 'from-emerald-500 to-teal-600';
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{label}</span>
          <span className="font-bold text-slate-800">
            {Number(current).toLocaleString()}
            <span className="text-slate-400 font-normal"> / {Number(max).toLocaleString()}</span>
          </span>
        </div>
        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${badgeStyle}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden p-[1px] border border-slate-200/60">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
        />
      </div>
    </div>
  );
};

export default function QuotaManagement() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('quotaActiveTab') || 'departments';
  });

  const [filterPreset, setFilterPreset] = useState('all'); // 'all' | 'warning' | 'locked' | 'with_pin'
  const [copiedPin, setCopiedPin] = useState(null);

  useEffect(() => {
    localStorage.setItem('quotaActiveTab', activeTab);
  }, [activeTab]);

  // Ensure Ricoh report modal script is loaded
  useEffect(() => {
    if (!window.openRicohUserReport) {
      const script = document.createElement('script');
      script.src = '/assets/ricoh-report-modal.js?v=20261102';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Default sort: highest print usage on top
  const [sortField, setSortField] = useState('usage');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Registration modals
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', department: '', monthly_quota: 1000 });
  
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ name: '', monthly_quota_bw: 10000, monthly_quota_color: 5000, monthly_quota_copier: 2000 });

  const [newDevice, setNewDevice] = useState({ computer_name: '', ip_address: '', monthly_quota_bw: 1000, monthly_quota_color: 500, monthly_quota_copier: 200, user_code: '', department_id: '' });

  // Manual Quota Edit
  const [showEditQuota, setShowEditQuota] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editQuotaVal, setEditQuotaVal] = useState(1000);
  const [editQuotaBW, setEditQuotaBW] = useState(1000);
  const [editQuotaColor, setEditQuotaColor] = useState(500);
  const [editQuotaCopier, setEditQuotaCopier] = useState(200);
  const [editPIN, setEditPIN] = useState('');
  const [editDeptId, setEditDeptId] = useState('');

  // Assign Devices to Department Modal
  const [showAssignDevices, setShowAssignDevices] = useState(false);
  const [assignDeptTarget, setAssignDeptTarget] = useState(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);

  const getParentOrigin = () => {
    if (typeof window !== 'undefined' && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.protocol.startsWith('http')) {
          return refUrl.origin;
        }
      } catch (e) {
        // ignore
      }
    }
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:5000`;
  };

  const parentOrigin = getParentOrigin();

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`/api/ricoh/users`);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await axios.get(`/api/ricoh/devices/quotas`);
      setDevices(res.data);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`/api/ricoh/departments`);
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchDevices(), fetchDepartments()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyPin = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedPin(code);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'locked' ? 'active' : 'locked';
    if (window.confirm(`${newStatus === 'active' ? 'Aktifkan kembali akses cetak' : 'Kunci / Blokir akses cetak'} untuk ${user.name}?`)) {
      try {
        await axios.put(`/api/ricoh/users/${user.id}/status`, { status: newStatus });
        fetchUsers();
      } catch (err) {
        alert('Gagal memperbarui status');
      }
    }
  };

  const toggleDeviceStatus = async (device) => {
    const newStatus = device.status === 'locked' ? 'active' : 'locked';
    if (window.confirm(`${newStatus === 'active' ? 'Izinkan pencetakan' : 'Blokir pencetakan'} untuk komputer ${device.computer_name}?`)) {
      try {
        await axios.put(`/api/ricoh/devices/quotas/${device.id}/status`, { status: newStatus });
        fetchDevices();
      } catch (err) {
        alert('Gagal memperbarui status');
      }
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/ricoh/users`, newUser);
      setShowAddUser(false);
      setNewUser({ name: '', department: '', monthly_quota: 1000 });
      fetchUsers();
    } catch (err) {
      alert('Gagal menambahkan user');
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/ricoh/devices/quotas`, newDevice);
      setShowAddDevice(false);
      setNewDevice({ computer_name: '', ip_address: '', monthly_quota_bw: 1000, monthly_quota_color: 500, user_code: '', department_id: '' });
      fetchDevices();
    } catch (err) {
      alert('Gagal menambahkan komputer');
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/ricoh/departments`, newDepartment);
      setShowAddDepartment(false);
      setNewDepartment({ name: '', monthly_quota_bw: 10000, monthly_quota_color: 5000, monthly_quota_copier: 2000 });
      fetchDepartments();
    } catch (err) {
      alert('Gagal menambahkan departemen');
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (window.confirm('Hapus departemen ini? Perangkat terkait akan dilepas dari departemen ini.')) {
      try {
        await axios.delete(`/api/ricoh/departments/${id}`);
        fetchDepartments();
        fetchDevices();
      } catch (err) {
        alert('Gagal menghapus departemen');
      }
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Hapus user ini beserta data kuotanya?')) {
      try {
        await axios.delete(`/api/ricoh/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert('Gagal menghapus user');
      }
    }
  };

  const handleDeleteDevice = async (id) => {
    if (window.confirm('Hapus kebijakan cetak untuk komputer ini?')) {
      try {
        await axios.delete(`/api/ricoh/devices/quotas/${id}`);
        fetchDevices();
        fetchDepartments();
      } catch (err) {
        alert('Gagal menghapus komputer');
      }
    }
  };

  const openQuotaEdit = (type, item) => {
    setEditTarget({
      type,
      id: item.id,
      name: type === 'user' ? item.name : type === 'department' ? item.name : item.computer_name,
      quota: item.monthly_quota,
      quota_bw: item.monthly_quota_bw || 1000,
      quota_color: item.monthly_quota_color || 500,
      quota_copier: item.monthly_quota_copier || 200,
      department_id: item.department_id || '',
      user_code: item.user_code || '',
      device_count: item.device_count || item.devices_count || (item.members ? item.members.length : 0)
    });
    if (type === 'user') {
      setEditQuotaVal(item.monthly_quota);
    } else {
      setEditQuotaBW(item.monthly_quota_bw || 1000);
      setEditQuotaColor(item.monthly_quota_color || 500);
      setEditQuotaCopier(item.monthly_quota_copier || 200);
      setEditPIN(item.user_code || '');
      setEditDeptId(item.department_id || '');
    }
    setShowEditQuota(true);
  };

  const handleUpdateQuota = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      if (editTarget.type === 'user') {
        await axios.put(`/api/ricoh/users/${editTarget.id}/quota`, { monthly_quota: editQuotaVal });
        fetchUsers();
      } else if (editTarget.type === 'device') {
        await axios.put(`/api/ricoh/devices/quotas/${editTarget.id}/quota`, { 
          monthly_quota_bw: editQuotaBW, 
          monthly_quota_color: editQuotaColor,
          monthly_quota_copier: editQuotaCopier,
          user_code: editPIN,
          department_id: editDeptId
        });
        fetchDevices();
        fetchDepartments();
      } else if (editTarget.type === 'department') {
        await axios.put(`/api/ricoh/departments/${editTarget.id}/quota`, { 
          monthly_quota_bw: editQuotaBW, 
          monthly_quota_color: editQuotaColor,
          monthly_quota_copier: editQuotaCopier,
          name: editTarget.name
        });
        fetchDepartments();
      }
      setShowEditQuota(false);
    } catch (err) {
      alert('Gagal memperbarui kuota');
    }
  };

  const resetAllDevicesQuotas = async () => {
    if (window.confirm('Reset pemakaian cetak (Usage = 0) untuk semua komputer? Tindakan ini memulai siklus kuota baru.')) {
      try {
        await axios.post(`/api/ricoh/devices/quotas/reset-all`);
        fetchDevices();
        alert('Semua pemakaian komputer berhasil di-reset ke 0!');
      } catch (err) {
        alert('Gagal mereset kuota');
      }
    }
  };

  const handleExportRicohExcel = () => {
    window.open(`/api/ricoh/devices/quotas/export-excel`, '_blank');
  };

  const openAssignDevices = (dept) => {
    setAssignDeptTarget(dept);
    setSelectedDeviceIds(devices.filter(d => d.department_id === dept.id).map(d => d.id));
    setShowAssignDevices(true);
  };

  const handleAssignDevices = async (e) => {
    e.preventDefault();
    if (!assignDeptTarget) return;
    try {
      await axios.put(`/api/ricoh/departments/${assignDeptTarget.id}/devices`, {
        device_ids: selectedDeviceIds
      });
      setShowAssignDevices(false);
      fetchDevices();
      fetchDepartments();
    } catch (err) {
      alert('Gagal menetapkan perangkat');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'usage' ? 'desc' : 'asc');
    }
  };

  // Executive KPI summary calculations
  const summaryMetrics = useMemo(() => {
    let totalUsageBW = 0;
    let totalQuotaBW = 0;
    let totalUsageColor = 0;
    let totalQuotaColor = 0;
    let totalPhotocopy = 0;
    let totalQuotaPhotocopy = 0;
    let lockedCount = 0;
    let warningCount = 0;

    devices.forEach(d => {
      totalUsageBW += Number(d.current_usage_bw || 0);
      totalQuotaBW += Number(d.monthly_quota_bw || 0);
      totalUsageColor += Number(d.current_usage_color || 0);
      totalQuotaColor += Number(d.monthly_quota_color || 0);
      totalPhotocopy += Number(d.current_usage_copier_bw || 0) + Number(d.current_usage_copier_color || 0);
      totalQuotaPhotocopy += Number(d.monthly_quota_copier || 0);
      if (d.status === 'locked') lockedCount++;

      const bwRatio = (d.current_usage_bw || 0) / Math.max(d.monthly_quota_bw || 1, 1);
      const colorRatio = (d.current_usage_color || 0) / Math.max(d.monthly_quota_color || 1, 1);
      if (bwRatio >= 0.5 || colorRatio >= 0.5) warningCount++;
    });

    return {
      totalUsageBW,
      totalQuotaBW,
      bwPercent: totalQuotaBW > 0 ? (totalUsageBW / totalQuotaBW) * 100 : 0,
      totalUsageColor,
      totalQuotaColor,
      colorPercent: totalQuotaColor > 0 ? (totalUsageColor / totalQuotaColor) * 100 : 0,
      totalPhotocopy,
      totalQuotaPhotocopy,
      photocopyPercent: totalQuotaPhotocopy > 0 ? (totalPhotocopy / totalQuotaPhotocopy) * 100 : 0,
      lockedCount,
      warningCount,
      activeCount: devices.length - lockedCount
    };
  }, [devices]);

  // Filtered & Sorted Lists
  const filteredDepartments = useMemo(() => {
    let list = departments;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => (d.name || '').toLowerCase().includes(q));
    }
    if (filterPreset === 'warning') {
      list = list.filter(d => {
        const bwRatio = (d.current_usage_bw || 0) / Math.max(d.monthly_quota_bw || 1, 1);
        const colRatio = (d.current_usage_color || 0) / Math.max(d.monthly_quota_color || 1, 1);
        const copyRatio = (d.current_usage_copier || 0) / Math.max(d.monthly_quota_copier || 1, 1);
        return bwRatio >= 0.5 || colRatio >= 0.5 || copyRatio >= 0.5;
      });
    }

    return [...list].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = (a.name || '').localeCompare(b.name || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'usage') {
        const valA = Number(a.current_usage_bw || 0) + Number(a.current_usage_color || 0) + Number(a.current_usage_copier || 0);
        const valB = Number(b.current_usage_bw || 0) + Number(b.current_usage_color || 0) + Number(b.current_usage_copier || 0);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [departments, searchQuery, filterPreset, sortField, sortDirection]);

  const filteredDevices = useMemo(() => {
    let list = devices;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => 
        (d.computer_name || '').toLowerCase().includes(q) ||
        (d.ip_address || '').toLowerCase().includes(q) ||
        (d.department_name || '').toLowerCase().includes(q) ||
        (d.inventory_user_name || '').toLowerCase().includes(q) ||
        (String(d.user_code || '')).includes(q)
      );
    }
    if (filterPreset === 'warning') {
      list = list.filter(d => {
        const bwRatio = (d.current_usage_bw || 0) / Math.max(d.monthly_quota_bw || 1, 1);
        const colRatio = (d.current_usage_color || 0) / Math.max(d.monthly_quota_color || 1, 1);
        return bwRatio >= 0.5 || colRatio >= 0.5;
      });
    } else if (filterPreset === 'locked') {
      list = list.filter(d => d.status === 'locked');
    } else if (filterPreset === 'with_pin') {
      list = list.filter(d => Boolean(d.user_code));
    }

    return [...list].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = (a.computer_name || '').localeCompare(b.computer_name || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'usage') {
        const valA = Number(a.current_usage_bw || 0) + Number(a.current_usage_color || 0) + (Number(a.current_usage_copier_bw) || 0) + (Number(a.current_usage_copier_color) || 0);
        const valB = Number(b.current_usage_bw || 0) + Number(b.current_usage_color || 0) + (Number(b.current_usage_copier_bw) || 0) + (Number(b.current_usage_copier_color) || 0);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [devices, searchQuery, filterPreset, sortField, sortDirection]);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u => 
        (u.name || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (String(u.id || '')).includes(q)
      );
    }
    if (filterPreset === 'locked') {
      list = list.filter(u => u.status === 'locked');
    }

    return [...list].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = (a.name || '').localeCompare(b.name || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'usage') {
        return sortDirection === 'asc' ? (a.current_usage || 0) - (b.current_usage || 0) : (b.current_usage || 0) - (a.current_usage || 0);
      }
      return 0;
    });
  }, [users, searchQuery, filterPreset, sortField, sortDirection]);

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Slim Executive Metric Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="flex items-center gap-3 pr-2">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <Printer size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total B/W Prints</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-slate-900">{summaryMetrics.totalUsageBW.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-semibold">/ {summaryMetrics.totalQuotaBW.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1 rounded">
                {summaryMetrics.bwPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 md:pt-0 md:px-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Total Color Prints</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-slate-900">{summaryMetrics.totalUsageColor.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-semibold">/ {summaryMetrics.totalQuotaColor.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                {summaryMetrics.colorPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 md:pt-0 md:px-4">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider block">Fotokopi (Kaca)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-slate-900">{summaryMetrics.totalPhotocopy.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-semibold">/ {summaryMetrics.totalQuotaPhotocopy.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-1 rounded">
                {summaryMetrics.photocopyPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 md:pt-0 md:pl-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Shield size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Status Armada</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-emerald-600">{summaryMetrics.activeCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold">/ {devices.length} PC Aktif</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                0 Melebihi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation & Control Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              activeTab === 'departments'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={15} />
            <span>Departemen ({departments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              activeTab === 'devices'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop size={15} />
            <span>Komputer PC ({devices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus size={15} />
            <span>Personel ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
              activeTab === 'monthly'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 size={15} />
            <span>Laporan Bulanan</span>
          </button>
        </div>

        {/* Filter Pills, Search, and Action Buttons */}
        {activeTab !== 'monthly' && (
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Search Input */}
            <div className="relative min-w-[210px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder={`Cari ${activeTab === 'departments' ? 'departemen' : activeTab === 'devices' ? 'PC/IP/PIN/user' : 'karyawan'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 shadow-inner"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterPreset('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterPreset === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterPreset('warning')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterPreset === 'warning' ? 'bg-amber-50 text-amber-700 shadow-xs border border-amber-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pakai &gt;50%
              </button>
              {activeTab === 'devices' && (
                <button
                  onClick={() => setFilterPreset('with_pin')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterPreset === 'with_pin' ? 'bg-purple-50 text-purple-700 shadow-xs border border-purple-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ada PIN
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {activeTab === 'devices' && (
                <>
                  <button
                    onClick={handleExportRicohExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                    title="Export Quotas ke Excel"
                  >
                    <Download size={13} />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={resetAllDevicesQuotas}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
                    title="Reset Pemakaian Bulanan ke 0"
                  >
                    <RefreshCw size={13} />
                    <span className="hidden sm:inline">Reset Siklus</span>
                  </button>

                  <button
                    onClick={() => setShowAddDevice(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    <Plus size={14} />
                    <span>Daftarkan PC</span>
                  </button>
                </>
              )}

              {activeTab === 'departments' && (
                <button
                  onClick={() => setShowAddDepartment(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  <Plus size={14} />
                  <span>Tambah Departemen</span>
                </button>
              )}

              {activeTab === 'users' && (
                <button
                  onClick={() => setShowAddUser(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  <Plus size={14} />
                  <span>Tambah Personel</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Main List Table Views */}
      {activeTab === 'monthly' ? (
        <MonthlyAnalytics />
      ) : activeTab === 'departments' ? (
        
        /* ------------------ DEPARTMENTS LIST TABLE ------------------ */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5 cursor-pointer hover:text-slate-900" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1.5">
                      <span>Departemen</span>
                      <ArrowUpDown size={12} className={sortField === 'name' ? 'text-blue-500' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="px-5 py-3.5 min-w-[320px] max-w-[420px]" onClick={() => handleSort('usage')}>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                      <span>Utilisasi Kuota (B/W, Warna & Photocopy)</span>
                      <ArrowUpDown size={12} className={sortField === 'usage' ? 'text-blue-500' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-center">Total Output</th>
                  <th className="px-5 py-3.5 text-right">Aksi & Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepartments.map(dept => {
                  const totalPrint = Number(dept.current_usage_bw || 0) + Number(dept.current_usage_color || 0);
                  const totalCopy = Number(dept.current_usage_copier || 0);
                  const totalUsage = totalPrint + totalCopy;

                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Dept Profile */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors shrink-0">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs tracking-tight block">
                              {dept.name}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                              {dept.device_count || dept.devices_count || 0} Perangkat PC Terhubung
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Quota Progress */}
                      <td className="px-5 py-3.5 min-w-[320px] max-w-[420px]">
                        <div className="space-y-1.5">
                          <QuotaProgressBar 
                            current={dept.current_usage_bw || 0} 
                            max={dept.monthly_quota_bw || 10000} 
                            label="B/W" 
                          />
                          <QuotaProgressBar 
                            current={dept.current_usage_color || 0} 
                            max={dept.monthly_quota_color || 5000} 
                            label="Color" 
                          />
                          <QuotaProgressBar 
                            current={totalCopy} 
                            max={dept.monthly_quota_copier || 500} 
                            label="Photocopy" 
                          />
                        </div>
                      </td>

                      {/* Total Output */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200/60 min-w-[85px]">
                          <span className="text-sm font-black text-slate-900 leading-none">
                            {totalUsage.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">lembar</span>
                          <span className="text-[9px] text-slate-500 font-semibold block mt-0.5 whitespace-nowrap">
                            <span className="text-slate-700">{totalPrint.toLocaleString()} Prt</span> • <span className="text-emerald-700 font-bold">{totalCopy.toLocaleString()} Cpy</span>
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openAssignDevices(dept)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-colors"
                            title="Atur Perangkat PC"
                          >
                            <Laptop size={14} />
                          </button>
                          <button
                            onClick={() => openQuotaEdit('department', dept)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                            title="Sesuaikan Alokasi Kuota"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(dept.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                            title="Hapus Departemen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredDepartments.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-5 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                      Tidak ada data departemen yang cocok dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'devices' ? (
        
        /* ------------------ COMPUTERS (DEVICES) LIST TABLE ------------------ */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5 cursor-pointer hover:text-slate-900" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1.5">
                      <span>Perangkat Komputer / Pengguna</span>
                      <ArrowUpDown size={12} className={sortField === 'name' ? 'text-blue-500' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="px-5 py-3.5 min-w-[300px] max-w-[380px]" onClick={() => handleSort('usage')}>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                      <span>Utilisasi Kuota (B/W, Warna & Photocopy)</span>
                      <ArrowUpDown size={12} className={sortField === 'usage' ? 'text-blue-500' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-center">Total Output</th>
                  <th className="px-5 py-3.5 text-center">Status Cetak</th>
                  <th className="px-5 py-3.5 text-right">Aksi & Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map(device => {
                  const isLocked = device.status === 'locked';
                  const totalPrint = Number(device.current_usage_bw || 0) + Number(device.current_usage_color || 0);
                  const totalCopy = (Number(device.current_usage_copier_bw) || 0) + (Number(device.current_usage_copier_color) || 0);
                  const totalUsage = totalPrint + totalCopy;

                  return (
                    <tr key={device.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Hostname & User Profile */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                            isLocked 
                              ? 'bg-rose-50 text-rose-600 border-rose-200' 
                              : 'bg-slate-50 text-slate-700 border-slate-200/80 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200'
                          }`}>
                            <Laptop size={17} />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              {device.asset_id ? (
                                <a 
                                  href={`${parentOrigin}/ict/assets/${device.asset_id}`}
                                  target="_parent"
                                  className="font-black text-slate-900 text-xs tracking-tight hover:text-blue-600 hover:underline flex items-center gap-1"
                                  title="Buka detail aset di Power Asset"
                                >
                                  <span>{device.computer_name}</span>
                                  <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                              ) : (
                                <span className="font-black text-slate-900 text-xs tracking-tight">{device.computer_name}</span>
                              )}
                              
                              {isLocked && (
                                <span className="text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.2 rounded uppercase">
                                  Blocked
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {device.inventory_user_name ? (
                                <span className="text-[11px] font-bold text-slate-700">{device.inventory_user_name}</span>
                              ) : device.inventory_contact ? (
                                <span className="text-[11px] font-semibold text-slate-500">{device.inventory_contact.split('@')[0]}</span>
                              ) : null}

                              {device.department_name && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  {device.department_name}
                                </span>
                              )}

                              {device.user_code && (
                                <button
                                  onClick={() => handleCopyPin(device.user_code)}
                                  className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                                  title="Klik untuk salin PIN"
                                >
                                  <Hash size={9} />
                                  <span>PIN: {device.user_code}</span>
                                  {copiedPin === device.user_code ? <Check size={9} className="text-emerald-600" /> : <Copy size={9} className="text-purple-400" />}
                                </button>
                              )}

                              {device.ip_address && (
                                <span className="text-[9px] font-mono text-slate-400">
                                  {device.ip_address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Quota Progress */}
                      <td className="px-5 py-3.5 min-w-[300px] max-w-[380px]">
                        <div className="space-y-1.5">
                          <QuotaProgressBar 
                            current={device.current_usage_bw || 0} 
                            max={device.monthly_quota_bw || 1000} 
                            label="B/W" 
                          />
                          <QuotaProgressBar 
                            current={device.current_usage_color || 0} 
                            max={device.monthly_quota_color || 500} 
                            label="Color" 
                          />
                          <QuotaProgressBar 
                            current={totalCopy} 
                            max={device.monthly_quota_copier || 200} 
                            label="Photocopy" 
                          />
                        </div>
                      </td>

                      {/* Total Output */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200/60 min-w-[85px]">
                          <span className="text-sm font-black text-slate-900 leading-none">
                            {totalUsage.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">lembar</span>
                          <span className="text-[9px] text-slate-500 font-semibold block mt-0.5 whitespace-nowrap">
                            <span className="text-slate-700">{totalPrint.toLocaleString()} Prt</span> • <span className="text-emerald-700 font-bold">{totalCopy.toLocaleString()} Cpy</span>
                          </span>
                        </div>
                      </td>

                      {/* Status Switch */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => toggleDeviceStatus(device)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                            isLocked
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title="Klik untuk ubah status Block/Allow"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <span>{isLocked ? 'Blocked' : 'Active'}</span>
                        </button>
                      </td>

                      {/* Controls */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window.openRicohUserReport === 'function') {
                                window.openRicohUserReport(device.computer_name, device.inventory_user_name);
                              } else {
                                const s = document.createElement('script');
                                s.src = '/assets/ricoh-report-modal.js?v=' + Date.now();
                                s.onload = () => window.openRicohUserReport && window.openRicohUserReport(device.computer_name, device.inventory_user_name);
                                document.body.appendChild(s);
                              }
                            }}
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200 transition-all font-bold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer mr-0.5"
                            title="Lihat Laporan & Riwayat Dokumen Cetak"
                          >
                            <FileText size={13} />
                            <span className="hidden xl:inline">Laporan</span>
                          </button>
                          <button
                            onClick={() => openQuotaEdit('device', device)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                            title="Ubah Kuota & PIN"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => toggleDeviceStatus(device)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                            title={isLocked ? 'Buka Kunci' : 'Kunci Komputer'}
                          >
                            <Shield size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(device.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                            title="Hapus Kebijakan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredDevices.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                      Tidak ada data komputer yang cocok dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        /* ------------------ USERS LIST TABLE ------------------ */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5 cursor-pointer hover:text-slate-900" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1.5">
                      <span>Nama Karyawan</span>
                      <ArrowUpDown size={12} className={sortField === 'name' ? 'text-blue-500' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Departemen & Kode ID</th>
                  <th className="px-5 py-3.5 min-w-[280px]">Utilisasi Kuota</th>
                  <th className="px-5 py-3.5 text-center">Status Akun</th>
                  <th className="px-5 py-3.5 text-right">Aksi & Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{user.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{user.department}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500">ID: {user.id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <QuotaProgressBar current={user.current_usage || 0} max={user.monthly_quota || 1000} label="Prints" />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          user.status === 'locked' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {user.status === 'locked' ? 'Locked' : 'Active'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => window.openRicohUserReport && window.openRicohUserReport(null, user.name)}
                          className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200 transition-all font-bold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer mr-0.5"
                          title="Lihat Laporan Aktivitas Cetak Personel"
                        >
                          <FileText size={13} />
                          <span className="hidden xl:inline">Laporan</span>
                        </button>
                        <button
                          onClick={() => openQuotaEdit('user', user)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                      Tidak ada personel yang terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------ MODALS ------------------ */}
      <AnimatePresence>
        
        {/* Add Department Modal */}
        {showAddDepartment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Buat Departemen Baru</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Tentukan batas kuota cetak bulanan</p>
                </div>
                <button onClick={() => setShowAddDepartment(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddDepartment} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Nama Departemen</label>
                  <input
                    type="text"
                    required
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    placeholder="Contoh: Produksi, PPIC, QC"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">B/W (Lbr)</label>
                    <input
                      type="number"
                      required
                      value={newDepartment.monthly_quota_bw}
                      onChange={(e) => setNewDepartment({ ...newDepartment, monthly_quota_bw: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Warna (Lbr)</label>
                    <input
                      type="number"
                      required
                      value={newDepartment.monthly_quota_color}
                      onChange={(e) => setNewDepartment({ ...newDepartment, monthly_quota_color: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">Photocopy (Lbr)</label>
                    <input
                      type="number"
                      required
                      value={newDepartment.monthly_quota_copier}
                      onChange={(e) => setNewDepartment({ ...newDepartment, monthly_quota_copier: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDepartment(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    Simpan Departemen
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Device (Computer) Modal */}
        {showAddDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Daftarkan Kebijakan Komputer</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Terapkan kuota ke hostname atau IP komputer</p>
                </div>
                <button onClick={() => setShowAddDevice(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddDevice} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Hostname Komputer</label>
                  <input
                    type="text"
                    required
                    value={newDevice.computer_name}
                    onChange={(e) => setNewDevice({ ...newDevice, computer_name: e.target.value })}
                    placeholder="Contoh: PPIC-KHALDA, QC-8"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Alamat IP (Opsional)</label>
                    <input
                      type="text"
                      value={newDevice.ip_address}
                      onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
                      placeholder="192.168.1.xxx"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Kode PIN (Opsional)</label>
                    <input
                      type="text"
                      value={newDevice.user_code}
                      onChange={(e) => setNewDevice({ ...newDevice, user_code: e.target.value })}
                      placeholder="Contoh: 1001"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Tetapkan ke Departemen</label>
                  <select
                    value={newDevice.department_id}
                    onChange={(e) => setNewDevice({ ...newDevice, department_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">Tidak Ada (Standalone)</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">B/W (Lbr)</label>
                    <input
                      type="number"
                      required
                      value={newDevice.monthly_quota_bw}
                      onChange={(e) => setNewDevice({ ...newDevice, monthly_quota_bw: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Warna (Lbr)</label>
                    <input
                      type="number"
                      required
                      value={newDevice.monthly_quota_color}
                      onChange={(e) => setNewDevice({ ...newDevice, monthly_quota_color: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">Copy (Lbr)</label>
                    <input
                      type="number"
                      required
                      value={newDevice.monthly_quota_copier}
                      onChange={(e) => setNewDevice({ ...newDevice, monthly_quota_copier: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDevice(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    Daftarkan Komputer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Quota Modal */}
        {showEditQuota && editTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Ubah Alokasi Kuota</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    Target: <strong className="text-slate-800">{editTarget.name}</strong>
                  </p>
                </div>
                <button onClick={() => setShowEditQuota(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateQuota} className="space-y-4">
                {editTarget.type === 'user' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Alokasi Total Cetak (Lembar)</label>
                    <input
                      type="number"
                      required
                      value={editQuotaVal}
                      onChange={(e) => setEditQuotaVal(parseInt(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                ) : (
                  <>
                    {editTarget.type === 'department' && (
                      <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-2xl mb-1">
                        <div className="flex items-start gap-2">
                          <Sparkles size={15} className="text-blue-600 shrink-0 mt-0.5" />
                          <div className="text-[11px] text-slate-700 leading-relaxed">
                            <span className="font-bold text-blue-900 block mb-0.5">Akumulasi Otomatis Aktif</span>
                            Kuota departemen ini otomatis terakumulasi dari total <b>{editTarget.device_count || 0} Komputer PC</b> terhubung.
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">B/W (Lbr)</label>
                        <input
                          type="number"
                          required
                          value={editQuotaBW}
                          onChange={(e) => setEditQuotaBW(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Warna (Lbr)</label>
                        <input
                          type="number"
                          required
                          value={editQuotaColor}
                          onChange={(e) => setEditQuotaColor(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">Copy (Lbr)</label>
                        <input
                          type="number"
                          required
                          value={editQuotaCopier}
                          onChange={(e) => setEditQuotaCopier(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 outline-none focus:border-emerald-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    {editTarget.type === 'device' && (
                      <>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Kode PIN Pengguna</label>
                          <input
                            type="text"
                            value={editPIN}
                            onChange={(e) => setEditPIN(e.target.value)}
                            placeholder="PIN 4 digit"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Tetapkan ke Departemen</label>
                          <select
                            value={editDeptId}
                            onChange={(e) => setEditDeptId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                          >
                            <option value="">Tidak Ada (Standalone)</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditQuota(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    Simpan Alokasi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Assign Devices to Department Modal */}
        {showAssignDevices && assignDeptTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Tetapkan Komputer ke Departemen</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    Hubungkan PC ke departemen <strong className="text-slate-800">{assignDeptTarget.name}</strong>
                  </p>
                </div>
                <button onClick={() => setShowAssignDevices(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAssignDevices} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-6">
                  {devices
                    .filter(device => !device.department_id || device.department_id === assignDeptTarget.id)
                    .map(device => {
                      const isAssigned = selectedDeviceIds.includes(device.id);
                      return (
                        <label
                          key={device.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isAssigned
                              ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                              : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDeviceIds([...selectedDeviceIds, device.id]);
                              } else {
                                setSelectedDeviceIds(selectedDeviceIds.filter(id => id !== device.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs tracking-tight truncate">{device.computer_name}</span>
                              {device.user_code && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100/70 text-purple-700">
                                  PIN: {device.user_code}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {device.inventory_user_name || (device.inventory_contact ? device.inventory_contact.split('@')[0] : (device.ip_address || 'Dynamic IP'))}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignDevices(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    Simpan Penetapan ({selectedDeviceIds.length})
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

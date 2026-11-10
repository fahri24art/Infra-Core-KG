import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Building2, Search, Filter, Sparkles, Laptop, ShieldCheck } from 'lucide-react';

const QuotaProgressBar = ({ current = 0, max = 1, label = 'Prints' }) => {
  const percentage = Math.min((Number(current) / Math.max(Number(max), 1)) * 100, 100) || 0;
  const isDanger = percentage >= 85;
  const isWarning = percentage >= 60 && percentage < 85;

  let barColor = 'from-blue-500 to-indigo-600';
  let badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  
  if (isDanger) {
    barColor = 'from-rose-500 to-red-600';
    badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  } else if (isWarning) {
    barColor = 'from-amber-500 to-amber-600';
    badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (label.toLowerCase().includes('color')) {
    barColor = 'from-purple-500 to-pink-600';
    badgeStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  } else if (label.toLowerCase().includes('bw')) {
    barColor = 'from-slate-400 to-slate-200';
    badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  } else if (label.toLowerCase().includes('photo') || label.toLowerCase().includes('copy')) {
    barColor = 'from-emerald-500 to-teal-600';
    badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
            {label}
          </span>
          <span className="font-bold text-white">
            {Number(current).toLocaleString()} <span className="text-slate-400 font-normal">/ {Number(max).toLocaleString()}</span>
          </span>
        </div>
        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${badgeStyle}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="h-2 w-full bg-slate-900/80 rounded-full overflow-hidden p-[1px] border border-white/10">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${barColor} shadow-lg`} 
        />
      </div>
    </div>
  );
};

export default function PublicDepartmentQuotas() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('usage');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get('/api/ricoh/departments');
        setDepartments(res.data);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
    const interval = setInterval(fetchDepartments, 15000);
    return () => clearInterval(interval);
  }, []);

  const sortedDepartments = useMemo(() => {
    let filtered = departments;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = departments.filter(d => (d.name || '').toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
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
  }, [departments, searchQuery, sortField, sortDirection]);

  const getCurrentPeriod = () => {
    const d = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
        <Sparkles size={18} className="animate-spin text-blue-400" />
        <span>Loading Department Quotas...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Building2 size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-wide uppercase flex items-center gap-2.5">
              <span>Department Printing Quota Status</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {departments.length} Units
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Billing Period: <span className="text-blue-400 font-bold">{getCurrentPeriod()}</span>
            </p>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search departments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-white/10 rounded-xl text-xs font-bold text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2">
            <Filter size={14} className="text-slate-400" />
            <select 
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-');
                setSortField(f);
                setSortDirection(d);
              }}
              className="text-xs font-bold text-slate-200 outline-none bg-transparent cursor-pointer"
            >
              <option value="usage-desc" className="bg-slate-900 text-white">Highest Usage</option>
              <option value="usage-asc" className="bg-slate-900 text-white">Lowest Usage</option>
              <option value="name-asc" className="bg-slate-900 text-white">Name (A-Z)</option>
              <option value="name-desc" className="bg-slate-900 text-white">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modern High-Density Horizontal Department List */}
      <div className="space-y-3">
        {sortedDepartments.map(dept => {
          const totalUsage = Number(dept.current_usage_bw || 0) + Number(dept.current_usage_color || 0) + Number(dept.current_usage_copier || 0);

          return (
            <div 
              key={dept.id} 
              className="p-4 sm:p-5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-white/10 hover:border-white/20 transition-all duration-200 flex flex-col xl:flex-row items-start xl:items-center gap-4 xl:gap-8 group shadow-sm"
            >
              {/* Dept Profile */}
              <div className="w-full xl:w-72 flex items-center gap-3.5 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-blue-400 transition-colors shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wider">{dept.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                    <Laptop size={12} className="text-slate-500" />
                    {dept.device_count || dept.devices_count || 0} Connected Devices
                  </p>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="flex-1 w-full space-y-2">
                <QuotaProgressBar 
                  current={dept.current_usage_bw || 0} 
                  max={dept.monthly_quota_bw || 10000} 
                  label="B/W Print" 
                />
                <QuotaProgressBar 
                  current={dept.current_usage_color || 0} 
                  max={dept.monthly_quota_color || 5000} 
                  label="Color Print" 
                />
                <QuotaProgressBar 
                  current={dept.current_usage_copier || 0} 
                  max={dept.monthly_quota_copier || 500} 
                  label="Photocopy" 
                />
              </div>

              {/* Total Output */}
              <div className="w-full xl:w-auto xl:min-w-[130px] text-right xl:text-center pt-3 xl:pt-0 border-t border-white/10 xl:border-0 shrink-0">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-0.5">Month Total</p>
                <p className="text-base font-black text-white">
                  {totalUsage.toLocaleString()} <span className="text-xs font-normal text-slate-400">pgs</span>
                </p>
              </div>
            </div>
          );
        })}

        {sortedDepartments.length === 0 && (
          <div className="py-16 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
            No departments matched the search query.
          </div>
        )}
      </div>

    </div>
  );
}

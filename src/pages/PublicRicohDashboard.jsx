import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Printer, ArrowLeft, RefreshCw, BarChart3, Building2, Sparkles, Activity, ShieldCheck, Clock, FileText, Calendar } from 'lucide-react';
import bgImage from '../assets/space-background.jpg';
import MonthlyAnalytics from './ricoh/MonthlyAnalytics';
import PublicDepartmentQuotas from './ricoh/PublicDepartmentQuotas';
import RicohDashboard from './ricoh/Dashboard';
import RicohJobHistory from './ricoh/JobHistory';

export default function PublicRicohDashboard() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  
  const queryOrg = new URLSearchParams(window.location.search).get('org') || 'TCF-SG';

  const fetchData = async () => {
    try {
      const deviceRes = await axios.get(`/api/ricoh/devices/status`);
      setDevices(deviceRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard statistics:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white font-black tracking-widest uppercase gap-3">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
        <span className="text-xs text-slate-400">Connecting to Ricoh Network Telemetry...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative overflow-x-hidden p-4 sm:p-8 lg:p-10">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-[-10%] z-0 bg-cover bg-center bg-no-repeat opacity-20 mix-blend-screen animate-drift" style={{ backgroundImage: `url(${bgImage})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617]/85 to-[#020617] z-0"></div>
      </div>

      <div className="max-w-[1720px] mx-auto relative z-10 space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <button 
                onClick={() => navigate('/public')}
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group text-xs font-black uppercase tracking-widest"
            >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Main Portal
            </button>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                <span>{queryOrg}</span>
                <span className="text-blue-500 font-rubik italic">Print & Copy Telemetry</span>
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-500/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-blue-400/20 text-blue-300">
              <Clock size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-wider">Siklus Tagihan: Reset Tiap Tgl 21</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 shadow-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ricoh Telemetry Live</span>
                <span className="text-[9px] text-slate-400 font-mono">PostgreSQL Network Monitor</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 w-fit">
          {[
            { id: 'live', label: 'Fleet Live Analytics', icon: Activity },
            { id: 'jobs', label: 'Job List Print', icon: FileText },
            { id: 'departments', label: 'Department Quotas', icon: Building2 },
            { id: 'monthly', label: 'Monthly Reports', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Views */}
        <div className="w-full">
          {activeTab === 'live' && (
            <div className="bg-[#F8FAFC] p-4 sm:p-6 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 text-slate-800">
              <RicohDashboard />
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="bg-[#F8FAFC] p-4 sm:p-6 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 text-slate-800">
              <RicohJobHistory readOnly={true} />
            </div>
          )}

          {activeTab === 'departments' && (
            <PublicDepartmentQuotas />
          )}

          {activeTab === 'monthly' && (
            <div className="bg-[#F8FAFC] p-4 sm:p-6 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 text-slate-800">
              <MonthlyAnalytics />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

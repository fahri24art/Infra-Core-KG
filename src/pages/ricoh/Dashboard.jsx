import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Printer, AlertTriangle, CheckCircle2, TrendingUp, Droplets, Activity, Box, Shield, Copy, RefreshCw, BarChart3, Clock, X, FileText, Building2, Calendar } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

const StatCard = ({ id, title, value, icon: Icon, subtext, color, glowClass, isDark }) => (
  <motion.div 
    id={id}
    variants={itemVariants}
    className={`p-4 flex flex-col gap-5 relative overflow-hidden group rounded-3xl transition-all duration-300 ${
      isDark 
        ? 'bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/10' 
        : `premium-card shadow-sm ${glowClass}`
    }`}
  >
    <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl transition-colors ${
      isDark ? 'bg-white/5 group-hover:bg-white/10' : 'bg-slate-900/5 group-hover:bg-slate-900/10'
    }`} />
    
    <div className="flex justify-between items-center">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md`}>
        <Icon size={24} />
      </div>
      {subtext && (
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
          isDark 
            ? 'text-slate-300 bg-white/10 border border-white/10' 
            : 'text-slate-400 bg-slate-100 border border-slate-200/50'
        }`}>
          {subtext}
        </span>
      )}
    </div>
    
    <div>
      <p className={`text-xs font-black tracking-widest uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{title}</p>
      <h3 className={`text-3xl font-black mt-1.5 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</h3>
    </div>
  </motion.div>
);

const TonerLevel = ({ label, level, color, isDark }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-end">
      <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-xs font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{level || 0}%</span>
    </div>
    <div className={`h-2.5 rounded-full overflow-hidden p-[2px] border ${
      isDark ? 'bg-slate-800/80 border-white/10' : 'bg-slate-100 border-slate-200/50'
    }`}>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${level || 0}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full rounded-full toner-gradient" 
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

const Dashboard = ({ theme = 'light' }) => {
  const isDark = theme === 'dark';
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState('trend'); // 'trend' | 'top5'
  const [selectedMachineIp, setSelectedMachineIp] = useState('all');
  const [selectedComputer, setSelectedComputer] = useState(null); // computer name for detail panel

  const fetchData = async () => {
    try {
      const [deviceRes, logRes, quotaRes] = await Promise.all([
        axios.get(`/api/ricoh/devices/status`),
        axios.get(`/api/ricoh/logs`),
        axios.get(`/api/ricoh/devices/quotas`)
      ]);
      setDevices(deviceRes.data);
      setLogs(logRes.data);
      setQuotas(quotaRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard statistics:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s for real-time responsiveness
    return () => clearInterval(interval);
  }, []);

  // Helper to extract IP from log or assign fallback IP for old logs
  const getLogIp = (log) => {
    const ipMatch = log.message.match(/on ([\d\.]+)/);
    if (ipMatch) {
      const ip = ipMatch[1];
      return ip.endsWith('.') ? ip.slice(0, -1) : ip;
    }
    
    // Fallback for old logs (distribute them using log ID across available devices)
    if (devices.length > 0) {
      const index = log.id % devices.length;
      return devices[index]?.ip;
    }
    return null;
  };

  // Filter logs based on selected printer IP
  const getFilteredLogs = () => {
    if (selectedMachineIp === 'all') return logs;
    return logs.filter(log => {
      return getLogIp(log) === selectedMachineIp;
    });
  };

  // Compute prints statistics for a specific period
  const getPrintsPeriod = (daysToSubtract) => {
    let bw = 0;
    let color = 0;
    
    // For 'today', we just use the date string match for exact calendar day.
    // For others, we use the timestamp cutoff.
    const todayStr = new Date().toDateString();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToSubtract);
    cutoff.setHours(0, 0, 0, 0);

    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      
      const isIncluded = daysToSubtract === 0 
        ? logDate.toDateString() === todayStr
        : logDate >= cutoff;

      if (isIncluded) {
        const match = log.message.match(/(?:printed|copied) (\d+) (BW|COLOR) page/i);
        if (match) {
          const pages = parseInt(match[1], 10);
          const type = match[2].toUpperCase();
          const logIp = getLogIp(log);

          if (selectedMachineIp === 'all' || logIp === selectedMachineIp) {
            if (type === 'COLOR') {
              color += pages;
            } else {
              bw += pages;
            }
          }
        }
      }
    });

    return { bw, color, total: bw + color };
  };

  // Compile print history for the last 7 days dynamically based on logs
  const getChartData = (targetMachineIp = selectedMachineIp) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartMap = {};
    
    // Pre-populate last 7 days in chronological order
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      chartMap[dayName] = { name: dayName, BW: 0, Color: 0, Total: 0 };
    }

    logs.forEach(log => {
      const date = new Date(log.timestamp);
      const dayName = days[date.getDay()];
      if (chartMap[dayName]) {
        const match = log.message.match(/(?:printed|copied) (\d+) (BW|COLOR) page/i);
        if (match) {
          const pages = parseInt(match[1], 10);
          const type = match[2].toUpperCase();
          const logIp = getLogIp(log);

          if (targetMachineIp === 'all' || logIp === targetMachineIp) {
            if (type === 'COLOR') {
              chartMap[dayName].Color += pages;
            } else {
              chartMap[dayName].BW += pages;
            }
            chartMap[dayName].Total += pages;
          }
        }
      }
    });

    return Object.values(chartMap);
  };

  // Extract Top 5 Printing Computers dynamically from parsed logs for selected machine
  const getTopPrintersData = (targetMachineIp = selectedMachineIp) => {
    const printerMap = {};
    
    logs.forEach(log => {
      const match = log.message.match(/(?:PRINT|PHOTOCOPY|COPIER) by (.*?)(?: \(| printed| copied)/i);
      if (match) {
        const computerName = match[1].trim();
        
        const pageMatch = log.message.match(/(?:printed|copied) (\d+) (BW|COLOR) page/i);
        if (pageMatch) {
          const pages = parseInt(pageMatch[1], 10);
          const type = pageMatch[2].toUpperCase();
          const logIp = getLogIp(log);

          if (targetMachineIp === 'all' || logIp === targetMachineIp) {
            if (!printerMap[computerName]) {
              printerMap[computerName] = { name: computerName, BW: 0, Color: 0, Total: 0 };
            }
            if (type === 'COLOR') {
              printerMap[computerName].Color += pages;
            } else {
              printerMap[computerName].BW += pages;
            }
            printerMap[computerName].Total += pages;
          }
        }
      }
    });

    return Object.values(printerMap)
      .sort((a, b) => b.Total - a.Total)
      .slice(0, 5);
  };


  // Extract Top Departments dynamically from logs and quotas
  const getTopDepartmentsData = (targetMachineIp = selectedMachineIp) => {
    const deptMap = {};
    const computerToDept = {};
    
    quotas.forEach(q => {
      if (q.computer_name && q.department_name) {
        computerToDept[q.computer_name] = q.department_name;
      }
    });
    
    logs.forEach(log => {
      const match = log.message.match(/(?:PRINT|PHOTOCOPY|COPIER) by (.*?)(?: \(| printed| copied)/i);
      if (match) {
        // match[1] already strips out the " (User)" part because of the regex
        const computerName = match[1].trim();

        const deptName = computerToDept[computerName] || 'Unassigned';
        
        const pageMatch = log.message.match(/(?:printed|copied) (\d+) (BW|COLOR) page/i);
        if (pageMatch) {
          const pages = parseInt(pageMatch[1], 10);
          const type = pageMatch[2].toUpperCase();
          const logIp = getLogIp(log);

          if (targetMachineIp === 'all' || logIp === targetMachineIp) {
            if (!deptMap[deptName]) {
              deptMap[deptName] = { name: deptName, BW: 0, Color: 0, Total: 0 };
            }
            if (type === 'COLOR') {
              deptMap[deptName].Color += pages;
            } else {
              deptMap[deptName].BW += pages;
            }
            deptMap[deptName].Total += pages;
          }
        }
      }
    });

    return Object.values(deptMap)
      .sort((a, b) => b.Total - a.Total)
      .slice(0, 5);
  };

  const getMonthlyComparisonData = (targetMachineIp = selectedMachineIp) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    
    // Determine the last 3 months
    const targetMonths = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      targetMonths.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        name: `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      });
    }

    const chartMap = {};
    targetMonths.forEach(tm => {
      chartMap[tm.name] = { name: tm.name, BW: 0, Color: 0, Total: 0, machines: {} };
    });

    logs.forEach(log => {
      const date = new Date(log.timestamp);
      const logYear = date.getFullYear();
      const logMonth = date.getMonth();
      const monthName = `${monthNames[logMonth]} ${logYear}`;
      
      if (chartMap[monthName]) {
        const match = log.message.match(/printed (\d+) (BW|COLOR) page/);
        if (match) {
          const pages = parseInt(match[1], 10);
          const type = match[2];
          const logIp = getLogIp(log);
          const machineName = devices.find(d => d.ip === logIp)?.name || logIp || 'Unknown';

          if (targetMachineIp === 'all' || logIp === targetMachineIp) {
            if (type === 'COLOR') {
              chartMap[monthName].Color += pages;
            } else {
              chartMap[monthName].BW += pages;
            }
            chartMap[monthName].Total += pages;
            
            if (!chartMap[monthName].machines[machineName]) {
              chartMap[monthName].machines[machineName] = 0;
            }
            chartMap[monthName].machines[machineName] += pages;
          }
        }
      }
    });

    return Object.values(chartMap);
  };

  const MonthlyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`rounded-2xl p-4 shadow-xl min-w-[200px] border ${
          isDark 
            ? 'bg-slate-900/95 border-white/20 text-white shadow-black/50' 
            : 'bg-white border-slate-200'
        }`}>
          <p className={`font-black mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{label}</p>
          <div className={`space-y-1 mb-3 pb-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <p className={`text-xs font-bold flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-600'}`}><span>BW Pages:</span> <span>{data.BW}</span></p>
            <p className="text-xs font-bold text-pink-500 flex justify-between"><span>Color Pages:</span> <span>{data.Color}</span></p>
            <p className={`text-xs font-black pt-1 flex justify-between ${isDark ? 'text-white' : 'text-slate-800'}`}><span>Total:</span> <span>{data.Total}</span></p>
          </div>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Machine Breakdown</p>
          {Object.entries(data.machines || {}).length === 0 ? (
            <p className="text-[10px] italic text-slate-400">No prints recorded</p>
          ) : (
            Object.entries(data.machines).map(([m, val]) => (
              <p key={m} className={`text-[11px] font-bold flex justify-between gap-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="truncate max-w-[120px]">{m}</span>
                <span>{val}p</span>
              </p>
            ))
          )}
        </div>
      );
    }
    return null;
  };

  // Get all print jobs for a specific computer name
  const getComputerJobs = (computerName) => {
    return logs
      .filter(log => {
        const nameMatch = log.message.match(/(?:PRINT|PHOTOCOPY) by (.*?)(?: \(| printed)/);
        return nameMatch && nameMatch[1].trim() === computerName;
      })
      .map(log => {
        const jobTypeMatch = log.message.match(/^API Poller: (PRINT|PHOTOCOPY)/);
        const pageMatch = log.message.match(/printed (\d+) (BW|COLOR) page/);
        const ipMatch = log.message.match(/on ([\d\.]+)/);
        return {
          id: log.id,
          timestamp: log.timestamp,
          jobType: jobTypeMatch ? jobTypeMatch[1] : 'PRINT',
          pages: pageMatch ? parseInt(pageMatch[1], 10) : 0,
          type: pageMatch ? pageMatch[2] : 'BW',
          machine: ipMatch ? ipMatch[1].replace(/\.$/, '') : 'Unknown',
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const getLogDetails = (log) => {
    let department = null;
    const nameMatch = log.message.match(/(?:PRINT|PHOTOCOPY|COPIER) by (.*?)(?: \(| printed| copied)/i);
    if (nameMatch) {
      let computerName = nameMatch[1].trim();
      const matchingQuota = quotas.find(q => q.computer_name === computerName);
      if (matchingQuota && matchingQuota.department_name) {
        department = matchingQuota.department_name;
      }
    }

    if (log.event_type === 'QUOTA_LOCK' || log.event_type === 'QUOTA_EXCEEDED') {
      return {
        icon: Shield,
        iconClass: 'bg-red-50 text-red-600 border border-red-200',
        tag: 'Quota Lock',
        tagClass: 'bg-red-50 text-red-600 border border-red-100',
        department
      };
    }
    if (log.event_type === 'COPIER' || log.message.includes('COPIER') || log.message.includes('PHOTOCOPY') || log.message.includes('copied')) {
      return {
        icon: Copy,
        iconClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
        tag: 'Copy Job',
        tagClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        department
      };
    }
    if (log.message.includes('PRINT') || log.message.includes('printed')) {
      return {
        icon: Printer,
        iconClass: 'bg-blue-50 text-blue-600 border border-blue-200',
        tag: 'Print Job',
        tagClass: 'bg-blue-50 text-blue-600 border border-blue-100',
        department
      };
    }
    return {
      icon: Activity,
      iconClass: 'bg-slate-100 text-slate-600 border border-slate-200',
      tag: 'System',
      tagClass: 'bg-slate-100 text-slate-600 border border-slate-200/50',
      department
    };
  };

  const printsToday = getPrintsPeriod(0);
  const printsWeekly = getPrintsPeriod(7);
  const printsMonthly = getPrintsPeriod(30);
  const filteredLogs = getFilteredLogs();

  const getActiveFleetVal = () => {
    if (selectedMachineIp === 'all') {
      return `${devices.filter(d => d.status === 'online').length} / ${devices.length}`;
    }
    const target = devices.find(d => d.ip === selectedMachineIp);
    return target ? (target.status === 'online' ? 'Online' : 'Offline') : 'Offline';
  };

  const getActiveFleetColor = () => {
    const val = getActiveFleetVal();
    if (val === 'Offline') return 'from-red-500 to-red-600';
    return 'from-emerald-500 to-emerald-600';
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>System Dashboard</h1>
          <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Live Print & Fleet Telemetry</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 select-none">
          {/* Machine Selector Dropdown */}
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl shadow-sm border ${
            isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Select Machine:</span>
            <select
              id="select-machine-filter"
              value={selectedMachineIp}
              onChange={(e) => setSelectedMachineIp(e.target.value)}
              className={`bg-transparent text-xs font-black focus:outline-none cursor-pointer border-none p-0 pr-1 ${
                isDark ? 'text-white [&>option]:bg-slate-900 [&>option]:text-white' : 'text-slate-800'
              }`}
            >
              <option value="all">All Monitored Machines</option>
              {devices.map(device => (
                <option key={device.id} value={device.ip}>
                  {device.name} ({device.ip})
                </option>
              ))}
            </select>
          </div>

          <button 
            id="btn-refresh-fleet"
            onClick={fetchData}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm select-none border ${
              isDark 
                ? 'bg-slate-900/80 border-white/10 text-slate-200 hover:bg-slate-800 hover:text-white' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sync Live Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-4">
        <StatCard id="stat-prints-today" title="Today" value={printsToday.total.toLocaleString()} icon={Activity} subtext="Pages" color="from-blue-500 to-indigo-600" glowClass="hover:shadow-blue-500/5" isDark={isDark} />
        <StatCard id="stat-prints-weekly" title="This Week" value={printsWeekly.total.toLocaleString()} icon={TrendingUp} subtext="Pages" color="from-purple-500 to-fuchsia-600" glowClass="hover:shadow-purple-500/5" isDark={isDark} />
        <StatCard id="stat-prints-monthly" title="This Month" value={printsMonthly.total.toLocaleString()} icon={BarChart3} subtext="Pages" color="from-violet-500 to-purple-600" glowClass="hover:shadow-violet-500/5" isDark={isDark} />
        <StatCard id="stat-color-today" title="Color Today" value={printsToday.color.toLocaleString()} icon={Droplets} subtext="Color" color="from-pink-500 to-rose-600" glowClass="hover:shadow-pink-500/5" isDark={isDark} />
        <StatCard id="stat-bw-today" title="BW Today" value={printsToday.bw.toLocaleString()} icon={Printer} subtext="B & W" color="from-slate-600 to-slate-800" glowClass="hover:shadow-slate-500/5" isDark={isDark} />
        <StatCard id="stat-active-fleet" title="Device Status" value={getActiveFleetVal()} icon={Box} subtext={selectedMachineIp === 'all' ? "Online" : "Selected"} color={getActiveFleetColor()} glowClass="hover:shadow-emerald-500/5" isDark={isDark} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(devices.length > 0 ? devices : [{id: 'fallback', name: 'All Machines', ip: 'all'}]).map(device => (
          <motion.div 
            key={device.id} 
            variants={itemVariants} 
            className={`p-4 flex flex-col gap-4 min-h-[480px] rounded-3xl ${
              isDark 
                ? 'bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl' 
                : 'premium-card'
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h4 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>Performance Metrics</h4>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{device.name} - Print Volume breakdown</p>
              </div>
              
              {/* Tab Toggles */}
              <div className={`flex p-1.5 rounded-2xl border w-fit select-none ${
                isDark ? 'bg-slate-800/80 border-white/10' : 'bg-slate-100 border-slate-200/50'
              }`}>
                <button
                  onClick={() => setActiveChartTab('trend')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeChartTab === 'trend' 
                      ? (isDark ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm') 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                  }`}
                >
                  <Clock size={14} />
                  Trend
                </button>
                <button
                  onClick={() => setActiveChartTab('top5')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeChartTab === 'top5' 
                      ? (isDark ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm') 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                  }`}
                >
                  <BarChart3 size={14} />
                  Users
                </button>
                <button
                  onClick={() => setActiveChartTab('departments')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeChartTab === 'departments' 
                      ? (isDark ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm') 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                  }`}
                >
                  <Building2 size={14} />
                  Depts
                </button>
                <button
                  onClick={() => setActiveChartTab('monthly')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeChartTab === 'monthly' 
                      ? (isDark ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm') 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                  }`}
                >
                  <Calendar size={14} />
                  Monthly
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === 'trend' ? (
                  <AreaChart data={getChartData(device.ip)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`bwGradient-${device.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? "#38bdf8" : "#475569"} stopOpacity={0.25}/>
                        <stop offset="100%" stopColor={isDark ? "#38bdf8" : "#475569"} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`colorGradient-${device.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.25}/>
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"} vertical={false} />
                    <XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={isDark ? { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', color: '#f8fafc' } : { backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px' }}
                      labelStyle={isDark ? { fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' } : { fontWeight: 'black', color: '#0f172a', marginBottom: '4px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Area name="Black & White" type="monotone" dataKey="BW" stroke={isDark ? "#38bdf8" : "#475569"} strokeWidth={3} fillOpacity={1} fill={`url(#bwGradient-${device.id})`} />
                    <Area name="Color" type="monotone" dataKey="Color" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill={`url(#colorGradient-${device.id})`} />
                  </AreaChart>
                ) : activeChartTab === 'departments' ? (
                  <BarChart data={getTopDepartmentsData(device.ip)} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"} horizontal={false} />
                    <XAxis type="number" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="black" tickLine={false} axisLine={false} width={120} />
                    <Tooltip 
                      contentStyle={isDark ? { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', color: '#f8fafc' } : { backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px' }}
                      labelStyle={isDark ? { fontWeight: 'bold', color: '#f8fafc' } : { fontWeight: 'black', color: '#0f172a' }}
                      formatter={(value, name) => [value + ' pages', name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar name="BW Pages" dataKey="BW" stackId="a" fill={isDark ? "#0ea5e9" : "#0f766e"} radius={[0, 0, 0, 0]} barSize={14} />
                    <Bar name="Color Pages" dataKey="Color" stackId="a" fill="#14b8a6" radius={[0, 10, 10, 0]} barSize={14} />
                  </BarChart>
                ) : activeChartTab === 'monthly' ? (
                  <BarChart data={getMonthlyComparisonData(device.ip)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"} vertical={false} />
                    <XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={isDark ? { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', color: '#f8fafc' } : { backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px' }}
                      labelStyle={isDark ? { fontWeight: 'bold', color: '#f8fafc' } : { fontWeight: 'black', color: '#0f172a' }}
                      formatter={(value, name) => [value + ' pages', name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar name="BW Pages" dataKey="BW" fill={isDark ? "#38bdf8" : "#475569"} radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar name="Color Pages" dataKey="Color" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                ) : (
                  <BarChart data={getTopPrintersData(device.ip)} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"} horizontal={false} />
                    <XAxis type="number" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="black" tickLine={false} axisLine={false} width={120} />
                    <Tooltip 
                      contentStyle={isDark ? { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', color: '#f8fafc' } : { backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px' }}
                      labelStyle={isDark ? { fontWeight: 'bold', color: '#f8fafc' } : { fontWeight: 'black', color: '#0f172a' }}
                      formatter={(value, name) => [value + ' pages', name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar name="BW Pages" dataKey="BW" stackId="a" fill={isDark ? "#38bdf8" : "#475569"} radius={[0, 0, 0, 0]} barSize={14} onClick={(data) => setSelectedComputer(data.name)} />
                    <Bar name="Color Pages" dataKey="Color" stackId="a" fill="#ec4899" radius={[0, 10, 10, 0]} barSize={14} onClick={(data) => setSelectedComputer(data.name)} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Clickable Computer List (fallback) */}
            {activeChartTab === 'top5' && (
              <div className={`border-t pt-4 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Klik nama perangkat untuk detail print:</p>
                <div className="flex flex-wrap gap-2">
                  {getTopPrintersData(device.ip).map(item => (
                    <button
                      key={item.name}
                      onClick={() => setSelectedComputer(item.name)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isDark 
                          ? 'bg-slate-800/80 hover:bg-blue-600/20 hover:border-blue-400 border-white/10 text-slate-200 hover:text-blue-400' 
                          : 'bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border-slate-200 text-slate-700 hover:text-blue-600'
                      }`}
                    >
                      <Printer size={11} />
                      {item.name}
                      <span className={`text-[9px] font-black ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{item.Total}p</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Live Job Telemetry Row */}
      <div className="grid grid-cols-1">
        <motion.div 
          variants={itemVariants} 
          className={`p-4 flex flex-col gap-4 h-[480px] rounded-3xl ${
            isDark 
              ? 'bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl' 
              : 'premium-card'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <div>
              <h4 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>Live Job Telemetry</h4>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Real-Time Event Stream</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            <AnimatePresence initial={false}>
              {filteredLogs.map((log) => {
                const details = getLogDetails(log);
                const Icon = details.icon;
                return (
                  <motion.div 
                    key={log.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3.5 rounded-2xl flex gap-3.5 items-start transition-all border ${
                      isDark 
                        ? 'bg-slate-800/40 border-white/5 hover:border-white/15 hover:bg-slate-800/70' 
                        : 'bg-slate-50 border-slate-200/50 hover:border-slate-300/80'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${details.iconClass}`}>
                      <Icon size={18} />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2 items-center">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${details.tagClass}`}>
                            {details.tag}
                          </span>
                          {details.department && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-widest ${
                              isDark 
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
                                : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                            }`}>
                              {details.department}
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-xs font-bold leading-normal ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        {log.message.replace('API Poller:', '').replace('Auto-Lock:', '').trim()}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {filteredLogs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Printer className={`mb-2 animate-bounce-slow ${isDark ? 'text-slate-600' : 'text-slate-300'}`} size={32} />
                <p className={`text-xs font-bold italic ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>No logs detected for selected filter</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Fleet Live Diagnostics Section */}
      <div className="grid grid-cols-1 gap-4">
        <motion.div 
          variants={itemVariants} 
          className={`p-4 flex flex-col gap-4 rounded-3xl ${
            isDark 
              ? 'bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl' 
              : 'premium-card'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <div>
              <h4 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>Fleet Diagnostics</h4>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Live machine telemetry & toner levels</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div 
                key={device.id} 
                className={`p-5 rounded-2xl border transition-all group flex flex-col justify-between cursor-pointer ${
                  isDark
                    ? (selectedMachineIp === device.ip 
                        ? 'bg-slate-800/80 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40' 
                        : 'bg-slate-800/40 border-white/10 hover:border-white/20 hover:bg-slate-800/60')
                    : (selectedMachineIp === device.ip 
                        ? 'bg-slate-50 border-blue-600 shadow-md ring-1 ring-blue-500/20' 
                        : 'bg-slate-50 border-slate-200/50 hover:border-slate-300')
                }`}
                onClick={() => setSelectedMachineIp(selectedMachineIp === device.ip ? 'all' : device.ip)}
              >
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                      isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'
                    }`}>
                      <Printer size={20} className={device.status === 'online' ? (isDark ? 'text-emerald-400' : 'text-secondary') : 'text-rose-500'} />
                    </div>
                    <div>
                      <h5 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{device.name}</h5>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{device.ip}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    device.status === 'online' 
                      ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-success/10 text-success border border-success/20') 
                      : (isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-danger/10 text-danger border border-danger/20')
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${device.status === 'online' ? (isDark ? 'bg-emerald-400 animate-pulse' : 'bg-success animate-pulse') : (isDark ? 'bg-rose-400' : 'bg-danger')}`} />
                    {device.status}
                  </div>
                </div>
                
                {device.status === 'online' ? (
                  <div className={`grid grid-cols-2 gap-x-4 gap-y-3 pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-200/50'}`}>
                    <TonerLevel label="Cyan" level={device.cyan} color="#22d3ee" isDark={isDark} />
                    <TonerLevel label="Magenta" level={device.magenta} color="#f472b6" isDark={isDark} />
                    <TonerLevel label="Yellow" level={device.yellow} color="#fbbf24" isDark={isDark} />
                    <TonerLevel label="Black" level={device.black} color={isDark ? "#94a3b8" : "#0f172a"} isDark={isDark} />
                  </div>
                ) : (
                  <div className={`py-4 border-t text-center ${isDark ? 'border-white/10' : 'border-slate-200/50'}`}>
                    <p className="text-xs text-rose-400 font-bold flex items-center justify-center gap-1.5">
                      <AlertTriangle size={14} /> Machine Connection Unreachable
                    </p>
                  </div>
                )}
              </div>
            ))}
            
            {devices.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center">
                <Printer size={40} className={`mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>No active Ricoh machines registered in inventory</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Device Detail Slide-Over Panel */}
      <AnimatePresence>
        {selectedComputer && (() => {
          const jobs = getComputerJobs(selectedComputer);
          const totalBW = jobs.filter(j => j.type === 'BW').reduce((s, j) => s + j.pages, 0);
          const totalColor = jobs.filter(j => j.type === 'COLOR').reduce((s, j) => s + j.pages, 0);
          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
                onClick={() => setSelectedComputer(null)}
              />
              {/* Panel */}
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={`fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col ${
                  isDark ? 'bg-slate-900 border-l border-white/10 text-white' : 'bg-white'
                }`}
              >
                {/* Header */}
                <div className={`p-4 border-b flex items-start justify-between ${
                  isDark ? 'border-white/10 bg-slate-800/80' : 'border-slate-100 bg-gradient-to-r from-slate-50 to-white'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                      isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                    }`}>
                      <Printer size={22} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedComputer}</h3>
                      <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Print History Detail</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedComputer(null)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isDark ? 'bg-white/10 hover:bg-white/20 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}>
                    <X size={18} />
                  </button>
                </div>

                {/* Summary Stats */}
                <div className={`grid grid-cols-3 gap-3 p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  <div className={`rounded-2xl p-3.5 text-center border ${
                    isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50 border-slate-200/50'
                  }`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Total Jobs</p>
                    <p className={`text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{jobs.length}</p>
                  </div>
                  <div className={`rounded-2xl p-3.5 text-center border ${
                    isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50 border-slate-200/50'
                  }`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>BW Pages</p>
                    <p className={`text-2xl font-black mt-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{totalBW}</p>
                  </div>
                  <div className={`rounded-2xl p-3.5 text-center border ${
                    isDark ? 'bg-pink-500/10 border-pink-500/20' : 'bg-pink-50 border-pink-200/50'
                  }`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-pink-300' : 'text-pink-400'}`}>Color Pages</p>
                    <p className="text-2xl font-black text-pink-500 mt-1">{totalColor}</p>
                  </div>
                </div>

                {/* Job List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>All Print Events ({jobs.length})</p>
                  {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <FileText size={32} className={`mb-3 ${isDark ? 'text-slate-700' : 'text-slate-200'}`} />
                      <p className={`text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No print history found</p>
                    </div>
                  ) : jobs.map((job) => (
                    <div key={job.id} className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-colors ${
                      isDark ? 'bg-slate-800/50 border-white/5 hover:border-white/15' : 'bg-slate-50 border-slate-200/50 hover:border-slate-300'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        job.jobType === 'PHOTOCOPY'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : job.type === 'COLOR'
                            ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                            : (isDark ? 'bg-slate-800 text-slate-300 border border-white/10' : 'bg-slate-100 text-slate-500 border border-slate-200/50')
                      }`}>
                        {job.jobType === 'PHOTOCOPY' ? <Copy size={18} /> : <Printer size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
                            job.jobType === 'PHOTOCOPY' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' :
                            job.type === 'COLOR' ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30' :
                            (isDark ? 'bg-slate-800 text-slate-300 border border-white/10' : 'bg-slate-100 text-slate-600 border border-slate-200/50')
                          }`}>{job.jobType === 'PHOTOCOPY' ? 'Photocopy' : job.type === 'COLOR' ? 'Color Print' : 'BW Print'}</span>
                          <span className={`text-[10px] font-black ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{job.pages} pages</span>
                        </div>
                        <p className={`text-[10px] font-bold mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Printer: {job.machine}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[10px] font-black ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          {new Date(job.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className={`text-[10px] font-bold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                          {new Date(job.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;

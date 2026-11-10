import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, Shield, Server, Printer, Users, Cpu, 
  Download, Info, RefreshCw, Database, AlertCircle, CheckCircle2, 
  Terminal, Copy, Check, ExternalLink, HardDrive
} from 'lucide-react';

const Settings = ({ setActiveTab }) => {
  const [copiedScript, setCopiedScript] = useState(false);

  const systemStats = [
    { label: 'API Gateway', status: 'Online (Port 5000)', icon: Server, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { label: 'Database', status: 'PostgreSQL 127.0.0.1', icon: Database, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { label: 'Hardware Poller', status: 'Active (Port 9100)', icon: RefreshCw, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Fleet Lockdown', status: 'Policy Enforced', icon: Shield, color: 'text-purple-600', bgColor: 'bg-purple-50' }
  ];

  const managementModules = [
    { 
      id: 'devices', 
      title: 'Machine Management', 
      desc: 'Configure printer hardware IPs, model profiles, and network SNMP telemetry.',
      icon: Printer,
      color: 'bg-blue-600'
    },
    { 
      id: 'quotas', 
      title: 'Quota Policies', 
      desc: 'Enforce computer limits, department quotas, and user PIN access codes.',
      icon: Users,
      color: 'bg-purple-600'
    }
  ];

  const handleCopyScript = () => {
    const script = `# Install Ricoh Driver via PowerShell\nAdd-Printer -Name "Ricoh MP C2004" -PortName "192.168.2.11" -DriverName "RICOH MP C2004 PCL 6"`;
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* System Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color} shrink-0`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{stat.status}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Management Modules & Client Guide */}
        <div className="lg:col-span-2 space-y-6">
          
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Cpu size={16} className="text-blue-500" />
              Core Navigation Modules
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {managementModules.map((module) => (
                <div 
                  key={module.id}
                  onClick={() => setActiveTab(module.id)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 group cursor-pointer hover:border-blue-200 hover:shadow-md transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-2xl ${module.color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-105 transition-transform`}>
                    <module.icon size={24} />
                  </div>
                  <h5 className="text-base font-black text-slate-900 mb-1">{module.title}</h5>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">{module.desc}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Open Module</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Client Setup Guide */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Download size={20} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Client PC Deployment Instructions</h4>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">How user workstations print through Ricoh accounting</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">1</div>
                <div>
                  <h6 className="font-bold text-xs text-slate-900 mb-0.5">Standard Ricoh PCL6/RPCS Driver</h6>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Users print directly using standard Windows Ricoh printer drivers pointing to the machine IP (e.g., <strong>192.168.2.11</strong>).
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">2</div>
                <div>
                  <h6 className="font-bold text-xs text-slate-900 mb-0.5">Configure User Code Authentication</h6>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    In Printing Preferences → Detailed Settings → Job Setup, set the <strong>User Code</strong> to match the PIN assigned in our Quota Management tab.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">3</div>
                <div>
                  <h6 className="font-bold text-xs text-slate-900 mb-0.5">Real-Time Quota Telemetry</h6>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    The Express server intercepts and verifies every print job. If a device exceeds quota or is locked, subsequent prints are rejected.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyScript}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
              >
                {copiedScript ? <Check size={14} className="text-emerald-600" /> : <Terminal size={14} />}
                <span>{copiedScript ? 'Script Copied!' : 'Copy Setup Script (PowerShell)'}</span>
              </button>

              <a
                href="/api/ricoh/public/download-agent"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download size={14} />
                <span>Download Print Agent (.exe)</span>
              </a>
            </div>
          </div>

        </div>

        {/* Right Sidebar: System Intelligence */}
        <div className="space-y-6">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            System Intelligence
          </h4>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Architecture</span>
              <p className="text-xs font-bold text-slate-800">Antigravity 2.0 • PostgreSQL Pure</p>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Server Host</span>
              <p className="text-xs font-mono font-bold text-slate-800">192.168.1.66 (Linux)</p>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Database Store</span>
              <p className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1.5">
                <Database size={13} />
                network_monitor_db (Active)
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">SQLite Legacy Status</span>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                Decommissioned & Purged
              </p>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-200/60 rounded-2xl p-5">
            <h5 className="font-bold text-blue-900 text-xs flex items-center gap-2 uppercase tracking-wider mb-2">
              <HardDrive size={14} className="text-blue-600" />
              Backup & Safety Policy
            </h5>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Quota tables are backed up prior to resets. Counters are separated into B/W Prints, Color Prints, and Copier Jobs to prevent scraper counter inflation.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Settings;

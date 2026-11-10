import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Globe, Monitor, ExternalLink, Printer, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', ip: '', model: '' });
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      const res = await axios.get(`/api/ricoh/devices`);
      setDevices(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/ricoh/devices`, newDevice);
      setShowAddModal(false);
      setNewDevice({ name: '', ip: '', model: '' });
      fetchDevices();
    } catch (err) {
      alert('Failed to register printer device');
    }
  };

  const handleDeleteDevice = async (id) => {
    if (window.confirm('Are you sure you want to delete this printer from monitored fleet?')) {
      try {
        await axios.delete(`/api/ricoh/devices/${id}`);
        fetchDevices();
      } catch (err) {
        alert('Failed to delete device');
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Printer Fleet Hardware</span>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {devices.length} Units
            </span>
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Monitored Ricoh Multifunction Devices & Network Interfaces
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
        >
          <Plus size={16} />
          <span>Add Printer Device</span>
        </button>
      </div>

      {/* Grid of Printer Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((device) => (
          <motion.div 
            key={device.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-blue-200"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                    <Printer size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight">{device.name}</h4>
                    <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">{device.model || 'Ricoh Multifunction'}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleDeleteDevice(device.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remove device"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* IP & Status */}
              <div className="space-y-2 mb-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <Globe size={12} />
                    Network IP
                  </span>
                  <a 
                    href={`http://${device.ip}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1"
                    title="Open Ricoh Web Image Monitor"
                  >
                    <span>{device.ip}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={11} />
                Poller Active
              </span>

              <a
                href={`http://${device.ip}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors"
              >
                Web Console ↗
              </a>
            </div>
          </motion.div>
        ))}

        {devices.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
            No Ricoh printer devices configured. Click "Add Printer Device" above.
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Register Printer Device</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Enter network details for SNMP & log monitoring</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleAddDevice} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Device Name</label>
                  <input 
                    type="text" 
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="e.g. Ricoh MPC 2004 Office"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">IP Address</label>
                  <input 
                    type="text" 
                    value={newDevice.ip}
                    onChange={(e) => setNewDevice({ ...newDevice, ip: e.target.value })}
                    placeholder="e.g. 192.168.2.11"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Model Description</label>
                  <input 
                    type="text" 
                    value={newDevice.model}
                    onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                    placeholder="e.g. Ricoh MP C2004ex"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    Save Device
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Devices;

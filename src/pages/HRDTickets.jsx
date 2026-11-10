import React from 'react';
import { AlertCircle, Tag, Clock } from 'lucide-react';
import MonitoringAlert from './MonitoringAlert';

export default function HRDTickets() {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">HR & GA Tickets</h1>
                    <p className="text-sm font-bold text-slate-400 mt-1">Permintaan Fasilitas & Laporan Kerusakan</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                    <Tag size={16} /> Create Ticket
                </button>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-900">Helpdesk HR & GA</h3>
                <p className="text-slate-500 mt-2 max-w-md mx-auto">
                    Halaman ini akan berfungsi untuk menampung tiket request barang karyawan baru dan tiket laporan kerusakan AC, Kendaraan, dll.
                </p>
            </div>

            <div className="mt-8">
                <MonitoringAlert department="hrga" />
            </div>
        </div>
    );
}

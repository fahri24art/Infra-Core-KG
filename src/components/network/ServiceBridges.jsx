import React from 'react';
import { Card } from '../ui/Card';
import { Server, Activity, Shield } from 'lucide-react';

export default function ServiceBridges() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Card className="p-4 relative overflow-hidden group hover:shadow-md transition-all border-l-4 border-l-emerald-500">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={64} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <Server size={20} className="text-emerald-600" />
                    osTicket-GLPI Bridge
                </h3>
                <p className="text-sm text-slate-500 mb-4 z-10 relative">
                    Bidirectional relay service connecting osTicket helpdesk with GLPI asset inventory.
                    Handles ticket creation, asset linkage, and status synchronization.
                </p>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-emerald-700">SERVICE ONLINE</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">PORT: 3001</span>
                </div>
            </Card>

            <Card className="p-4 relative overflow-hidden group hover:shadow-md transition-all border-l-4 border-l-blue-500">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Shield size={64} className="text-blue-500" />
                </div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <Shield size={20} className="text-blue-600" />
                    Socket Relay Gateway
                </h3>
                <p className="text-sm text-slate-500 mb-4 z-10 relative">
                    Real-time WebSocket gateway for remote agent communication.
                    Maintains persistent connections with distributed monitoring agents.
                </p>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </span>
                        <span className="text-xs font-bold text-blue-700">LISTENING</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">PORT: 3002</span>
                </div>
            </Card>
        </div>
    );
}

import React from 'react';
import { Card } from '../ui/Card';
import { ExternalLink } from 'lucide-react';

export default function NetworkPerformance() {
    return (
        <div className="space-y-3 mt-6 h-full min-h-[600px] flex flex-col">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div>
                    <h3 className="text-sm font-bold text-blue-800">Mikrotik Dashboard Integration</h3>
                    <p className="text-xs text-blue-600">Viewing embedded dashboard from local service.</p>
                </div>
                <a
                    href="http://192.168.1.100:3003"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-blue-700 hover:underline bg-white px-3 py-2 rounded shadow-sm border border-blue-200"
                >
                    Open in New Tab <ExternalLink size={12} />
                </a>
            </div>

            <Card className="flex-1 overflow-hidden border-0 shadow-lg relative bg-slate-900">
                <iframe
                    src="http://192.168.1.100:3003"
                    className="w-full h-[800px] border-0"
                    title="Mikrotik Dashboard"
                />
            </Card>
        </div>
    );
}

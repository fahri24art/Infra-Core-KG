import React, { useState, useEffect } from 'react';
import { ArrowLeft, Key, Plus, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import http from '../../../services/http';

export default function Licenses() {
    const navigate = useNavigate();
    const [licenses, setLicenses] = useState([]);

    useEffect(() => {
        fetchLicenses();
    }, []);

    const fetchLicenses = async () => {
        try {
            const res = await http.get('/api/glpi/licenses');
            setLicenses(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Software Licenses</h1>
                        <p className="text-sm text-gray-500">Manage software keys and seat allocations</p>
                    </div>
                </div>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <Plus size={20} />
                    <span>Add License</span>
                </button>
            </div>
            
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 border-b uppercase tracking-widest">
                            <tr>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">Software Name</th>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">License Key</th>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">Seats</th>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">Vendor</th>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">Expires At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {licenses.map(lic => (
                                <tr key={lic.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-[11px]">{lic.software_name}</td>
                                    <td className="p-4 font-mono text-[11px]">{lic.license_key || '-'}</td>
                                    <td className="p-4 text-[11px]">{lic.total_seats}</td>
                                    <td className="p-4 text-[11px]">{lic.vendor || '-'}</td>
                                    <td className="p-4 text-[11px]">{lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : 'Lifetime'}</td>
                                </tr>
                            ))}
                            {licenses.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-5 text-center text-gray-500">
                                        No licenses registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

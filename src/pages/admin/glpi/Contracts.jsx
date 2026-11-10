import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Plus, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import http from '../../../services/http';

export default function Contracts() {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState([]);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        try {
            const res = await http.get('/api/glpi/contracts');
            setContracts(res.data);
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
                        <h1 className="text-2xl font-bold text-gray-800">Contracts & Vendors</h1>
                        <p className="text-sm text-gray-500">Manage warranties, ISPs, and supplier contracts</p>
                    </div>
                </div>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <Plus size={20} />
                    <span>Add Contract</span>
                </button>
            </div>
            
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 border-b uppercase tracking-widest">
                            <tr>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">Contract Name</th>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">Vendor</th>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">Start Date</th>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">End Date</th>
                                <th className="p-4 font-medium text-[10px] uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {contracts.map(contract => {
                                const isExpired = new Date(contract.end_date) < new Date();
                                return (
                                    <tr key={contract.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <FileText size={16} className="text-gray-400" />
                                                <span>{contract.contract_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-[11px]">{contract.vendor_name}</td>
                                        <td className="p-4 text-[11px]">{new Date(contract.start_date).toLocaleDateString()}</td>
                                        <td className="p-4 font-medium text-gray-900">{new Date(contract.end_date).toLocaleDateString()}</td>
                                        <td className="p-4 text-[11px]">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {isExpired ? 'Expired' : 'Active'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {contracts.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-5 text-center text-gray-500">
                                        No contracts registered yet.
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

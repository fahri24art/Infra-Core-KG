import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Plus, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import http from '../../../services/http';

export default function Consumables() {
    const navigate = useNavigate();
    const [consumables, setConsumables] = useState([]);

    useEffect(() => {
        fetchConsumables();
    }, []);

    const fetchConsumables = async () => {
        try {
            const res = await http.get('/api/glpi/consumables');
            setConsumables(res.data);
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
                        <h1 className="text-2xl font-bold text-gray-800">Stock & Consumables</h1>
                        <p className="text-sm text-gray-500">Manage spare parts, toners, and accessories</p>
                    </div>
                </div>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <Plus size={20} />
                    <span>Add Item</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {consumables.map(item => (
                    <Card key={item.id} className="p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{item.item_name}</h3>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{item.category || 'General'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1">
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-500">Current Stock</span>
                                <span className={`font-bold text-lg ${item.current_stock <= item.minimum_stock ? 'text-red-500' : 'text-green-600'}`}>
                                    {item.current_stock}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">Min. Threshold</span>
                                <span className="text-gray-400">{item.minimum_stock}</span>
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                            <button className="flex-1 flex items-center justify-center space-x-2 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium transition-colors">
                                <Plus size={16} />
                                <span>Restock</span>
                            </button>
                            <button className="flex-1 flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg text-sm font-medium transition-colors">
                                <LogOut size={16} />
                                <span>Check-Out</span>
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
            {consumables.length === 0 && (
                <Card className="p-12 text-center text-gray-500">
                    No consumables registered yet.
                </Card>
            )}
        </div>
    );
}

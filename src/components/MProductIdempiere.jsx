import React, { useState, useEffect } from 'react';
import { Search, Database, RefreshCw, FileSpreadsheet } from 'lucide-react';

export default function MProductIdempiere() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/network/idempiere/products?search=${encodeURIComponent(searchTerm)}`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error("Failed to fetch idempiere products", err);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50">
                    <div className="flex items-center gap-2">
                        <Database className="text-blue-600" size={24} />
                        <h2 className="font-bold text-slate-800">Idempiere Product Database</h2>
                    </div>
                    
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search product code, name, or ID..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                        />
                    </div>
                    
                    <button onClick={fetchData} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all active:scale-95" title="Refresh Data">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
                
                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Product ID</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Code</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Name</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Category</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">UOM</th>
                                <th className="px-3 py-1.5 text-[10px] uppercase">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-5 text-center text-slate-400 font-bold">Loading...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={6} className="p-5 text-center text-slate-400 font-bold">No products found.</td></tr>
                            ) : (
                                products.map(item => (
                                    <tr key={item.m_product_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-1.5 text-[11px] font-mono text-[11px] font-bold text-blue-600">{item.m_product_id}</td>
                                        <td className="px-3 py-1.5 text-[11px] font-mono text-[11px] text-slate-500">{item.product_code || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px] font-bold text-slate-800">{item.product_name}</td>
                                        <td className="px-3 py-1.5 text-[11px]">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">{item.product_category || '-'}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px]">{item.uom || '-'}</td>
                                        <td className="px-3 py-1.5 text-[11px] text-slate-500 truncate max-w-[250px]" title={item.description}>{item.description || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

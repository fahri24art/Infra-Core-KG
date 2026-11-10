import React from 'react';
import { HardHat, Settings, Beaker, FileText, Wrench, Battery, Archive, Shield } from 'lucide-react';

const categories = [
    { id: 1, name: 'APD & Safety', icon: HardHat, color: 'bg-yellow-100 text-yellow-600' },
    { id: 2, name: 'Sparepart Mesin', icon: Settings, color: 'bg-blue-100 text-blue-600' },
    { id: 3, name: 'Kimia & Oli', icon: Beaker, color: 'bg-purple-100 text-purple-600' },
    { id: 4, name: 'ATK Pabrik', icon: FileText, color: 'bg-red-100 text-red-600' },
    { id: 5, name: 'Hand Tools', icon: Wrench, color: 'bg-gray-100 text-gray-600' },
    { id: 6, name: 'Elektrikal', icon: Battery, color: 'bg-green-100 text-green-600' },
    { id: 7, name: 'Material Umum', icon: Archive, color: 'bg-orange-100 text-orange-600' },
    { id: 8, name: 'Kebersihan', icon: Shield, color: 'bg-indigo-100 text-indigo-600' },
];

const CategoryCircle = () => {
    return (
        <div className="bg-white py-4">
            <h3 className="px-4 font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Kategori Gudang</h3>
            <div className="flex overflow-x-auto px-4 gap-4 pb-2 scrollbar-none">
                {categories.map((cat) => (
                    <div key={cat.id} className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer group">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform shadow-sm border border-gray-100`}>
                            <cat.icon size={22} className="opacity-90" />
                        </div>
                        <span className="text-[10px] text-center font-medium text-gray-600 leading-tight block w-full px-1">{cat.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryCircle;

import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Wrench, Shield, LogIn } from 'lucide-react';
import { useUser } from '../context/UserContext';

const LandingPage = () => {
    const { isAuthenticated, user, logout } = useUser();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header / Nav */}
            <header className="bg-white shadow-sm py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/infraforce-logo.png" alt="INFRAFORCE Logo" className="h-10 w-auto" />
                        <div className="hidden md:block">
                            <h1 className="text-xl font-bold text-gray-800 leading-tight">INFRAFORCE Portal</h1>
                            <p className="text-xs text-gray-500">PT. Tri Centrum Fortuna</p>
                        </div>
                    </div>
                    <div>
                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600">Halo, {user?.name}</span>
                                <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
                            </div>
                        ) : (
                            <Link to="/login" className="flex items-center gap-2 bg-[#EE4D2D] text-white px-5 py-2 rounded-full font-medium hover:brightness-110 transition-all">
                                <LogIn size={18} /> Login
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="relative h-[400px] w-full bg-slate-900">
                <img src="/images/factory-bg.jpg" alt="Hero" className="w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-lg">
                        Operational Excellence
                    </h2>
                    <p className="text-lg text-gray-200 max-w-2xl mx-auto mb-8 drop-shadow-md">
                        Pusat kendali terintegrasi untuk Manajemen Inventaris, Pemeliharaan Mesin, dan Pelaporan Operasional INFRAFORCE, PT. Tri Centrum Fortuna.
                    </p>
                </div>
            </div>

            {/* Modules Grid */}
            <div className="flex-1 -mt-20 z-10 relative px-4 pb-20">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">

                    {/* Warehouse Module */}
                    <Link to="/warehouse" className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 group">
                        <div className="h-2 bg-[#EE4D2D]" />
                        <div className="p-5">
                            <div className="bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-[#EE4D2D] group-hover:bg-[#EE4D2D] group-hover:text-white transition-colors">
                                <ShoppingCart size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Gudang & Logistik</h3>
                            <p className="text-gray-500 mb-4">
                                Pengambilan barang consumable, sparepart, ATK, dan manajemen stok inventaris secara real-time.
                            </p>
                            <span className="text-[#EE4D2D] font-bold flex items-center gap-2">
                                Akses Modul &rarr;
                            </span>
                        </div>
                    </Link>

                    {/* Maintenance Module */}
                    <Link to="/maintenance" className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 group">
                        <div className="h-2 bg-blue-600" />
                        <div className="p-5">
                            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Wrench size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Maintenance ICT & Mesin</h3>
                            <p className="text-gray-500 mb-4">
                                Jadwal pemeliharaan, checksheet aset, perbaikan perangkat, dan pelaporan kerusakan.
                            </p>
                            <span className="text-blue-600 font-bold flex items-center gap-2">
                                Akses Modul &rarr;
                            </span>
                        </div>
                    </Link>

                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t py-8 text-center text-gray-500 text-sm">
                <p>&copy; 2026 INFRAFORCE, PT. Tri Centrum Fortuna - Integrated Management System</p>
            </footer>
        </div>
    );
};

export default LandingPage;

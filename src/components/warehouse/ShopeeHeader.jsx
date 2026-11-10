import React, { useState } from 'react';
import { Search, ShoppingCart, Bell, MessageSquare } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import { Link, useNavigate } from 'react-router-dom';

const ShopeeHeader = () => {
    const { getCartCount } = useCart();
    const { user, getAvailableQuota } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        // Implement search logic or navigation
        console.log('Searching for:', searchTerm);
    };

    return (
        <div className="sticky top-0 z-50 bg-[#EE4D2D] text-white shadow-md">
            {/* Top Bar (UserInfo & Links) - Hidden on small mobile */}
            <div className="max-w-7xl mx-auto px-4 py-1 text-xs justify-between items-center hidden sm:flex">
                <div className="flex space-x-4">
                    <span>Seller Centre</span>
                    <span>Download</span>
                    <span>Ikuti kami di</span>
                </div>
                <div className="flex space-x-4 items-center">
                    {user ? (
                        <>
                            <div className="flex items-center space-x-1">
                                <img src={user.avatar} alt="Avatar" className="w-5 h-5 rounded-full border border-white" />
                                <span className="font-semibold">{user.name}</span>
                            </div>
                            <span>|</span>
                            <span className="font-bold text-yellow-200">Limit: {getAvailableQuota()} unit</span>
                        </>
                    ) : (
                        <Link to="/login" className="font-bold text-white hover:text-gray-200">Login</Link>
                    )}
                </div>
            </div>

            {/* Main Header */}
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
                {/* Logo */}
                <Link to="/warehouse" className="flex flex-col items-center flex-shrink-0 cursor-pointer">
                    <img src="/images/logo-tcf.png" alt="TCF Logo" className="h-10 w-auto bg-white rounded p-0.5" />
                </Link>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Cari barang gudang..."
                        className="w-full py-2.5 px-4 pr-12 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-orange-600 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="absolute right-1 top-1 bottom-1 bg-[#EE4D2D] text-white px-4 rounded-md hover:brightness-110 transition-all">
                        <Search size={18} />
                    </button>
                    {/* Search Suggestions (Mock) */}
                    <div className="absolute top-12 left-0 flex space-x-3 text-xs opacity-90 truncate w-full">
                        <span className="cursor-pointer hover:underline">HVS A4</span>
                        <span className="cursor-pointer hover:underline">Mouse Wireless</span>
                        <span className="cursor-pointer hover:underline">Tinta Epson</span>
                        <span className="cursor-pointer hover:underline">Materai</span>
                    </div>
                </form>

                {/* Icons */}
                <div className="flex items-center gap-4 sm:gap-4">
                    <Link to="/warehouse/cart" className="relative group">
                        <ShoppingCart size={26} strokeWidth={1.5} />
                        {getCartCount() > 0 && (
                            <span className="absolute -top-2 -right-2 bg-white text-[#EE4D2D] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-[#EE4D2D]">
                                {getCartCount()}
                            </span>
                        )}
                        <div className="absolute hidden group-hover:block right-0 mt-2 w-64 bg-white text-black shadow-lg rounded-lg p-4 text-sm z-50">
                            <p className="text-gray-500 mb-2">Baru Ditambahkan</p>
                            {/* Quick view items mock */}
                            <div className="text-center text-xs text-orange-500 cursor-pointer">Lihat Keranjang Saya</div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ShopeeHeader;

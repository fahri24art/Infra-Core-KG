import React from 'react';
import { useCart } from '../../context/CartContext';
import { Trash2, Minus, Plus, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Cart = () => {
    const { cartItems, removeFromCart, updateQuantity, getCartCount } = useCart();
    const navigate = useNavigate();
    const totalItems = getCartCount();

    if (cartItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
                <img src="https://cdn-icons-png.flaticon.com/512/2038/2038854.png" alt="Empty Cart" className="w-32 h-32 mb-4 opacity-50" />
                <p className="mb-4">Keranjang permintaan kosong</p>
                <Link to="/warehouse" className="bg-[#EE4D2D] text-white px-6 py-2 rounded shadow-sm hover:brightness-110">
                    Ambil Barang
                </Link>
            </div>
        );
    }

    return (
        <div className="pb-24 sm:pb-8">
            {/* Header Mobile */}
            <div className="sticky top-0 bg-white z-10 p-4 border-b flex items-center gap-4 sm:hidden">
                <ArrowLeft onClick={() => navigate(-1)} className="cursor-pointer text-[#EE4D2D]" />
                <h1 className="text-lg font-bold">Keranjang Permintaan</h1>
            </div>

            <div className="hidden sm:block mb-4">
                <h2 className="text-xl font-bold text-gray-800">Keranjang Permintaan Barang</h2>
            </div>

            {/* Cart Items */}
            <div className="space-y-3">
                {cartItems.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm flex gap-4 items-start">
                        {/* Checkbox Mock */}
                        <input type="checkbox" checked readOnly className="mt-2 accent-[#EE4D2D] w-4 h-4 cursor-pointer" />

                        <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded bg-gray-50" />

                        <div className="flex-1">
                            <h3 className="text-sm font-medium line-clamp-2 mb-1">{item.name}</h3>
                            <div className={`text-xs px-1 rounded w-fit mb-2 ${item.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {item.stock < 10 ? `Sisa Stok: ${item.stock}` : 'Stok Tersedia'}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-4">
                            <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500">
                                <Trash2 size={18} />
                            </button>

                            <div className="flex items-center border border-gray-300 rounded">
                                <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="px-2 py-1 text-gray-600 hover:bg-gray-100 border-r"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="px-3 py-1 text-sm font-medium w-10 text-center">{item.quantity}</span>
                                <button
                                    onClick={() => {
                                        if (item.quantity < item.stock) updateQuantity(item.id, item.quantity + 1);
                                    }}
                                    disabled={item.quantity >= item.stock}
                                    className="px-2 py-1 text-gray-600 hover:bg-gray-100 border-l disabled:opacity-50"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Checkout Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-[0_-2px_10px_rgba(0,0,0,0.1)] sm:sticky sm:bottom-4 px-4 sm:mx-4 sm:rounded-lg z-50">
                <div className="flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="accent-[#EE4D2D] w-4 h-4" />
                    <span className="text-sm text-gray-600 hidden sm:inline">Pilih Semua ({cartItems.length})</span>
                    <span className="text-sm font-medium ml-4">Total Item:</span>
                    <span className="text-lg font-bold text-[#EE4D2D]">{totalItems} Unit</span>
                </div>
                <Link to="/warehouse/checkout" className="bg-[#EE4D2D] text-white px-8 py-2.5 rounded font-bold hover:brightness-110 shadow-sm">
                    Ajukan Permintaan
                </Link>
            </div>
        </div>
    );
};

export default Cart;

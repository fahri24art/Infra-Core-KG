import React from 'react';
import { Plus } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const ProductCard = ({ product }) => {
    const { addToCart } = useCart();

    const handleAddToCart = (e) => {
        e.preventDefault(); // Prevent navigation if wrapped in Link
        addToCart(product);
    };

    return (
        <div className="bg-white border border-gray-100 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col h-full overflow-hidden">
            {/* Image Container */}
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                />

                {/* Overlay Badges */}
                {product.isHot && (
                    <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-2 py-1 text-red-700">
                        TERLARIS
                    </div>
                )}
                {product.discount && (
                    <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-2 py-1 text-red-700">
                        {product.discount}
                    </div>
                )}

                {/* Quick Add Overlay (Desktop) */}
                <div onClick={handleAddToCart} className="absolute bottom-0 left-0 right-0 bg-[#EE4D2D]/90 py-2 text-white text-center text-sm font-semibold translate-y-full group-hover:translate-y-0 transition-transform duration-200 hidden sm:block">
                    + Keranjang
                </div>
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
                <h3 className="text-sm text-gray-800 line-clamp-2 min-h-[2.5em] leading-snug mb-2" title={product.name}>
                    {product.name}
                </h3>

                {/* Tags/Labels */}
                <div className="flex gap-1 mb-2">
                    <span className="text-[10px] border border-[#EE4D2D] text-[#EE4D2D] px-1 rounded-sm">Gudang A</span>
                    {product.freeShipping && <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded-sm">Gratis Ongkir</span>}
                </div>

                {/* Price Section */}
                {/* Info Section - Stock Based */}
                <div className="mt-auto">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500">Stok Tersedia</span>
                            <span className={`text-sm font-bold ${product.stock > 0 ? 'text-gray-800' : 'text-red-500'}`}>
                                {product.stock > 0 ? `${product.stock} Pcs` : 'Habis'}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500">Terambil</span>
                            <span className="text-xs text-gray-600">{product.consumed}x</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {product.isHot ? 'Sering Diambil' : 'Gudang Umum'}
                        </span>

                        {/* Mobile Add Button */}
                        {product.stock > 0 && (
                            <button
                                onClick={handleAddToCart}
                                className="sm:hidden bg-[#EE4D2D] text-white p-1.5 rounded-full shadow-sm active:scale-95"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;

import React, { useEffect, useState } from 'react';
import ShopeeBanner from '../../components/warehouse/ShopeeBanner';
import CategoryCircle from '../../components/warehouse/CategoryCircle';
import ProductCard from '../../components/warehouse/ProductCard';
import { glpiService } from '../../services/glpiService';

const WarehouseHome = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Fetch from GLPI service (which currently returns mocks)
                const items = await glpiService.getConsumables();
                setProducts(items);
            } catch (error) {
                console.error("Failed to load products", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    return (
        <div className="flex flex-col gap-4">
            {/* Banner Section */}
            <section className="px-4 sm:px-0">
                <ShopeeBanner />
            </section>

            {/* Categories */}
            <section>
                <CategoryCircle />
            </section>

            {/* Flash Sale / Hot Items Header */}
            <section className="bg-white p-4 sticky top-[60px] z-40 shadow-sm sm:static sm:z-0 sm:shadow-none sm:rounded-lg">
                <div className="flex items-center justify-between">
                    <h2 className="text-orange-600 font-bold text-lg uppercase tracking-wide">
                        Rekomendasi
                    </h2>
                    <span className="text-xs text-gray-500 cursor-pointer hover:text-orange-500">Lihat Semua {'>'}</span>
                </div>
            </section>

            {/* Product Grid */}
            <section className="px-2 sm:px-0">
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Memuat Produk...</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </section>

            {/* Infinite Scroll Loader Mock */}
            <div className="text-center py-8">
                <button className="bg-white border border-gray-300 text-gray-600 px-6 py-2 rounded hover:bg-gray-50 transition-colors text-sm">
                    Lihat Lainnya
                </button>
            </div>
        </div>
    );
};

export default WarehouseHome;

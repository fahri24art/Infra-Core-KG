import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import { MapPin, Box, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { glpiService } from '../../services/glpiService';

const Checkout = () => {
    const { cartItems, getCartCount, clearCart } = useCart();
    const { user, getAvailableQuota, deductQuota } = useUser();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [notes, setNotes] = useState('');

    const totalQty = getCartCount();
    const quotaBalance = getAvailableQuota();
    const canAfford = quotaBalance >= totalQty;

    const handlePlaceOrder = async () => {
        if (!canAfford) return;
        setSubmitting(true);
        try {
            // Deduct mock quota
            deductQuota(totalQty);

            // Construct Ticket Content
            const itemsList = cartItems.map(item => `- ${item.name} (${item.quantity} Unit)`).join('\n');
            const ticketContent = `
[Warehouse Retrieval Request]
Requester: ${user.name} (${user.department})
Total Items: ${totalQty} Unit
Remaining Quota: ${quotaBalance - totalQty} Unit

Requested Items:
${itemsList}

Notes:
${notes || '-'}
            `.trim();

            const title = `Warehouse Retrieval - ${user.name} - ${totalQty} Items`;

            // Send to GLPI
            await glpiService.createTicket(title, ticketContent);

            alert('Permintaan pengambilan barang berhasil diajukan!');
            clearCart();
            navigate('/warehouse');
        } catch (error) {
            console.error('Submission failed', error);
            alert('Gagal mengajukan permintaan.');
        } finally {
            setSubmitting(false);
        }
    };

    if (cartItems.length === 0) {
        navigate('/warehouse');
        return null;
    }

    return (
        <div className="pb-24 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4 border-t-4 border-t-[url('https://shopee.co.id/assets/0b36fb2621cb03cf.png')] border-t-repeat-x bg-[length:20px_4px] bg-top">
                <div className="flex items-center gap-2 text-[#EE4D2D] mb-2">
                    <MapPin size={18} />
                    <h2 className="font-bold">Lokasi Penggunaan (Departemen)</h2>
                </div>
                <div className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded">
                    <div>
                        <div className="font-bold mb-1">{user.name}</div>
                        <div className="text-gray-600 text-sm">Departemen {user.department}</div>
                    </div>
                    <ChevronRight className="text-gray-400" />
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-[#EE4D2D]" /> Rincian Barang
                </h2>
                <div className="space-y-3">
                    {cartItems.map(item => (
                        <div key={item.id} className="flex gap-4 items-center border-b pb-4 last:border-0 last:pb-0">
                            <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded bg-gray-50" />
                            <div className="flex-1">
                                <div className="text-sm font-medium">{item.name}</div>
                                <div className="text-gray-500 text-xs">Stok: {item.stock}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-sm">{item.quantity} Unit</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 border-t pt-4 flex items-center gap-2">
                    <span className="text-sm">Catatan:</span>
                    <input
                        type="text"
                        className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:border-[#EE4D2D]"
                        placeholder="Keperluan untuk..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <Box size={18} className="text-[#EE4D2D]" />
                        <span className="font-bold">Limit Pengambilan</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 p-3 rounded border border-orange-100">
                    <div className="bg-[#EE4D2D] text-white text-xs font-bold px-1 rounded">QUOTA</div>
                    <span className="text-sm font-medium">Sisa Limit: {quotaBalance} Unit</span>
                </div>
                {!canAfford && (
                    <div className="text-red-600 text-xs mt-2">
                        Limit pengambilan Anda tidak mencukupi.
                    </div>
                )}
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-end items-center gap-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-50">
                <div className="text-right">
                    <div className="text-sm text-gray-600">Total Pengambilan</div>
                    <div className="text-xl font-bold text-[#EE4D2D]">{totalQty} Barang</div>
                </div>
                <button
                    onClick={handlePlaceOrder}
                    disabled={!canAfford || submitting}
                    className={`px-8 py-3 rounded font-bold text-white min-w-[160px] 
                        ${!canAfford || submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#EE4D2D] hover:brightness-110 shadow-lg'}`}
                >
                    {submitting ? 'Memproses...' : 'Ajukan Permintaan'}
                </button>
            </div>
        </div>
    );
};

export default Checkout;

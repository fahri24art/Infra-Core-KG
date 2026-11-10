import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, Printer } from 'lucide-react';

export default function AssetLabel({ asset }) {
    const labelRef = useRef(null);

    const handleDownload = async () => {
        if (!labelRef.current) return;
        try {
            const canvas = await html2canvas(labelRef.current, {
                scale: 3, // Higher resolution
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const link = document.createElement('a');
            link.download = `LABEL-${asset.inventory_number || asset.serial_number}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        } catch (err) {
            console.error('Failed to capture label:', err);
            alert('Failed to generate image. Please try again.');
        }
    };

    return (
        <div className="flex flex-col items-center space-y-3">
            {/* Visual Label (What gets printed) */}
            <div
                ref={labelRef}
                className="w-[400px] h-[200px] bg-white border-4 border-slate-800 p-4 flex flex-row items-center justify-between shadow-lg relative"
                style={{ fontFamily: 'Arial, sans-serif' }}
            >
                {/* Left Side: Info */}
                <div className="flex-1 pr-4 space-y-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Property of</div>
                    <div className="text-lg font-black text-slate-900 leading-tight">PT. TRI CENTRUM FORTUNA</div>

                    <div className="mt-4 space-y-0.5">
                        <div className="text-sm font-bold text-slate-800 border-b border-slate-300 pb-1 mb-1">
                            {asset.name}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">ID:</span>
                            <span className="font-mono font-bold text-slate-900">{asset.inventory_number || asset.serial_number}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Type:</span>
                            <span className="font-semibold text-slate-800">{asset.type || asset.category}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Brand:</span>
                            <span className="font-semibold text-slate-800 truncate max-w-[120px]">{asset.manufacturer}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: QR Code */}
                <div className="bg-white p-2 border-2 border-slate-900 rounded">
                    <QRCodeCanvas
                        value={asset.qr_url || `${window.location.origin}/hrd/assets/${asset.id}`}
                        size={110}
                        level="M"
                        includeMargin={false}
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
                <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Download size={18} />
                    <span>Download Label (JPG)</span>
                </button>
            </div>
        </div>
    );
}

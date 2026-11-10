import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, Flame } from 'lucide-react';

export default function HydrantPrintCard() {
    const { id } = useParams();
    const [hydrant, setHydrant] = useState(null);
    const searchParams = new URLSearchParams(window.location.search);
    const isViewOnly = searchParams.get('view') === 'true';
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (isViewOnly) {
            const updateScale = () => {
                const screenWidth = window.innerWidth;
                const cardWidth = 560; // 148mm in pixels
                if (screenWidth < cardWidth) {
                    setScale((screenWidth - 20) / cardWidth);
                } else {
                    setScale(1);
                }
            };
            updateScale();
            window.addEventListener('resize', updateScale);
            return () => window.removeEventListener('resize', updateScale);
        }
    }, [isViewOnly]);

    useEffect(() => {
        fetch('/api/hr/hydrants/master')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const h = data.data.find(x => x.id === parseInt(id));
                    if (h) {
                        setHydrant(h);
                        if (!isViewOnly) {
                            setTimeout(() => window.print(), 1000);
                        }
                    }
                }
            })
            .catch(console.error);
    }, [id, isViewOnly]);

    if (!hydrant) return <div className="p-10 font-bold text-slate-500">Loading Hydrant Data...</div>;

    return (
        <div className="min-h-screen bg-slate-100 py-10 print:bg-white print:py-0 overflow-x-hidden flex flex-col items-center">
            {/* Header / Nav - Hidden when printing */}
            {!isViewOnly && (
                <div className="w-full max-w-3xl mx-auto mb-8 flex justify-between items-center print:hidden px-4">
                    <Link to="/hse/hydrant" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold bg-white px-4 py-2 rounded-xl shadow-sm">
                        <ArrowLeft size={18} /> Back to Dashboard
                    </Link>
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 shadow-md transition-all active:scale-95"
                    >
                        <Printer size={18} /> Print Card (A5)
                    </button>
                </div>
            )}

            {/* A5 Print Canvas */}
            <div className="bg-white shadow-2xl print:shadow-none relative" 
                 style={{ 
                     width: '148mm', 
                     minHeight: '210mm', 
                     padding: '10mm',
                     boxSizing: 'border-box',
                     ...(isViewOnly && { 
                         transform: `scale(${scale})`, 
                         transformOrigin: 'top center',
                         marginBottom: `-${(1 - scale) * 210}mm` 
                     })
                 }}>
                 
                {/* Border Frame */}
                <div className="w-full h-full border-4 border-red-600 p-1 flex flex-col">
                    <div className="w-full h-full border-2 border-red-600 flex flex-col p-4">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between border-b-4 border-red-600 pb-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white">
                                    <Flame size={28} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase">HYDRANT CHECK SHEET</h1>
                                    <p className="text-xs font-bold text-red-600 tracking-widest uppercase">PT. TRI CENTRUM FORTUNA</p>
                                </div>
                            </div>
                        </div>

                        {/* Top Card Info & QR */}
                        <div className="flex items-stretch justify-between border-b-2 border-red-100 pb-6 mb-6">
                            <table className="w-3/4 text-sm font-bold text-slate-700">
                                <tbody>
                                    <tr><td className="w-24 uppercase text-slate-400 text-[11px]">NO. HYDRANT</td><td className="w-4 text-[11px]">:</td><td className="text-[11px] text-slate-900">{hydrant.code}</td></tr>
                                    <tr><td className="w-24 uppercase text-slate-400 text-[11px]">LOKASI</td><td className="w-4 text-[11px]">:</td><td className="text-[11px]">{hydrant.location}</td></tr>
                                    <tr><td className="w-24 uppercase text-slate-400 text-[11px]">JENIS</td><td className="w-4 text-[11px]">:</td><td className="text-[11px]">{hydrant.type}</td></tr>
                                </tbody>
                            </table>
                            
                            <div className="w-1/4 flex items-center justify-center border-l-2 border-red-100 pl-4">
                                <QRCodeSVG value={`${window.location.origin}/public/hydrant/${hydrant.code}`} size={100} level="M" />
                            </div>
                        </div>

                        {/* Checklist Guidelines */}
                        <div className="flex-1">
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 bg-slate-100 px-3 py-2 border-l-4 border-red-600 mb-3">Checklist Standar:</h3>
                            <ul className="text-xs font-medium text-slate-600 space-y-2 pl-4 list-disc">
                                <li><strong>Kondisi Box & Pintu:</strong> Tidak penyok, engsel berfungsi, pintu mudah dibuka/tutup.</li>
                                <li><strong>Selang (Hose):</strong> Utuh, tidak sobek/bocor, tergulung rapi.</li>
                                <li><strong>Nozzle:</strong> Terpasang dengan baik, drat/ulir tidak rusak.</li>
                                <li><strong>Valve / Keran:</strong> Mudah diputar, tidak macet, tidak berkarat.</li>
                                <li><strong>Area Sekitar:</strong> Bersih, tidak terhalang barang/material.</li>
                            </ul>
                        </div>

                        {/* Footer Warning */}
                        <div className="mt-8 pt-4 border-t-2 border-red-100 text-center">
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">PERHATIAN</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">DILARANG MENGHALANGI ATAU MENYALAHGUNAKAN FASILITAS HYDRANT INI.<br/>HYDRANT HANYA DIGUNAKAN UNTUK KEADAAN DARURAT (KEBAKARAN).</p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

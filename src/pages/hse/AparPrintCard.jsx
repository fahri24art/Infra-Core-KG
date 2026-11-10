import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import logoTCF from '../../assets/Logo_TCF_Sec_Processed.png';
import logoK3 from '../../assets/LOGO-K3-TRANSPARANT.png';

export default function AparPrintCard() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const year = searchParams.get('year') || new Date().getFullYear();
    const isViewOnly = searchParams.get('view') === 'true';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (isViewOnly) {
            const updateScale = () => {
                const screenWidth = window.innerWidth;
                const cardWidth = 794; // approx 210mm in px
                // If screen is smaller than card, scale it down (minus a small margin)
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
        const fetchPrintData = async () => {
            try {
                const res = await fetch(`/api/hr/apars/${id}/print/${year}`);
                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                    if (!isViewOnly) {
                        setTimeout(() => window.print(), 1000);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPrintData();
    }, [id, year]);

    if (loading || !data) return <div className="text-center p-10 font-bold">Menyiapkan kartu cetak...</div>;

    const { apar, checksheets } = data;
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGS', 'SEPT', 'OKT', 'NOV', 'DES'];
    const points = [
        { id: 'pin_status', label: '1. PIN PENGAMAN' },
        { id: 'pin_seal_status', label: '2. SEGEL PIN' },
        { id: 'handle_status', label: '3. HANDLE' },
        { id: 'pressure_status', label: '4. PRESSURE GAUGE' },
        { id: 'hose_status', label: '5. SELANG' },
        { id: 'sticker_status', label: '6. STICKER' },
        { id: 'body_status', label: '7. TABUNG' },
    ];

    return (
        <div className="bg-wrapper min-h-screen flex flex-col items-center">
            {!isViewOnly && (
                <div className="no-print p-4 bg-slate-100 flex justify-center gap-4 border-b border-slate-300">
                    <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700">Cetak Kartu</button>
                    <button onClick={() => window.close()} className="bg-slate-500 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-slate-600">Tutup</button>
                </div>
            )}

            <div 
                className="a4-page mx-auto bg-white" 
                style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    color: '#000',
                    ...(isViewOnly && { 
                        transform: `scale(${scale})`, 
                        transformOrigin: 'top center',
                        marginBottom: `-${(1 - scale) * 297}mm` // compensate for scale height reduction
                    })
                }}
            >
                
                {/* --- A5 CARD 1: ASSET / CHECK SHEET --- */}
                <div className="a5-card justify-between">
                    <div>
                        <div className="border-2 border-black">
                            {/* Header */}
                            <table className="w-full border-collapse border-b-2 border-black">
                                <tbody>
                                    <tr>
                                        <td className="w-1/5 text-center border-r-2 border-black p-2">
                                            <img src={logoTCF} alt="TCF Logo" className="h-[50px] mx-auto object-contain" />
                                        </td>
                                        <td className="w-3/5 text-center p-2">
                                            <div className="text-xl font-black tracking-tight">PT. TRI CENTRUM FORTUNA</div>
                                            <div className="text-lg font-bold">CHECK SHEET APAR</div>
                                        </td>
                                        <td className="w-1/5 text-center border-l-2 border-black p-2">
                                            <img src={logoK3} alt="K3 Logo" className="h-[50px] mx-auto object-contain" />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Info */}
                            <div className="p-2 border-b-2 border-black text-xs flex justify-between items-center">
                                <table className="w-3/4">
                                    <tbody>
                                        <tr><td className="w-[120px] uppercase text-[11px]">Nomor</td><td className="w-[10px] text-[11px]">:</td><td className="font-bold text-[11px]">{apar.code}</td></tr>
                                        <tr><td className="w-[120px] uppercase text-[11px]">Jenis</td><td className="w-[10px] text-[11px]">:</td><td className="text-[11px]">{apar.type} ({apar.weight} Kg)</td></tr>
                                        <tr><td className="w-[120px] uppercase text-[11px]">Lokasi / Area</td><td className="w-[10px] text-[11px]">:</td><td className="text-[11px]">{apar.location}</td></tr>
                                        <tr><td className="w-[120px] uppercase text-[11px]">Kadaluarsa</td><td className="w-[10px] text-[11px]">:</td><td className="text-[11px]">{new Date(apar.expired_date).toLocaleDateString('id-ID')}</td></tr>
                                    </tbody>
                                </table>
                                <div className="w-1/4 flex items-center justify-center border-l border-slate-300 pl-2">
                                    <QRCodeSVG value={`${window.location.origin}/hse/apar?scan=${apar.code}`} size={110} level="M" />
                                </div>
                            </div>

                            {/* Matrix */}
                            <table className="w-full border-collapse text-[9px] text-center border-b-2 border-black">
                                <thead className="bg-[#f2f2f2] text-[10px] uppercase tracking-widest">
                                    <tr>
                                        <th rowSpan={2} className="border border-black p-1 bg-[#fce750] text-left w-[25%] font-bold" uppercase tracking-widest>POINT YANG DIPERIKSA</th>
                                        <th colSpan={12} className="border border-black p-1 font-bold text-[10px] uppercase tracking-widest">TAHUN {year}</th>
                                    </tr>
                                    <tr>
                                        {months.map(m => <th key={m} className="border border-black p-1 text-[8px]" uppercase tracking-widest>{m}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {points.map((pt, i) => (
                                        <tr key={pt.id}>
                                            <td className="border border-black p-1 text-left font-bold">{pt.label}</td>
                                            {months.map((_, mi) => {
                                                const mStr = (mi + 1).toString();
                                                const check = checksheets[mStr];
                                                let val = '';
                                                if (check) {
                                                    val = check[pt.id] ? 'V' : 'X';
                                                }
                                                return <td key={mi} className="border border-black p-1 font-bold" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>{val}</td>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Footer / Legends */}
                            <table className="w-full border-collapse">
                                <tbody>
                                    <tr>
                                        <td className="w-1/2 align-top border-r-2 border-black p-1.5 text-[9px]">
                                            <div className="text-center font-bold mb-1">KETERANGAN TANDA PEMERIKSAAN</div>
                                            <div className="flex justify-around font-bold mb-2">
                                                <span>BAIK : V</span>
                                                <span>TIDAK BAIK : X</span>
                                                <span>TIDAK ADA : TA</span>
                                            </div>
                                            <div className="text-center text-[8px]">
                                                NOTE :<br/>
                                                PEMERIKSAAN DILAKUKAN SETIAP BULAN<br/>
                                                DI MINGGU PERTAMA OLEH TEAM EHS
                                            </div>
                                        </td>
                                        <td className="w-1/2 align-top p-1.5 text-[11px]">
                                            <table className="w-full border-collapse border border-black text-[10px] text-center">
                                                <thead>
                                                    <tr>
                                                        <th className="border border-black font-normal py-0.5 text-[10px] uppercase tracking-widest">Disetujui</th>
                                                        <th className="border border-black font-normal py-0.5 text-[10px] uppercase tracking-widest">Diperiksa</th>
                                                        <th className="border border-black font-normal py-0.5 text-[10px] uppercase tracking-widest">Disiapkan</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-black h-[40px] text-[11px]"></td>
                                                        <td className="border border-black h-[40px] text-[11px]"></td>
                                                        <td className="border border-black h-[40px] text-[11px]"></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-1 text-[8px] flex justify-between px-2 font-medium">
                            <span>TCFSG-FM-EHS-01-03 (Rev.01 , 24 Maret 2025)</span>
                        </div>
                    </div>
                </div>

                {/* --- SEPARATOR & A5 CARD 2 (HIDDEN IN VIEW-ONLY) --- */}
                {!isViewOnly && (
                    <>
                        <div className="cut-line no-print border-t-2 border-dashed border-slate-300 relative flex-shrink-0 my-[10mm]">
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-slate-400 text-xs font-bold tracking-widest uppercase">Potong Di Sini</span>
                        </div>

                        <div className="a5-card border-[3px] border-black p-4 relative">
                    <div className="absolute inset-0 opacity-5 pointer-events-none flex justify-center items-center overflow-hidden">
                        <img src={logoTCF} alt="bg" className="w-[150%] h-[150%] object-contain" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col h-full">
                        {/* Header Auditor */}
                        <div className="flex justify-between items-center border-b-[3px] border-black pb-4 mb-6">
                            <img src={logoTCF} alt="TCF" className="h-[60px]" />
                            <div className="text-center">
                                <h2 className="text-2xl font-black tracking-tight">PT. TRI CENTRUM FORTUNA</h2>
                                <h3 className="text-lg font-bold uppercase tracking-widest mt-1">Kartu Identitas Asset (Auditor)</h3>
                            </div>
                            <img src={logoK3} alt="K3" className="h-[60px]" />
                        </div>

                        {/* Data & QR Layout */}
                        <div className="flex items-center justify-between flex-grow px-4">
                            <div className="w-1/2">
                                <table className="w-full text-base">
                                    <tbody>
                                        <tr>
                                            <td className="py-2 text-slate-500 font-bold uppercase text-[11px] tracking-widest w-[100px]">Kode APAR</td>
                                            <td className="w-4 text-[11px]">:</td>
                                            <td className="font-black text-2xl text-slate-900">{apar.code}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 text-slate-500 font-bold uppercase text-[11px] tracking-widest border-t border-dashed border-slate-300">Jenis</td>
                                            <td className="border-t border-dashed border-slate-300 text-[11px]">:</td>
                                            <td className="py-2 font-bold text-[11px] border-t border-dashed border-slate-300">{apar.type} <span className="text-sm font-medium text-slate-500">({apar.weight} Kg)</span></td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 text-slate-500 font-bold uppercase text-[11px] tracking-widest border-t border-dashed border-slate-300">Lokasi</td>
                                            <td className="border-t border-dashed border-slate-300 text-[11px]">:</td>
                                            <td className="py-2 font-bold text-[11px] border-t border-dashed border-slate-300">{apar.location}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 text-slate-500 font-bold uppercase text-[11px] tracking-widest border-t border-dashed border-slate-300">Kadaluarsa</td>
                                            <td className="border-t border-dashed border-slate-300 text-[11px]">:</td>
                                            <td className="py-2 font-black text-[11px] text-rose-600 border-t border-dashed border-slate-300">{new Date(apar.expired_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="w-1/2 flex flex-col items-center justify-center">
                                <div className="p-3 border-[4px] border-black rounded-2xl bg-white shadow-xl">
                                    <QRCodeSVG value={`${window.location.origin}/public/apar/${apar.code}`} size={160} level="H" />
                                </div>
                                <div className="mt-4 text-center bg-black text-white px-6 py-2 rounded-full">
                                    <p className="font-black tracking-widest text-lg">SCAN QR CODE</p>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-300">Untuk Akses Data & Riwayat APAR</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </>
                )}

            </div>
            <style>{`
                .bg-wrapper {
                    background-color: ${isViewOnly ? '#f8fafc' : '#ffffff'};
                    min-height: 100vh;
                    overflow-x: hidden;
                }
                .a4-page {
                    width: 210mm;
                    height: 297mm;
                    padding: 10mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: ${isViewOnly ? 'flex-start' : 'center'};
                }
                .a5-card {
                    height: calc(138.5mm - 10mm);
                    width: 100%;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0; }
                    @page { size: A4 portrait; margin: 0; }
                    .a4-page { padding: 5mm; height: 100vh; }
                    .a5-card { height: 48vh; }
                    .cut-line { my: 2vh; border-color: #000; }
                }
            `}</style>
        </div>
    );
}

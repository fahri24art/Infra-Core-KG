import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import logo from '../../assets/Logo_TCF_Sec_Processed.png';

// Komponen Background Gelombang (Solid Colors untuk Printer Ricoh)
const WaveBackground = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0, background: '#e0f6fd' }}>
        <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
            {/* Layer Gelombang Solid Colors supaya printer Ricoh tidak dither/bintik */}
            <path d="M-10,80 Q30,120 110,50 L110,150 L-10,150 Z" fill="#e6f5fb" />
            <path d="M-10,95 Q40,110 110,45 L110,150 L-10,150 Z" fill="#96def4" />
            <path d="M-10,105 Q35,115 110,65 L110,150 L-10,150 Z" fill="#f2fbfe" />
            <path d="M-10,120 Q50,130 110,75 L110,150 L-10,150 Z" fill="#58c0ea" />
            <path d="M-10,135 Q60,140 110,95 L110,150 L-10,150 Z" fill="#69d1f6" />
        </svg>
    </div>
);

export default function PrintIDCard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const user = JSON.parse(sessionStorage.getItem('user') || '{}');
                const res = await fetch('/api/hr/employees', {
                    headers: { 'x-organization': user.organization || 'TCF-SG' }
                });
                const data = await res.json();
                if (data.success) {
                    const emp = data.data.find(e => e.id === parseInt(id));
                    setEmployee(emp);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchEmployee();
    }, [id]);

    if (!employee) return <div className="p-10 text-center font-bold">Memuat data...</div>;

    const serifFont = { fontFamily: '"Times New Roman", Times, serif' };
    const sansFont = { fontFamily: 'Arial, Helvetica, sans-serif' };

    return (
        <div className="min-h-screen bg-slate-100 p-5 print:p-0 print:bg-white flex flex-col items-center">
            <div className="print:hidden w-full max-w-xl flex justify-between mb-8">
                <button onClick={() => navigate('/hrd/employees')} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl font-bold shadow-sm hover:bg-slate-50">
                    <ArrowLeft size={18} /> Kembali
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700">
                    <Printer size={18} /> Cetak ID Card
                </button>
            </div>

            {/* Area Kertas Cetak */}
            <div className="bg-white shadow-2xl print:shadow-none print:m-0 flex flex-col sm:flex-row gap-5 p-5 print:p-0 rounded-2xl"
                 style={{ width: 'fit-content' }}>
                
                {/* --- BAGIAN DEPAN (FRONT) --- */}
                <div className="relative overflow-hidden bg-white border border-slate-200" 
                     style={{ width: '54mm', height: '86mm', boxSizing: 'border-box' }}>
                    
                    <WaveBackground />

                    <div className="relative z-10 flex flex-col h-full items-center pt-[3mm] pb-[4mm]">
                        {/* Logo */}
                        <img src={logo} alt="TCF" className="h-[14mm] object-contain mb-[2mm] drop-shadow-md" />
                        
                        {/* Title */}
                        <h1 className="text-[11px] font-bold text-[#333] tracking-tighter uppercase mb-[4mm] drop-shadow-sm" style={serifFont}>
                            PT. TRI CENTRUM FORTUNA
                        </h1>

                        {/* Foto Karyawan dengan Efek Frame Solid (Printer-friendly) */}
                        <div className="w-[28mm] h-[34mm] bg-white relative z-10 rounded-md overflow-hidden flex items-center justify-center mt-[1mm] mb-[2mm] border-[3px] border-[#2eb0e5] p-[2px]">
                            <div className="w-full h-full rounded-sm overflow-hidden bg-slate-100 flex items-center justify-center relative">
                                {employee.photo_url ? (
                                    <img src={employee.photo_url} alt={employee.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-black text-slate-300 drop-shadow-sm">{employee.name.charAt(0)}</span>
                                )}
                            </div>
                        </div>

                        {/* Info Karyawan */}
                        <div className="mt-auto flex flex-col items-center text-center w-full" style={{ textShadow: '0 0 3px #fff, 0 0 5px #fff, 0 0 7px #fff, 0 0 10px #fff' }}>
                            <h2 className="text-[12px] font-bold text-[#000] uppercase tracking-wide border-b-[1.5px] border-[#000] pb-[1px] mb-[1px]" style={serifFont}>
                                {employee.name}
                            </h2>
                            <p className="text-[11px] font-bold text-[#111] capitalize leading-tight" style={serifFont}>
                                {employee.position || 'Staff'}
                            </p>
                            <p className="text-[11px] font-bold text-[#111] leading-tight" style={serifFont}>
                                {employee.nik}
                            </p>
                            <p className="text-[10px] font-bold text-[#222] mt-[1mm] leading-tight" style={serifFont}>
                                Join: {employee.join_date ? (
                                    (() => {
                                        const d = new Date(employee.join_date);
                                        d.setUTCHours(d.getUTCHours() + 7);
                                        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                        return `${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
                                    })()
                                ) : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- BAGIAN BELAKANG (BACK) --- */}
                <div className="relative overflow-hidden bg-white border border-slate-200" 
                     style={{ width: '54mm', height: '86mm', boxSizing: 'border-box' }}>
                     
                    <WaveBackground />

                    <div className="relative z-10 p-[3mm] flex flex-col h-full items-center text-center">
                        {/* Logo */}
                        <img src={logo} alt="TCF" className="h-[12mm] object-contain mb-[2mm] drop-shadow-md" />
                        
                        {/* Title */}
                        <h1 className="text-[11px] font-bold text-[#333] tracking-tighter uppercase mb-[3mm] drop-shadow-sm" style={serifFont}>
                            PT. TRI CENTRUM FORTUNA
                        </h1>

                        {/* Teks Aturan */}
                        <div className="text-[#000] text-[7px] leading-[1.3] flex-1 flex flex-col gap-[3mm] px-1 font-bold" style={{ ...sansFont, textShadow: '0 0 3px #fff, 0 0 5px #fff, 0 0 7px #fff' }}>
                            <p>
                                Perhatian :<br/>
                                Pemegang kartu ini adalah karyawan<br/>
                                <span className="font-black text-[7.5px]">PT. Tri Centrum Fortuna</span>
                            </p>
                            
                            <p>
                                Kartu ini wajib digunakan selama yang<br/>
                                bersangkutan berada di lingkungan<br/>
                                <span className="font-black text-[7.5px]">PT. Tri Centrum Fortuna</span>
                            </p>
                            
                            <p>
                                Pemakai kartu ini berada di bawah<br/>
                                kontrol Departemen HRD, sehingga<br/>
                                pemakai tunduk dan patuh pada<br/>
                                peraturan-peraturan yang berlaku<br/>
                                di lingkungan kerja<br/>
                                <span className="font-black text-[7.5px]">PT. Tri Centrum Fortuna</span>
                            </p>
                        </div>

                        {/* Footer Alamat */}
                        <div className="mt-auto text-[#000] text-[7.5px] font-black leading-[1.2]" style={{ ...sansFont, textShadow: '0 0 3px #fff, 0 0 5px #fff' }}>
                            Jl. Sadang - Subang KM 10 Cibatu<br/>
                            Kab. Purwakarta<br/>
                            (0264) 8931000
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

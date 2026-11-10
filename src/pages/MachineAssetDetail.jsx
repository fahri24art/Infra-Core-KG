import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Save, ArrowLeft, Package, User, MapPin, Tag, Briefcase, Printer, FileText, CheckCircle, ShieldAlert
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import AssetLabel from '../components/AssetLabel';

export default function MachineAssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // BAST Form State
    const [handoverForm, setHandoverForm] = useState({
        receiverName: '',
        department: '',
        quantity: 1,
        location: '',
        notes: ''
    });

    useEffect(() => {
        fetchAsset();
    }, [id]);

    const fetchAsset = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/machine/inventory');
            if (res.ok) {
                const data = await res.json();
                const found = data.data.find(a => a.id.toString() === id);
                setAsset(found);
            }
        } catch (err) {
            console.error('Failed to fetch Machine asset', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="animate-spin h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full"></div>
        </div>
    );

    if (!asset) return <div className="text-center py-32 text-slate-500 font-bold">Asset not found.</div>;

    const catPrefix = asset.category.substring(0, 3).toUpperCase();
    const assetLabel = `MAC-${catPrefix}-${asset.id.toString().padStart(4, '0')}`;

    // Reusing the AssetLabel component logic but adapting it for Machine
    const machineAssetForLabel = {
        name: asset.item_name,
        inventory_number: assetLabel,
        category: asset.category,
        brand: 'TCF Property',
        model: asset.category,
        uuid: `Machine-${asset.id}`
    };

    const generateHandoverPDF = () => {
        if (!handoverForm.receiverName || !handoverForm.department) {
            alert('Silakan isi Nama Penerima dan Departemen untuk membuat BAST.');
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(10);
        doc.text("PT. TRI CENTRUM FORTUNA", 14, 15);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("BERITA ACARA SERAH TERIMA (BAST) FASILITAS", 14, 22);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("No. Dokumen: TCFSG-FM-Machine-01-02", 140, 15);
        doc.text(`Tanggal: ${new Date().toLocaleDateString()}`, 140, 20);
        
        doc.setLineWidth(0.5);
        doc.line(14, 25, 196, 25);
        
        doc.setFontSize(10);
        const yStart = 35;
        doc.text("Pada hari ini, kami yang bertanda tangan dibawah ini:", 14, yStart);
        
        doc.text("1. Pihak Pertama (Yang Menyerahkan):", 14, yStart + 10);
        doc.text("   Nama: Machine Engineering Dept", 14, yStart + 16);
        doc.text("   Departemen: Machine Asset", 14, yStart + 22);
        
        doc.text("2. Pihak Kedua (Yang Menerima):", 14, yStart + 35);
        doc.text(`   Nama: ${handoverForm.receiverName}`, 14, yStart + 41);
        doc.text(`   Departemen: ${handoverForm.department}`, 14, yStart + 47);
        
        doc.text("Telah melakukan serah terima fasilitas / perlengkapan dengan detail sebagai berikut:", 14, yStart + 60);
        
        doc.setDrawColor(0);
        doc.setFillColor(250, 250, 250);
        doc.rect(20, yStart + 65, 170, 45, 'F');
        doc.rect(20, yStart + 65, 170, 45);
        
        doc.setFont("helvetica", "bold");
        doc.text("DATA ASET / FASILITAS", 25, yStart + 72);
        doc.setFont("helvetica", "normal");
        
        doc.text(`Nama Item: ${asset.item_name}`, 25, yStart + 80);
        doc.text(`Kategori: ${asset.category}`, 110, yStart + 80);
        doc.text(`Asset ID / Label: ${assetLabel}`, 25, yStart + 90);
        doc.text(`Kuantitas Diserahkan: ${handoverForm.quantity} unit`, 110, yStart + 90);
        doc.text(`Lokasi Penempatan: ${handoverForm.location || 'Sesuai Departemen'}`, 25, yStart + 100);
        
        const textY = yStart + 120;
        const agreementText = "Pihak Kedua menyatakan telah menerima fasilitas tersebut dalam kondisi baik dan lengkap, serta bersedia untuk merawat dan menggunakannya sesuai dengan kebijakan perusahaan. Segala kerusakan atau kehilangan akibat kelalaian menjadi tanggung jawab Pihak Kedua.";
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        const splitText = doc.splitTextToSize(agreementText, 180);
        doc.text(splitText, 14, textY);
        
        const signY = textY + 25;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Diserahkan Oleh,", 20, signY);
        doc.text("( Pihak Pertama )", 20, signY + 30);
        doc.text("Machine Asset Department", 20, signY + 35);
        
        doc.text("Diterima Oleh,", 140, signY);
        doc.text("( Pihak Kedua )", 140, signY + 30);
        doc.text(handoverForm.receiverName, 140, signY + 35);
        
        doc.save(`BAST_Machine_${assetLabel}_${handoverForm.receiverName.replace(/\\s+/g, '_')}.pdf`);
    };

    return (
        <div className="space-y-5 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/machine/assets')}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-purple-600 hover:border-purple-200 shadow-sm transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">
                                {asset.item_name}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-purple-50 text-purple-600 border-purple-100">
                                {assetLabel}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                            <Package size={12} />
                            <span>{asset.category}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Left Column: Asset Info & BAST Form */}
                <div className="lg:col-span-2 space-y-3">
                    {/* Inventory Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Dimiliki</div>
                            <div className="text-3xl font-black text-slate-800">{asset.total_stock}</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Terdistribusi</div>
                            <div className="text-3xl font-black text-amber-600">{asset.assigned_stock}</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sisa Gudang</div>
                            <div className={`text-3xl font-black ${asset.available_stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {asset.available_stock}
                            </div>
                        </div>
                    </div>

                    {/* Handover Form */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                            <FileText size={16} className="text-purple-600" />
                            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Berita Acara Serah Terima (BAST)</h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Penerima</label>
                                <input 
                                    type="text" 
                                    value={handoverForm.receiverName}
                                    onChange={(e) => setHandoverForm({...handoverForm, receiverName: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 outline-none transition-all" 
                                    placeholder="Contoh: Budi Santoso"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Departemen</label>
                                <input 
                                    type="text" 
                                    value={handoverForm.department}
                                    onChange={(e) => setHandoverForm({...handoverForm, department: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 outline-none transition-all" 
                                    placeholder="Contoh: Produksi"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kuantitas</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    max={asset.available_stock}
                                    value={handoverForm.quantity}
                                    onChange={(e) => setHandoverForm({...handoverForm, quantity: parseInt(e.target.value) || 1})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 outline-none transition-all" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lokasi Penempatan</label>
                                <input 
                                    type="text" 
                                    value={handoverForm.location}
                                    onChange={(e) => setHandoverForm({...handoverForm, location: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 outline-none transition-all" 
                                    placeholder="Contoh: Gedung A, Lantai 2"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <button
                                    onClick={generateHandoverPDF}
                                    className="w-full py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <FileText size={16} /> Print Document BAST
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Asset Tag & QR */}
                <div className="space-y-3">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                            <Tag size={16} className="text-amber-500" />
                            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Asset Tag / Label</h3>
                        </div>
                        <div className="p-4 flex justify-center bg-slate-100/50">
                            <div className="scale-90 origin-top">
                                <AssetLabel asset={machineAssetForLabel} />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 space-y-3">
                            <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20">
                                <Printer size={16} /> Execute Thermal Print
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

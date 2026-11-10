import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';
import ttdTechnisi from '../assets/WhatsApp_Image_2026-06-30_at_13.35.24-removebg-preview.png';
import { addSopHeader } from './sopHeader';

const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

const getIndonesianDay = (date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
};

const getIndonesianMonth = (date) => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months[date.getMonth()];
};

export const generateHandoverPdf = async (userName, assetsInput, formDataObj = {}, action = 'download') => {
    const isString = typeof formDataObj === 'string';
    const formData = isString ? { divisi: formDataObj } : formDataObj;
    const { nik = '......................................................................................', jabatan = '......................................................................................', divisi = formData.divisi || 'General', atasan = '......................................................................................', snCharger = '......................................................................................' } = formData;
    try {
        // Format user name (Title Case only)
        let displayName = userName ? userName.trim() : '';
        displayName = displayName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

        // Convert single asset to array for multi-page support
        const assets = Array.isArray(assetsInput) ? assetsInput : [assetsInput];
        if (assets.length === 0) return;

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        const today = new Date();
        const dateNum = String(today.getDate()).padStart(2, '0');
        const monthNum = String(today.getMonth() + 1).padStart(2, '0');
        const yearNum = today.getFullYear();
        const yearShort = String(yearNum).slice(-2);

        // Preload image
        const imgData = await loadImage(logoTCF);

        for (let i = 0; i < assets.length; i++) {
            const asset = assets[i];
            
            if (i > 0) {
                doc.addPage();
            }

            // Extract location and year from inventory number (e.g. TCFSG-ICT-NB-2024-022)
            const invNum = asset.inventory_number || '';
            const currentOrg = sessionStorage.getItem('organization') || '';
            const isKG = currentOrg.toUpperCase().includes('KG') || invNum.toUpperCase().includes('TCFKG');
            const isSG = !isKG;
            const docCode = isKG ? 'TCFKG-FM-ICT-03-02' : 'TCFSG-FM-ICT-03-02';

            // --- Header Configuration ---
            if (imgData) {
                addSopHeader(doc, pageWidth, "BERITA ACARA SERAH TERIMA", docCode, "01", "01 Oktober 2021", "1 dari 2", imgData);
            }
            
            let matchedYear = today.getFullYear();
            const yearMatch = invNum.match(/(20\d{2})/);
            if (yearMatch) {
                matchedYear = parseInt(yearMatch[1], 10);
            }


            // --- Body / Content ---
            doc.setFontSize(9);
            let currentY = 42;
            doc.text("Dalam rangka menunjang kelancaran pelaksanaan tugas dan tanggung jawab karyawan PT TRI CENTRUM FORTUNA", 10, currentY);
            currentY += 5;
            
            const dateStr = `${getIndonesianDay(today)}, ${dateNum} ${getIndonesianMonth(today)} ${matchedYear}`;
            doc.text(`maka pada hari ini ${dateStr} telah diserahterimakan inventaris perangkat ICT milik perusahaan,`, 10, currentY);
            currentY += 5;
            doc.text("dengan data sebagai berikut :", 10, currentY);

            // Asset Details Extraction
            let parsedSpecs = {};
            try {
                if (typeof asset.specs === 'string' && asset.specs.startsWith('{')) {
                    parsedSpecs = JSON.parse(asset.specs);
                } else if (typeof asset.specs === 'object') {
                    parsedSpecs = asset.specs || {};
                }
            } catch (e) {}

            const catStr = (asset.category || '').toLowerCase();
            let jenisStr = asset.category || 'Device';
            if (catStr.includes('pc') || catStr.includes('desktop')) jenisStr = 'PC / Desktop';
            
            const osInfo = asset.os_info || parsedSpecs.os || parsedSpecs.OperatingSystem || '-';
            const ramInfo = asset.ram || parsedSpecs.ram || parsedSpecs.memory || parsedSpecs.Memory || '-';
            const cpuInfo = parsedSpecs.cpu || parsedSpecs.processor || parsedSpecs.Processor || '-';
            
            let storageInfo = parsedSpecs.storage_summary || parsedSpecs.storage || parsedSpecs.disk || '-';
            if (Array.isArray(storageInfo)) {
                storageInfo = storageInfo.map(d => typeof d === 'object' ? `${d.model || 'Disk'} (${d.capacity_gb || d.capacity_mb || 0} GB)` : d).join(', ');
            } else if (typeof storageInfo === 'object') {
                storageInfo = JSON.stringify(storageInfo);
            }

            const kelengkapan = catStr.includes('pc') ? 'PC, Keyboard, Mouse, Kabel Power' : (catStr.includes('laptop') ? 'Laptop, Charger, Mouse, Tas' : 'Unit, Kabel Power');

            currentY += 6;
            const deviceDetails = [
                { label: "o Jenis Perangkat", value: jenisStr },
                { label: "o Merek, type", value: `${asset.manufacturer || ''} ${asset.model || ''}`.trim() || '-' },
                { label: "o Asset / SN", value: `${asset.inventory_number || '-'} / ${asset.serial_number || '-'}` },
                { label: "o Kelengkapan", value: kelengkapan },
                { label: "o SN Charger", value: snCharger || "......................................................................................" },
                { label: "o Spesifikasi", value: `${cpuInfo}, ${ramInfo}, ${storageInfo}` },
                { label: "o Kondisi", value: "Baru / Bekas *" },
                { label: "o OS / Software", value: osInfo }
            ];

            deviceDetails.forEach(item => {
                doc.text(item.label, 15, currentY);
                doc.text(":", 45, currentY);
                // truncate to avoid overflow
                doc.text(item.value.toString().replace(/\n/g, ' ').substring(0, 85), 48, currentY);
                currentY += 5;
            });

            currentY += 4;
            doc.text("kepada,", 10, currentY);
            currentY += 5;
            const userDetails = [
                { label: "o Nama Lengkap", value: userName },
                { label: "o N.I.K", value: nik || "......................................................................................" },
                { label: "o Department", value: divisi || "General" },
                { label: "o Jabatan", value: jabatan || "......................................................................................" },
                { label: "o Atasan Langsung", value: atasan || "......................................................................................" }
            ];

            userDetails.forEach(item => {
                doc.text(item.label, 15, currentY);
                doc.text(":", 55, currentY);
                doc.text(item.value, 58, currentY);
                currentY += 5;
            });

            currentY += 4;
            doc.text("Setelah pengecekan dilakukan, perangkat tersebut dalam kondisi utuh dan dapat berfungsi serta dipergunakan sebagaimana", 10, currentY);
            currentY += 4;
            doc.text("mestinya, sehingga karyawan bersangkutan menyetujui dan mengesahkan pernyataan dibawah ini :", 10, currentY);

            currentY += 8;
            doc.setFont("times", "bold");
            doc.setFontSize(10);
            doc.text("SURAT PERNYATAAN", pageWidth / 2, currentY, { align: "center" });
            
            currentY += 6;
            doc.setFont("times", "normal");
            doc.setFontSize(8.5);
            doc.text("Saya yang bertanda tangan dibawah ini, menyatakan dengan sebenarnya bahwa saya telah menerima perangkat inventaris sesuai", 10, currentY);
            currentY += 4;
            doc.text("dengan data dalam surat ini maupun lampirannya. Selanjutnya terhadap perangkat inventaris yang telah saya terima tersebut,", 10, currentY);
            currentY += 4;
            doc.text("saya bersedia dan berjanji untuk :", 10, currentY);

            currentY += 5;
            
            const rules = [
                { 
                    num: "1.", 
                    text: [
                        { t: "merawat", bold: true },
                        { t: " (menjaga kebersihan, keutuhan & keamanan) perangkat inventaris tersebut dengan sebaik mungkin,", bold: false }
                    ] 
                },
                { 
                    num: "2.", 
                    text: [
                        { t: "menanggung", bold: true },
                        { t: " biaya perbaikan dan atau penggantian spare part maupun penggantian keseluruhan, apabila terjadi kerusakan", bold: false },
                        { t: "\n    atau kehilangan perangkat tersebut yang diakibatkan oleh pihak lain maupun kecerobohan atau ketidakhati-hatian saya.", bold: false }
                    ] 
                },
                { 
                    num: "3.", 
                    text: [
                        { t: "mempergunakan", bold: true },
                        { t: " perangkat tersebut dengan cara yang benar, hanya untuk kepentingan dan kelancaran tugas dan tanggung", bold: false },
                        { t: "\n    jawab kerja saya di PT. TRI CENTRUM FORTUNA.", bold: false }
                    ] 
                },
                { 
                    num: "4.", 
                    text: [
                        { t: "mengembalikan", bold: true },
                        { t: " dan menyerahkan secara langsung perangkat tersebut kepada bagian ICT PT. TRI CENTRUM FORTUNA,", bold: false },
                        { t: "\n    dengan kondisi utuh dan masih dapat dipergunakan dengan semestinya baik pada saat saya putus hubungan kerja dengan", bold: false },
                        { t: "\n    PT. TRI CENTRUM FORTUNA apapun alasannya, atau apabila PT. TRI CENTRUM FORTUNA menghendaki agar saya me-", bold: false },
                        { t: "\n    nyerahkan perangkat tersebut.", bold: false }
                    ] 
                },
                { 
                    num: "5.", 
                    text: [
                        { t: "mematuhi", bold: true },
                        { t: " aturan penggunaan software standard (software komersial yg licensenya dimiliki perusahaan dan OpenSource/Free", bold: false },
                        { t: "\n    Software) pada asset perusahaan yang telah ditentukan dan diinstall oleh pihak ICT dan tidak melakukan instalasi software", bold: false },
                        { t: "\n    apapun tanpa izin tertulis dari departement head yang bersangkutan dan dari pihak ICT", bold: false }
                    ] 
                },
                { 
                    num: "6.", 
                    text: [
                        { t: "dilarang", bold: true },
                        { t: " melakukan instalasi software ilegal ** diluar standard ICT tersebut, sesuai dengan UU dibawah ini:", bold: false }
                    ] 
                }
            ];

            rules.forEach(rule => {
                doc.setFont("times", "normal");
                doc.text(rule.num, 10, currentY);
                
                let xOffset = 14;
                let currentLineY = currentY;
                
                rule.text.forEach(segment => {
                    const lines = segment.t.split('\n');
                    for (let j = 0; j < lines.length; j++) {
                        if (j > 0) {
                            currentLineY += 4;
                            xOffset = 10; 
                        }
                        doc.setFont("times", segment.bold ? "bold" : "normal");
                        doc.text(lines[j], xOffset, currentLineY);
                        xOffset += doc.getTextWidth(lines[j]);
                    }
                });
                
                // Adjust Y based on lines added in this rule
                currentY = currentLineY + 4;
            });

            currentY += 1;
            doc.setFontSize(7.5);
            doc.setFont("times", "bold");
            doc.text("Terkait Undang-undang 19 Tahun 2002 tentang hak cipta pasal 72 ayat 3 yaitu :", 14, currentY);
            currentY += 4;
            doc.setFont("times", "italic");
            doc.text('"Barang siapa dengan sengaja dan tanpa hak memperbanyak penggunaan untuk kepentingan komersial suatu program komputer', 14, currentY);
            currentY += 4;
            doc.text('dipidana dengan pidana penjara paling lama 5 (lima) tahun dan/atau denda paling banyak Rp. 500.000.000,- (lima ratus juta rupiah)".', 14, currentY);
            
            currentY += 5;
            doc.setFont("times", "normal");
            doc.setFontSize(8.5);
            doc.text("7.", 10, currentY);
            doc.setFont("times", "bold");
            doc.text("Pihak perusahaan tidak bertanggung jawab", 14, currentY);
            let textW = doc.getTextWidth("Pihak perusahaan tidak bertanggung jawab");
            doc.setFont("times", "normal");
            doc.text(" apabila ditemukan software ilegal yang di-install sendiri oleh user pemegang asset.", 14 + textW, currentY);

            // End of Page 1

            // Form Footer Number (Page 1)
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.text(docCode, pageWidth - 10, pageHeight - 5, { align: "right" });

            // --- PAGE 2: Software Attachment & Signatures ---
            doc.addPage();
            
            // Software Header
            doc.setFont("times", "bold");
            doc.setFontSize(12);
            doc.text("LAMPIRAN BAST", pageWidth / 2, 20, { align: "center" });
            doc.setFontSize(10);
            doc.text("DAFTAR INSTALLED SOFTWARE & DRIVERS", pageWidth / 2, 26, { align: "center" });
            
            doc.setFont("times", "normal");
            doc.setFontSize(9);
            doc.text(`Asset / SN : ${asset.inventory_number || '-'} / ${asset.serial_number || '-'}`, 15, 35);
            doc.text(`Pengguna : ${userName}`, 15, 40);

            // Menggunakan Standard Legal Software List secara Global
            const tableData = [
                ['Windows 10 / 11 Pro', 'Latest / 24H2'],
                ['Microsoft Office 2021 / Microsoft 365', '2021 / Latest'],
                ['Google Chrome', 'Latest'],
                ['Adobe Acrobat Reader', 'Latest'],
                ['7-Zip', 'Latest'],
                ['VLC Media Player', 'Latest'],
                ['WhatsApp Desktop', 'Latest'],
                ['Microsoft Teams', 'Latest'],
                ['AnyDesk', 'Latest'],
                ['Microsoft OneDrive', 'Latest'],
                ['Microsoft Defender Antivirus', 'Built-in'],
                ['Printer Driver', 'Sesuai tipe printer']
            ];

            autoTable(doc, {
                startY: 45,
                head: [['Application Name', 'Version']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 8, font: 'times', cellPadding: 1.5 },
                headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
                margin: { left: 15, right: 15 }
            });

            // Start Signatures Block after table
            currentY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 45) + 10;
            
            doc.setFont("times", "normal");
            doc.setFontSize(8.5);
            doc.text("Demikian pernyataan ini saya tanda tangani sebagai bukti persetujuan dan janji saya bagi pihak-pihak yang berwenang serta yang", 10, currentY);
            currentY += 4;
            doc.text("berkepentingan, khususnya berkaitan dengan perangkat inventaris yang telah saya terima dan saya pinjam dari PT. TRI CENTRUM FORTUNA.", 10, currentY);

            currentY += 10;
            doc.setFontSize(8);
            doc.text(`Dicek dan diserahterimakan bersama di ${isSG ? 'Purwakarta' : 'Karawang'}, oleh :`, pageWidth / 2, currentY, { align: "center" });

            currentY += 6;
            currentY += 6;
            // 2 Columns for signatures
            doc.text("Yang menerima,", 70, currentY, { align: "center" });
            doc.text("Disetujui dan disahkan oleh,", 140, currentY, { align: "center" });

            currentY += 22; // Space for signatures
            
            // Name lines
            doc.line(40, currentY, 100, currentY); // 60mm width
            doc.line(110, currentY, 170, currentY);

            currentY += 4;
            doc.text(`${displayName}`, 70, currentY, { align: "center" });
            doc.text("Fauziah Fajrin", 140, currentY, { align: "center" });
            currentY += 4;
            doc.text("(Direktur Administrasi)", 140, currentY, { align: "center" });

            currentY += 10;
            doc.setFontSize(7);
            doc.text("OpenSource/Freeware adalah perangkat lunak yg bebas digunakan untuk tujuan apapun dengan kode sumber terbuka atau tertutup.", 10, currentY);
            currentY += 3;
            doc.text("** Software illegal adalah perangkat lunak yang bersifat komersial dan memerlukan lisensi untuk dapat menggunakannya yang tidak dimiliki oleh perusahaan.", 10, currentY);
            currentY += 5;
            doc.setFontSize(8);
            doc.setFont("times", "bold");
            doc.text("Telah dikembalikan dan dicek pada tanggal : ..............................................", pageWidth / 2, currentY, { align: "center" });

            // Form Footer Number (Page 2)
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.text(docCode, pageWidth - 10, pageHeight - 5, { align: "right" });
        }

        if (action === 'download') {
            doc.save(`BAST_${userName.replace(/\s+/g, '_')}_${yearNum}.pdf`);
        } else {
            const pdfUrl = doc.output('bloburl');
            window.open(pdfUrl, '_blank');
        }
        
    } catch (error) {
        console.error("Failed to generate Handover PDF", error);
        alert("Gagal membuat PDF Serah Terima.");
    }
}

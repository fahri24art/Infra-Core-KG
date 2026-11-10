import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';

const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
};

export const generateTicketPdf = async (selectedTicket, responses = [], asset = null) => {
    if (!selectedTicket) return;
    const doc = new jsPDF();
    
    // Brand Logo
    const imgData = await loadImage(logoTCF);
    if (imgData) doc.addImage(imgData, 'PNG', 14, 10, 26, 23);
    
    // Header Titles
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("PT. TRI CENTRUM FORTUNA", 45, 16);
    
    // Top Right Info
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Printed: ${new Date().toLocaleString()}`, 196, 12, { align: 'right' });
    
    const currentOrg = sessionStorage.getItem('organization') || '';
    const isKG = currentOrg.toUpperCase().includes('KG') ||
        (selectedTicket.id && typeof selectedTicket.id === 'string' && selectedTicket.id.includes("TCFKG")) ||
        (selectedTicket.number && typeof selectedTicket.number === 'string' && selectedTicket.number.includes("TCFKG"));

    let docNo = isKG ? "TCFKG-FM-ICT-03-03" : "TCFSG-FM-ICT-03-03"; // History / Riwayat Perangkat
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    doc.setFont("helvetica", "normal");
    const docNoWidth = doc.getTextWidth(docNo);
    doc.text(docNo, 196, 16, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.text("No. Dokumen: ", 196 - docNoWidth - 2, 16, { align: 'right' });

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175); 
    doc.text("RIWAYAT PERBAIKAN PERANGKAT", 45, 22);
    
    let rawTicketNo = selectedTicket.number || ('#' + selectedTicket.id);
    if (isKG && typeof rawTicketNo === 'string') {
        rawTicketNo = rawTicketNo.replace(/TCFSG/g, 'TCFKG');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`No. Tiket: ${rawTicketNo}`, 45, 27);
    doc.setTextColor(0, 0, 0); 
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 35, 196, 35);
    
    // Derived Data
    const lastResponse = responses.length > 0 ? responses[responses.length - 1] : null;
    const lastResponseDate = lastResponse ? new Date(lastResponse.created_at).toLocaleString() : '-';
    const lastMessageDate = new Date(selectedTicket.created_at).toLocaleString();
    
    let closedBy = '-';
    let closeDate = '-';
    if (selectedTicket.status === 'Closed') {
        closeDate = new Date(selectedTicket.updated_at || selectedTicket.created_at).toLocaleString();
        const lastAdminResp = [...responses].reverse().find(r => r.user_role === 'admin');
        closedBy = lastAdminResp ? lastAdminResp.user_name : 'System';
    }

    // Ticket Details Box
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    
    let cleanSubject = selectedTicket.raw_subject || selectedTicket.subject || '';
    
    if (cleanSubject.startsWith('[')) {
        const closingBracketIdx = cleanSubject.indexOf(']');
        if (closingBracketIdx !== -1) {
            cleanSubject = cleanSubject.substring(closingBracketIdx + 1).replace(/^(\s*-\s*)/, '').trim();
        }
    }
    if (cleanSubject.includes(':')) {
       const parts = cleanSubject.split(':');
       if (parts[0].length < 100) { 
           cleanSubject = parts.slice(1).join(':').trim();
       }
    }
    if (!cleanSubject) cleanSubject = selectedTicket.raw_subject || selectedTicket.subject;
    
    const titleText = `[${selectedTicket.status.toUpperCase()}] - ${cleanSubject}`;
    const titleLines = doc.splitTextToSize(titleText, 182);
    
    if (selectedTicket.status === 'Open') doc.setTextColor(220, 38, 38); 
    else if (selectedTicket.status === 'Closed') doc.setTextColor(22, 163, 74); 
    else doc.setTextColor(202, 138, 4); 
    
    doc.text(titleLines, 14, 42);
    doc.setTextColor(0, 0, 0); 
    
    const titleHeight = (titleLines.length * 5);

    autoTable(doc, {
        startY: 42 + titleHeight,
        theme: 'grid',
        head: [],
        body: [
            ['Status:', selectedTicket.status, 'User:', selectedTicket.user_name || '-'],
            ['Priority:', selectedTicket.priority || 'Normal', 'Email:', selectedTicket.email || '-'],
            ['Department:', selectedTicket.user_department || selectedTicket.department || 'General', 'Source:', selectedTicket.source || 'Web'],
            ['Create Date:', new Date(selectedTicket.created_at).toLocaleString(), 'Help Topic:', selectedTicket.category || 'General'],
            ['Closed By:', closedBy, 'Last Message:', lastMessageDate],
            ['Asset:', asset ? (asset.code || asset.inventory_number || '-') : (selectedTicket.asset_code || '-'), 'Asset Name:', asset ? asset.name : '-'],
            ['Close Date:', closeDate, '', '']
        ],
        styles: { fontSize: 8, font: 'helvetica', cellPadding: 2 },
        columnStyles: { 
            0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 25 }, 
            1: { cellWidth: 65 }, 
            2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 25 },
            3: { cellWidth: 65 }
        }
    });

    let finalY = doc.lastAutoTable.finalY;

    // Issue Description
    finalY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Keterangan Kerusakan / Issue Description", 14, finalY);
    doc.line(14, finalY + 2, 196, finalY + 2);
    
    finalY += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    
    // Strip HTML from description
    let cleanDesc = selectedTicket.description || '';
    cleanDesc = cleanDesc.replace(/<[^>]*>?/gm, '').replace(/[^\x00-\x7F]/g, ''); 
    const descLines = doc.splitTextToSize(cleanDesc, 182);
    doc.text(descLines, 14, finalY);
    
    finalY += (descLines.length * 4) + 10;

    // Action Taken (Responses)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Tindakan Perbaikan / Action Taken", 14, finalY);
    doc.line(14, finalY + 2, 196, finalY + 2);
    
    finalY += 8;
    
    if (responses.length > 0) {
        responses.forEach(resp => {
            if (finalY > 260) {
                doc.addPage();
                finalY = 20;
            }
            
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            if (resp.user_role === 'admin') doc.setTextColor(37, 99, 235);
            else doc.setTextColor(15, 118, 110);
            
            doc.text(`${resp.user_name} (${resp.user_role}) - ${new Date(resp.created_at).toLocaleString()}`, 14, finalY);
            finalY += 4;
            
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            let cleanBody = resp.body || '';
            cleanBody = cleanBody.replace(/<[^>]*>?/gm, '').replace(/[^\x00-\x7F]/g, '');
            const bodyLines = doc.splitTextToSize(cleanBody, 175);
            doc.text(bodyLines, 18, finalY);
            
            finalY += (bodyLines.length * 4) + 6;
        });
    } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("Belum ada tindakan perbaikan yang dicatat.", 14, finalY);
        finalY += 15;
    }

    // Signatures
    if (finalY > 230) {
        doc.addPage();
        finalY = 20;
    }
    
    finalY += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY, 196, finalY);
    
    finalY += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Signatures / Persetujuan", 14, finalY);
    
    finalY += 25;
    doc.line(20, finalY, 70, finalY);
    doc.line(130, finalY, 180, finalY);
    
    finalY += 5;
    doc.text("User / Pelapor", 45, finalY, { align: 'center' });
    doc.text("IT Support / Admin", 155, finalY, { align: 'center' });
    
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
};

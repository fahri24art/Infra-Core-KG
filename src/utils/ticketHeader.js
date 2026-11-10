export const addTicketHeader = (doc, pageWidth, title, formNo, ticketNo, logoImgData) => {
    const rightX = pageWidth - 70;
    
    // Automatically detect active organization/plant
    const org = (typeof window !== 'undefined' && sessionStorage.getItem('organization')) || '';
    const isKG = org.toUpperCase().includes('KG');
    const effectiveFormNo = isKG && formNo ? String(formNo).replace(/TCFSG/g, 'TCFKG') : formNo;
    const effectiveTicketNo = isKG && ticketNo ? String(ticketNo).replace(/TCFSG/g, 'TCFKG') : ticketNo;
    const effectiveTitle = isKG && title ? String(title).replace(/TCFSG/g, 'TCFKG') : title;
    
    // Outer box
    doc.setLineWidth(0.3);
    doc.rect(10, 10, pageWidth - 20, 25);
    
    // Vertical lines
    doc.line(40, 10, 40, 35);
    doc.line(rightX, 10, rightX, 35);
    
    // Horizontal line for title box
    doc.line(40, 17, rightX, 17);

    // Lines for right box (SOP details)
    doc.line(rightX, 22.5, pageWidth - 10, 22.5);

    // Text for right box
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    // Row 1
    doc.text("No. Dokumen", rightX + 2, 16.5);
    doc.text(`: ${effectiveFormNo || '-'}`, rightX + 18, 16.5);

    // Row 2
    doc.setFontSize(8);
    doc.text("No. Tiket", rightX + 2, 29);
    const ticketFontSize = effectiveTicketNo && effectiveTicketNo.length > 22 ? 7 : 8;
    doc.setFontSize(ticketFontSize);
    doc.text(`: ${effectiveTicketNo || '-'}`, rightX + 18, 29);

    const midWidth = (pageWidth - 110);
    const midCenter = 40 + (midWidth / 2);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("PT. Tri Centrum Fortuna", midCenter, 14, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(effectiveTitle, midCenter, 25, { align: 'center' });
    
    // Draw logo if provided
    if (logoImgData) {
        doc.addImage(logoImgData, 'PNG', 12, 11, 26, 23);
    }
};

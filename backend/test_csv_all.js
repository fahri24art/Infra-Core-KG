const fs = require('fs');
const path = require('path');
const downloadPath = path.resolve(__dirname, 'services', 'downloads');
const files = fs.readdirSync(downloadPath);
const file = files.find(f => f.endsWith('.csv'));
if (file) {
    const csvData = fs.readFileSync(path.join(downloadPath, file), 'utf8');
    const lines = csvData.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const userIdx = headers.findIndex(h => h.includes('User') && !h.includes('Name'));
    const bwTotalIdx = headers.findIndex(h => h.includes('B & W(Total Prints)'));
    const colorTotalIdx = headers.findIndex(h => h.includes('Color(Total Prints)'));
    
    let codes = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
        let userCode = cols[userIdx] || '';
        userCode = userCode.replace(/\[|\]/g, '').trim();
        if (userCode) codes.push(userCode);
    }
    console.log("All parsed user codes from Ricoh CSV:", codes);
}

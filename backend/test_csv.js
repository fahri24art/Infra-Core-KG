const fs = require('fs');
const path = require('path');
const downloadPath = path.resolve(__dirname, 'services', 'downloads');
const files = fs.readdirSync(downloadPath);
const file = files.find(f => f.endsWith('.csv'));
if (file) {
    const csvData = fs.readFileSync(path.join(downloadPath, file), 'utf8');
    const lines = csvData.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    // Check specific user rows
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].includes('2023') || lines[i].includes('7453') || lines[i].includes('7519')) {
            const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
            const userIdx = headers.findIndex(h => h.includes('User') && !h.includes('Name'));
            const bwTotalIdx = headers.findIndex(h => h.includes('B & W(Total Prints)'));
            const colorTotalIdx = headers.findIndex(h => h.includes('Color(Total Prints)'));
            
            let userCode = cols[userIdx] || '';
            userCode = userCode.replace(/\[|\]/g, '').trim();
            const sumBW = parseInt(cols[bwTotalIdx] || '0') || 0;
            const sumColor = parseInt(cols[colorTotalIdx] || '0') || 0;
            console.log("Parsed -> user:", userCode, "bw:", sumBW, "color:", sumColor);
        }
    }
}

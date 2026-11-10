const fs = require('fs');
const path = require('path');
const downloadPath = path.resolve(__dirname, 'services', 'downloads');
const files = fs.readdirSync(downloadPath);
const file = files.sort().reverse().find(f => f.endsWith('.csv'));

if (file) {
    const csvData = fs.readFileSync(path.join(downloadPath, file), 'utf8');
    const lines = csvData.split('\n').filter(l => l.trim().length > 0);
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].includes('2023')) {
            const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
            console.log("Found 2023!");
            console.log("Total:", cols[2], "BW:", cols[3], "Color:", cols[4]);
        }
        if (lines[i].includes('7745')) {
            const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
            console.log("Found 7745!");
            console.log("Total:", cols[2], "BW:", cols[3], "Color:", cols[4]);
        }
    }
}

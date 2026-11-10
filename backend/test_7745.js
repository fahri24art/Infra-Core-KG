const fs = require('fs');
const path = require('path');
const downloadPath = path.resolve(__dirname, 'services', 'downloads');
const files = fs.readdirSync(downloadPath);
// Get the latest downloaded CSV
const file = files.sort().reverse().find(f => f.endsWith('.csv'));

if (file) {
    const csvData = fs.readFileSync(path.join(downloadPath, file), 'utf8');
    const lines = csvData.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    // Find row for 7745
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].includes('7745')) {
            const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
            console.log("Found 7745!");
            console.log("Total Prints:", cols[2]);
            console.log("B & W(Total Prints):", cols[3]);
            console.log("Color(Total Prints):", cols[4]);
            console.log("B & W:Result:", cols[5]);
            console.log("Color:Result:", cols[6]);
            console.log("Full line:", lines[i]);
        }
    }
}

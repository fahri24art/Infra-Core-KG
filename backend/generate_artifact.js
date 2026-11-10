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
    const nameIdx = headers.findIndex(h => h.includes('Name') && !h.includes('User'));
    const bwTotalIdx = headers.findIndex(h => h.includes('B & W(Total Prints)'));
    const colorTotalIdx = headers.findIndex(h => h.includes('Color(Total Prints)'));
    
    let markdown = `# Daftar PIN Asli dari Mesin Ricoh\n\n`;
    markdown += `> [!NOTE]\n> Ini adalah daftar 93 PIN yang **saat ini terdaftar secara fisik di dalam mesin Ricoh (192.168.2.11)** beserta jumlah *print*-nya. Gunakan PIN dari daftar ini untuk didaftarkan ke Dashboard Power Asset agar angkanya bisa tersinkronisasi.\n\n`;
    
    markdown += `| Nama / Komputer | PIN Asli | Print B&W | Print Color |\n`;
    markdown += `|-----------------|----------|-----------|-------------|\n`;
    
    let users = [];
    
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
        let userCode = cols[userIdx] || '';
        let name = cols[nameIdx] || '';
        userCode = userCode.replace(/\[|\]/g, '').trim();
        name = name.replace(/\[|\]/g, '').trim();
        
        const sumBW = parseInt(cols[bwTotalIdx] || '0') || 0;
        const sumColor = parseInt(cols[colorTotalIdx] || '0') || 0;
        
        if (userCode) {
            users.push({ name, userCode, sumBW, sumColor });
        }
    }
    
    // Sort by highest total prints
    users.sort((a, b) => (b.sumBW + b.sumColor) - (a.sumBW + a.sumColor));
    
    for (const u of users) {
        markdown += `| **${u.name}** | \`${u.userCode}\` | ${u.sumBW.toLocaleString()} | ${u.sumColor.toLocaleString()} |\n`;
    }
    
    const artifactPath = path.resolve('C:\\Users\\Administrator.DESKTOP-4O314L4\\.gemini\\antigravity\\artifacts\\ricoh_original_pins.md');
    // Ensure artifacts directory exists
    const artifactsDir = path.dirname(artifactPath);
    if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
    }
    fs.writeFileSync(artifactPath, markdown);
    console.log("Artifact created at:", artifactPath);
}

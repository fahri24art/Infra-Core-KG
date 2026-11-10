const fs = require('fs');

const missingAssets = JSON.parse(fs.readFileSync('F:/TCF Project Infra/missing_assets.json', 'utf8'));

let sql = '';

// Delete the corrupted assets occupying these IDs first
const ids = missingAssets.map(a => a.id);
sql += `DELETE FROM assets WHERE id IN (${ids.join(', ')});\n\n`;

// Insert the clean original assets
missingAssets.forEach(asset => {
    const keys = Object.keys(asset);
    const columns = keys.map(k => `"${k}"`).join(', ');
    
    const values = keys.map(k => {
        const val = asset[k];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return "'" + val.replace(/'/g, "''") + "'";
        if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'"; // For JSON columns like specs
        return val;
    }).join(', ');
    
    sql += `INSERT INTO assets (${columns}) VALUES (${values});\n`;
});

fs.writeFileSync('F:/TCF Project Infra/restore_missing_assets.sql', sql);
console.log('SQL generated with DELETE + INSERT for ' + missingAssets.length + ' assets.');

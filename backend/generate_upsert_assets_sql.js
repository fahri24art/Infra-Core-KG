const fs = require('fs');

const assets = JSON.parse(fs.readFileSync('F:/TCF Project Infra/all_local_assets.json', 'utf8'));

let sql = '';

function generateUpsert(tableName, dataArray, conflictKey) {
    let script = '';
    dataArray.forEach(row => {
        const keys = Object.keys(row);
        const columns = keys.map(k => `"${k}"`).join(', ');
        
        const values = keys.map(k => {
            const val = row[k];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return "'" + val.replace(/'/g, "''") + "'";
            if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
            return val;
        }).join(', ');
        
        const updateSet = keys.filter(k => k !== conflictKey).map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
        
        script += `INSERT INTO ${tableName} (${columns}) VALUES (${values}) ON CONFLICT ("${conflictKey}") DO UPDATE SET ${updateSet};\n`;
    });
    return script;
}

sql += generateUpsert('assets', assets, 'id');

fs.writeFileSync('F:/TCF Project Infra/restore_all_assets.sql', sql);
console.log('SQL UPSERT script generated for ' + assets.length + ' assets.');

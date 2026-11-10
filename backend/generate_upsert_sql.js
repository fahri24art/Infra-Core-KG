const fs = require('fs');

const users = JSON.parse(fs.readFileSync('F:/TCF Project Infra/local_users.json', 'utf8'));
const hr = JSON.parse(fs.readFileSync('F:/TCF Project Infra/local_hr.json', 'utf8'));

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

sql += generateUpsert('hr_employees', hr, 'id');
sql += generateUpsert('users', users, 'id');

fs.writeFileSync('F:/TCF Project Infra/restore_users_hr.sql', sql);
console.log('SQL UPSERT script generated for ' + hr.length + ' HR employees and ' + users.length + ' users.');

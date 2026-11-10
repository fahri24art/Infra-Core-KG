const sqlite3 = require('sqlite3').verbose(); 
const path = require('path'); 
const fs = require('fs'); 
const dbPath = path.join(__dirname, '../../check_apar/database/database.sqlite'); 
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => { 
    if (err) { console.error(err.message); process.exit(1); } 
}); 

let sqlOutput = `-- Migration Script for APAR
TRUNCATE TABLE hr_apars CASCADE;
TRUNCATE TABLE hr_apar_checksheets CASCADE;

`; 

db.serialize(() => { 
    db.all('SELECT * FROM apars', (err, rows) => { 
        if (err) throw err; 
        console.log('Found ' + rows.length + ' APARs'); 
        rows.forEach(row => { 
            const code = row.code.replace(/'/g, "''"); 
            const loc = row.location.replace(/'/g, "''"); 
            const type = row.type.replace(/'/g, "''"); 
            sqlOutput += `INSERT INTO hr_apars (id, code, location, type, weight, expired_date) VALUES (${row.id}, '${code}', '${loc}', '${type}', ${row.weight}, '${row.expired_date}');\n`; 
        }); 
        sqlOutput += `SELECT setval('hr_apars_id_seq', (SELECT MAX(id) FROM hr_apars));\n\n`; 

        db.all('SELECT c.*, u.name as inspector_name FROM checksheets c LEFT JOIN users u ON c.user_id = u.id', (err, csRows) => { 
            if (err) throw err; 
            console.log('Found ' + csRows.length + ' Checksheets'); 
            csRows.forEach(row => { 
                const inspector = (row.inspector_name || 'Admin').replace(/'/g, "''"); 
                const notes = (row.notes || '').replace(/'/g, "''"); 
                const isPassed = row.is_passed === 1 ? 'true' : 'false'; 
                const pin = row.pin_status === 1 ? 'true' : 'false'; 
                const pinSeal = row.pin_seal_status === 1 ? 'true' : 'false'; 
                const handle = row.handle_status === 1 ? 'true' : 'false'; 
                const pressure = row.pressure_status === 1 ? 'true' : 'false'; 
                const hose = row.hose_status === 1 ? 'true' : 'false'; 
                const sticker = row.sticker_status === 1 ? 'true' : 'false'; 
                const body = row.body_status === 1 ? 'true' : 'false'; 
                const photos = row.photos ? `'${row.photos}'::jsonb` : 'NULL'; 
                sqlOutput += `INSERT INTO hr_apar_checksheets (id, apar_id, inspector_name, check_date, pin_status, pin_seal_status, handle_status, pressure_status, hose_status, sticker_status, body_status, notes, is_passed, photos, created_at) VALUES (${row.id}, ${row.apar_id}, '${inspector}', '${row.check_date}', ${pin}, ${pinSeal}, ${handle}, ${pressure}, ${hose}, ${sticker}, ${body}, '${notes}', ${isPassed}, ${photos}, '${row.created_at}');\n`; 
            }); 
            sqlOutput += `SELECT setval('hr_apar_checksheets_id_seq', (SELECT MAX(id) FROM hr_apar_checksheets));\n`; 
            
            fs.writeFileSync('apar_migration.sql', sqlOutput); 
            console.log('Migration SQL generated: apar_migration.sql'); 
            db.close(); 
        }); 
    }); 
});

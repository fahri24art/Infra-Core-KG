const { Client } = require('pg');
const fs = require('fs');

async function dump() {
    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'check_apar',
        password: 'nevergiveup',
        port: 5432,
    });
    
    try {
        await client.connect();
        console.log("Connected to check_apar");
        
        const resApars = await client.query('SELECT * FROM apars');
        const resChecksheets = await client.query(`
            SELECT c.*, u.name as inspector_name 
            FROM checksheets c 
            LEFT JOIN users u ON c.user_id = u.id
        `);
        
        const data = {
            apars: resApars.rows,
            checksheets: resChecksheets.rows
        };
        
        let sql = `-- Migration Script for APAR\nTRUNCATE TABLE hr_apars CASCADE;\nTRUNCATE TABLE hr_apar_checksheets CASCADE;\n\n`;
        data.apars.forEach(row => {
            sql += `INSERT INTO hr_apars (id, code, location, type, weight, expired_date) VALUES (${row.id}, '${row.code.replace(/'/g, "''")}', '${row.location.replace(/'/g, "''")}', '${row.type.replace(/'/g, "''")}', ${row.weight}, '${new Date(row.expired_date).toISOString().split('T')[0]}');\n`;
        });
        sql += `SELECT setval('hr_apars_id_seq', (SELECT MAX(id) FROM hr_apars));\n\n`;

        data.checksheets.forEach(row => {
            const inspector = (row.inspector_name || 'Admin').replace(/'/g, "''");
            const notes = (row.notes || '').replace(/'/g, "''");
            const isPassed = row.is_passed ? 'true' : 'false';
            
            const pin = row.pin_status ? 'true' : 'false';
            const pinSeal = row.pin_seal_status ? 'true' : 'false';
            const handle = row.handle_status ? 'true' : 'false';
            const pressure = row.pressure_status ? 'true' : 'false';
            const hose = row.hose_status ? 'true' : 'false';
            const sticker = row.sticker_status ? 'true' : 'false';
            const body = row.body_status ? 'true' : 'false';
            
            const photos = row.photos ? `'${JSON.stringify(row.photos)}'::jsonb` : 'NULL';
            
            sql += `INSERT INTO hr_apar_checksheets (id, apar_id, inspector_name, check_date, pin_status, pin_seal_status, handle_status, pressure_status, hose_status, sticker_status, body_status, notes, is_passed, photos, created_at) VALUES (${row.id}, ${row.apar_id}, '${inspector}', '${new Date(row.check_date).toISOString().split('T')[0]}', ${pin}, ${pinSeal}, ${handle}, ${pressure}, ${hose}, ${sticker}, ${body}, '${notes}', ${isPassed}, ${photos}, '${new Date(row.created_at).toISOString()}');\n`;
        });
        sql += `SELECT setval('hr_apar_checksheets_id_seq', (SELECT MAX(id) FROM hr_apar_checksheets));\n`;
        
        fs.writeFileSync('../apar_migration_pg.sql', sql);
        console.log("SQL Migration generated successfully in parent folder.");
        
    } catch (e) {
        console.error("PG Dump error:", e.message);
    } finally {
        await client.end();
    }
}
dump();

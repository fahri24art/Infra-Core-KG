require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        // List tables
        const tables = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public'
        `);
        console.log("Tables in network_monitor_db:", tables.rows.map(r => r.table_name));

        // Check columns in machines or inventory table
        let targetTable = tables.rows.find(r => r.table_name === 'machines' || r.table_name === 'inventory');
        if (targetTable) {
            console.log(`Checking table: ${targetTable.table_name}`);
            const columns = await db.raw(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='${targetTable.table_name}'
            `);
            console.log("Columns:", columns.rows.map(r => r.column_name));

            // See first row
            const firstRow = await db(targetTable.table_name).first();
            console.log("Sample Row:", firstRow);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();

require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        const assets1 = await db.raw(`SELECT * FROM hr_assets LIMIT 5`);
        console.log("hr_assets:", assets1.rows);
        
        const assets2 = await db.raw(`SELECT * FROM assets LIMIT 5`);
        console.log("assets:", assets2.rows);

        const assets3 = await db.raw(`SELECT * FROM hr_inventory_items LIMIT 5`);
        console.log("hr_inventory_items:", assets3.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();

const fs = require('fs');
const knex = require('knex');

async function clearOverrides(dbPath) {
    if (!fs.existsSync(dbPath)) return;
    console.log(`--- CLEARING MARCH OVERRIDES IN: ${dbPath}`);
    const db = knex({
        client: 'sqlite3',
        connection: { filename: dbPath },
        useNullAsDefault: true
    });

    try {
        const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'");
        if (tables.some(t => t.name === 'kpi_overrides')) {
            const deleted = await db('kpi_overrides').where({ month: 3, year: 2026 }).del();
            console.log(`  Deleted ${deleted} rows.`);
        } else {
            console.log(`  Table 'kpi_overrides' not found.`);
        }
    } catch (err) {
        console.log(`  Error: ${err.message}`);
    } finally {
        await db.destroy();
    }
}

const dbs = [
    'c:/Users/Administrator.DESKTOP-4O314L4/OneDrive - PT. TRI CENTRUM FORTUNA (1)/Documents/Antigravity/network_monitor.db',
    'c:/Users/Administrator.DESKTOP-4O314L4/OneDrive - PT. TRI CENTRUM FORTUNA (1)/Documents/Antigravity/APP_Infra_Guard/network_monitor.db',
    'c:/Users/Administrator.DESKTOP-4O314L4/OneDrive - PT. TRI CENTRUM FORTUNA (1)/Documents/Antigravity/APP_Power_Asset/backend/network_monitor.db',
    'c:/Users/Administrator.DESKTOP-4O314L4/OneDrive - PT. TRI CENTRUM FORTUNA (1)/Documents/Antigravity/APP_Power_Asset/network_monitor.db',
    'c:/Users/Administrator.DESKTOP-4O314L4/OneDrive - PT. TRI CENTRUM FORTUNA (1)/Documents/Antigravity/APP_Infra_Guard/backend/network_monitor.db'
];

async function run() {
    for (const db of dbs) {
        await clearOverrides(db);
    }
}

run();

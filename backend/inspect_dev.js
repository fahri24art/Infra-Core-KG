const knex = require('knex');
const path = require('path');

async function inspect(filename) {
    const db = knex({
        client: 'sqlite3',
        connection: {
            filename: path.join(__dirname, filename)
        },
        useNullAsDefault: true
    });
    try {
        console.log(`\n--- Inspecting ${filename} ---`);
        const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'");
        for (const t of tables) {
            const count = await db(t.name).count('* as count').first();
            console.log(`Table: ${t.name}, Count: ${count.count}`);
            if (t.name === 'maintenance_records' && count.count > 0) {
                 const sample = await db(t.name).limit(1);
                 console.log('Sample record:', sample);
            }
        }
    } catch (e) { console.log('Error:', e.message); }
    finally { await db.destroy(); }
}

inspect('dev.sqlite3');

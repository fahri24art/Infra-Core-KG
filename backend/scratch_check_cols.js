const db = require('./db');

async function check() {
    try {
        const columns = await db('assets').columnInfo();
        console.log("Columns:", Object.keys(columns).join(', '));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();

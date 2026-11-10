const db = require('./db');

async function run() {
    try {
        const result = await db.raw('SELECT cpu_usage FROM assets LIMIT 1');
        console.log('SUCCESS: Column exists');
    } catch(e) {
        console.log('ERROR:', e.message);
    } finally {
        process.exit(0);
    }
}

run();

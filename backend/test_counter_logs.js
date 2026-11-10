require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        const logs = await db('ricoh_counter_logs').orderBy('timestamp', 'desc').limit(10);
        console.log(logs);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();

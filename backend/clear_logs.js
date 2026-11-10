require('dotenv').config();
const db = require('./db');

async function fix() {
    try {
        await db('ricoh_system_logs').del();
        console.log("Cleared garbage logs from ricoh_system_logs");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
fix();

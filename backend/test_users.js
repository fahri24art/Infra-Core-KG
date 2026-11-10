require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        const users = await db.raw(`SELECT * FROM users LIMIT 5`);
        console.log("users:", users.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();

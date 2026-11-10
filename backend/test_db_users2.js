require('dotenv').config();
const db = require('./db');

async function check() {
    const user2023 = await db('ricoh_users').where('id', '2023').orWhere('id', 2023).first();
    console.log("Ricoh User 2023:", user2023);
    const users = await db('ricoh_users').select('*');
    console.log("All ricoh users count:", users.length);
    process.exit(0);
}

check();

require('dotenv').config();
const db = require('./db');

async function check() {
    const user = await db('ricoh_device_quotas').where('user_code', '7453').first();
    console.log("DB User 7453:", user);
    
    const user2023 = await db('ricoh_device_quotas').where('user_code', '2023').first();
    console.log("DB User 2023:", user2023);
    
    process.exit(0);
}

check();

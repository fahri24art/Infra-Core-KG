require('dotenv').config();
const db = require('./db');

async function check() {
    const users = await db('ricoh_device_quotas').select('user_code', 'computer_name', 'current_usage_bw');
    console.log("DB Users:");
    console.log(users.slice(0, 10)); // just print a few to see
    process.exit(0);
}

check();

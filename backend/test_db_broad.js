require('dotenv').config();
const db = require('./db');

async function check() {
    const all = await db('ricoh_device_quotas').select('user_code', 'computer_name');
    console.log("Total computers in DB:", all.length);
    const u7453 = all.find(u => u.user_code && u.user_code.includes('7453'));
    console.log("Did we find 7453 anywhere?", u7453);
    const d4O = all.find(u => u.computer_name && u.computer_name.includes('4O314L4'));
    console.log("Did we find DESKTOP-4O314L4?", d4O);
    process.exit(0);
}

check();

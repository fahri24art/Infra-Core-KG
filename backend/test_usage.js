require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        const row = await db('ricoh_device_quotas')
          .where('computer_name', 'DESKTOP-4O314L4')
          .first();
        console.log(row);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();

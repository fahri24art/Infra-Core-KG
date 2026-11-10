require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        const rows = await db('ricoh_device_quotas')
          .leftJoin('assets', 'ricoh_device_quotas.computer_name', 'assets.name')
          .leftJoin('users', 'assets.user_id', 'users.id')
          .select('ricoh_device_quotas.*', 'assets.contact as inventory_contact', 'users.name as inventory_user_name')
          .limit(5);
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();

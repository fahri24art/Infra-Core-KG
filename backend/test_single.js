require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        const row = await db('ricoh_device_quotas')
          .leftJoin('assets', 'ricoh_device_quotas.computer_name', 'assets.name')
          .leftJoin('users', 'assets.user_id', 'users.id')
          .select('ricoh_device_quotas.computer_name', 'assets.name as asset_name', 'assets.contact', 'users.name as user_name')
          .where('ricoh_device_quotas.computer_name', 'DESKTOP-4O314L4')
          .first();
        console.log("DESKTOP-4O314L4 ->", row);
        
        const allAssets = await db('assets').select('name').limit(20);
        console.log("First 20 assets in DB:", allAssets.map(a => a.name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();

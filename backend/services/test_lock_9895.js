
require('dotenv').config({ path: '/opt/power_asset/backend/.env' });
const { syncCopierPermissionToPrinters } = require('./ricoh_copier_lock');

async function test() {
    console.log("Testing syncCopierPermissionToPrinters for 9895 (lock copier)...");
    await syncCopierPermissionToPrinters('9895', false);
    console.log("Test finished.");
}
test().catch(e => console.error("TEST FAILED:", e));

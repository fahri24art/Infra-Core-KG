
require('dotenv').config({ path: '/opt/power_asset/backend/.env' });
const { syncCopierPermissionToPrinters } = require('/opt/power_asset/backend/services/ricoh_copier_lock');

async function testLock() {
    console.log("Triggering syncCopierPermissionToPrinters(9895, false)...");
    const res = await syncCopierPermissionToPrinters('9895', false);
    console.log("Result:", res);
    process.exit(0);
}
testLock().catch(e => {
    console.error("ERROR:", e);
    process.exit(1);
});

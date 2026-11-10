
require('dotenv').config({ path: '/opt/power_asset/backend/.env' });
const { syncCopierPermissionToPrinters } = require('/opt/power_asset/backend/services/ricoh_copier_lock');

async function testUnlock() {
    console.log("Unlocking PIN 9895 on printers (allow = true)...");
    await syncCopierPermissionToPrinters('9895', true);
    console.log("Unlock finished.");
}
testUnlock().catch(e => console.error("UNLOCK ERROR:", e));

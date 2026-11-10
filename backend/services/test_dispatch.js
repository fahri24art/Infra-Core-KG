
require('dotenv').config({ path: '/opt/power_asset/backend/.env' });
const { checkAndDispatchAllQuotaWarnings, getDeviceQuotaStatuses } = require('/opt/power_asset/backend/services/ricoh_quota_notifier');

async function test() {
    console.log("=== EVALUATING DEVICES ===");
    const devices = await getDeviceQuotaStatuses('TCF-SG');
    const warningOrLocked = devices.filter(d => d.current_threshold >= 90);
    console.log(`Found ${warningOrLocked.length} devices with threshold >= 90:`);
    warningOrLocked.forEach(d => {
        console.log(`- ${d.computer_name} (${d.display_user}, PIN: ${d.user_code}, WA: ${d.whatsapp_number}): threshold=${d.current_threshold}, notified=${d.is_notified_for_current_threshold}, Copier: ${d.usage_copier}/${d.quota_copier}`);
    });

    console.log("\n=== DISPATCHING NOTIFICATIONS ===");
    const res = await checkAndDispatchAllQuotaWarnings('TCF-SG');
    console.log("Result:", JSON.stringify(res, null, 2));
    process.exit(0);
}
test().catch(e => { console.error("TEST ERROR:", e); process.exit(1); });

require('dotenv').config();
const db = require('./db');

async function check() {
    const hrInfo = await db('hr_assets').columnInfo();
    console.log("hr_assets schema:");
    for (const [col, info] of Object.entries(hrInfo)) {
        console.log(`  ${col}: ${info.type}`);
    }
    
    const machineInfo = await db('hr_inventory').columnInfo();
    console.log("\nhr_inventory schema:");
    for (const [col, info] of Object.entries(machineInfo)) {
        console.log(`  ${col}: ${info.type}`);
    }

    process.exit();
}
check().catch(console.error);

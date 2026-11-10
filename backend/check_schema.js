require('dotenv').config();
const db = require('./db');

async function checkSchema() {
    const tableInfo = await db('global_dropdowns').columnInfo();
    console.log("global_dropdowns:", Object.keys(tableInfo));
    
    const hrInfo = await db('hr_assets').columnInfo();
    console.log("hr_assets:", Object.keys(hrInfo));
    
    const machineInfo = await db('hr_inventory').columnInfo();
    console.log("hr_inventory:", Object.keys(machineInfo));

    process.exit();
}
checkSchema().catch(console.error);

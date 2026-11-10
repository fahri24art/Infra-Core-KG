require('dotenv').config();
const db = require('./db');

async function check() {
    const data = await db('global_dropdowns').limit(5);
    console.log("global_dropdowns sample:", data);
    process.exit();
}
check().catch(console.error);

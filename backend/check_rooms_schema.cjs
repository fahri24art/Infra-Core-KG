require('dotenv').config();
const db = require('./db');
async function test() {
    try {
        const res = await db.raw("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hr_meeting_rooms'");
        console.log("hr_meeting_rooms cols:", res.rows.map(r => r.column_name));
        
        const res2 = await db.raw("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hr_apar_records'");
        console.log("hr_apar_records cols:", res2.rows.map(r => r.column_name));
    } catch(err) {
        console.error(err);
    }
    process.exit();
}
test();

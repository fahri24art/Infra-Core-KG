require('dotenv').config();
const db = require('./db');

async function run() {
    try {
        const rows = await db('raw_documents').select('title', 'type');
        console.log(JSON.stringify(rows.filter(r => r.type === 'SOP' || r.title.includes('SOP')), null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();

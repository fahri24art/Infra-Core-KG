require('dotenv').config();
const db = require('./db');

async function run() {
    try {
        const rows = await db('raw_documents')
            .where('title', 'ilike', '%TCFSG-FM-MR-04%')
            .select('title', 'type');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();

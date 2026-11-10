require('dotenv').config();
const db = require('./db');

async function run() {
    try {
        await db('raw_documents')
            .where('title', 'ilike', '%TCFSG-FM-MR-04%')
            .update({ type: 'SOP' });
        console.log('Fixed to SOP');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();

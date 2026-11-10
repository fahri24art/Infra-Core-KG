require('dotenv').config();
const db = require('./db');

async function listSops() {
    try {
        const sops = await db('raw_documents').where('type', 'SOP').select('title');
        console.log(JSON.stringify(sops, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listSops();

const fs = require('fs');
require('dotenv').config();
const db = require('./db');

async function run() {
    try {
        const localAssets = await db('assets').select('*');
        fs.writeFileSync('F:/TCF Project Infra/all_local_assets.json', JSON.stringify(localAssets));
        console.log(`Exported ${localAssets.length} assets to all_local_assets.json`);
    } catch(e) {
        console.error(e);
    } finally {
        db.destroy();
    }
}
run();

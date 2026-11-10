const fs = require('fs');
require('dotenv').config();
const db = require('./db');
const actions = JSON.parse(fs.readFileSync('actions.json', 'utf8'));
const insertedNumbers = actions.inserts.map(item => item.inventory_number);

async function run() {
    try {
        const localAssets = await db('assets').whereIn('inventory_number', insertedNumbers);
        fs.writeFileSync('F:/TCF Project Infra/missing_assets.json', JSON.stringify(localAssets, null, 2));
        console.log('Exported ' + localAssets.length + ' original assets to missing_assets.json');
    } catch(e) {
        console.error(e);
    } finally {
        db.destroy();
    }
}
run();

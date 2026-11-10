require('dotenv').config();
const db = require('./db');
const fs = require('fs');

async function rollback() {
    try {
        const actions = JSON.parse(fs.readFileSync('actions.json', 'utf8'));
        
        const insertedNumbers = actions.inserts.map(item => item.inventory_number);
        
        console.log(`Found ${insertedNumbers.length} assets to rollback (DELETE).`);
        
        const deletedCount = await db('assets')
            .whereIn('inventory_number', insertedNumbers)
            .where('created_at', '>=', '2026-09-09')
            .del();
            
        console.log(`Successfully deleted ${deletedCount} newly inserted assets.`);
        
        console.log('NOTE: The 29 updated assets were kept with their new Excel inventory numbers because only their numbers were updated, not their users.');
        
    } catch (e) {
        console.error(e);
    } finally {
        db.destroy();
    }
}

rollback();

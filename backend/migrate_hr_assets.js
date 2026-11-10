require('dotenv').config();
const db = require('./db');

async function migrate() {
    try {
        console.log("Starting migration...");
        
        // 1. Add status_text and location_text to hr_assets if they don't exist
        const hasStatusText = await db.schema.hasColumn('hr_assets', 'status_text');
        if (!hasStatusText) {
            await db.schema.alterTable('hr_assets', t => {
                t.string('status_text');
                t.string('location_text');
            });
            console.log("Added status_text and location_text to hr_assets.");
        }

        // 2. Populate existing data
        const assets = await db('hr_assets')
            .leftJoin('hr_locations', 'hr_assets.location_id', 'hr_locations.id')
            .leftJoin('hr_status_labels', 'hr_assets.status_id', 'hr_status_labels.id')
            .select('hr_assets.id', 'hr_status_labels.name as status_name', 'hr_locations.name as loc_name');
            
        for (const asset of assets) {
            await db('hr_assets').where('id', asset.id).update({
                status_text: asset.status_name || 'Deployed',
                location_text: asset.loc_name || 'Office'
            });
        }
        console.log(`Migrated ${assets.length} hr_assets records.`);

        // 3. Add status and location to hr_inventory (Machine Assets)
        const hasStatus = await db.schema.hasColumn('hr_inventory', 'status_text');
        if (!hasStatus) {
            await db.schema.alterTable('hr_inventory', t => {
                t.string('status_text').defaultTo('Active');
                t.string('location_text').defaultTo('Warehouse');
            });
            console.log("Added status_text and location_text to hr_inventory.");
        }

        console.log("Migration complete!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}
migrate();

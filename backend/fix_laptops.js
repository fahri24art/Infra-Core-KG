require('dotenv').config();
const db = require('./db');

async function fixLaptops() {
    console.log("Fetching assets that might be miscategorized as PC instead of NB...");
    
    // We want assets where inventory_number contains '-PC-' 
    // AND (hostname contains LAPTOP/NOTEBOOK OR network_type contains WIFI/WIRELESS)
    const assets = await db('assets')
        .where('inventory_number', 'like', '%-ICT-PC-%')
        .andWhere(function() {
            this.where('name', 'ilike', '%LAPTOP%')
                .orWhere('name', 'ilike', '%NOTEBOOK%')
                .orWhere('network_type', 'ilike', '%WIFI%')
                .orWhere('network_type', 'ilike', '%WIRELESS%')
        });

    console.log(`Found ${assets.length} assets to fix.`);

    let updated = 0;
    
    for (let asset of assets) {
        // Determine Org and Year from existing inventory_number
        // Format: TCFSG-ICT-PC-2024-001
        const parts = asset.inventory_number.split('-');
        if (parts.length < 5) continue; // invalid format

        const org = parts[0]; // TCFSG or TCFKG
        const year = parts[3]; // 2024

        const prefix = `${org}-ICT-NB-${year}-`;
        
        // Get the latest NB number for this prefix
        const latest = await db('assets')
            .where('inventory_number', 'like', `${prefix}%`)
            .orderBy('inventory_number', 'desc')
            .first();
            
        let nextNum = 1;
        if (latest && latest.inventory_number) {
            const lParts = latest.inventory_number.split('-');
            const lastPart = lParts[lParts.length - 1];
            if (!isNaN(lastPart)) {
                nextNum = parseInt(lastPart) + 1;
            }
        }
        
        const newId = prefix + nextNum.toString().padStart(3, '0');
        
        // Update the asset
        await db('assets').where('id', asset.id).update({ 
            inventory_number: newId,
            category: 'Laptop' // ensure category is correct too
        });
        
        console.log(`✅ Fixed: ${asset.name} | Old: ${asset.inventory_number} -> New: ${newId}`);
        updated++;
    }

    console.log(`\nFinished! Fixed ${updated} assets.`);
    process.exit(0);
}

fixLaptops().catch(err => {
    console.error(err);
    process.exit(1);
});

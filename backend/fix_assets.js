require('dotenv').config();
const db = require('./db');

async function fix() {
    const assets = await db('assets').where('inventory_number', 'like', 'AUTO-%').orWhere('inventory_number', 'like', 'INV-%').orWhereNull('inventory_number');
    let updated = 0;
    
    // Process one by one to ensure sequence doesn't overlap
    for (let asset of assets) {
        // Determine Org
        let org = 'TCFSG';
        if (asset.ip_address && asset.ip_address.startsWith('192.168.2.')) org = 'TCFKG';
        
        // Determine Cat
        let cat = 'PC';
        const catStr = (asset.category || '').toLowerCase();
        if (catStr.includes('laptop')) cat = 'LT';
        else if (catStr.includes('server')) cat = 'SV';
        else if (catStr.includes('network') || catStr.includes('router') || catStr.includes('switch')) cat = 'NT';
        else if (catStr.includes('printer') || catStr.includes('scanner')) cat = 'PR';
        else if (catStr.includes('cctv')) cat = 'CC';
        
        // Determine Year
        let year = new Date().getFullYear();
        if (asset.purchase_date) {
            year = new Date(asset.purchase_date).getFullYear();
        } else if (asset.created_at) {
            year = new Date(asset.created_at).getFullYear();
        }

        const prefix = `${org}-ICT-${cat}-${year}-`;
        
        // Get latest number for this prefix
        const latest = await db('assets').where('inventory_number', 'like', `${prefix}%`).orderBy('inventory_number', 'desc').first();
        let nextNum = 1;
        if (latest && latest.inventory_number) {
            const parts = latest.inventory_number.split('-');
            const lastPart = parts[parts.length - 1];
            if (!isNaN(lastPart)) {
                nextNum = parseInt(lastPart) + 1;
            }
        }
        
        const newId = prefix + nextNum.toString().padStart(3, '0');
        await db('assets').where('id', asset.id).update({ inventory_number: newId });
        console.log(`Updated asset ${asset.id} (${asset.name}) to ${newId}`);
        updated++;
    }
    console.log('Fixed ' + updated + ' assets');
    process.exit(0);
}

fix();

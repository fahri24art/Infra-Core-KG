const fs = require('fs');
const path = require('path');
const knex = require('knex')(require('./db.js').client.config);

async function run() {
    try {
        console.log("Reading snipeit_data.json...");
        const dataPath = path.join(__dirname, '..', '..', 'snipeit_data.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        console.log("Dropping existing HR tables if any...");
        await knex.schema.dropTableIfExists('hr_action_logs');
        await knex.schema.dropTableIfExists('hr_assets');
        await knex.schema.dropTableIfExists('hr_models');
        await knex.schema.dropTableIfExists('hr_categories');
        await knex.schema.dropTableIfExists('hr_locations');
        await knex.schema.dropTableIfExists('hr_status_labels');
        
        console.log("Creating new Snipe-IT schema...");
        await knex.schema.createTable('hr_categories', t => {
            t.integer('id').primary();
            t.string('name');
            t.string('category_type');
        });
        
        await knex.schema.createTable('hr_models', t => {
            t.integer('id').primary();
            t.string('name');
            t.integer('category_id');
            t.string('manufacturer_id');
            t.string('model_number');
        });
        
        await knex.schema.createTable('hr_locations', t => {
            t.integer('id').primary();
            t.string('name');
            t.integer('parent_id').nullable();
        });
        
        await knex.schema.createTable('hr_status_labels', t => {
            t.integer('id').primary();
            t.string('name');
            t.string('type'); // deployable, pending, etc
            t.string('color');
        });
        
        await knex.schema.createTable('hr_assets', t => {
            t.integer('id').primary();
            t.string('asset_tag').unique();
            t.string('name').nullable();
            t.integer('model_id');
            t.string('serial').nullable();
            t.integer('status_id').nullable();
            t.integer('location_id').nullable();
            t.integer('rtd_location_id').nullable();
            t.integer('assigned_to').nullable();
            t.string('assigned_type').nullable(); // user, location, asset
            t.decimal('purchase_cost', 15, 2).nullable();
            t.date('purchase_date').nullable();
            t.text('notes').nullable();
            t.timestamps(true, true);
        });

        // Filter ICT Categories
        const ictCategories = [
            'Monitor / Display', 'CCTV', 'NOTEBOOK', 'Computer', 'Computer built up', 
            'Server', 'Printer', 'SERVER COMPUTER', 'Access Point', 'Switch', 'Router', 
            'Modem', 'Firewall', 'PABX', 'Telephone', 'Scanner', 'Projector', 'UPS', 
            'Keyboard', 'Mouse', 'Headset', 'Webcam', 'Storage', 'Harddisk', 'SSD', 'RAM'
        ];
        
        const validCategories = data.categories.filter(c => !ictCategories.some(ict => c.name.toLowerCase().includes(ict.toLowerCase())));
        const validCategoryIds = validCategories.map(c => c.id);
        
        console.log(`Inserting ${validCategories.length} HRGA Categories...`);
        for (const cat of validCategories) {
            await knex('hr_categories').insert({ id: cat.id, name: cat.name, category_type: cat.category_type });
        }
        
        const validModels = data.models.filter(m => validCategoryIds.includes(m.category_id));
        const validModelIds = validModels.map(m => m.id);
        
        console.log(`Inserting ${validModels.length} HRGA Models...`);
        for (const mod of validModels) {
            await knex('hr_models').insert({
                id: mod.id, name: mod.name, category_id: mod.category_id, 
                manufacturer_id: mod.manufacturer_id?.toString() || null, model_number: mod.model_number
            });
        }
        
        console.log(`Inserting ${data.locations.length} Locations...`);
        for (const loc of data.locations) {
            await knex('hr_locations').insert({ id: loc.id, name: loc.name, parent_id: loc.parent_id });
        }
        
        console.log(`Inserting ${data.status_labels.length} Status Labels...`);
        for (const sl of data.status_labels) {
            await knex('hr_status_labels').insert({ id: sl.id, name: sl.name, type: sl.type, color: sl.color });
        }
        
        const validAssets = data.assets.filter(a => validModelIds.includes(a.model_id));
        
        console.log(`Inserting ${validAssets.length} HRGA Assets...`);
        for (const asset of validAssets) {
            // "ganti code asset dari TCF2 ke TCFSG"
            let newTag = asset.asset_tag;
            if (newTag) {
                newTag = newTag.replace(/TCF2/g, 'TCFSG');
            }
            
            await knex('hr_assets').insert({
                id: asset.id,
                asset_tag: newTag,
                name: asset.name,
                model_id: asset.model_id,
                serial: asset.serial,
                status_id: asset.status_id,
                location_id: asset.location_id,
                rtd_location_id: asset.rtd_location_id,
                assigned_to: asset.assigned_to,
                assigned_type: asset.assigned_type,
                purchase_cost: asset.purchase_cost,
                purchase_date: asset.purchase_date,
                notes: asset.notes
            });
        }

        console.log("Seeding complete!");
        process.exit(0);
    } catch (err) {
        console.error("Error seeding DB:", err);
        process.exit(1);
    }
}

run();

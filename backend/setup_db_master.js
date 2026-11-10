require('dotenv').config();
const db = require('./db');

async function createTables() {
    console.log("Setting up Inventory and Hydrant tables...");

    try {
        // --- INVENTORY TABLES ---
        const hasInventoryItems = await db.schema.hasTable('hr_inventory_items');
        if (!hasInventoryItems) {
            await db.schema.createTable('hr_inventory_items', table => {
                table.increments('id').primary();
                table.string('item_code', 100).unique().notNullable();
                table.string('name', 255).notNullable();
                table.string('category', 100);
                table.string('department', 50).notNullable(); // 'ICT' or 'HRGA'
                table.integer('stock_qty').defaultTo(0);
                table.integer('min_stock_alert').defaultTo(0);
                table.string('unit', 50);
                table.timestamp('created_at').defaultTo(db.fn.now());
            });
            console.log("Created hr_inventory_items");
        } else {
            console.log("Table hr_inventory_items already exists");
        }

        const hasInventoryTransactions = await db.schema.hasTable('hr_inventory_transactions');
        if (!hasInventoryTransactions) {
            await db.schema.createTable('hr_inventory_transactions', table => {
                table.increments('id').primary();
                table.integer('item_id').references('id').inTable('hr_inventory_items').onDelete('CASCADE');
                table.string('type', 10).notNullable(); // 'IN' or 'OUT'
                table.integer('qty').notNullable();
                table.string('requestor_name', 255);
                table.text('notes');
                table.timestamp('created_at').defaultTo(db.fn.now());
            });
            console.log("Created hr_inventory_transactions");
        } else {
            console.log("Table hr_inventory_transactions already exists");
        }

        // --- HYDRANT TABLES ---
        const hasHydrants = await db.schema.hasTable('hr_hydrants');
        if (!hasHydrants) {
            await db.schema.createTable('hr_hydrants', table => {
                table.increments('id').primary();
                table.string('code', 100).unique().notNullable();
                table.string('location', 255);
                table.string('type', 100);
                table.timestamp('created_at').defaultTo(db.fn.now());
            });
            console.log("Created hr_hydrants");
        } else {
            console.log("Table hr_hydrants already exists");
        }

        const hasHydrantChecksheets = await db.schema.hasTable('hr_hydrant_checksheets');
        if (!hasHydrantChecksheets) {
            await db.schema.createTable('hr_hydrant_checksheets', table => {
                table.increments('id').primary();
                table.integer('hydrant_id').references('id').inTable('hr_hydrants').onDelete('CASCADE');
                table.date('check_date').notNullable();
                table.string('inspector_name', 100);
                table.boolean('is_box_good');
                table.boolean('is_hose_good');
                table.boolean('is_nozzle_good');
                table.boolean('is_valve_good');
                table.string('water_pressure', 50);
                table.string('status', 50); // 'OK' or 'RUSAK'
                table.text('notes');
                table.jsonb('photos');
                table.timestamp('created_at').defaultTo(db.fn.now());
            });
            console.log("Created hr_hydrant_checksheets");
        } else {
            console.log("Table hr_hydrant_checksheets already exists");
        }

        const hasHydrantLogs = await db.schema.hasTable('hr_hydrant_check_logs');
        if (!hasHydrantLogs) {
            await db.schema.createTable('hr_hydrant_check_logs', table => {
                table.increments('id').primary();
                table.integer('check_id').references('id').inTable('hr_hydrant_checksheets').onDelete('CASCADE');
                table.string('edited_by', 100);
                table.timestamp('edited_at').defaultTo(db.fn.now());
                table.jsonb('changes');
            });
            console.log("Created hr_hydrant_check_logs");
        } else {
            console.log("Table hr_hydrant_check_logs already exists");
        }

        console.log("Database setup complete.");
    } catch (error) {
        console.error("Error setting up DB:", error);
    } finally {
        process.exit(0);
    }
}

createTables();

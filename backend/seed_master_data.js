require('dotenv').config();
const db = require('./db');

async function seed() {
    try {
        console.log("Seeding Master Data...");

        // 1. Dropdown Options (Asset Status & Location)
        const existingDropdowns = await db('app_dropdown_options').count('id as count');
        if (existingDropdowns[0].count == 0) {
            await db('app_dropdown_options').insert([
                { category: 'asset_status', value: 'Deployed', label: 'Deployed', sort_order: 1, is_active: true },
                { category: 'asset_status', value: 'Active', label: 'Active', sort_order: 2, is_active: true },
                { category: 'asset_status', value: 'In Repair', label: 'In Repair', sort_order: 3, is_active: true },
                { category: 'asset_status', value: 'Broken', label: 'Broken', sort_order: 4, is_active: true },
                { category: 'asset_status', value: 'Archived', label: 'Archived', sort_order: 5, is_active: true },
                { category: 'asset_location', value: 'Office', label: 'Office', sort_order: 1, is_active: true },
                { category: 'asset_location', value: 'Warehouse', label: 'Warehouse', sort_order: 2, is_active: true },
                { category: 'asset_location', value: 'Factory Floor', label: 'Factory Floor', sort_order: 3, is_active: true }
            ]);
            console.log("Seeded Dropdown Options.");
        }

        // 2. Asset Categories
        const existingCategories = await db('app_asset_categories').count('id as count');
        if (existingCategories[0].count == 0) {
            await db('app_asset_categories').insert([
                { name: 'Computer / PC', icon: 'Monitor', description: 'Desktop computers and workstations', is_active: true },
                { name: 'Laptop', icon: 'Laptop', description: 'Portable computers', is_active: true },
                { name: 'Printer', icon: 'Printer', description: 'Office printers and scanners', is_active: true },
                { name: 'Network Device', icon: 'Server', description: 'Routers, Switches, Access Points', is_active: true },
                { name: 'CCTV', icon: 'Camera', description: 'Security cameras', is_active: true }
            ]);
            console.log("Seeded Asset Categories.");
        }

        // 3. Node Types
        const existingNodeTypes = await db('app_node_types').count('id as count');
        if (existingNodeTypes[0].count == 0) {
            await db('app_node_types').insert([
                { name: 'Server', description: 'Physical or Virtual Server' },
                { name: 'Workstation', description: 'Employee PC' },
                { name: 'Router', description: 'Network Edge Router' },
                { name: 'Switch', description: 'Network Switch' }
            ]);
            console.log("Seeded Node Types.");
        }

        console.log("Seeding complete!");
    } catch (e) {
        console.error("Seeding failed:", e);
    } finally {
        process.exit();
    }
}
seed();

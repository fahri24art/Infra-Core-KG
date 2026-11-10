require('dotenv').config();
const db = require('./db');

async function migrate() {
    try {
        console.log("Starting department migration...");

        // 1. Create ricoh_departments table
        const hasDepartments = await db.schema.hasTable('ricoh_departments');
        if (!hasDepartments) {
            await db.schema.createTable('ricoh_departments', table => {
                table.increments('id').primary();
                table.string('name').notNullable().unique();
                table.integer('monthly_quota_bw').defaultTo(10000);
                table.integer('monthly_quota_color').defaultTo(5000);
                table.timestamp('created_at').defaultTo(db.fn.now());
            });
            console.log("Created ricoh_departments table.");
        } else {
            console.log("Table ricoh_departments already exists.");
        }

        // 2. Add department_id to ricoh_device_quotas
        const hasDeptId = await db.schema.hasColumn('ricoh_device_quotas', 'department_id');
        if (!hasDeptId) {
            await db.schema.table('ricoh_device_quotas', table => {
                table.integer('department_id').references('id').inTable('ricoh_departments').onDelete('SET NULL');
            });
            console.log("Added department_id to ricoh_device_quotas.");
        } else {
            console.log("Column department_id already exists in ricoh_device_quotas.");
        }

        console.log("Migration complete!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
}

migrate();

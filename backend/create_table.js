require('dotenv').config();
const db = require('./db');

async function createTable() {
    try {
        const exists = await db.schema.hasTable('ricoh_print_jobs');
        if (!exists) {
            await db.schema.createTable('ricoh_print_jobs', table => {
                table.increments('id').primary();
                table.integer('job_id').notNullable();
                table.string('user_name');
                table.string('user_id');
                table.string('document_name');
                table.string('status');
                table.integer('pages');
                table.string('printer_ip').defaultTo('192.168.2.11');
                table.string('timestamp').notNullable();
                table.timestamp('created_at').defaultTo(db.fn.now());
                
                table.unique(['job_id', 'timestamp', 'document_name'], { indexName: 'ricoh_print_jobs_unique_idx' });
            });
            console.log('✅ Table ricoh_print_jobs created successfully!');
        } else {
            console.log('⚠️ Table ricoh_print_jobs already exists.');
        }
    } catch (err) {
        console.error('❌ Error creating table:', err);
    } finally {
        process.exit(0);
    }
}

createTable();

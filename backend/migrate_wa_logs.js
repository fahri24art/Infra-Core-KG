const db = require('./db');

async function migrate() {
    try {
        console.log('Checking for whatsapp_logs table...');
        const exists = await db.schema.hasTable('whatsapp_logs');
        
        if (!exists) {
            console.log('Creating whatsapp_logs table locally...');
            await db.schema.createTable('whatsapp_logs', (table) => {
                table.increments('id').primary();
                table.string('sender_number');
                table.string('sender_name');
                table.text('message_text');
                table.string('direction'); // 'IN' or 'OUT'
                table.timestamp('timestamp').defaultTo(db.fn.now());
            });
            console.log('Table whatsapp_logs created successfully!');
        } else {
            console.log('Table whatsapp_logs already exists.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();

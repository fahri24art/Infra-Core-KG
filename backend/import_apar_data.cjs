const knex = require('knex');

const srcDb = knex({
    client: 'sqlite3',
    connection: { filename: '../../check_apar/database/database.sqlite' },
    useNullAsDefault: true
});

const targetDb = knex(require('./db.js').client.config);

async function transferData() {
    try {
        console.log('Reading from source...');
        const apars = await srcDb('apars').select('*');
        console.log(`Found ${apars.length} APARs.`);
        
        // Let's clear the dummy data we added earlier
        await targetDb('hr_apars').del();
        
        // Insert APARs
        for (const apar of apars) {
            await targetDb('hr_apars').insert({
                id: apar.id,
                code: apar.code,
                location: apar.location,
                type: apar.type,
                weight: apar.weight,
                expired_date: apar.expired_date,
                created_at: apar.created_at,
                updated_at: apar.updated_at
            });
        }
        console.log('Imported APARs to hr_apars.');

        // Now checksheets
        const checksheets = await srcDb('checksheets').select('*');
        console.log(`Found ${checksheets.length} Checksheets.`);
        
        await targetDb('hr_apar_checksheets').del();

        for (const cs of checksheets) {
            await targetDb('hr_apar_checksheets').insert({
                id: cs.id,
                apar_id: cs.apar_id,
                inspector_name: 'Admin', // In Laravel it was user_id, let's just map it to Admin or we can join users
                check_date: cs.check_date,
                pin_status: cs.pin_status,
                pin_seal_status: cs.pin_seal_status,
                handle_status: cs.handle_status,
                pressure_status: cs.pressure_status,
                hose_status: cs.hose_status,
                sticker_status: cs.sticker_status,
                body_status: cs.body_status,
                notes: cs.notes,
                photos: cs.photos,
                is_passed: cs.is_passed,
                created_at: cs.created_at,
                updated_at: cs.updated_at
            });
        }
        console.log('Imported Checksheets to hr_apar_checksheets.');

    } catch (err) {
        console.error('Import Error:', err);
    } finally {
        await srcDb.destroy();
        await targetDb.destroy();
    }
}

transferData();

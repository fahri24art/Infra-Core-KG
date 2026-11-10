const db = require('./db');

async function insertTechSettings() {
    try {
        console.log('Creating settings table if not exists...');
        await db.schema.hasTable('settings').then(async (exists) => {
            if (!exists) {
                await db.schema.createTable('settings', (table) => {
                    table.increments('id');
                    table.string('section');
                    table.string('key');
                    table.text('value');
                    table.timestamps();
                });
                console.log('Settings table created');
            } else {
                console.log('Settings table already exists');
            }
        });

        console.log('Deleting old tickets settings...');
        await db('settings').where({ section: 'tickets' }).del();

        console.log('Inserting technician numbers...');
        const supervisorNum = '6285697522219';
        const technicianNum = '6281220729559';
        const technicianLid = '215582024675529';

        await db('settings').insert([
            { section: 'tickets', key: 'supervisor_number', value: supervisorNum },
            { section: 'tickets', key: 'technician_number', value: technicianNum },
            { section: 'tickets', key: 'technician_lid', value: technicianLid }
        ]);

        console.log('Technician settings inserted successfully!');

        console.log('Verifying settings...');
        const settings = await db('settings').where({ section: 'tickets' }).select('*');
        console.log('Current settings:', settings);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

insertTechSettings();

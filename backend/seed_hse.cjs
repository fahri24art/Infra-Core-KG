const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function seedHse() {
    console.log('Starting HSE Database Setup & Seeding...');

    try {
        // 1. hse_incidents
        const hasIncidents = await db.schema.hasTable('hse_incidents');
        if (!hasIncidents) {
            await db.schema.createTable('hse_incidents', table => {
                table.increments('id').primary();
                table.string('title').notNullable();
                table.date('incident_date').notNullable();
                table.string('location');
                table.string('category');
                table.text('description');
                table.string('status').defaultTo('Open');
                table.string('reporter_name');
                table.timestamps(true, true);
            });
            console.log('Created hse_incidents table.');
            
            // Seed incidents
            await db('hse_incidents').insert([
                {
                    title: 'Terpeleset di Area Produksi',
                    incident_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days ago
                    location: 'Area Produksi Line 1',
                    category: 'Ringan',
                    description: 'Operator terpeleset karena ada genangan air.',
                    status: 'Closed',
                    reporter_name: 'Budi Santoso'
                },
                {
                    title: 'Tumpahan Oli',
                    incident_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days ago
                    location: 'Gudang Sparepart',
                    category: 'Near Miss',
                    description: 'Tumpahan oli dari mesin forklift, hampir menyebabkan orang terjatuh.',
                    status: 'Open',
                    reporter_name: 'Agus Riyadi'
                }
            ]);
            console.log('Seeded hse_incidents.');
        }

        // 2. hse_patrols
        const hasPatrols = await db.schema.hasTable('hse_patrols');
        if (!hasPatrols) {
            await db.schema.createTable('hse_patrols', table => {
                table.increments('id').primary();
                table.date('patrol_date').notNullable();
                table.string('area');
                table.string('inspector_name');
                table.string('finding_type');
                table.text('description');
                table.string('status').defaultTo('Open');
                table.timestamps(true, true);
            });
            console.log('Created hse_patrols table.');
            
            // Seed patrols
            await db('hse_patrols').insert([
                {
                    patrol_date: new Date().toISOString().split('T')[0], // Today
                    area: 'Panel Room',
                    inspector_name: 'Andi Saputra',
                    finding_type: 'Unsafe Condition',
                    description: 'Pintu panel listrik tidak terkunci rapat.',
                    status: 'Open'
                },
                {
                    patrol_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
                    area: 'Loading Dock',
                    inspector_name: 'Siti Rahma',
                    finding_type: 'Unsafe Act',
                    description: 'Pekerja tidak menggunakan APD (Helm Safety).',
                    status: 'Addressed'
                }
            ]);
            console.log('Seeded hse_patrols.');
        }

        // 3. hse_capa
        const hasCapa = await db.schema.hasTable('hse_capa');
        if (!hasCapa) {
            await db.schema.createTable('hse_capa', table => {
                table.increments('id').primary();
                table.string('source');
                table.integer('source_id');
                table.text('action_plan').notNullable();
                table.string('pic');
                table.date('due_date');
                table.string('status').defaultTo('Open');
                table.text('closing_remarks');
                table.timestamps(true, true);
            });
            console.log('Created hse_capa table.');
            
            // Seed capa
            await db('hse_capa').insert([
                {
                    source: 'Incident',
                    source_id: 1,
                    action_plan: 'Perbaikan atap bocor di Area Produksi.',
                    pic: 'Tim Maintenance',
                    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
                    status: 'In Progress'
                },
                {
                    source: 'Patrol',
                    source_id: 1,
                    action_plan: 'Mengganti kunci pintu panel.',
                    pic: 'Tim Elektrikal',
                    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
                    status: 'Open'
                }
            ]);
            console.log('Seeded hse_capa.');
        }

        console.log('HSE Database Setup completed successfully!');
    } catch (err) {
        console.error('Error setting up HSE tables:', err);
    } finally {
        await db.destroy();
    }
}

seedHse();

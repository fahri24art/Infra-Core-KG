require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password', // Assumed standard local dev pass
        database: 'network_monitor_db' // Assuming TCF-SG local DB
    });

    try {
        await client.connect();
        console.log('Connected to local PostgreSQL DB.');

        // 1. Create hr_meeting_rooms
        await client.query(`
            CREATE TABLE IF NOT EXISTS hr_meeting_rooms (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                capacity INT DEFAULT 10,
                facilities JSONB,
                is_active BOOLEAN DEFAULT true,
                color_theme VARCHAR(50) DEFAULT '#3B82F6',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table hr_meeting_rooms created.');

        // 2. Create hr_room_bookings
        await client.query(`
            CREATE TABLE IF NOT EXISTS hr_room_bookings (
                id SERIAL PRIMARY KEY,
                room_id INT REFERENCES hr_meeting_rooms(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                booker_name VARCHAR(255) NOT NULL,
                booker_contact VARCHAR(100),
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                status VARCHAR(50) DEFAULT 'SCHEDULED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table hr_room_bookings created.');

        // 3. Create hr_meeting_moms
        await client.query(`
            CREATE TABLE IF NOT EXISTS hr_meeting_moms (
                id SERIAL PRIMARY KEY,
                booking_id INT REFERENCES hr_room_bookings(id) ON DELETE CASCADE,
                discussion TEXT,
                action_items JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table hr_meeting_moms created.');

        // 4. Seed initial rooms
        const check = await client.query('SELECT COUNT(*) FROM hr_meeting_rooms');
        if (parseInt(check.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO hr_meeting_rooms (name, capacity, facilities, color_theme) VALUES 
                ('Boardroom A', 20, '["Projector", "Video Conf", "Whiteboard"]', '#3B82F6'),
                ('Meeting Room B', 8, '["TV", "Whiteboard"]', '#10B981'),
                ('Discussion Pod', 4, '["Whiteboard"]', '#F59E0B');
            `);
            console.log('Seeded initial rooms.');
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();

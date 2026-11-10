const knex = require('knex');
const config = require('./knexfile');

const db = knex(config.development);

async function runMigrations() {
    try {
        console.log('Running migrations...');
        await db.migrate.latest();
        console.log('Migrations finished successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        db.destroy();
    }
}

runMigrations();

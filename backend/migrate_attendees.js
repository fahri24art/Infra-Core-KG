const knex = require('knex')({
    client: 'pg',
    connection: 'postgres://postgres:postgres@localhost:5432/network_monitor_db'
});

async function run() {
    try {
        const hasColumn = await knex.schema.hasColumn('hr_meeting_moms', 'attendees');
        if (!hasColumn) {
            await knex.schema.alterTable('hr_meeting_moms', table => {
                table.jsonb('attendees').defaultTo('[]');
            });
            console.log('Column attendees added');
        } else {
            console.log('Column already exists');
        }
    } catch (e) {
        console.error(e);
    } finally {
        knex.destroy();
    }
}
run();

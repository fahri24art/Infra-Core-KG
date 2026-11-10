const knex = require('knex')({
    client: 'pg',
    connection: 'postgres://postgres:postgres@localhost:5432/network_monitor_db'
});

async function run() {
    try {
        const hasColumn = await knex.schema.hasColumn('hr_meeting_moms', 'attachments');
        if (!hasColumn) {
            await knex.schema.alterTable('hr_meeting_moms', table => {
                table.jsonb('attachments').defaultTo('[]');
            });
            console.log('Column attachments added');
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

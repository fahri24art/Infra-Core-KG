exports.up = function (knex) {
    return knex.schema.hasTable('communication_logs').then(exists => {
        if (!exists) {
            return knex.schema.createTable('communication_logs', table => {
                table.increments('id').primary();
                table.string('platform').notNullable(); // whatsapp, email, teams
                table.string('type').notNullable();     // incoming, outgoing
                table.string('sender').notNullable();
                table.string('recipient').notNullable();
                table.text('message');
                table.string('ticket_number').nullable();
                table.string('status').nullable();
                table.timestamp('timestamp').defaultTo(knex.fn.now());
            });
        }
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('communication_logs');
};

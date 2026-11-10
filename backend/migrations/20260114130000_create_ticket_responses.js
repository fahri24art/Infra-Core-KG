exports.up = function (knex) {
    return knex.schema.createTable('ticket_responses', table => {
        table.increments('id').primary();
        table.integer('ticket_id').unsigned().references('id').inTable('tickets').onDelete('CASCADE');
        table.integer('user_id').unsigned(); // weak ref to users
        table.text('message');
        table.string('type').defaultTo('public'); // public or private
        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('ticket_responses');
};

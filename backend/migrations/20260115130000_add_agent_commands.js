/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('agent_commands', function (table) {
        table.increments('id').primary();
        table.string('agent_uuid').notNullable();
        table.string('command').notNullable();
        table.text('output').nullable();
        table.string('status').defaultTo('pending'); // pending, executed, failed
        table.timestamps(true, true);
    }).then(() => {
        return knex.schema.table('assets', function (table) {
            table.string('uuid').nullable().index(); // Add UUID to link with Agent
        });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('agent_commands')
        .then(() => {
            return knex.schema.table('assets', function (table) {
                table.dropColumn('uuid');
            });
        });
};

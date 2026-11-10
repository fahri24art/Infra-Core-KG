/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('assets', function (table) {
        table.string('agent_status').nullable().defaultTo('Offline'); // Online, Offline
        table.string('ip_address').nullable();
        table.timestamp('last_agent_sync').nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('assets', function (table) {
        table.dropColumn('agent_status');
        table.dropColumn('ip_address');
        table.dropColumn('last_agent_sync');
    });
};

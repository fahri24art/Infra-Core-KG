/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('assets', function (table) {
        table.string('manufacturer');
        table.string('model');
        table.json('specs'); // For Processor, RAM, etc.
        table.integer('user_id').unsigned();
        // table.foreign('user_id').references('users.id'); // Clean but optional for SQLite loose constraints
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('assets', function (table) {
        table.dropColumn('manufacturer');
        table.dropColumn('model');
        table.dropColumn('specs');
        table.dropColumn('user_id');
    });
};

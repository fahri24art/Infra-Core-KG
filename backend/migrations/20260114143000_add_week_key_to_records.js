/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('maintenance_records', function (table) {
        table.string('week_key'); // e.g., "1_1" to link back to the plan slot
        table.integer('year'); // To easily filter by plan year
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('maintenance_records', function (table) {
        table.dropColumn('week_key');
        table.dropColumn('year');
    });
};

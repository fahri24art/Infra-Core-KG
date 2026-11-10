/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .alterTable('maintenance_plans', function (table) {
            table.string('maintenance_type').defaultTo('Semester').index(); // Daily, Weekly, Monthly, Semester
        })
        .alterTable('maintenance_records', function (table) {
            table.string('maintenance_type').defaultTo('Semester').index();
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .alterTable('maintenance_records', function (table) {
            table.dropColumn('maintenance_type');
        })
        .alterTable('maintenance_plans', function (table) {
            table.dropColumn('maintenance_type');
        });
};

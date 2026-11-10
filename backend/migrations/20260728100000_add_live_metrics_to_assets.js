/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const hasCpuUsage = await knex.schema.hasColumn('assets', 'cpu_usage');
    if (!hasCpuUsage) {
        return knex.schema.table('assets', function (table) {
            table.integer('cpu_usage').defaultTo(0);
            table.integer('ram_usage').defaultTo(0);
            table.integer('disk_usage').defaultTo(0);
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('assets', function (table) {
        table.dropColumn('cpu_usage');
        table.dropColumn('ram_usage');
        table.dropColumn('disk_usage');
    });
};

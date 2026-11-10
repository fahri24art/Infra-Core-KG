/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .table('assets', function (table) {
            table.string('antivirus_name').nullable();
            table.string('antivirus_status').nullable().defaultTo('Protected'); // Protected, At Risk, Disabled
            table.integer('threats_found').defaultTo(0);
            table.timestamp('last_scan_at').nullable();
        })
        .createTable('user_traffic_logs', function (table) {
            table.increments('id').primary();
            table.string('asset_uuid').notNullable().index();
            table.string('url').notNullable();
            table.integer('hits').defaultTo(1);
            table.bigInteger('data_usage').defaultTo(0); // in bytes
            table.date('log_date').defaultTo(knex.fn.now());
            table.timestamps(true, true);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('user_traffic_logs')
        .table('assets', function (table) {
            table.dropColumn('antivirus_name');
            table.dropColumn('antivirus_status');
            table.dropColumn('threats_found');
            table.dropColumn('last_scan_at');
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('traffic_history', table => {
        table.bigInteger('rx_iforte').defaultTo(0);
        table.bigInteger('tx_iforte').defaultTo(0);
        table.bigInteger('rx_comnet').defaultTo(0);
        table.bigInteger('tx_comnet').defaultTo(0);
        table.boolean('is_up_iforte').defaultTo(true);
        table.boolean('is_up_comnet').defaultTo(true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('traffic_history', table => {
        table.dropColumn('rx_iforte');
        table.dropColumn('tx_iforte');
        table.dropColumn('rx_comnet');
        table.dropColumn('tx_comnet');
        table.dropColumn('is_up_iforte');
        table.dropColumn('is_up_comnet');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('traffic_history', table => {
        table.increments('id');
        table.timestamp('timestamp').defaultTo(knex.fn.now());
        table.bigInteger('rx').defaultTo(0);
        table.bigInteger('tx').defaultTo(0);
        table.boolean('is_up').defaultTo(true);

        table.index('timestamp');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists('traffic_history');
};

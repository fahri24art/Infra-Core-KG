/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable('maintenance_plans', function (table) {
            table.increments('id');
            table.integer('asset_id').unsigned().references('id').inTable('assets').onDelete('CASCADE');
            table.integer('year').notNullable();
            table.integer('semester').notNullable(); // 1 or 2
            table.json('planning_data'); // { "1_1": true } meaning Month 1 Week 1
            table.json('actual_data');
            table.timestamps(true, true);
        })
        .createTable('maintenance_records', function (table) {
            table.increments('id');
            table.integer('asset_id').unsigned().references('id').inTable('assets').onDelete('CASCADE');
            table.date('maintenance_date');
            table.string('pic_name');
            table.string('department');
            table.text('condition_before');
            table.text('condition_after');
            table.string('status').defaultTo('Completed');
            table.timestamps(true, true);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTable('maintenance_records')
        .dropTable('maintenance_plans');
};

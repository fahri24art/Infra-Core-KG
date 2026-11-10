/**
 * Migration: Create asset_history table for tracking hardware upgrades, changes, and drift
 */
exports.up = function(knex) {
    return knex.schema.createTable('asset_history', table => {
        table.increments('id').primary();
        table.integer('asset_id').unsigned().references('id').inTable('assets').onDelete('CASCADE');
        table.string('action').notNullable().defaultTo('Hardware Update');
        table.text('details');
        table.text('diff_data'); // JSON string with old, new, changes
        table.string('performed_by').defaultTo('TCF Agent Sync');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        
        table.index(['asset_id', 'created_at']);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('asset_history');
};

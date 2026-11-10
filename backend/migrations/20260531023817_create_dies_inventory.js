exports.up = function(knex) {
    return knex.schema.createTable('dies_inventory', table => {
        table.increments('id').primary();
        table.string('category');
        table.string('item_name');
        table.integer('total_stock');
        table.integer('assigned_stock');
        table.string('status').defaultTo('ACTIVE');
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('dies_inventory');
};

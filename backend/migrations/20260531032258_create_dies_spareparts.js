exports.up = function(knex) {
    return knex.schema.createTable('dies_sparepart_inventory', table => {
        table.increments('id').primary();
        table.string('part_name').notNullable();
        table.string('specifications').nullable();
        table.string('erp_item_code').nullable().unique(); // Link to iDempiere
        table.integer('qty_in_stock').defaultTo(0);
        table.integer('min_stock_level').defaultTo(1);
        table.string('uom').defaultTo('Pcs'); // Unit of Measure
        table.string('rack_location').nullable();
        table.decimal('unit_price', 15, 2).defaultTo(0.00); // Price for cost calculation
        table.integer('life_expectancy_hits').nullable(); // Expected life in hits before replacement
        table.string('supplier').nullable();
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('dies_sparepart_inventory');
};

exports.up = function(knex) {
  return knex.schema.createTable('app_dropdown_options', table => {
    table.increments('id').primary();
    table.string('category').notNullable(); // e.g., 'asset_status', 'asset_location'
    table.string('value').notNullable(); // e.g., 'Active', 'In Repair'
    table.string('label').notNullable(); // e.g., 'Active', 'In Repair'
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
    table.unique(['category', 'value']);
  }).then(() => {
    // Insert default values so the app doesn't break
    return knex('app_dropdown_options').insert([
        { category: 'asset_status', value: 'Active', label: 'Active', sort_order: 1 },
        { category: 'asset_status', value: 'In Repair', label: 'In Repair', sort_order: 2 },
        { category: 'asset_status', value: 'In Stock', label: 'In Stock', sort_order: 3 },
        { category: 'asset_status', value: 'Disposed', label: 'Disposed', sort_order: 4 },
        { category: 'asset_location', value: 'HO', label: 'Head Office', sort_order: 1 },
        { category: 'asset_location', value: 'Factory 1', label: 'Factory 1', sort_order: 2 },
        { category: 'asset_location', value: 'Factory 2', label: 'Factory 2', sort_order: 3 }
    ]);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('app_dropdown_options');
};

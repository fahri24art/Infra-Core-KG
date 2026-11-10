exports.up = function(knex) {
  return knex.schema
    // 1. app_modules: Controls which main modules are active
    .createTable('app_modules', table => {
      table.string('id').primary(); // e.g., 'fixed_assets', 'helpdesk'
      table.string('name').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.jsonb('config').defaultTo('{}'); // JSON metadata for the module
      table.timestamps(true, true);
    })
    
    // 2. app_asset_categories: Master list of categories
    .createTable('app_asset_categories', table => {
      table.increments('id').primary();
      table.string('name').notNullable().unique(); // e.g., 'Computer', 'Network'
      table.string('icon').defaultTo('Box');
      table.text('description');
      table.jsonb('form_schema').defaultTo('{}'); // Dynamic form fields for this category
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // 3. app_sto_periods: STO scheduling master data
    .createTable('app_sto_periods', table => {
      table.increments('id').primary();
      table.string('name').notNullable(); // e.g., 'Q3 2026'
      table.date('start_date');
      table.date('end_date');
      table.string('status').defaultTo('active'); // active, closed, planned
      table.jsonb('config').defaultTo('{}'); // STO specific metadata
      table.timestamps(true, true);
    })
    
    // 4. app_node_types: Represents network/logical nodes
    .createTable('app_node_types', table => {
      table.increments('id').primary();
      table.string('name').notNullable().unique(); // e.g., 'Switch', 'Router', 'Endpoint'
      table.text('description');
      table.timestamps(true, true);
    })
    
    // 5. app_category_relations: Mappings between categories and allowed node types
    .createTable('app_category_relations', table => {
      table.increments('id').primary();
      table.integer('category_id').unsigned().references('id').inTable('app_asset_categories').onDelete('CASCADE');
      table.integer('node_type_id').unsigned().references('id').inTable('app_node_types').onDelete('CASCADE');
      table.unique(['category_id', 'node_type_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('app_category_relations')
    .dropTableIfExists('app_node_types')
    .dropTableIfExists('app_sto_periods')
    .dropTableIfExists('app_asset_categories')
    .dropTableIfExists('app_modules');
};

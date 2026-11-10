/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('hr_inventory', table => {
      table.increments('id').primary();
      table.string('category').notNullable();
      table.string('item_name').notNullable();
      table.integer('total_stock').notNullable().defaultTo(0);
      table.integer('assigned_stock').notNullable().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('machine_inventory', table => {
      table.increments('id').primary();
      table.string('category');
      table.string('item_name');
      table.integer('total_stock').defaultTo(0);
      table.integer('assigned_stock').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('hr_apars', table => {
      table.increments('id').primary();
      table.string('code');
      table.string('location');
      table.string('type');
      table.integer('weight');
      table.date('expired_date');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('hr_apar_checksheets', table => {
      table.increments('id').primary();
      table.integer('apar_id').unsigned().references('id').inTable('hr_apars').onDelete('CASCADE');
      table.string('inspector_name');
      table.date('check_date');
      table.boolean('pin_status').defaultTo(true);
      table.boolean('pin_seal_status').defaultTo(true);
      table.boolean('handle_status').defaultTo(true);
      table.boolean('pressure_status').defaultTo(true);
      table.boolean('hose_status').defaultTo(true);
      table.boolean('sticker_status').defaultTo(true);
      table.boolean('body_status').defaultTo(true);
      table.text('notes');
      table.jsonb('photos');
      table.boolean('is_passed').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('hr_facility_checksheets', table => {
      table.increments('id').primary();
      table.integer('inventory_id');
      table.string('category');
      table.string('inspector_name');
      table.date('check_date');
      table.jsonb('check_data');
      table.text('notes');
      table.jsonb('photos');
      table.boolean('is_passed').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('hr_categories', table => {
      table.integer('id').primary();
      table.string('name');
      table.string('category_type');
    })
    .createTable('hr_models', table => {
      table.integer('id').primary();
      table.string('name');
      table.integer('category_id');
      table.string('manufacturer_id');
      table.string('model_number');
    })
    .createTable('hr_locations', table => {
      table.integer('id').primary();
      table.string('name');
      table.integer('parent_id');
    })
    .createTable('hr_status_labels', table => {
      table.integer('id').primary();
      table.string('name');
      table.string('type');
      table.string('color');
    })
    .createTable('hr_assets', table => {
      table.integer('id').primary();
      table.string('asset_tag');
      table.string('name');
      table.integer('model_id');
      table.string('serial');
      table.integer('status_id');
      table.integer('location_id');
      table.integer('rtd_location_id');
      table.integer('assigned_to');
      table.string('assigned_type');
      table.float('purchase_cost');
      table.date('purchase_date');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('hr_asset_checksheets', table => {
      table.increments('id').primary();
      table.integer('asset_id');
      table.string('category');
      table.string('inspector_name');
      table.date('check_date');
      table.text('notes');
      table.boolean('is_passed');
      table.jsonb('check_data');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('hr_asset_checksheets')
    .dropTableIfExists('hr_assets')
    .dropTableIfExists('hr_status_labels')
    .dropTableIfExists('hr_locations')
    .dropTableIfExists('hr_models')
    .dropTableIfExists('hr_categories')
    .dropTableIfExists('hr_facility_checksheets')
    .dropTableIfExists('hr_apar_checksheets')
    .dropTableIfExists('hr_apars')
    .dropTableIfExists('machine_inventory')
    .dropTableIfExists('hr_inventory');
};

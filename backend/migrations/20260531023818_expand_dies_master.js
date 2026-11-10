exports.up = async function(knex) {
  // Alter existing dies_inventory table
  await knex.schema.alterTable('dies_inventory', table => {
    table.string('asset_code').nullable();
    table.string('dies_number').nullable();
    table.string('dies_type').nullable();
    table.string('part_number').nullable();
    table.string('part_name').nullable();
    table.string('customer').nullable();
    table.string('project').nullable();
    table.string('model').nullable();
    table.string('maker').nullable();
    table.string('vendor').nullable();
    table.integer('manufacture_year').nullable();
    table.string('status').defaultTo('ACTIVE').alter(); 
    table.string('press_machine').nullable();
    table.string('production_line').nullable();
  });

  // Create dies_specifications table
  await knex.schema.createTable('dies_specifications', table => {
    table.increments('id').primary();
    table.integer('dies_id').unsigned().references('id').inTable('dies_inventory').onDelete('CASCADE');
    table.float('length').nullable();
    table.float('width').nullable();
    table.float('height').nullable();
    table.float('weight').nullable();
    table.string('material').nullable();
    table.float('shut_height').nullable();
    table.float('stroke').nullable();
    table.integer('press_capacity').nullable();
    table.integer('station_qty').nullable();
    table.string('die_set_type').nullable();
    table.float('upper_die_weight').nullable();
    table.float('lower_die_weight').nullable();
    table.string('storage_rack').nullable();
    table.string('lifting_point').nullable();
    table.boolean('safety_lock').defaultTo(false);
    table.timestamps(true, true);
  });

  // Create dies_locations table
  await knex.schema.createTable('dies_locations', table => {
    table.increments('id').primary();
    table.integer('dies_id').unsigned().references('id').inTable('dies_inventory').onDelete('CASCADE');
    table.string('plant').nullable();
    table.string('building').nullable();
    table.string('area').nullable();
    table.string('rack_number').nullable();
    table.string('shelf_number').nullable();
    table.string('current_position').nullable();
    table.datetime('last_move_date').nullable();
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('dies_locations');
  await knex.schema.dropTableIfExists('dies_specifications');
  
  await knex.schema.alterTable('dies_inventory', table => {
    table.dropColumns(
      'asset_code', 'dies_number', 'dies_type', 'part_number', 'part_name',
      'customer', 'project', 'model', 'maker', 'vendor', 'manufacture_year',
      'press_machine', 'production_line'
    );
  });
};

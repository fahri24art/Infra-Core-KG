exports.up = function(knex) {
  return knex.schema
    // 1. Software Licenses
    .createTable('software_licenses', table => {
      table.increments('id').primary();
      table.string('software_name').notNullable();
      table.string('license_key');
      table.integer('total_seats').defaultTo(1);
      table.date('purchased_at');
      table.date('expires_at');
      table.string('vendor');
      table.text('notes');
      table.timestamps(true, true);
    })
    // 2. Asset Licenses (Pivot table)
    .createTable('asset_licenses', table => {
      table.increments('id').primary();
      table.integer('asset_id').unsigned().references('id').inTable('assets').onDelete('CASCADE');
      table.integer('license_id').unsigned().references('id').inTable('software_licenses').onDelete('CASCADE');
      table.timestamp('assigned_at').defaultTo(knex.fn.now());
      table.unique(['asset_id', 'license_id']);
    })
    // 3. Consumables
    .createTable('consumables', table => {
      table.increments('id').primary();
      table.string('item_name').notNullable();
      table.string('category');
      table.integer('current_stock').defaultTo(0);
      table.integer('minimum_stock').defaultTo(0);
      table.string('location');
      table.timestamps(true, true);
    })
    // 4. Consumable Logs
    .createTable('consumable_logs', table => {
      table.increments('id').primary();
      table.integer('consumable_id').unsigned().references('id').inTable('consumables').onDelete('CASCADE');
      table.integer('user_id'); // Can map to HR employee or app user
      table.string('action_type').notNullable(); // 'IN' or 'OUT'
      table.integer('quantity').notNullable();
      table.integer('ticket_id').unsigned().references('id').inTable('engineering_tickets').onDelete('SET NULL');
      table.text('remarks');
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    })
    // 5. Contracts
    .createTable('contracts', table => {
      table.increments('id').primary();
      table.string('contract_name').notNullable();
      table.string('contract_number');
      table.string('vendor_name').notNullable();
      table.date('start_date');
      table.date('end_date');
      table.decimal('cost', 15, 2);
      table.string('status');
      table.text('description');
      table.timestamps(true, true);
    })
    // 6. Knowledge Base
    .createTable('knowledge_base', table => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.string('category');
      table.text('content');
      table.string('author');
      table.boolean('is_published').defaultTo(true);
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('knowledge_base')
    .dropTableIfExists('contracts')
    .dropTableIfExists('consumable_logs')
    .dropTableIfExists('consumables')
    .dropTableIfExists('asset_licenses')
    .dropTableIfExists('software_licenses');
};

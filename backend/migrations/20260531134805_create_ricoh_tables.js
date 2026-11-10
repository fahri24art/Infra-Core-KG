/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('ricoh_devices', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('ip').notNullable().unique();
      table.string('model');
      table.string('serial');
      table.string('status').defaultTo('unknown');
      table.timestamp('last_poll');
    })
    .createTable('ricoh_toner_logs', table => {
      table.increments('id').primary();
      table.integer('device_id').unsigned().references('id').inTable('ricoh_devices').onDelete('CASCADE');
      table.integer('cyan');
      table.integer('magenta');
      table.integer('yellow');
      table.integer('black');
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    })
    .createTable('ricoh_counter_logs', table => {
      table.increments('id').primary();
      table.integer('device_id').unsigned().references('id').inTable('ricoh_devices').onDelete('CASCADE');
      table.integer('total_counter');
      table.integer('bw_counter');
      table.integer('color_counter');
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    })
    .createTable('ricoh_users', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('department');
      table.integer('monthly_quota').defaultTo(1000);
      table.integer('current_usage').defaultTo(0);
      table.timestamp('last_reset').defaultTo(knex.fn.now());
      table.string('status').defaultTo('active');
      table.integer('current_printer_id').unsigned().references('id').inTable('ricoh_devices');
    })
    .createTable('ricoh_system_logs', table => {
      table.increments('id').primary();
      table.string('event_type');
      table.text('message');
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    })
    .createTable('ricoh_device_quotas', table => {
      table.increments('id').primary();
      table.string('computer_name').notNullable().unique();
      table.string('ip_address');
      table.integer('monthly_quota').defaultTo(1500);
      table.integer('current_usage').defaultTo(0);
      table.integer('monthly_quota_bw').defaultTo(1000);
      table.integer('current_usage_bw').defaultTo(0);
      table.integer('monthly_quota_color').defaultTo(500);
      table.integer('current_usage_color').defaultTo(0);
      table.integer('lifetime_bw').defaultTo(0);
      table.integer('lifetime_color').defaultTo(0);
      table.string('user_code');
      table.integer('asset_id'); // maps to Power Asset's assets table
      table.timestamp('last_reset').defaultTo(knex.fn.now());
      table.string('status').defaultTo('active');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('ricoh_device_quotas')
    .dropTableIfExists('ricoh_system_logs')
    .dropTableIfExists('ricoh_users')
    .dropTableIfExists('ricoh_counter_logs')
    .dropTableIfExists('ricoh_toner_logs')
    .dropTableIfExists('ricoh_devices');
};

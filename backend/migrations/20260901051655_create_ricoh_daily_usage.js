/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('ricoh_daily_usage', table => {
      table.increments('id').primary();
      table.string('date').notNullable(); // YYYY-MM-DD
      table.string('computer_name');
      table.string('user_code');
      table.integer('department_id');
      table.integer('bw_usage').defaultTo(0);
      table.integer('color_usage').defaultTo(0);
      table.integer('copier_bw_usage').defaultTo(0);
      table.integer('copier_color_usage').defaultTo(0);
      table.integer('total_usage').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Index for faster searching by date
      table.index(['date']);
      // Unique constraint to ensure one record per user per day
      table.unique(['date', 'user_code']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('ricoh_daily_usage');
};

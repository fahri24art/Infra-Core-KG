/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('endpoint_lockdown_logs');
  if (!hasTable) {
    return knex.schema.createTable('endpoint_lockdown_logs', (table) => {
      table.increments('id').primary();
      table.string('hostname').notNullable();
      table.string('ip_address').notNullable();
      table.text('policies');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('endpoint_lockdown_logs');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('ricoh_print_jobs');
  if (!hasTable) {
    return knex.schema
      .createTable('ricoh_print_jobs', table => {
        table.increments('id').primary();
        table.string('device_ip');
        table.integer('job_id');
        table.string('user_name');
        table.string('user_id_col'); // Named user_id_col to avoid conflict with user_id
        table.string('file_name');
        table.string('status');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.integer('pages');
      });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('ricoh_print_jobs');
};

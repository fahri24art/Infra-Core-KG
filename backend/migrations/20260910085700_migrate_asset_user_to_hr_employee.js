/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Add hr_employee_id to assets
  await knex.schema.alterTable('assets', table => {
      table.integer('hr_employee_id').unsigned().references('id').inTable('hr_employees').onDelete('SET NULL');
  });

  // 2. Migrate data: Set hr_employee_id based on the existing user_id's mapping in the users table
  // users table has an hr_employee_id column that links to hr_employees.
  await knex.raw(`
      UPDATE assets
      SET hr_employee_id = (
          SELECT users.hr_employee_id 
          FROM users 
          WHERE users.id = assets.user_id
      )
      WHERE user_id IS NOT NULL;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('assets', table => {
      table.dropForeign('hr_employee_id');
      table.dropColumn('hr_employee_id');
  });
};

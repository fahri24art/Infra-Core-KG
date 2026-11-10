/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasHrEmployeeId = await knex.schema.hasColumn('users', 'hr_employee_id');
  if (!hasHrEmployeeId) {
    await knex.schema.alterTable('users', table => {
      table.integer('hr_employee_id').unsigned().references('id').inTable('hr_employees').onDelete('SET NULL');
    });
  }
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.dropColumn('hr_employee_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasEmployees = await knex.schema.hasTable('hr_employees');
  if (!hasEmployees) {
    await knex.schema.createTable('hr_employees', table => {
      table.increments('id').primary();
      table.string('nik').unique().notNullable();
      table.string('name').notNullable();
      table.string('position');
      table.string('department');
      table.string('blood_type');
      table.text('address');
      table.string('phone');
      table.string('photo_url');
      table.date('join_date');
      table.string('status').defaultTo('Active');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  const hasEmployeeIdInAssets = await knex.schema.hasColumn('hr_assets', 'employee_id');
  if (!hasEmployeeIdInAssets) {
    const hasHrAssetsTable = await knex.schema.hasTable('hr_assets');
    if (hasHrAssetsTable) {
      await knex.schema.alterTable('hr_assets', table => {
        table.integer('employee_id').unsigned().references('id').inTable('hr_employees').onDelete('SET NULL');
      });
    }
  }
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('hr_assets', table => {
      table.dropColumn('employee_id');
    })
    .dropTableIfExists('hr_employees');
};

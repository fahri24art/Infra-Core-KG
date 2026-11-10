exports.up = async function(knex) {
  const hasVmCode = await knex.schema.hasColumn('assets', 'vm_code');
  if (!hasVmCode) {
    return knex.schema.alterTable('assets', table => {
        table.string('vm_code');
        table.string('server_purpose');
    });
  }
};

exports.down = async function(knex) {
  const hasVmCode = await knex.schema.hasColumn('assets', 'vm_code');
  if (hasVmCode) {
    return knex.schema.alterTable('assets', table => {
        table.dropColumn('vm_code');
        table.dropColumn('server_purpose');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};

exports.up = function(knex) {
  return knex.schema.table('communication_logs', table => {
      table.string('department').defaultTo('ict');
  });
};

exports.down = function(knex) {
  return knex.schema.table('communication_logs', table => {
      table.dropColumn('department');
  });
};

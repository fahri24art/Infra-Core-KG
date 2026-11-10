exports.up = function(knex) {
  return knex.schema.alterTable('assets', table => {
    table.date('purchase_date').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('assets', table => {
    table.dropColumn('purchase_date');
  });
};

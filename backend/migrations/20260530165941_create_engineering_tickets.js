exports.up = function(knex) {
  return knex.schema.createTable('engineering_tickets', table => {
    table.increments('id').primary();
    table.string('ticket_number').notNullable();
    table.string('type').notNullable(); // 'MJO', 'RJO', 'EMERGENCY', 'CALL_TOOLING', 'CALL_MAINTENANCE'
    table.string('category').notNullable(); // 'machine' or 'dies'
    table.integer('machine_id').nullable();
    table.string('machine_name').nullable();
    table.string('operator_name').nullable();
    table.text('description').nullable();
    table.string('status').defaultTo('OPEN'); // OPEN, IN_PROGRESS, RESOLVED, CLOSED
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('engineering_tickets');
};

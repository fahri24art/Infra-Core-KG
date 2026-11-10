exports.up = function (knex) {
    return knex.schema
        .createTable('users', table => {
            table.increments('id').primary();
            table.string('name');
            table.string('email').unique();
            table.string('password');
            table.string('role').defaultTo('user');
            table.timestamps(true, true);
        })
        .createTable('assets', table => {
            table.increments('id').primary();
            table.string('name');
            table.string('serial_number');
            table.string('inventory_number');
            table.string('status').defaultTo('Active');
            table.string('location');
            table.string('category').defaultTo('Desktop'); // Default for now
            table.string('contact');
            table.timestamps(true, true);
        })
        .createTable('tickets', table => {
            table.increments('id').primary();
            table.string('subject');
            table.text('description');
            table.string('status');
            table.string('priority');
            table.integer('user_id').unsigned();
            // .references('id').inTable('users'); // Disable foreign key for migration simplicity initially
            table.timestamps(true, true);
        });
};

exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('tickets')
        .dropTableIfExists('assets')
        .dropTableIfExists('users');
};

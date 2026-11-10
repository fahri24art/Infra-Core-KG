exports.up = function(knex) {
    return knex.schema.hasTable('kpi_overrides').then(exists => {
        if (!exists) {
            return knex.schema.createTable('kpi_overrides', table => {
                table.increments('id').primary();
                table.string('type').notNullable(); // e.g. 'maintenance', 'bandwidth'
                table.integer('year').notNullable();
                table.integer('month').notNullable(); // 1-12
                table.string('metric').notNullable(); // e.g. 'Total Perangkat', 'target'
                table.integer('value').notNullable();
                table.timestamp('created_at').defaultTo(knex.fn.now());
                table.timestamp('updated_at').defaultTo(knex.fn.now());
                table.unique(['type', 'year', 'month', 'metric']);
            });
        }
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('kpi_overrides');
};

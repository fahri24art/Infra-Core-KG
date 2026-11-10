/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable('departments', table => {
            table.increments('id').primary();
            table.string('name').notNullable().unique();
            table.text('description');
            table.timestamps(true, true);
        })
        .createTable('divisions', table => {
            table.increments('id').primary();
            table.string('name').notNullable();
            table.integer('department_id').unsigned().notNullable();
            table.text('description');
            table.timestamps(true, true);

            // Add foreign key if supported by the environment, 
            // but keeping it simple for SQLite migrations.
            // table.foreign('department_id').references('id').inTable('departments');
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('divisions')
        .dropTableIfExists('departments');
};

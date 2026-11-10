exports.up = function (knex) {
    return knex.schema.createTable('settings', table => {
        table.increments('id').primary();
        table.string('section').notNullable(); // e.g., global, assets, tickets
        table.string('key').notNullable();     // e.g., app_name, sync_interval
        table.text('value');                   // JSON string
        table.unique(['section', 'key']);
        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('settings');
};

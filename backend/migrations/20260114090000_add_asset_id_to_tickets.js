exports.up = function (knex) {
    return knex.schema.table('tickets', function (table) {
        table.integer('asset_id').unsigned();
        // table.foreign('asset_id').references('assets.id'); // Optional: foreign key constraint
    });
};

exports.down = function (knex) {
    return knex.schema.table('tickets', function (table) {
        table.dropColumn('asset_id');
    });
};

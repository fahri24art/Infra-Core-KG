exports.up = function (knex) {
    return knex.schema.table('assets', table => {
        table.string('type').nullable();
    });
};

exports.down = function (knex) {
    return knex.schema.table('assets', table => {
        table.dropColumn('type');
    });
};

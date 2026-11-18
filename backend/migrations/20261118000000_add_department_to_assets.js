exports.up = async function (knex) {
    const hasCol = await knex.schema.hasColumn('assets', 'department');
    if (!hasCol) {
        await knex.schema.table('assets', function (table) {
            table.string('department', 150).nullable();
        });
    }
};

exports.down = async function (knex) {
    const hasCol = await knex.schema.hasColumn('assets', 'department');
    if (hasCol) {
        await knex.schema.table('assets', function (table) {
            table.dropColumn('department');
        });
    }
};


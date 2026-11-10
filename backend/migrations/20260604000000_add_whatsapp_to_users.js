exports.up = async function(knex) {
    const hasColumn = await knex.schema.hasColumn('users', 'whatsapp');
    if (!hasColumn) {
        return knex.schema.alterTable('users', table => {
            table.string('whatsapp').nullable();
        });
    }
};

exports.down = async function(knex) {
    const hasColumn = await knex.schema.hasColumn('users', 'whatsapp');
    if (hasColumn) {
        return knex.schema.alterTable('users', table => {
            table.dropColumn('whatsapp');
        });
    }
};

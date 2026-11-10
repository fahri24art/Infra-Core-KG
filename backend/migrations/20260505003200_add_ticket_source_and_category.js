exports.up = function (knex) {
    return knex.schema.hasColumn('tickets', 'source').then(hasSource => {
        return knex.schema.hasColumn('tickets', 'category').then(hasCategory => {
            return knex.schema.alterTable('tickets', table => {
                if (!hasSource) {
                    table.string('source').defaultTo('Email'); // WhatsApp, Email, Teams
                }
                if (!hasCategory) {
                    table.string('category').defaultTo('General'); // Hardware, Software, Network, etc.
                }
            });
        });
    });
};

exports.down = function (knex) {
    return knex.schema
        .alterTable('tickets', table => {
            table.dropColumn('source');
            table.dropColumn('category');
        });
};

exports.up = async function(knex) {
    const hasWindowsLogin = await knex.schema.hasColumn('assets', 'windows_login');
    if (!hasWindowsLogin) {
        return knex.schema.table('assets', function(table) {
            table.string('windows_login', 255).nullable();
        });
    }
};

exports.down = function(knex) {
    return knex.schema.table('assets', function(table) {
        table.dropColumn('windows_login');
    });
};

exports.up = async function (knex) {
    const hasSupHr = await knex.schema.hasColumn('ricoh_device_quotas', 'supervisor_hr_id');
    if (!hasSupHr) {
        await knex.schema.table('ricoh_device_quotas', function (table) {
            table.integer('supervisor_hr_id').nullable();
            table.string('supervisor_name', 150).nullable();
            table.string('supervisor_whatsapp', 40).nullable();
            table.string('wa_notify_mode', 32).defaultTo('auto');
        });
    }
};

exports.down = async function (knex) {
    const hasSupHr = await knex.schema.hasColumn('ricoh_device_quotas', 'supervisor_hr_id');
    if (hasSupHr) {
        await knex.schema.table('ricoh_device_quotas', function (table) {
            table.dropColumn('supervisor_hr_id');
            table.dropColumn('supervisor_name');
            table.dropColumn('supervisor_whatsapp');
            table.dropColumn('wa_notify_mode');
        });
    }
};


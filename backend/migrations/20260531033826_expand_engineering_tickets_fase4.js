exports.up = function(knex) {
    return knex.schema.table('engineering_tickets', function(table) {
        table.decimal('repair_cost', 14, 2).defaultTo(0);
        table.decimal('downtime_hours', 8, 2).defaultTo(0);
        table.text('root_cause');
        table.text('kaizen_action');
        table.integer('sparepart_used_id').unsigned().references('id').inTable('dies_sparepart_inventory').onDelete('SET NULL');
        table.integer('sparepart_qty').defaultTo(0);
    });
};

exports.down = function(knex) {
    return knex.schema.table('engineering_tickets', function(table) {
        table.dropColumn('repair_cost');
        table.dropColumn('downtime_hours');
        table.dropColumn('root_cause');
        table.dropColumn('kaizen_action');
        table.dropColumn('sparepart_used_id');
        table.dropColumn('sparepart_qty');
    });
};

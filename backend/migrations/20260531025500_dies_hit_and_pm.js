exports.up = function(knex) {
    return knex.schema
        // Tabel Hit Counters per Dies
        .createTable('dies_hit_counters', table => {
            table.increments('id').primary();
            table.integer('dies_id').unsigned().references('id').inTable('dies_inventory').onDelete('CASCADE');
            table.bigInteger('current_hit').defaultTo(0);
            table.bigInteger('lifetime_hit').defaultTo(0); // Total seumur hidup
            table.bigInteger('target_pm_hit').defaultTo(100000); // Kapan PM selanjutnya
            table.timestamp('last_updated').defaultTo(knex.fn.now());
        })
        // Tabel PM Schedules
        .createTable('dies_pm_schedules', table => {
            table.increments('id').primary();
            table.integer('dies_id').unsigned().references('id').inTable('dies_inventory').onDelete('CASCADE');
            table.string('pm_type'); // misal: 50K, 100K, 300K, Overhaul
            table.bigInteger('trigger_hit'); // Pada hit ke berapa PM ini dijadwalkan
            table.date('scheduled_date').nullable();
            table.date('completed_date').nullable();
            table.string('status').defaultTo('PENDING'); // PENDING, IN_PROGRESS, COMPLETED, OVERDUE
            table.string('executed_by').nullable();
            table.text('notes').nullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());
        });
};

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('dies_pm_schedules')
        .dropTableIfExists('dies_hit_counters');
};

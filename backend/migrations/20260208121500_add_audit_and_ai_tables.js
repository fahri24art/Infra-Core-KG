/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable('audit_logs', function (table) {
            table.increments('id').primary();
            table.string('user_name').notNullable().defaultTo('System');
            table.string('action').notNullable(); // e.g., SAVE_CONFIG, CREATE_PROXY, DELETE_DEVICE
            table.text('details').nullable(); // JSON string of changes
            table.string('ip_address').nullable();
            table.timestamp('timestamp').defaultTo(knex.fn.now());
        })
        .createTable('ai_threat_analysis', function (table) {
            table.increments('id').primary();
            table.string('threat_type').notNullable(); // e.g., Brute Force, Anomalous Data Transfer
            table.string('severity').notNullable(); // Low, Medium, High, Critical
            table.float('confidence').defaultTo(0.0);
            table.text('pattern_detected').nullable();
            table.string('recommendation').nullable();
            table.string('status').defaultTo('Pending'); // Pending, Investigating, Resolved, Ignored
            table.timestamps(true, true);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('ai_threat_analysis')
        .dropTableIfExists('audit_logs');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('audit_documents', table => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('title').notNullable();
        table.string('type').notNullable(); // 'SOP', 'IK', 'Form', 'Audit', 'Other'
        table.text('description');
        table.string('filename').notNullable();
        table.string('original_filename').notNullable();
        table.string('uploaded_by');
        table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTableIfExists('audit_documents');
};

exports.up = function(knex) {
    return knex.schema.createTable('raw_documents', table => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.string('type').notNullable(); // SOP, IK, Form, etc.
        table.text('description');
        table.string('filename').notNullable();
        table.string('original_filename').notNullable();
        table.string('uploaded_by');
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('raw_documents');
};
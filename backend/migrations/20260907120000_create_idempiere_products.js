exports.up = function(knex) {
    return knex.schema.createTable('idempiere_products', table => {
        table.integer('m_product_id').primary();
        table.string('product_code');
        table.string('product_name');
        table.text('description');
        table.string('product_type');
        table.integer('product_category_id');
        table.string('product_category');
        table.integer('uom_id');
        table.string('uom');
        table.integer('ad_org_id');
        table.string('organization');
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('idempiere_products');
};

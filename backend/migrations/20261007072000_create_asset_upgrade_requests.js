exports.up = function(knex) {
    return knex.schema.createTable('asset_upgrade_requests', table => {
        table.increments('id').primary();
        
        // Relasi ke tabel assets
        table.integer('asset_id').unsigned().references('id').inTable('assets').onDelete('CASCADE');
        
        // Info User / Pemegang Asset
        table.string('user_name').notNullable();
        table.string('department').notNullable();
        table.string('job_title').notNullable();
        
        // Atasan Langsung (User Side)
        table.string('manager_name'); // Section/Dept Head dari user
        
        // Detail Perangkat
        table.text('current_specs');
        table.integer('purchase_year');
        
        // Kebutuhan Upgrade
        table.text('justification').notNullable(); // Alasan
        table.text('requested_specs').notNullable(); // Target spek
        table.string('priority').defaultTo('Normal'); // Low, Normal, High, Urgent
        
        // Evaluasi ICT
        table.integer('estimated_cost').defaultTo(0);
        table.string('ict_recommendation'); // Layak Upgrade, Beli Baru, Re-install OS, dll
        
        // Flow Approval (Status & Timestamps)
        // Status: Pending Manager, Pending ICT Tech, Pending ICT Manager, Approved, Rejected, Completed
        table.string('status').defaultTo('Pending Manager');
        
        // Approvals (Nama & Waktu)
        table.string('approved_by_manager');
        table.timestamp('approved_by_manager_at');
        
        table.string('evaluated_by_tech');
        table.timestamp('evaluated_by_tech_at');
        
        table.string('approved_by_ict_manager'); // Section/Dept Head ICT
        table.timestamp('approved_by_ict_manager_at');
        
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('asset_upgrade_requests');
};

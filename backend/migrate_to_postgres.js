require('dotenv').config();
const knex = require('knex');
const knexConfig = require('./knexfile');

async function migrate() {
    console.log("🚀 Starting Migration: SQLite -> PostgreSQL");

    // Force connections specifically
    const sqliteConfig = { ...knexConfig.development };
    const pgConfig = { ...knexConfig.production };
    
    // Safety check: ensure production config actually points to PG
    if (pgConfig.client !== 'pg') {
        console.error("❌ Production config is not set to 'pg' (PostgreSQL). Check knexfile.js.");
        return;
    }

    const sqlite = knex(sqliteConfig);
    const pg = knex(pgConfig);

    try {
        console.log("📌 Testing connections...");
        await sqlite.raw('SELECT 1');
        console.log("✅ SQLite connected.");
        await pg.raw('SELECT 1');
        console.log("✅ PostgreSQL connected.");

        console.log("🛠️ Running migrations on PostgreSQL to ensure schema exists...");
        await pg.migrate.latest();
        console.log("✅ PostgreSQL schema updated.");

        // Fetch all tables from SQLite
        const tablesResult = await sqlite.raw("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        const tables = tablesResult.map(t => t.name).filter(name => !['knex_migrations', 'knex_migrations_lock'].includes(name));

        console.log(`📋 Found ${tables.length} tables to migrate.`);

        // Clear existing data in PostgreSQL (CASCADE handles foreign keys)
        console.log("🧹 Clearing existing data in PostgreSQL (if any)...");
        for (const table of tables) {
            try {
                // Table might not exist or might be empty, truncate it safely
                const exists = await pg.schema.hasTable(table);
                if (exists) {
                    await pg.raw(`TRUNCATE TABLE "${table}" CASCADE`);
                }
            } catch (e) {
                console.warn(`⚠️ Warning: Could not truncate ${table} - ${e.message}`);
            }
        }

        // Disable foreign key checks in PostgreSQL
        await pg.raw(`SET session_replication_role = 'replica';`);

        // Migrate data
        for (const table of tables) {
            console.log(`\n📦 Migrating table: ${table}...`);
            const rows = await sqlite(table).select('*');
            
            if (rows.length === 0) {
                console.log(`⏭️ Table ${table} is empty. Skipping.`);
                continue;
            }

            console.log(`⏳ Copying ${rows.length} rows...`);
            
            const pgColumns = await pg(table).columnInfo();
            const validColumnNames = Object.keys(pgColumns);

            // Insert in batches of 500 to avoid query size limits
            const batchSize = 500;
            for (let i = 0; i < rows.length; i += batchSize) {
                const rawBatch = rows.slice(i, i + batchSize);
                
                // Filter out columns that don't exist in the Postgres schema
                const batch = rawBatch.map(row => {
                    const cleanRow = {};
                    for (const key in row) {
                        if (validColumnNames.includes(key)) {
                            let val = row[key];
                            // Check if PostgreSQL expects a timestamp or date for this column
                            if (val != null && (pgColumns[key].type.includes('timestamp') || pgColumns[key].type.includes('date'))) {
                                let parsedDate = null;
                                if (typeof val === 'number') {
                                    parsedDate = new Date(val);
                                } else if (typeof val === 'string' && /^\d+$/.test(val)) {
                                    parsedDate = new Date(parseInt(val, 10));
                                } else if (typeof val === 'string') {
                                    parsedDate = new Date(val);
                                }
                                
                                if (parsedDate && !isNaN(parsedDate.getTime())) {
                                    val = parsedDate.toISOString();
                                } else {
                                    val = null; // Fallback for invalid dates
                                }
                            }
                            
                            // PostgreSQL does not support null bytes \0 in text fields
                            if (typeof val === 'string') {
                                val = val.replace(/\0/g, '');
                            }
                            
                            cleanRow[key] = val;
                        }
                    }
                    return Object.keys(cleanRow).length > 0 ? cleanRow : null;
                }).filter(r => r !== null);

                if (batch.length === 0) continue;

                // Let knex insert the clean batch
                await pg(table).insert(batch);
            }
            console.log(`✅ Table ${table} migrated successfully.`);
        }

        // Restore foreign key checks
        await pg.raw(`SET session_replication_role = 'origin';`);

        // Update sequences for auto-increment columns in PostgreSQL
        console.log("\n🔄 Updating PostgreSQL sequences...");
        for (const table of tables) {
            try {
                await pg.raw(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id)+1 FROM "${table}"), 1), false)`);
                console.log(`🔄 Sequence reset for ${table}.`);
            } catch (seqErr) {
                // Ignore if not a serial column or error resetting
            }
        }

        console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!");

    } catch (err) {
        console.error("\n❌ MIGRATION FAILED:", err);
    } finally {
        await sqlite.destroy();
        await pg.destroy();
    }
}

migrate();

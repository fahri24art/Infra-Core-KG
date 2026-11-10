/**
 * Database Initialization Script for Organization
 * 
 * This script initializes the database for a specific organization by:
 * 1. Creating the PostgreSQL database if it doesn't exist
 * 2. Running migrations
 * 
 * Usage:
 *   node init_org_db.js [organization]
 * 
 * Examples:
 *   node init_org_db.js TCF-KG    # Initialize TCF-Kendal database
 *   node init_org_db.js TCF-SG    # Initialize TCF-Semarang database (if needed)
 */

require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');

// Organization-specific database configurations (local copy - not using db.js yet)
const ORG_DB_CONFIG = {
    'TCF-SG': {
        postgres: 'network_monitor_db'
    },
    'TCF-KG': {
        postgres: 'network_monitor_kg'
    }
};

async function createDatabaseIfNotExists(dbName) {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST || '127.0.0.1',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        user: process.env.POSTGRES_USER || 'netadmin',
        password: process.env.POSTGRES_PASSWORD || 'secure_net_pass',
        database: 'postgres',
    });

    try {
        const result = await pool.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (result.rows.length === 0) {
            console.log(`[INIT] Creating database: "${dbName}"...`);
            await pool.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);
            console.log(`[INIT] Database '${dbName}' created successfully.`);
        } else {
            console.log(`[INIT] Database '${dbName}' already exists.`);
        }
    } catch (err) {
        console.error(`[INIT] Error creating database '${dbName}':`, err.message);
        throw err;
    } finally {
        await pool.end();
    }
}

async function initDatabase(organization) {
    console.log(`\n========================================`);
    console.log(`Initializing database for: ${organization}`);
    console.log(`========================================\n`);

    const orgConfig = ORG_DB_CONFIG[organization];
    if (!orgConfig) {
        console.error(`Invalid organization: ${organization}`);
        process.exit(1);
    }

    // Check if we are using PostgreSQL
    const usePostgres = process.env.POSTGRES_HOST;
    
    if (usePostgres) {
        // STEP 1: Create PostgreSQL database first
        console.log('[STEP 1] Creating PostgreSQL database if not exists...');
        await createDatabaseIfNotExists(orgConfig.postgres);
        console.log('[STEP 1] Complete.\n');
    }

    // STEP 2: Now load db and run migrations
    console.log('[STEP 2] Running migrations...');
    const { getDb } = require('./db');
    const db = getDb(organization);

    try {
        const [batchNo, log] = await db.migrate.latest();
        console.log(`[INIT] Migrations completed. Batch: ${batchNo}, Files: ${log.length}`);
        log.forEach(f => console.log(`  - ${f}`));

        // STEP 3: Run seeds
        console.log('[STEP 3] Running seeds...');
        try {
            const [seedLog] = await db.seed.run();
            if (seedLog && seedLog.length > 0) {
                console.log(`[INIT] Seeds completed. Files: ${seedLog.length}`);
                seedLog.forEach(f => console.log(`  - ${f}`));
            } else {
                console.log('[INIT] No seeds to run.');
            }
        } catch (seedErr) {
            console.log('[INIT] Seeds skipped:', seedErr.message);
        }

        console.log(`\n========================================`);
        console.log(`Database for ${organization} initialized successfully!`);
        console.log(`========================================\n`);
    } catch (err) {
        console.error(`[INIT] Error:`, err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

const organization = process.argv[2] || 'TCF-KG';

if (!Object.keys(ORG_DB_CONFIG).includes(organization)) {
    console.error(`Invalid organization: ${organization}`);
    console.error(`Valid: ${Object.keys(ORG_DB_CONFIG).join(', ')}`);
    process.exit(1);
}

initDatabase(organization);
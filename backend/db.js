const knex = require('knex');
const { AsyncLocalStorage } = require('async_hooks');

// ============================================================
// DATABASE: PostgreSQL Only
// SQLite telah dihapus. Semua data harus ada di PostgreSQL.
// Pastikan env vars POSTGRES_HOST, POSTGRES_USER,
// POSTGRES_PASSWORD, POSTGRES_PORT sudah terset.
// ============================================================

// Validasi environment variables wajib saat startup
const REQUIRED_ENV = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_PORT'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`[DB] ❌ FATAL: Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('[DB] Pastikan file .env sudah dikonfigurasi dengan benar.');
    process.exit(1);
}

// Organization → nama database PostgreSQL (Dedicated Standalone KG Instance)
const TARGET_DB = process.env.POSTGRES_DB || 'network_monitor_kg';
const ORG_DB_CONFIG = {
    'TCF-KG': { postgres: TARGET_DB },
    'TCF-SG': { postgres: TARGET_DB }, // Fallback to local KG database
};

// Cache koneksi per organisasi
const dbConnections = {};

// AsyncLocalStorage untuk request-scoped organization context
const orgStorage = new AsyncLocalStorage();

function setActiveOrg(org) {
    orgStorage._fallbackOrg = 'TCF-KG';
}

/**
 * Dapatkan koneksi Knex untuk organisasi (Locked to TCF-KG)
 */
function getDb(organization) {
    const org = 'TCF-KG';
    if (dbConnections[org]) return dbConnections[org];
    return createConnection(org);
}

/**
 * Jalankan callback dalam context organisasi tertentu
 */
function runWithOrg(org, callback) {
    return orgStorage.run('TCF-KG', callback);
}

/**
 * Buat koneksi PostgreSQL baru untuk organisasi
 */
function createConnection(org) {
    if (!ORG_DB_CONFIG[org]) {
        throw new Error(`[DB] Unknown org: ${org}`);
    }

    const config = {
        client: 'pg',
        connection: {
            host:     process.env.POSTGRES_HOST,
            port:     parseInt(process.env.POSTGRES_PORT || '5432'),
            user:     process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: ORG_DB_CONFIG[org].postgres,
        },
        pool: { min: 2, max: 10 },
        migrations: { directory: './migrations' },
        seeds:      { directory: './seeds' },
        debug: false,
    };

    console.log(`[DB] ✅ PostgreSQL connection created for org: ${org} → DB: ${ORG_DB_CONFIG[org].postgres}`);
    dbConnections[org] = knex(config);
    return dbConnections[org];
}

// Inisialisasi koneksi TCF-KG saat startup
createConnection('TCF-KG');

// ============================================================
// Proxy wrapper agar db('table') bekerja seperti knex('table')
// ============================================================
function db(table) {
    return getDb()(table);
}

const dbProxy = new Proxy(db, {
    apply(target, thisArg, args) {
        return getDb()(...args);
    },
    get(target, prop) {
        if (prop === 'getDb')        return getDb;
        if (prop === 'setActiveOrg') return setActiveOrg;
        if (prop === 'runWithOrg')   return runWithOrg;
        if (prop === 'ORG_DB_CONFIG') return ORG_DB_CONFIG;
        if (prop === 'default')      return dbProxy;

        const conn = getDb();
        if (conn && typeof conn[prop] === 'function') return conn[prop].bind(conn);
        return conn ? conn[prop] : undefined;
    }
});

module.exports = dbProxy;
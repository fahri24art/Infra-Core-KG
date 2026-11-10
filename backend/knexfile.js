require('dotenv').config();
const path = require('path');

// Organization-specific database configurations
// TCF-SG uses the existing network_monitor.db for backward compatibility
const ORG_DB_CONFIG = {
    'TCF-SG': {
        sqlite: path.join(__dirname, 'network_monitor.db'),  // Existing database
        postgres: 'network_monitor_db'  // Existing PostgreSQL database
    },
    'TCF-KG': {
        sqlite: path.join(__dirname, 'network_monitor_kg.db'),  // New database for Kendal
        postgres: 'network_monitor_kg'  // New PostgreSQL database for Kendal
    }
};

// Get current organization from environment or default to TCF-SG
const currentOrg = process.env.ORGANIZATION || 'TCF-SG';

module.exports = {
    // Keep SQLite as a fallback or development option
    development: {
        client: 'sqlite3',
        connection: {
            filename: process.env.POSTGRES_HOST 
                ? ORG_DB_CONFIG[currentOrg].sqlite 
                : path.join(__dirname, 'network_monitor.db')
        },
        useNullAsDefault: true,
        migrations: {
            directory: './migrations',
        },
        seeds: {
            directory: './seeds',
        },
        debug: false,
    },

    // PostgreSQL config for production/main use
    production: {
        client: 'pg',
        connection: {
            host: process.env.POSTGRES_HOST || '127.0.0.1',
            port: process.env.POSTGRES_PORT || 5432,
            user: process.env.POSTGRES_USER || 'netadmin',
            password: process.env.POSTGRES_PASSWORD || 'secure_net_pass',
            database: process.env.POSTGRES_HOST 
                ? ORG_DB_CONFIG[currentOrg].postgres 
                : 'network_monitor_db'
        },
        migrations: {
            directory: './migrations',
        },
        seeds: {
            directory: './seeds',
        },
        debug: false,
    }
};

const db = require('../db');

/**
 * Unified Configuration Service for TCF Power Asset
 * Provides in-memory cached access to dynamic settings in 'settings' table,
 * preventing hardcoded scripts and enabling real-time UI updates.
 */
class ConfigService {
    constructor() {
        this.cache = {};
        this.lastLoaded = 0;
        this.cacheTtlMs = 60000; // 1 minute auto-refresh or immediate on update
        this.isInitialized = false;
    }

    async init() {
        if (!this.isInitialized) {
            await this.refresh();
            this.isInitialized = true;
        }
    }

    async refresh() {
        try {
            const rows = await db('settings').select('*');
            const grouped = {};
            for (const row of rows) {
                if (!grouped[row.section]) grouped[row.section] = {};
                try {
                    grouped[row.section][row.key] = JSON.parse(row.value);
                } catch (e) {
                    grouped[row.section][row.key] = row.value;
                }
            }
            this.cache = grouped;
            this.lastLoaded = Date.now();
            return this.cache;
        } catch (err) {
            console.error('[ConfigService] Failed to load settings from DB:', err.message);
            return this.cache;
        }
    }

    async get(section, key, defaultValue = null) {
        if (!this.isInitialized || (Date.now() - this.lastLoaded > this.cacheTtlMs)) {
            await this.refresh();
        }
        if (this.cache[section] && this.cache[section][key] !== undefined) {
            return this.cache[section][key];
        }
        return defaultValue;
    }

    async getSection(section, defaultValues = {}) {
        if (!this.isInitialized || (Date.now() - this.lastLoaded > this.cacheTtlMs)) {
            await this.refresh();
        }
        return { ...defaultValues, ...(this.cache[section] || {}) };
    }

    invalidate() {
        this.lastLoaded = 0;
    }
}

const configService = new ConfigService();
module.exports = configService;

const express = require('express');
const router = express.Router();
const net = require('net');
const axios = require('axios');
const { Client: PgClient } = require('pg');
const { RouterOSAPI } = require('node-routeros');
const db = require('../db');
const { logAudit } = require('../services/audit');
const configService = require('../services/configService');

// Helper: Measure TCP connection latency
function checkTcpPort(host, port, timeoutMs = 3000) {
    return new Promise(resolve => {
        const start = Date.now();
        const s = new net.Socket();
        s.setTimeout(timeoutMs);
        s.on('connect', () => {
            const lat = Date.now() - start;
            s.destroy();
            resolve({ success: true, latency: lat });
        });
        s.on('error', (err) => {
            s.destroy();
            resolve({ success: false, error: err.message });
        });
        s.on('timeout', () => {
            s.destroy();
            resolve({ success: false, error: `Connection timed out after ${timeoutMs}ms` });
        });
        s.connect(port, host);
    });
}

// GET /api/settings - Fetch all settings grouped by section
router.get('/', async (req, res) => {
    try {
        const settings = await db('settings').select('*');
        const grouped = settings.reduce((acc, curr) => {
            if (!acc[curr.section]) acc[curr.section] = {};
            try {
                acc[curr.section][curr.key] = JSON.parse(curr.value);
            } catch (e) {
                acc[curr.section][curr.key] = curr.value;
            }
            return acc;
        }, {});
        
        // Force tickets section with WhatsApp mode options
        if (!grouped.tickets) {
            grouped.tickets = {};
        }
        grouped.tickets.wa_mode = 'real';

        // Map enable_isp_v2 back to enable_isp for UI compatibility while keeping legacy bot loop disabled
        if (!grouped.monitoring) {
            grouped.monitoring = {};
        }
        if (grouped.monitoring.enable_isp_v2 !== undefined) {
            grouped.monitoring.enable_isp = grouped.monitoring.enable_isp_v2;
        } else {
            grouped.monitoring.enable_isp = true;
        }
        
        res.json(grouped);
    } catch (err) {
        console.error('[Settings] Error fetching settings:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// POST /api/settings - Bulk update settings for a section
router.post('/', async (req, res) => {
    const { section, settings } = req.body;

    if (!section || !settings) {
        return res.status(400).json({ error: 'Section and settings are required' });
    }

    try {
        const payloadToSave = { ...settings };
        if (section === 'monitoring' && payloadToSave.enable_isp !== undefined) {
            payloadToSave.enable_isp_v2 = payloadToSave.enable_isp;
            payloadToSave.enable_isp = false; // Keep legacy generic ping in whatsapp_bot.js disabled
        }

        await db.transaction(async trx => {
            for (const [key, value] of Object.entries(payloadToSave)) {
                const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

                const existing = await trx('settings')
                    .where({ section, key })
                    .first();

                if (existing) {
                    await trx('settings')
                        .where({ id: existing.id })
                        .update({
                            value: stringValue,
                            updated_at: new Date()
                        });
                } else {
                    await trx('settings').insert({
                        section,
                        key,
                        value: stringValue,
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                }
            }
        });

        configService.invalidate();
        res.json({ message: `Settings for ${section} updated successfully` });

        // Log the action
        logAudit('Admin', 'UPDATE_SETTINGS', { section, keys: Object.keys(settings) });
    } catch (err) {
        console.error('[Settings] Error updating settings:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// POST /api/settings/test-database - Live PostgreSQL Handshake & Latency Check
router.post('/test-database', async (req, res) => {
    const { host, port, user, password, database, ssl } = req.body;

    if (!host || !user || !database) {
        return res.status(400).json({ success: false, error: 'Host, user, and database name are required' });
    }

    const client = new PgClient({
        host,
        port: parseInt(port) || 5432,
        user,
        password: password || '',
        database,
        ssl: ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000
    });

    const start = Date.now();
    try {
        await client.connect();
        const latency = Date.now() - start;
        const queryRes = await client.query(`
            SELECT 
                version() as version, 
                current_database() as db_name,
                (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') as table_count
        `);
        await client.end();

        return res.json({
            success: true,
            latency,
            host,
            port: parseInt(port) || 5432,
            database: queryRes.rows[0]?.db_name,
            version: queryRes.rows[0]?.version,
            tableCount: parseInt(queryRes.rows[0]?.table_count || 0)
        });
    } catch (err) {
        if (client) {
            try { await client.end(); } catch (e) { /* ignore */ }
        }
        return res.json({
            success: false,
            latency: Date.now() - start,
            host,
            port: parseInt(port) || 5432,
            error: err.message
        });
    }
});

// POST /api/settings/test-mikrotik - Live RouterOS API connection check
router.post('/test-mikrotik', async (req, res) => {
    let { host, port, user, password } = req.body;

    // Fallback to DB stored settings if not provided
    if (!host) {
        const row = await db('settings').where({ section: 'network', key: 'mikrotik_ip' }).first();
        host = row ? row.value : '192.168.1.1';
    }
    if (!user) {
        const row = await db('settings').where({ section: 'network', key: 'mikrotik_user' }).first();
        user = row ? row.value : 'api_mikrotik';
    }
    if (!password) {
        const row = await db('settings').where({ section: 'network', key: 'mikrotik_pass' }).first() ||
                    await db('settings').where({ section: 'network', key: 'mikrotik_password' }).first();
        password = row ? row.value : '';
    }

    const client = new RouterOSAPI({
        host,
        port: parseInt(port) || 8728,
        user,
        password,
        timeout: 4
    });

    const start = Date.now();
    try {
        await client.connect();
        const [resource, identity] = await Promise.all([
            client.write(['/system/resource/print']),
            client.write(['/system/identity/print'])
        ]);
        const latency = Date.now() - start;
        client.close();

        const resData = resource[0] || {};
        return res.json({
            success: true,
            latency,
            host,
            identity: identity[0]?.name || 'MikroTik Router',
            version: resData.version || 'Unknown',
            uptime: resData.uptime || '0s',
            cpuLoad: resData['cpu-load'] || '0',
            freeMemory: resData['free-memory'] ? Math.round(parseInt(resData['free-memory']) / 1024 / 1024) + ' MB' : 'N/A',
            totalMemory: resData['total-memory'] ? Math.round(parseInt(resData['total-memory']) / 1024 / 1024) + ' MB' : 'N/A',
            boardName: resData['board-name'] || resData.platform || 'RouterOS'
        });
    } catch (err) {
        if (client) {
            try { client.close(); } catch (e) { /* ignore */ }
        }
        return res.json({
            success: false,
            latency: Date.now() - start,
            host,
            error: err.message
        });
    }
});

// POST /api/settings/mikrotik/address-list/query - Query MikroTik Firewall Address-Lists
router.post('/mikrotik/address-list/query', async (req, res) => {
    let { host, port, user, password, listName } = req.body;

    if (!host) {
        const row = await db('settings').where({ section: 'network', key: 'mikrotik_ip' }).first();
        host = row ? row.value : '192.168.1.1';
    }
    if (!user) {
        const row = await db('settings').where({ section: 'network', key: 'mikrotik_user' }).first();
        user = row ? row.value : 'api_mikrotik';
    }
    if (!password) {
        const row = await db('settings').where({ section: 'network', key: 'mikrotik_pass' }).first() ||
                    await db('settings').where({ section: 'network', key: 'mikrotik_password' }).first();
        password = row ? row.value : '';
    }

    const client = new RouterOSAPI({
        host,
        port: parseInt(port) || 8728,
        user,
        password,
        timeout: 6
    });

    try {
        await client.connect();
        const rawList = await client.write(['/ip/firewall/address-list/print']);
        client.close();

        // Calculate counts per list
        const listCounts = {};
        rawList.forEach(item => {
            if (item.list) {
                listCounts[item.list] = (listCounts[item.list] || 0) + 1;
            }
        });

        // Filter items if specific list requested
        let items = rawList;
        if (listName && listName !== 'ALL') {
            items = rawList.filter(i => i.list === listName);
        }

        // Limit return items to 500 max to avoid browser crash
        const formatted = items.slice(0, 500).map(r => ({
            id: r['.id'],
            list: r.list,
            address: r.address,
            comment: r.comment || '',
            disabled: r.disabled === 'true',
            dynamic: r.dynamic === 'true',
            creationTime: r['creation-time'] || ''
        }));

        res.json({
            success: true,
            totalEntries: rawList.length,
            listCounts,
            items: formatted
        });
    } catch (err) {
        if (client) {
            try { client.close(); } catch (e) { /* ignore */ }
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/settings/mikrotik/address-list/action - Add/Remove/Toggle MikroTik Address-List
router.post('/mikrotik/address-list/action', async (req, res) => {
    let { host, port, user, password, action, id, list, address, comment, disabled } = req.body;

    if (!host) {
        const row = await db('settings').where({ section: 'network', key: 'mikrotik_ip' }).first();
        host = row ? row.value : '192.168.1.1';
    }
    if (!user) {
        const row = await db('settings').where({ section: 'network', key: 'mikrotik_user' }).first();
        user = row ? row.value : 'api_mikrotik';
    }
    if (!password) {
        const row = await db('settings').where({ section: 'network', key: 'mikrotik_pass' }).first() ||
                    await db('settings').where({ section: 'network', key: 'mikrotik_password' }).first();
        password = row ? row.value : '';
    }

    const client = new RouterOSAPI({
        host,
        port: parseInt(port) || 8728,
        user,
        password,
        timeout: 6
    });

    try {
        await client.connect();
        let resultMsg = '';

        if (action === 'add') {
            if (!list || !address) {
                client.close();
                return res.status(400).json({ success: false, error: 'List name and IP address are required' });
            }
            const cmd = [
                '/ip/firewall/address-list/add',
                '=list=' + list,
                '=address=' + address.trim(),
                '=comment=' + (comment ? comment.trim() : `Added via Power Asset UI [${new Date().toISOString().slice(0, 10)}]`)
            ];
            await client.write(cmd);
            resultMsg = `Successfully added ${address} to ${list}`;
            logAudit('Admin', 'MIKROTIK_BLOCKLIST_ADD', { host, list, address, comment });
        } else if (action === 'remove') {
            if (!id) {
                client.close();
                return res.status(400).json({ success: false, error: 'Item ID is required for removal' });
            }
            await client.write(['/ip/firewall/address-list/remove', '=.id=' + id]);
            resultMsg = `Successfully removed entry ${id}`;
            logAudit('Admin', 'MIKROTIK_BLOCKLIST_REMOVE', { host, id });
        } else if (action === 'toggle') {
            if (!id) {
                client.close();
                return res.status(400).json({ success: false, error: 'Item ID is required' });
            }
            const toggleCmd = disabled ? '/ip/firewall/address-list/enable' : '/ip/firewall/address-list/disable';
            await client.write([toggleCmd, '=.id=' + id]);
            resultMsg = `Successfully toggled entry ${id}`;
            logAudit('Admin', 'MIKROTIK_BLOCKLIST_TOGGLE', { host, id, newDisabled: !disabled });
        } else {
            client.close();
            return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
        }

        client.close();
        res.json({ success: true, message: resultMsg });
    } catch (err) {
        if (client) {
            try { client.close(); } catch (e) { /* ignore */ }
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/settings/test-ping - TCP Connection Latency Tester (Printers, NVR, GLPI, etc.)
router.post('/test-ping', async (req, res) => {
    const { host, port, timeoutMs } = req.body;
    if (!host || !port) {
        return res.status(400).json({ success: false, error: 'Host and port are required' });
    }
    const result = await checkTcpPort(host, parseInt(port), timeoutMs || 3000);
    res.json({ ...result, host, port: parseInt(port) });
});

// POST /api/settings/test-whatsapp - Send Test WhatsApp Notification
router.post('/test-whatsapp', async (req, res) => {
    const { gatewayUrl, phone, message } = req.body;
    const targetUrl = (gatewayUrl || 'http://192.168.1.66:5002').replace(/\/$/, '');

    try {
        const start = Date.now();
        // First check status
        const statusRes = await axios.get(`${targetUrl}/wa-status`, { timeout: 3000 });
        const latency = Date.now() - start;

        if (phone && message) {
            // Send test message
            const sendRes = await axios.post(`${targetUrl}/send-message`, {
                phone,
                message: `[TEST] ${message} (${new Date().toLocaleTimeString('id-ID')})`
            }, { timeout: 5000 });
            return res.json({
                success: true,
                latency,
                status: statusRes.data?.status || 'CONNECTED',
                messageSent: true,
                response: sendRes.data
            });
        }

        return res.json({
            success: true,
            latency,
            status: statusRes.data?.status || 'CONNECTED',
            details: statusRes.data
        });
    } catch (err) {
        return res.json({
            success: false,
            error: err.message,
            targetUrl
        });
    }
});

// GET /api/settings/audits - Fetch recent audit logs
router.get('/audits', async (req, res) => {
    try {
        const audits = await db('audit_logs').orderBy('timestamp', 'desc').limit(100);
        res.json(audits);
    } catch (err) {
        console.error('[Settings] Error fetching audits:', err);
        res.status(500).json({ error: 'Failed to fetch audits' });
    }
});

module.exports = router;

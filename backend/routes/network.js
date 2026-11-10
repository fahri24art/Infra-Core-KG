const express = require('express');
const router = express.Router();
const mikrotik = require('../services/mikrotik');
const db = require('../db');

// Middleware to load config
const loadConfig = async (req, res, next) => {
    try {
        const settings = await db('settings').where({ section: 'network' }).select('*');
        const config = {};
        settings.forEach(s => {
            // value is stored as JSON string "192.168.1.1" or just string
            try {
                config[s.key] = JSON.parse(s.value);
            } catch (e) {
                config[s.key] = s.value;
            }
        });

        if (!config.mikrotik_ip || !config.mikrotik_user) {
            return res.status(400).json({ error: "MikroTik not configured in System Settings" });
        }

        mikrotik.setConfig(config);
        next();
    } catch (e) {
        console.error("Config Load Error:", e);
        res.status(500).json({ error: "Failed to load configuration" });
    }
};

// GET /api/network/whatsapp-status
router.get('/whatsapp-status', async (req, res) => {
    try {
        const response = await fetch('http://127.0.0.1:5002/wa-status');
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.json({ status: 'OFFLINE', qr: null });
    }
});

// GET /api/network/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const response = await fetch('http://192.168.1.3/api/network/dashboard');
        if (!response.ok) throw new Error('Infra Guard API error');
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error("Dashboard error:", e);
        res.json({
            system: { cpu: 0, memory: { free: 0, total: 0 }, uptime: 'offline', identity: 'MicroTik-Offline' },
            traffic: { wan: { rx: 0, tx: 0, sources: [] }, interfaces: [] },
            users: { hotspotCount: 0, pppCount: 0 },
            config: { wan_capacity_iforte: 100, wan_capacity_comnet: 100 }
        });
    }
});

// GET /api/network/wazuh/alerts (Aggregated from ai_threat_analysis and endpoint_lockdown_logs)
router.get('/wazuh/alerts', async (req, res) => {
    try {
        const threats = await db('ai_threat_analysis').orderBy('created_at', 'desc').limit(250);
        const lockdowns = await db('endpoint_lockdown_logs').orderBy('created_at', 'desc').limit(250);
        
        const mappedThreats = threats.map(t => {
            let level = 5;
            const sev = (t.severity || '').toLowerCase();
            if (sev.includes('critical')) level = 12;
            else if (sev.includes('high')) level = 10;
            else if (sev.includes('medium')) level = 8;
            
            return {
                timestamp: t.created_at,
                rule_description: `[Iron Dome] ${t.threat_type}: ${t.recommendation || t.pattern_detected}`,
                level: level,
                agent_name: 'AI Analysis Engine',
                source_ip: '-'
            };
        });

        const mappedLockdowns = lockdowns.map(l => {
            return {
                timestamp: l.created_at,
                rule_description: `[Infra Guard] Endpoint Lockdown on ${l.hostname}. Policies: ${l.policies}`,
                level: 11,
                agent_name: l.hostname,
                source_ip: l.ip_address
            };
        });

        const combined = [...mappedThreats, ...mappedLockdowns].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({ data: combined });
    } catch (e) {
        console.error("Wazuh alerts error:", e);
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// GET /api/network/interfaces
router.get('/interfaces', async (req, res) => {
    try {
        const response = await fetch('http://192.168.1.3/api/network/interfaces');
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/network/firewall/:chain
router.get('/firewall/:chain', async (req, res) => {
    try {
        const { chain } = req.params;
        const response = await fetch(`http://192.168.1.3/api/network/firewall/${chain}`);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/network/firewall
router.post('/firewall', async (req, res) => {
    try {
        const response = await fetch('http://192.168.1.3/api/network/firewall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Proxy other endpoints to Server 3
router.get('/unifi', async (req, res) => {
    try {
        const response = await fetch('http://192.168.1.3/api/network/unifi');
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/topology', async (req, res) => {
    try {
        const response = await fetch('http://192.168.1.3/api/network/topology');
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/network/history?period=day|month|year
router.get('/history', async (req, res) => {
    try {
        const { period = 'day' } = req.query;
        let timeFormat;
        let limit;

        const now = new Date();
        if (period === 'day') {
            timeFormat = '%Y-%m-%d %H:00:00'; // Hourly
            limit = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        } else if (period === 'month') {
            timeFormat = '%Y-%m-%d'; // Daily
            limit = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        } else if (period === 'year') {
            timeFormat = '%Y-%m'; // Monthly
            limit = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
        }

        const data = await db('traffic_history')
            .select(
                db.client.config.client === 'pg' ? db.raw("to_char(to_timestamp(CAST(timestamp AS numeric) / 1000), '" + (period==='day'?'YYYY-MM-DD HH24:00:00':period==='month'?'YYYY-MM-DD':'YYYY-MM') + "') as time_bucket") : db.raw(`strftime('${timeFormat}', CASE WHEN typeof(timestamp) = 'integer' OR typeof(timestamp) = 'real' THEN datetime(timestamp / 1000, 'unixepoch') ELSE timestamp END) as time_bucket`),
                db.raw('AVG(rx) as rx'),
                db.raw('AVG(tx) as tx'),
                db.raw('AVG(rx_iforte) as rx_iforte'),
                db.raw('AVG(tx_iforte) as tx_iforte'),
                db.raw('AVG(rx_comnet) as rx_comnet'),
                db.raw('AVG(tx_comnet) as tx_comnet'),
                db.raw('MIN(CASE WHEN is_up = 1 OR is_up = "true" THEN 1 ELSE 0 END) as is_up'),
                db.raw('MIN(CASE WHEN is_up_iforte = 1 OR is_up_iforte = "true" THEN 1 ELSE 0 END) as is_up_iforte'),
                db.raw('MIN(CASE WHEN is_up_comnet = 1 OR is_up_comnet = "true" THEN 1 ELSE 0 END) as is_up_comnet')
            )
            .where('timestamp', '>=', limit)
            .groupBy('time_bucket')
            .orderBy('time_bucket', 'asc');

        res.json(data.map(d => ({
            time: d.time_bucket,
            rx: (d.rx / 1000000).toFixed(2),
            tx: (d.tx / 1000000).toFixed(2),
            rx_iforte: (d.rx_iforte / 1000000).toFixed(2),
            tx_iforte: (d.tx_iforte / 1000000).toFixed(2),
            rx_comnet: (d.rx_comnet / 1000000).toFixed(2),
            tx_comnet: (d.tx_comnet / 1000000).toFixed(2),
            is_up: !!d.is_up,
            is_up_iforte: !!d.is_up_iforte,
            is_up_comnet: !!d.is_up_comnet
        })));
    } catch (e) {
        console.error("History error:", e);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// GET /api/network/uptime-monthly?year=2025&type=uptime
router.get('/uptime-monthly', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const kpiType = req.query.type || 'uptime';
        const data = await db('traffic_history')
            .select(
                db.client.config.client === 'pg' ? db.raw("to_char(timestamp, 'MM') as month") : db.raw(`strftime('%m', CASE WHEN typeof(timestamp) = 'integer' OR typeof(timestamp) = 'real' THEN datetime(timestamp / 1000, 'unixepoch') ELSE timestamp END) as month`),
                // Support both legacy server_up and new is_up, and handle strings like 'true'
                db.client.config.client === 'pg' ? db.raw("SUM(CASE WHEN is_up = true OR is_up::text = '1' OR is_up::text = 'true' THEN 5 ELSE 0 END) as uptime_minutes") : db.raw('SUM(CASE WHEN is_up = 1 OR is_up = "true" THEN 5 ELSE 0 END) as uptime_minutes')
            )
            .whereRaw(db.client.config.client === 'pg' ? "to_char(timestamp, 'YYYY') = ?" : `strftime('%Y', CASE WHEN typeof(timestamp) = 'integer' OR typeof(timestamp) = 'real' THEN datetime(timestamp / 1000, 'unixepoch') ELSE timestamp END) = ?`, [year.toString()])
            .groupBy('month')
            .orderBy('month', 'asc');

        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const daysInMonth = new Date(year, m, 0).getDate();
            return {
                month: m,
                uptime_minutes: 0,
                total_minutes: daysInMonth * 24 * 60
            };
        });

        data.forEach(d => {
            const mIdx = parseInt(d.month) - 1;
            if (mIdx >= 0 && mIdx < 12) {
                // Only overwrite the uptime if it's the main uptime kpi
                if (kpiType === 'uptime') {
                    monthlyData[mIdx].uptime_minutes = d.uptime_minutes || 0;
                }
            }
        });

        // Calculate automatic percentage
        monthlyData.forEach(m => {
            m.percentage = m.total_minutes > 0 ? ((m.uptime_minutes / m.total_minutes) * 100).toFixed(2) : "0.00";
        });

        // Fetch overrides
        const overrides = await db('kpi_overrides')
            .where({ type: kpiType, year });

        overrides.forEach(ov => {
            const mIdx = ov.month - 1;
            if (mIdx >= 0 && mIdx < 12) {
                monthlyData[mIdx][ov.metric] = isNaN(ov.value) ? ov.value : Number(ov.value);
            }
        });

        // Recalculate percentage if overridden values changed the base
        monthlyData.forEach(m => {
            if (m.total_minutes > 0) {
                m.percentage = ((m.uptime_minutes / m.total_minutes) * 100).toFixed(2);
            }
        });

        res.json(monthlyData);
    } catch (e) {
        console.error("Uptime monthly error:", e);
        res.status(500).json({ error: "Failed to fetch uptime kpi" });
    }
});

// GET /api/network/isp-bandwidth-monthly?year=2025
router.get('/isp-bandwidth-monthly', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const data = await db('traffic_history')
            .select(
                db.client.config.client === 'pg' ? db.raw("to_char(timestamp, 'MM') as month") : db.raw(`strftime('%m', CASE WHEN typeof(timestamp) = 'integer' OR typeof(timestamp) = 'real' THEN datetime(timestamp / 1000, 'unixepoch') ELSE timestamp END) as month`),
                db.client.config.client === 'pg' ? db.raw("SUM(CASE WHEN is_up_iforte = true OR is_up_iforte::text = '1' OR is_up_iforte::text = 'true' THEN 5 ELSE 0 END) as iforte_uptime") : db.raw('SUM(CASE WHEN is_up_iforte = 1 OR is_up_iforte = "true" THEN 5 ELSE 0 END) as iforte_uptime'),
                db.client.config.client === 'pg' ? db.raw("SUM(CASE WHEN is_up_comnet = true OR is_up_comnet::text = '1' OR is_up_comnet::text = 'true' THEN 5 ELSE 0 END) as comnet_uptime") : db.raw('SUM(CASE WHEN is_up_comnet = 1 OR is_up_comnet = "true" THEN 5 ELSE 0 END) as comnet_uptime')
            )
            .whereRaw(db.client.config.client === 'pg' ? "to_char(timestamp, 'YYYY') = ?" : `strftime('%Y', CASE WHEN typeof(timestamp) = 'integer' OR typeof(timestamp) = 'real' THEN datetime(timestamp / 1000, 'unixepoch') ELSE timestamp END) = ?`, [year.toString()])
            .groupBy('month')
            .orderBy('month', 'asc');

        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const daysInMonth = new Date(year, m, 0).getDate();
            return {
                month: m,
                total_minutes: daysInMonth * 24 * 60, // Added calendar minutes
                iforte_uptime: 0,
                comnet_uptime: 0
            };
        });

        data.forEach(d => {
            const mIdx = parseInt(d.month) - 1;
            if (mIdx >= 0 && mIdx < 12) {
                monthlyData[mIdx].iforte_uptime = d.iforte_uptime || 0;
                monthlyData[mIdx].comnet_uptime = d.comnet_uptime || 0;
            }
        });

        // Fetch overrides
        const overrides = await db('kpi_overrides')
            .where({ type: 'isp', year });

        overrides.forEach(ov => {
            const mIdx = ov.month - 1;
            if (mIdx >= 0 && mIdx < 12) {
                monthlyData[mIdx][ov.metric] = isNaN(ov.value) ? ov.value : Number(ov.value);
            }
        });
        const finalData = monthlyData.map(m => {
            const total = m.total_minutes || 0;
            const iforte = m.iforte_uptime || 0;
            const comnet = m.comnet_uptime || 0;
            return {
                ...m,
                percentage: total > 0 ? (((iforte + comnet) / (total * 2)) * 100).toFixed(2) : "0.00"
            };
        });

        res.json(finalData);
    } catch (e) {
        console.error("ISP monthly error:", e);
        res.status(500).json({ error: "Failed to fetch isp kpi" });
    }
});

// GET /api/network/kpi-overrides - Fetch saved overrides
router.get('/kpi-overrides', async (req, res) => {
    try {
        const { type, year } = req.query;
        let query = db('kpi_overrides');
        if (type) query = query.where({ type });
        if (year) query = query.where({ year: parseInt(year) });
        const rows = await query.orderBy('month', 'asc');
        res.json(rows);
    } catch (e) {
        console.error("Fetch overrides error:", e);
        res.status(500).json({ error: "Failed to fetch overrides" });
    }
});

// POST /api/network/kpi-overrides - Save manual edits
router.post('/kpi-overrides', async (req, res) => {
    try {
        const { type, year, data } = req.body;
        // data should be an array of objects representing months:
        // [{ month: 1, target: 100, actual: 90 }, { month: 2, ... }]

        if (!Array.isArray(data)) return res.status(400).json({ error: "Data must be an array" });

        // Iterate through each month and each metric key to upsert
        for (const monthRow of data) {
            const month = monthRow.month;
            if (!month) continue;

            for (const [metric, value] of Object.entries(monthRow)) {
                if (metric === 'month' || metric === 'percentage' || metric === 'name') continue; // Skip non-metrics

                // Prepare numeric value
                const numValue = parseFloat(value);
                if (isNaN(numValue)) continue;

                // Upsert logic (SQLite handles REPLACE INTO)
                // We can first delete and then insert or use an ON CONFLICT equivalent.
                // SQLite 3.24+ supports UPSERT
                await db.raw(`
                    INSERT INTO kpi_overrides (type, year, month, metric, value)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(type, year, month, metric) DO UPDATE SET value=excluded.value
                `, [type, year, month, metric, numValue]);
            }
        }

        res.json({ success: true });
    } catch (e) {
        console.error("KPI Override save error:", e);
        res.status(500).json({ error: "Failed to save overrides" });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const mikrotik = require('../services/mikrotik');
const db = require('../db');
const {
    INFRA_MODULE_DEFS,
    classifyInfraDetail,
    computeMonthlyUptimeFromTickets,
    getMonthWindowWIB
} = require('../utils/kpiTime');

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

async function fetchYearIncidentContext(activeDb, year) {
    const startYearIso = new Date(Date.UTC(year - 1, 11, 1, 0, 0, 0)).toISOString();
    const endYearIso = new Date(Date.UTC(year + 1, 0, 2, 0, 0, 0)).toISOString();

    const tickets = await activeDb('tickets')
        .where('created_at', '>=', startYearIso)
        .where('created_at', '<', endYearIso)
        .where(function () {
            this.where('number', 'like', '%-IR-%')
                .orWhere('number', 'like', 'ICT-20%')
                .orWhere('subject', 'like', '%[AUTO-ALERT]%')
                .orWhere('subject', 'like', '%[LATENCY-ALERT]%')
                .orWhere('subject', 'like', '%[INFRA-GUARD]%')
                .orWhere('source', 'Infra Guard');
        })
        .select('id', 'number', 'subject', 'status', 'source', 'priority', 'created_at', 'updated_at')
        .orderBy('created_at', 'asc');

    const excludedRows = await activeDb('kpi_overrides')
        .where({ type: 'excluded_tickets', year });
    const excludedSet = new Set(
        excludedRows.filter(r => Number(r.value) === 1).map(r => String(r.metric))
    );

    return { tickets, excludedSet };
}

// GET /api/network/uptime-monthly?year=2026&type=uptime
router.get('/uptime-monthly', async (req, res) => {
    try {
        const activeDb = req.db || db;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const kpiType = req.query.type || 'uptime';

        const { tickets, excludedSet } = await fetchYearIncidentContext(activeDb, year);

        const monthlyData = computeMonthlyUptimeFromTickets({
            tickets,
            year,
            categoryPredicate: (cat) => (kpiType === 'uptime' ? cat === 'server_global' : false),
            excludedSet,
        });

        // Apply non-zero historical manual overrides (e.g., locked Jan-Aug figures before Kuma live sync)
        const overrides = await activeDb('kpi_overrides').where({ type: kpiType, year });
        overrides.forEach(ov => {
            const mIdx = ov.month - 1;
            const numVal = Number(ov.value);
            if (mIdx >= 0 && mIdx < 12 && !monthlyData[mIdx].isFuture) {
                if (ov.metric === 'uptime_minutes' && numVal > 0) {
                    monthlyData[mIdx].uptime_minutes = numVal;
                    monthlyData[mIdx].source = 'manual_override';
                } else if (ov.metric === 'total_minutes' && numVal > 0 && monthlyData[mIdx].source === 'manual_override') {
                    monthlyData[mIdx].total_minutes = numVal;
                }
            }
        });

        monthlyData.forEach(m => {
            if (m.total_minutes > 0) {
                if (m.source === 'manual_override') {
                    m.downtime_minutes = Math.max(0, m.total_minutes - m.uptime_minutes);
                }
                m.percentage = ((m.uptime_minutes / m.total_minutes) * 100).toFixed(2);
            } else {
                m.percentage = "0.00";
            }
        });

        res.json(monthlyData);
    } catch (e) {
        console.error("Uptime monthly error:", e);
        res.status(500).json({ error: "Failed to fetch uptime kpi" });
    }
});

// GET /api/network/isp-bandwidth-monthly?year=2026
router.get('/isp-bandwidth-monthly', async (req, res) => {
    try {
        const activeDb = req.db || db;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const { tickets, excludedSet } = await fetchYearIncidentContext(activeDb, year);

        const iforteMonthly = computeMonthlyUptimeFromTickets({
            tickets,
            year,
            categoryPredicate: (cat) => cat === 'internet_iforte',
            excludedSet,
        });
        const comnetMonthly = computeMonthlyUptimeFromTickets({
            tickets,
            year,
            categoryPredicate: (cat) => cat === 'internet_comnet',
            excludedSet,
        });

        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const ifM = iforteMonthly[i];
            const cmM = comnetMonthly[i];
            const mergedIncidents = [...(ifM.incidents || []), ...(cmM.incidents || [])]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return {
                month: i + 1,
                total_minutes: ifM.total_minutes,
                iforte_uptime: ifM.uptime_minutes,
                comnet_uptime: cmM.uptime_minutes,
                iforte_downtime: ifM.downtime_minutes,
                comnet_downtime: cmM.downtime_minutes,
                downtime_minutes: Math.round((ifM.downtime_minutes + cmM.downtime_minutes) / 2),
                uptime_minutes: Math.round((ifM.uptime_minutes + cmM.uptime_minutes) / 2),
                incident_count: mergedIncidents.filter(x => !x.excluded).length,
                incidents: mergedIncidents,
                isFuture: ifM.isFuture,
                isCurrent: ifM.isCurrent,
                source: 'tickets_realtime',
            };
        });

        // Apply non-zero historical manual overrides (e.g., locked Jan-Aug figures before Kuma/InfraGuard live sync)
        const overrides = await activeDb('kpi_overrides').where({ type: 'isp', year });
        overrides.forEach(ov => {
            const mIdx = ov.month - 1;
            const numVal = Number(ov.value);
            if (mIdx >= 0 && mIdx < 12 && !monthlyData[mIdx].isFuture && numVal > 0) {
                if (ov.metric === 'iforte_uptime' || ov.metric === 'comnet_uptime') {
                    monthlyData[mIdx][ov.metric] = numVal;
                    monthlyData[mIdx].source = 'manual_override';
                } else if (ov.metric === 'total_minutes' && monthlyData[mIdx].source === 'manual_override') {
                    monthlyData[mIdx].total_minutes = numVal;
                }
            }
        });

        const finalData = monthlyData.map(m => {
            const total = m.total_minutes || 0;
            const iforte = m.iforte_uptime || 0;
            const comnet = m.comnet_uptime || 0;
            const avgUp = total > 0 ? Math.round((iforte + comnet) / 2) : 0;
            return {
                ...m,
                uptime_minutes: avgUp,
                downtime_minutes: total > 0 ? Math.max(0, total - avgUp) : 0,
                percentage: total > 0 ? (((iforte + comnet) / (total * 2)) * 100).toFixed(2) : "0.00",
            };
        });

        res.json(finalData);
    } catch (e) {
        console.error("ISP monthly error:", e);
        res.status(500).json({ error: "Failed to fetch isp kpi" });
    }
});

// GET /api/network/kpi-years - Dynamic available KPI years based on DB history & future planning horizon
router.get('/kpi-years', async (req, res) => {
    try {
        const activeDb = req.db || db;
        const curYear = new Date().getFullYear();
        const yearSet = new Set();
        for (let y = 2025; y <= curYear + 2; y++) yearSet.add(y);

        try {
            const ovYears = await activeDb('kpi_overrides').distinct('year');
            ovYears.forEach(r => { const n = Number(r.year); if (n >= 2020 && n <= 2100) yearSet.add(n); });
        } catch (e) {}

        try {
            const mYears = await activeDb('maintenance_records').distinct('year');
            mYears.forEach(r => { const n = Number(r.year); if (n >= 2020 && n <= 2100) yearSet.add(n); });
        } catch (e) {}

        try {
            const tBounds = await activeDb('tickets').select(activeDb.raw('MIN(created_at) as min_d, MAX(created_at) as max_d')).first();
            if (tBounds?.min_d) {
                const minY = new Date(tBounds.min_d).getFullYear();
                const maxY = tBounds.max_d ? new Date(tBounds.max_d).getFullYear() : curYear;
                for (let y = Math.max(2020, minY); y <= Math.max(curYear + 2, maxY); y++) yearSet.add(y);
            }
        } catch (e) {}

        res.json({ currentYear: curYear, years: Array.from(yearSet).sort((a, b) => a - b) });
    } catch (e) {
        const curYear = new Date().getFullYear();
        res.json({ currentYear: curYear, years: [curYear - 1, curYear, curYear + 1, curYear + 2] });
    }
});

// Helper: Aggregate YTD SLA metrics across an array of monthly rows
function summarizeMonthlySlice(monthly = []) {
    let totalMinutes = 0;
    let uptimeMinutes = 0;
    let downtimeMinutes = 0;
    let incidentCount = 0;
    let downCount = 0;
    let latencyCount = 0;
    monthly.forEach(m => {
        if (!m.isFuture && m.total_minutes > 0) {
            totalMinutes += Number(m.total_minutes) || 0;
            uptimeMinutes += Number(m.uptime_minutes) || 0;
            downtimeMinutes += Number(m.downtime_minutes) || 0;
            incidentCount += Number(m.incident_count) || 0;
            downCount += Number(m.down_count) || 0;
            latencyCount += Number(m.latency_count) || 0;
        }
    });
    const pct = totalMinutes > 0 ? Number(((uptimeMinutes / totalMinutes) * 100).toFixed(2)) : 0;
    const mttrMinutes = incidentCount > 0 ? Math.round(downtimeMinutes / incidentCount) : 0;
    return { totalMinutes, uptimeMinutes, downtimeMinutes, incidentCount, downCount, latencyCount, mttrMinutes, pct };
}

// GET /api/network/local-kpi?year=YYYY - Infrastructure Telemetry & SLA grouped into Network, Server & Tools
router.get('/local-kpi', async (req, res) => {
    try {
        const activeDb = req.db || db;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const { tickets, excludedSet } = await fetchYearIncidentContext(activeDb, year);

        // Classify all tickets once
        const classifiedCache = new Map();
        const getDetail = (t) => {
            if (!classifiedCache.has(t.id)) {
                classifiedCache.set(t.id, classifyInfraDetail(t));
            }
            return classifiedCache.get(t.id);
        };

        const categories = [];
        for (const def of INFRA_MODULE_DEFS) {
            const monthly = computeMonthlyUptimeFromTickets({
                tickets,
                year,
                categoryPredicate: (_, t) => getDetail(t)?.moduleId === def.id,
                excludedSet,
            });
            const summary = summarizeMonthlySlice(monthly);
            if (def.optional && summary.incidentCount === 0) continue;
            categories.push({
                id: def.id,
                group: def.group,
                groupLabel: def.groupLabel,
                title: def.title,
                subtitle: def.subtitle,
                monthly,
                summary,
            });
        }

        // Compute group summaries (Network, Server, Tools) using merged intervals at group level + module averages
        const groups = {};
        for (const grpKey of ['network', 'server', 'tools']) {
            const grpModules = categories.filter(c => c.group === grpKey);
            const mergedGroupMonthly = computeMonthlyUptimeFromTickets({
                tickets,
                year,
                categoryPredicate: (_, t) => getDetail(t)?.domainGroup === grpKey,
                excludedSet,
            });
            const mergedStats = summarizeMonthlySlice(mergedGroupMonthly);
            const activeModScores = grpModules.map(m => m.summary.pct).filter(p => p > 0);
            const avgModulePct = activeModScores.length > 0
                ? Number((activeModScores.reduce((a, b) => a + b, 0) / activeModScores.length).toFixed(2))
                : 0;
            const totalInc = grpModules.reduce((s, m) => s + m.summary.incidentCount, 0);
            const totalDownInc = grpModules.reduce((s, m) => s + m.summary.downCount, 0);
            const totalLatInc = grpModules.reduce((s, m) => s + m.summary.latencyCount, 0);
            const totalDownMin = grpModules.reduce((s, m) => s + m.summary.downtimeMinutes, 0);
            groups[grpKey] = {
                id: grpKey,
                moduleCount: grpModules.length,
                avgPct: avgModulePct,
                mergedPct: mergedStats.pct,
                incidentCount: totalInc,
                downCount: totalDownInc,
                latencyCount: totalLatInc,
                downtimeMinutes: totalDownMin,
                mttrMinutes: totalInc > 0 ? Math.round(totalDownMin / totalInc) : 0,
                monthly: mergedGroupMonthly,
            };
        }

        res.json({
            year,
            groups,
            categories,
        });
    } catch (e) {
        console.error("Local KPI error:", e);
        res.status(500).json({ error: "Failed to fetch local kpi" });
    }
});

// POST /api/network/kpi-exclude-ticket - Exclude or restore a false-alarm incident ticket from SLA calc
router.post('/kpi-exclude-ticket', async (req, res) => {
    try {
        const activeDb = req.db || db;
        const { year, ticketNumber, excluded } = req.body;
        if (!year || !ticketNumber) return res.status(400).json({ error: "year and ticketNumber required" });

        if (excluded) {
            await activeDb.raw(`
                INSERT INTO kpi_overrides (type, year, month, metric, value)
                VALUES ('excluded_tickets', ?, 1, ?, 1)
                ON CONFLICT(type, year, month, metric) DO UPDATE SET value=1
            `, [parseInt(year), String(ticketNumber)]);
        } else {
            await activeDb('kpi_overrides')
                .where({ type: 'excluded_tickets', year: parseInt(year), metric: String(ticketNumber) })
                .del();
        }
        res.json({ success: true });
    } catch (e) {
        console.error("KPI exclude ticket error:", e);
        res.status(500).json({ error: "Failed to toggle excluded ticket" });
    }
});

// GET /api/network/kpi-overrides - Fetch saved overrides
router.get('/kpi-overrides', async (req, res) => {
    try {
        const activeDb = req.db || db;
        const { type, year } = req.query;
        let query = activeDb('kpi_overrides');
        if (type) query = query.where({ type });
        if (year) query = query.where({ year: parseInt(year) });
        const rows = await query.orderBy('month', 'asc');
        res.json(rows);
    } catch (e) {
        console.error("Fetch overrides error:", e);
        res.status(500).json({ error: "Failed to fetch overrides" });
    }
});

// POST /api/network/kpi-overrides - Save manual edits cleanly without zeroing future/unmodified months
router.post('/kpi-overrides', async (req, res) => {
    try {
        const activeDb = req.db || db;
        const { type, year, data } = req.body;
        if (!Array.isArray(data)) return res.status(400).json({ error: "Data must be an array" });

        for (const monthRow of data) {
            const month = monthRow.month;
            if (!month) continue;
            const win = getMonthWindowWIB(parseInt(year), parseInt(month));

            for (const [metric, value] of Object.entries(monthRow)) {
                if (metric === 'month' || metric === 'percentage' || metric === 'name' || metric === 'delete') continue;
                if (value === null || value === undefined || value === '') {
                    await activeDb('kpi_overrides').where({ type, year: parseInt(year), month: parseInt(month), metric }).del();
                    continue;
                }
                const numValue = parseFloat(value);
                if (isNaN(numValue)) continue;

                // Do not store synthetic 0 overrides for future months or current/past live metrics
                if (win.isFuture && numValue === 0) continue;

                await activeDb.raw(`
                    INSERT INTO kpi_overrides (type, year, month, metric, value)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(type, year, month, metric) DO UPDATE SET value=excluded.value
                `, [type, parseInt(year), parseInt(month), metric, numValue]);
            }
        }

        res.json({ success: true });
    } catch (e) {
        console.error("KPI Override save error:", e);
        res.status(500).json({ error: "Failed to save overrides" });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');
const http = require('http');

async function fetchRemote(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error("Parse failed")); }
            });
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(3000, () => { req.destroy(); reject(new Error("Timeout")); });
    });
}

// GET /api/security/intelligence - Aggregate stats for Dashboard
router.get('/intelligence', async (req, res) => {
    try {
        // Attempt to fetch real remote stats from localhost:7001
        let remoteStats = null;
        let remoteLogs = [];
        try {
            remoteStats = await fetchRemote('http://localhost:7001/api/security/stats');
            remoteLogs = await fetchRemote('http://localhost:7001/api/security/logs');
        } catch (e) {
            console.warn("[SecurityIntel] Failed to fetch remote data from localhost:", e.message);
        }

        // 1. AV Status Aggregation
        const avStats = await db('assets')
            .where('category', 'Computer')
            .select('antivirus_status')
            .count('id as value')
            .groupBy('antivirus_status');

        // Format for PieChart: [{ name: 'Protected', value: 45, color: '#10b981' }, ...]
        const statusColors = {
            'Protected': '#10b981',
            'At Risk': '#f59e0b',
            'Disabled': '#ef4444',
            'Offline': '#94a3b8'
        };

        const av_status = avStats.map(s => ({
            name: s.antivirus_status || 'Offline',
            value: s.value,
            color: statusColors[s.antivirus_status] || '#94a3b8'
        }));

        // 2. Top Sites (Today)
        const today = new Date().toISOString().split('T')[0];
        const topSitesRaw = await db('user_traffic_logs')
            .where('log_date', today)
            .select('url')
            .sum('hits as hits')
            .sum('data_usage as data')
            .groupBy('url')
            .orderBy('hits', 'desc')
            .limit(10);

        const top_sites = topSitesRaw.map(s => ({
            name: s.url,
            hits: s.hits,
            data: formatBytes(s.data)
        }));

        // 3. Top Users (Total Today)
        const topUsersRaw = await db('user_traffic_logs')
            .join('assets', 'user_traffic_logs.asset_uuid', 'assets.uuid')
            .where('user_traffic_logs.log_date', today)
            .select('assets.name as name', 'assets.threats_found as threats')
            .sum('user_traffic_logs.data_usage as traffic')
            .groupBy('assets.uuid', 'assets.name', 'assets.threats_found')
            .orderBy('traffic', 'desc')
            .limit(10);

        const top_users = topUsersRaw.map(u => ({
            name: u.name,
            traffic: formatBytes(u.traffic),
            threats: u.threats || 0
        }));

        // 4. Recent Threats
        const recent_threats = await db('assets')
            .where('threats_found', '>', 0)
            .select('name as user', 'antivirus_name as threat', 'antivirus_status as status', 'last_scan_at as time')
            .orderBy('last_scan_at', 'desc')
            .limit(5);

        // Merge Remote Logs into Recent Threats
        const formattedRemoteLogs = (remoteLogs || []).map(l => ({
            user: l.source_ip,
            threat: `${l.type} - ${l.details || 'Suspicious Traffic'}`,
            status: l.action === 'Allow' ? 'Observed' : 'Blocked',
            time: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : 'Recent'
        }));

        res.json({
            av_status,
            top_sites,
            top_users,
            recent_threats: [
                ...recent_threats.map(t => ({
                    ...t,
                    time: t.time ? new Date(t.time).toLocaleTimeString() : 'Unknown',
                    threat: t.threat || 'Unknown Threat',
                    status: t.status === 'Protected' ? 'Resolved' : 'Active'
                })),
                ...formattedRemoteLogs
            ].slice(0, 10)
        });

    } catch (err) {
        console.error('Security Intel Error:', err);
        res.status(500).json({ error: 'Failed to aggregate security intelligence' });
    }
});

function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/monitoring/alerts - Fetch communication logs
router.get('/alerts', async (req, res) => {
    const { platform, type, ticket_number, limit = 1000, department = 'all' } = req.query;
    try {
        const queryDb = req.db || db;
        let query = queryDb('communication_logs').orderBy('timestamp', 'desc').limit(limit);

        if (platform && platform !== 'all') {
            query = query.where({ platform });
        }
        if (department && department !== 'all') {
            query = query.where({ department });
        }
        if (type && type !== 'all') {
            query = query.where({ type });
        }
        if (ticket_number) {
            query = query.where('ticket_number', 'like', `%${ticket_number}%`);
        }

        const logs = await query;
        
        // Enrich logs with registered user names for WhatsApp
        const enrichedLogs = await Promise.all(logs.map(async (log) => {
            if (log.platform && log.platform.startsWith('whatsapp') && log.sender) {
                let phoneToLookup = log.sender;
                if (log.platform === 'whatsapp-group' && log.sender.includes('|')) {
                    phoneToLookup = log.sender.split('|')[1];
                }
                const cleanPhone = phoneToLookup.replace(/\D/g, '');
                if (cleanPhone) {
                    const queryDb = req.db || db;
                    const user = await queryDb('users').where('whatsapp', cleanPhone).orWhere('whatsapp', 'like', `%${cleanPhone}%`).first();
                    if (user) {
                        return { ...log, sender_name: user.name };
                    }
                }
            }
            return log;
        }));

        res.json(enrichedLogs);
    } catch (err) {
        console.error('[Monitoring] Error fetching alerts:', err.message);
        res.status(500).json({ error: 'Failed to fetch alert logs' });
    }
});

// GET /api/monitoring/whatsapp-history/:ticketNumber
router.get('/whatsapp-history/:ticketNumber', async (req, res) => {
    const { ticketNumber } = req.params;
    try {
        const queryDb = req.db || db;
        const history = await queryDb('communication_logs')
            .where({ platform: 'whatsapp' })
            .where('message', 'like', `%${ticketNumber}%`) // This is a bit loose, better if we link it properly
            .orWhere({ ticket_number: ticketNumber })
            .orderBy('timestamp', 'asc');
        res.json(history);
    } catch (err) {
        console.error('[Monitoring] Error fetching WA history:', err.message);
        res.status(500).json({ error: 'Failed to fetch WhatsApp history' });
    }
});

module.exports = router;

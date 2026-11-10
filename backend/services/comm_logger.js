const db = require('../db');

async function logComm({ platform, type, sender, recipient, message, ticketNumber = null, status = 'sent', department = 'ict', org = 'TCF-SG' }) {
    try {
        if (!db) return;
        await db.runWithOrg(org, async () => {
            await db('communication_logs').insert({
                platform,
                type,
                sender,
                recipient,
                message,
                ticket_number: ticketNumber,
                status,
                department,
                timestamp: new Date()
            });
        });
    } catch (err) {
        console.error(`[CommLogger] Error logging ${platform} message:`, err.message);
    }
}

module.exports = { logComm };

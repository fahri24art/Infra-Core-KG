const db = require('../db');

/**
 * Log an administrative action to the database.
 * @param {string} user - Name of the user performing the action.
 * @param {string} action - Type of action (e.g., 'SAVE_CONFIG', 'DELETE_HOST').
 * @param {object|string} details - Detailed information about the change.
 * @param {string} ip - IP address of the user (optional).
 */
async function logAudit(user, action, details, ip = null) {
    try {
        await db('audit_logs').insert({
            user_name: user || 'Admin',
            action: action,
            details: typeof details === 'object' ? JSON.stringify(details) : details,
            ip_address: ip,
            timestamp: new Date()
        });
    } catch (err) {
        console.error('Failed to save audit log:', err);
    }
}

module.exports = {
    logAudit
};

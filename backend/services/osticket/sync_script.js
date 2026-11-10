const { Client } = require('ssh2');
const mysql = require('mysql2/promise');
const db = require('../../db');

// Configuration
const config = {
    ssh: {
        host: '192.168.1.18',
        port: 22,
        username: 'tcf',
        password: 'nevergiveup'
    },
    db: {
        host: '127.0.0.1',
        user: 'osticket_user',
        password: 'nevergiveup',
        database: 'osticket_db'
    }
};

async function getLocalUserIdByEmail(email) {
    if (!email) return null;
    const user = await db('users').where('email', email).first();
    return user ? user.id : null;
}

async function getLocalUserIdByName(name) {
    if (!name) return null;
    const user = await db('users').where('name', name).first();
    return user ? user.id : null;
}

async function syncTickets() {
    console.log('[osTicket] Starting legacy sync...');
    const client = new Client();

    return new Promise((resolve, reject) => {
        client.on('ready', () => {
            client.forwardOut('127.0.0.1', 12345, '127.0.0.1', 3306, async (err, stream) => {
                if (err) {
                    client.end();
                    return reject(err);
                }

                const connection = await mysql.createConnection({ ...config.db, stream });

                try {
                    const [rows] = await connection.execute(`
                        SELECT 
                            t.ticket_id, t.number, t.user_id, t.status_id, t.created, t.updated, t.source,
                            u.name as user_name,
                            ue.address as user_email,
                            s.name as status_name
                        FROM ost_ticket t
                        LEFT JOIN ost_user u ON t.user_id = u.id
                        LEFT JOIN ost_user_email ue ON u.default_email_id = ue.id
                        LEFT JOIN ost_ticket_status s ON t.status_id = s.id
                        ORDER BY t.created ASC
                    `);

                    console.log(`[osTicket] Found ${rows.length} tickets to sync.`);

                    let syncedCount = 0;

                    for (const tick of rows) {
                        try {
                            // Map Status
                            let status = 'Open';
                            if (tick.status_name) {
                                const s = tick.status_name.toLowerCase();
                                if (s.includes('close') || s.includes('resolve')) status = 'Closed';
                                else if (s.includes('open')) status = 'Open';
                                else status = 'Pending';
                            }

                            // Try to match user
                            let localUserId = await getLocalUserIdByEmail(tick.user_email);
                            if (!localUserId) localUserId = await getLocalUserIdByName(tick.user_name);

                            const existing = await db('tickets')
                                .where('subject', 'like', `[OST-${tick.number}]%`)
                                .first();

                            const ticketData = {
                                subject: `[OST-${tick.number}] Legacy Ticket`,
                                description: `Imported from osTicket.\nSource: ${tick.source}\nOriginal User: ${tick.user_name} (${tick.user_email})\nOriginal Status: ${tick.status_name}`,
                                status: status,
                                priority: 'Medium',
                                user_id: localUserId,
                                created_at: new Date(tick.created),
                                updated_at: new Date(tick.updated)
                            };

                            if (existing) {
                                // console.log(`[osTicket] Skipping existing ticket ${tick.number}`);
                            } else {
                                await db('tickets').insert(ticketData);
                                console.log(`[osTicket] Imported ticket ${tick.number} (Date: ${tick.created})`);
                                syncedCount++;
                            }
                        } catch (innerErr) {
                            console.error(`[osTicket] Failed to sync ticket ${tick.number}:`, innerErr.message);
                        }
                    }

                    if (syncedCount === 0) {
                        console.log('[DEBUG] No tickets imported.');
                        console.log('[DEBUG] Total Rows Found:', rows.length);
                        if (rows.length > 0) {
                            console.log('[DEBUG] First Row Sample:', JSON.stringify(rows[0]));
                            const testSubject = `[OST-${rows[0].number}]`;
                            const check = await db('tickets').where('subject', 'like', `${testSubject}%`).first();
                            console.log(`[DEBUG] Check for ${testSubject} returned:`, check ? 'FOUND' : 'NOT FOUND');
                        }
                    }

                    console.log(`[osTicket] Sync complete. Imported ${syncedCount} new tickets.`);
                    resolve();

                } catch (e) {
                    console.error('[osTicket] DB Error:', e);
                    reject(e);
                } finally {
                    connection.end();
                    client.end();
                }
            });
        }).connect(config.ssh);
    });
}

if (require.main === module) {
    syncTickets()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { syncTickets };

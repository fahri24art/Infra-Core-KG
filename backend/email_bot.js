const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const ostPool = require('./config/osticket_db');
require('dotenv').config();
const db = require('./db');

async function getEmailConfig() {
    const rows = await db('settings').where({ section: 'tickets' }).select('key', 'value');
    const settings = {};
    rows.forEach(r => {
        try { settings[r.key] = JSON.parse(r.value); } catch(e) { settings[r.key] = r.value; }
    });

    return {
        imap: {
            user: settings.imap_user || process.env.IMAP_USER || 'helpdesk@tcf.co.id',
            password: settings.imap_password || process.env.IMAP_PASSWORD || 'password123',
            host: settings.imap_host || process.env.IMAP_HOST || 'imap.gmail.com',
            port: parseInt(settings.imap_port) || parseInt(process.env.IMAP_PORT) || 993,
            tls: settings.imap_tls !== false,
            authTimeout: 5000
        }
    };
}

async function processEmailAsTicket() {
    try {
        const dynamicConfig = await getEmailConfig();
        if (!dynamicConfig.imap.user || dynamicConfig.imap.user.includes('helpdesk@tcf.co.id')) {
            console.log('Skipping Email Poll: IMAP settings not configured.');
            return;
        }

        const connection = await imaps.connect(dynamicConfig);
        await connection.openBox('INBOX');

        const searchCriteria = ['UNSEEN'];
        const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: true };

        const messages = await connection.search(searchCriteria, fetchOptions);

        for (const item of messages) {
            const all = item.parts.find(part => part.which === '');
            const id = item.attributes.uid;
            const parsed = await simpleParser(all.body);

            const subject = parsed.subject || 'No Subject (Email)';
            const fromName = parsed.from.value[0].name || parsed.from.value[0].address;
            const fromEmail = parsed.from.value[0].address;
            const body = parsed.text || parsed.html || 'No Body Content';

            console.log(`Processing Email from ${fromEmail}: ${subject}`);

            // --- osTicket Transaction Log ---
            
            // 1. Ensure User Exists in osTicket
            let [userRows] = await ostPool.query(`SELECT id, default_email_id FROM ost_user WHERE name = ? OR default_email_id IN (SELECT id FROM ost_user_email WHERE address = ?) LIMIT 1`, [fromName, fromEmail]);
            let ostUserId = 0;
            let ostEmailId = 0;
            
            if (userRows.length === 0) {
                const [emailRes] = await ostPool.query(`INSERT INTO ost_user_email (address) VALUES (?)`, [fromEmail]);
                ostEmailId = emailRes.insertId;
                const [userRes] = await ostPool.query(`INSERT INTO ost_user (default_email_id, name, created, updated) VALUES (?, ?, NOW(), NOW())`, [ostEmailId, fromName]);
                ostUserId = userRes.insertId;
                await ostPool.query(`UPDATE ost_user_email SET user_id = ? WHERE id = ?`, [ostUserId, ostEmailId]);
            } else {
                ostUserId = userRows[0].id;
                ostEmailId = userRows[0].default_email_id;
            }

            // 2. Generate Ticket Number
            // Generate sequential ticket number
            const [rows] = await ostPool.query('SELECT number FROM ost_ticket WHERE number LIKE "ICT-03-%"');
            let maxNumber = 0;
            if (rows.length > 0) {
                rows.forEach(row => {
                    const match = row.number.match(/ICT-03-(\d{4})/);
                    if (match) {
                        const num = parseInt(match[1]);
                        if (num > maxNumber) maxNumber = num;
                    }
                });
            }
            const ticketNumber = "ICT-03-" + String(maxNumber + 1).padStart(4, '0');

            // 3. Create Ticket
            const [ticketRes] = await ostPool.query(`
                INSERT INTO ost_ticket 
                (number, user_id, user_email_id, status_id, dept_id, sla_id, topic_id, staff_id, team_id, source, isoverdue, isanswered, isresolved, created, updated)
                VALUES (?, ?, ?, 1, 1, 1, 0, 0, 0, 'Email', 0, 0, 0, NOW(), NOW())
            `, [ticketNumber, ostUserId, ostEmailId]);
            
            const internalTicketId = ticketRes.insertId;

            // 4. Create Custom Data
            await ostPool.query(`INSERT INTO ost_ticket__cdata (ticket_id, subject, priority) VALUES (?, ?, 'Normal')`, [internalTicketId, subject]);

            // 5. Create Thread
            const [threadRes] = await ostPool.query(`INSERT INTO ost_thread (object_id, object_type, created) VALUES (?, 'T', NOW())`, [internalTicketId]);
            const threadId = threadRes.insertId;

            // 6. Create Message Entry
            await ostPool.query(`
                INSERT INTO ost_thread_entry 
                (pid, thread_id, staff_id, user_id, type, poster, source, title, body, format, ip_address, created, updated)
                VALUES (0, ?, 0, ?, 'M', ?, 'Email', ?, ?, 'html', ?, NOW(), NOW())
            `, [threadId, ostUserId, fromName, subject, body, 'SMTP']);

            console.log(`Ticket Created: #${ticketNumber} from Email`);
        }

        connection.end();
    } catch (err) {
        console.error('Email Bot Polling Error:', err.message);
    }
}

// Poll every 1 minute
console.log('Email Ticket Listener started... Polling every 60s');
setInterval(processEmailAsTicket, 60000);
processEmailAsTicket();

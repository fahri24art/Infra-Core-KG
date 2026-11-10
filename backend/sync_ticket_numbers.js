const db = require('./db');
const mysql = require('mysql2/promise');

async function syncTicketNumbers() {
    try {
        console.log('Syncing ticket numbers from osTicket to local database...');
        
        // Connect to osTicket
        const ostPool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: 'nevergiveup',
            database: 'osticket',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        // Get all tickets from osTicket
        const [ostTickets] = await ostPool.query(`
            SELECT t.id, t.number, u.name as user_name, u.email
            FROM ost_ticket t
            LEFT JOIN ost_user u ON t.user_id = u.id
            WHERE t.source IN ('Web', 'Phone')
        `);
        
        console.log(`Found ${ostTickets.length} tickets in osTicket`);
        
        // For each osTicket, try to find corresponding local ticket and update number
        for (const ostTicket of ostTickets) {
            try {
                // Try to match by subject or created_at
                const [localTickets] = await db('tickets')
                    .where('subject', `WhatsApp Ticket - ${ostTicket.user_name}`)
                    .orWhere('subject', 'like', `%${ostTicket.user_name}%`)
                    .limit(1);
                
                if (localTickets.length > 0) {
                    const localTicket = localTickets[0];
                    await db('tickets')
                        .where('id', localTicket.id)
                        .update({ number: ostTicket.number.toString() });
                    
                    console.log(`✓ Updated local ticket ID ${localTicket.id} with number ${ostTicket.number}`);
                } else {
                    console.log(`⚠ No matching local ticket found for osTicket #${ostTicket.number}`);
                }
            } catch (err) {
                console.error(`Error processing ticket ${ostTicket.number}:`, err);
            }
        }
        
        await ostPool.end();
        console.log('✓ Sync completed');
        process.exit(0);
        
    } catch (err) {
        console.error('Error syncing ticket numbers:', err);
        process.exit(1);
    }
}

syncTicketNumbers();

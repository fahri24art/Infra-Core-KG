const ostPool = require('./config/osticket_db');

async function test() {
    try {
        console.log("Connecting to osTicket...");
        const [rows] = await ostPool.query('SELECT COUNT(*) as count FROM ost_ticket');
        console.log("Ticket Count:", rows[0].count);
        
        const [tickets] = await ostPool.query(`
            SELECT 
                t.ticket_id,
                t.number,
                s.name AS status,
                t.source,
                t.created
            FROM ost_ticket t
            LEFT JOIN ost_ticket_status s ON t.status_id = s.id
            LIMIT 5
        `);
        console.log("Tickets:", tickets);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit();
    }
}
test();

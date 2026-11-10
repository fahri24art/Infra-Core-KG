const ostPool = require('./config/osticket_db');

async function test() {
    try {
        console.log("Connecting to osTicket...");
        const [tickets] = await ostPool.query(`
            SELECT 
                t.ticket_id,
                t.number,
                s.name AS status,
                t.source,
                t.created,
                cd.priority,
                ht.topic,
                st.firstname,
                st.lastname
            FROM ost_ticket t
            LEFT JOIN ost_ticket_status s ON t.status_id = s.id
            LEFT JOIN ost_ticket__cdata cd ON t.ticket_id = cd.ticket_id
            LEFT JOIN ost_help_topic ht ON t.topic_id = ht.topic_id
            LEFT JOIN ost_staff st ON t.staff_id = st.staff_id
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

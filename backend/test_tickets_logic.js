const ostPool = require('./config/osticket_db');

async function test() {
    try {
        console.log("Connecting to osTicket...");
        // First Query
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
        `);
        console.log("Query 1 success. Tickets:", tickets.length);

        // Second Query (First Replies)
        const [replies] = await ostPool.query(`
            SELECT 
                t.source,
                TIMESTAMPDIFF(MINUTE, t.created, MIN(e.created)) as first_reply_minutes
            FROM ost_ticket t
            JOIN ost_thread th ON t.ticket_id = th.object_id AND th.object_type = 'T'
            JOIN ost_thread_entry e ON th.id = e.thread_id
            WHERE e.staff_id > 0
            GROUP BY t.ticket_id
        `);
        console.log("Query 2 success. Replies:", replies.length);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit();
    }
}
test();

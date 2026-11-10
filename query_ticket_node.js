const db = require('./backend/db');

async function queryTicket() {
    try {
        const ticket = await db('tickets').where('ticket_number', 'ICT-TCFSG-03-0068').first();
        console.log("=== TICKET ICT-TCFSG-03-0068 ===");
        console.log(ticket);
    } catch(err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

queryTicket();

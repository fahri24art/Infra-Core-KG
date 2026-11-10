const db = require('./db');

async function updateTicketSources() {
    try {
        const tickets = await db('tickets').select('id').limit(100);

        for (const ticket of tickets) {
            const sources = ['WhatsApp', 'Email', 'Teams'];
            const categories = ['Hardware', 'Software', 'Network', 'Request'];

            const source = sources[ticket.id % 3];
            const category = categories[ticket.id % 4];

            await db('tickets').where('id', ticket.id).update({
                source: source,
                category: category
            });
        }

        console.log('Updated', tickets.length, 'tickets with source and category');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updateTicketSources();

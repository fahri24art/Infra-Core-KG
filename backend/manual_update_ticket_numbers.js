const db = require('./db');

async function manualUpdateTicketNumbers() {
    try {
        console.log('Manually updating ticket numbers...');
        
        // Update specific tickets with their numbers
        // These are the tickets that were closed recently according to logs
        const updates = [
            { id: 1, number: '1000043' },
            { id: 2, number: '1000044' },
            { id: 3, number: '1000045' }
        ];
        
        for (const update of updates) {
            try {
                await db('tickets')
                    .where('id', update.id)
                    .update({ number: update.number });
                console.log(`✓ Updated ticket ID ${update.id} with number ${update.number}`);
            } catch (err) {
                console.error(`Error updating ticket ID ${update.id}:`, err);
            }
        }
        
        console.log('✓ Manual update completed');
        process.exit(0);
        
    } catch (err) {
        console.error('Error manually updating ticket numbers:', err);
        process.exit(1);
    }
}

manualUpdateTicketNumbers();

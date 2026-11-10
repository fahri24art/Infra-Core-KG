
const db = require('./db');
async function test() {
    try {
        console.log('Testing insert...');
        const res = await db('assets').insert({
            inventory_number: 'TCFSG-TEST-999',
            name: 'Test2',
            category: 'Laptop',
            type: 'Laptop',
            manufacturer: 'Test2',
            contact: 'Test2',
            location: 'Test2',
            status: 'Under Repair',
            specs: '{}',
            created_at: new Date(),
            updated_at: new Date()
        }).returning('*');
        console.log('Success:', res);
    } catch(e) {
        console.log('Error:', e);
    } finally {
        db.destroy();
    }
}
test();

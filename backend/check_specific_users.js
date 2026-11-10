require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./db');

async function checkUsers() {
    try {
        await db.runWithOrg('TCF-SG', async () => {
            const users = await db('users').where('name', 'ilike', '%AGUNG%').orWhere('name', 'ilike', '%ANA%');
            console.log("Users in ICT:");
            console.table(users.map(u => ({ id: u.id, name: u.name, whatsapp: u.whatsapp, hr_id: u.hr_employee_id })));

            const hr = await db('hr_employees').where('name', 'ilike', '%AGUNG%').orWhere('name', 'ilike', '%ANA%');
            console.log("\nUsers in HR:");
            console.table(hr.map(h => ({ id: h.id, name: h.name, phone: h.phone })));
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkUsers();

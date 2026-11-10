const fs = require('fs');
require('dotenv').config();
const db = require('./db');

async function run() {
    try {
        const users = await db('users').select('*');
        const hr = await db('hr_employees').select('*');
        
        fs.writeFileSync('F:/TCF Project Infra/local_users.json', JSON.stringify(users));
        fs.writeFileSync('F:/TCF Project Infra/local_hr.json', JSON.stringify(hr));
        
        console.log(`Exported ${users.length} users and ${hr.length} HR employees.`);
    } catch(e) {
        console.error(e);
    } finally {
        db.destroy();
    }
}
run();

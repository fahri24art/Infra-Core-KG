require('dotenv').config();
const db = require('./db');

async function check() {
    await db.runWithOrg('TCF-SG', async () => {
        const users = await db('users').where('name', 'ilike', '%abdurrahman%');
        console.log("Users:", users);
    });
    process.exit(0);
}
check();

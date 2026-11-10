const knex = require('knex');
const db = knex({
    client: 'pg',
    connection: 'postgres://postgres:Nevergiveup572*@192.168.1.66:5432/network_monitor_db'
});

async function run() {
    const count = await db('assets').count('* as count');
    console.log("Total assets in DB:", count[0].count);
    process.exit(0);
}
run();

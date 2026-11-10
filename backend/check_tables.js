const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    port: 5432,
    user: 'netadmin',
    password: 'secure_net_pass',
    database: 'network_monitor_db'
  }
});

async function main() {
  try {
    const res = await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log(res.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

main();

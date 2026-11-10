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
    const sysSet = await db('system_settings').select('*');
    console.log('system_settings:', sysSet);
    
    const settings = await db('settings').select('*');
    console.log('settings:', settings);
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

main();

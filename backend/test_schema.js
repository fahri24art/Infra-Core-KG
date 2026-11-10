const { Client } = require('pg');
const client = new Client({
  user: 'netadmin',
  host: '127.0.0.1',
  database: 'network_monitor_db',
  password: 'secure_net_pass',
  port: 5432,
});
client.connect().then(() => {
  return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';");
}).then((res) => {
  console.log("=== USERS TABLE ===");
  console.table(res.rows);
  return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hr_assets';");
}).then((res) => {
  console.log("=== HR_ASSETS TABLE ===");
  console.table(res.rows);
  client.end();
}).catch(err => {
  console.error('Error:', err);
  client.end();
});

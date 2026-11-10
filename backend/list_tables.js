const { Client } = require('pg');
const client = new Client({
  user: 'netadmin',
  host: '127.0.0.1',
  database: 'network_monitor_db',
  password: 'secure_net_pass',
  port: 5432,
});
client.connect().then(() => {
  return client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
}).then((res) => {
  console.log("TABLES:");
  res.rows.forEach(r => console.log(r.table_name));
  client.end();
}).catch(err => {
  console.error('Error:', err);
  client.end();
});

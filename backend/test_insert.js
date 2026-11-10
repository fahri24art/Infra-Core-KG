const { Client } = require('pg');
const client = new Client({
  user: 'netadmin',
  host: '127.0.0.1',
  database: 'network_monitor_db',
  password: 'secure_net_pass',
  port: 5432,
});
client.connect().then(() => {
  return client.query("INSERT INTO maintenance_records (asset_id, maintenance_date, maintenance_type, pic_name, department, condition_before, condition_after, status, checksheet_data, week_key, year, created_at, updated_at) VALUES (43, '2026-06-30', 'Semester', 'Test', 'IT', 'Test', 'Test', 'Completed', '{}', '6_4', 2026, NOW(), NOW())");
}).then((res) => {
  console.log('Success');
  client.end();
}).catch(err => {
  console.error('Error:', err.message);
  client.end();
});

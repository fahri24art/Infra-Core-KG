const { Client } = require('pg');

const client = new Client({ 
  user: 'netadmin', 
  host: '127.0.0.1', 
  database: 'network_monitor_db', 
  password: 'secure_net_pass', 
  port: 5432 
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT * FROM ricoh_devices');
  
  const imC2000 = res.rows.find(r => r.model.includes('C2000') || r.name.includes('PPIC'));
  const mpC2004 = res.rows.find(r => r.model.includes('C2004') || r.name.includes('OFFICE'));

  console.log('IM C2000 IP:', imC2000 ? imC2000.ip : 'Not Found');
  console.log('MP C2004 IP:', mpC2004 ? mpC2004.ip : 'Not Found');

  if (imC2000 && mpC2004) {
    // Check if we already inserted them to prevent duplicates
    const checkRes = await client.query("SELECT count(*) FROM ricoh_system_logs WHERE message LIKE '%Historical_Invoice_Data%'");
    if (checkRes.rows[0].count > 0) {
        console.log('Historical data already injected!');
        await client.end();
        return;
    }

    // We will inject the summary logs for April 2026 and May 2026
    const inserts = [
      // April 2026
      { ip: imC2000.ip, type: 'BW', pages: 15121, date: '2026-04-30 23:59:59' },
      { ip: imC2000.ip, type: 'COLOR', pages: 1642, date: '2026-04-30 23:59:59' },
      { ip: mpC2004.ip, type: 'BW', pages: 16643, date: '2026-04-30 23:59:59' },
      { ip: mpC2004.ip, type: 'COLOR', pages: 1885, date: '2026-04-30 23:59:59' },

      // May 2026
      { ip: imC2000.ip, type: 'BW', pages: 11161, date: '2026-05-31 23:59:59' },
      { ip: imC2000.ip, type: 'COLOR', pages: 2065, date: '2026-05-31 23:59:59' },
      { ip: mpC2004.ip, type: 'BW', pages: 14569, date: '2026-05-31 23:59:59' },
      { ip: mpC2004.ip, type: 'COLOR', pages: 1301, date: '2026-05-31 23:59:59' }
    ];

    for (const data of inserts) {
      const msg = `API Poller: PRINT by Historical_Invoice_Data printed ${data.pages} ${data.type} page(s) on ${data.ip}.`;
      await client.query(
        'INSERT INTO ricoh_system_logs (timestamp, event_type, message) VALUES ($1, $2, $3)',
        [data.date, 'PRINT_JOB', msg]
      );
      console.log('Inserted:', msg, 'at', data.date);
    }
    console.log('All historical data injected successfully!');
  } else {
    console.log('Could not find matching machines in database.');
  }

  await client.end();
}
run();

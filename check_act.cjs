const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('su - postgres -c "psql -d network_monitor_db -c \\"SELECT count(*) FROM budget_activity_plans;\\""', (err, stream) => {
        if (err) throw err;
        stream.on('data', d => console.log('OUT:', d.toString()));
        stream.stderr.on('data', d => console.error('ERR:', d.toString()));
        stream.on('close', (code) => {
            console.log('Finished with code', code);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'Nevergiveup572*' });

const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const cmd = `su - postgres -c "psql -d network_monitor_db -c '\\d budget_activity_plans'"`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', d => { out += d.toString(); });
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => {
            console.log(out);
            conn.end();
            process.exit(0);
        });
    });
}).connect({
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
});

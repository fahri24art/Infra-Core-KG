const { Client: SSHClient } = require('ssh2');

const config = {
    host: '192.168.1.3',
    port: 22,
    username: 'root',
    password: 'nevergiveup',
    readyTimeout: 30000
};

const conn = new SSHClient();
conn.on('ready', () => {
    const cmd = `docker exec net_mon_postgres psql -U netadmin -d infra_guard_db -c "SELECT key, value FROM settings;"`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
              .on('data', data => process.stdout.write('STDOUT: ' + data))
              .stderr.on('data', data => process.stderr.write('STDERR: ' + data));
    });
}).connect(config);

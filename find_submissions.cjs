const { Client } = require('ssh2');

const sshConfig = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

const conn = new Client();
conn.on('ready', () => {
    // Search for all POST requests to department-requests in all PM2 logs
    const cmd = `grep -i "POST /api/budgeting/department-requests" /root/.pm2/logs/*`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => conn.end());
    });
}).connect(sshConfig);

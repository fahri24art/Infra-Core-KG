const { Client } = require('ssh2');

const sshConfig = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

const conn = new Client();
conn.on('ready', () => {
    const cmd = `grep -C 5 "REQ-" /root/.pm2/logs/power-asset*.log | grep -v "REQ-SG-2026" | grep -v "REQ-KG-2026"`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => conn.end());
    });
}).connect(sshConfig);

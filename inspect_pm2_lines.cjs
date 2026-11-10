const { Client } = require('ssh2');

const sshConfig = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

const conn = new Client();
conn.on('ready', () => {
    const cmd = `sed -n '14441305,14441320p; 14447350,14447365p; 14474665,14474680p' /root/.pm2/logs/power-asset-out.log`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', code => conn.end());
    });
}).connect(sshConfig);

const { Client: SSHClient } = require('ssh2');

const ssh = new SSHClient();

ssh.on('ready', () => {
    const cmd = `sed -n '1065,1105p' /opt/power_asset/backend/whatsapp_bot.js`;
    ssh.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            ssh.end();
        }).on('data', (data) => {
            console.log(data.toString());
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).connect({
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
});

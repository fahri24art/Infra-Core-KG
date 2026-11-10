const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    conn.exec('ssh -o StrictHostKeyChecking=no root@192.168.1.17 "docker ps -a || systemctl status wazuh-manager || systemctl status wazuh-dashboard"', (err, stream) => {
        let stdout = '';
        let stderr = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('stderr', e => stderr += e.toString());
        stream.on('close', () => {
            console.log('--- WAZUH VM DOCKER / SYSTEMD STATUS ---');
            console.log(stdout);
            console.log('--- STDERR ---');
            console.log(stderr);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });

const SftpClient = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');
const path = require('path');

const config = {
    host: '192.168.1.66',
    port: 22,
    username: 'root',
    password: 'Nevergiveup572*'
};

async function main() {
    const sftp = new SftpClient();
    try {
        console.log('[SFTP] Connecting...');
        await sftp.connect(config);
        console.log('[SFTP] Uploading uptime_kuma.js...');
        await sftp.fastPut(
            path.join(__dirname, 'backend', 'routes', 'uptime_kuma.js'),
            '/opt/power_asset/backend/routes/uptime_kuma.js'
        );
        console.log('[SFTP] Upload complete!');
        await sftp.end();

        console.log('[SSH] Restarting PM2...');
        const ssh = new SSHClient();
        ssh.on('ready', () => {
            ssh.exec('pm2 restart power-asset-backend || pm2 restart all', (err, stream) => {
                if (err) throw err;
                stream.on('close', (code) => {
                    console.log('[SSH] PM2 restart done with code', code);
                    ssh.end();
                }).on('data', d => process.stdout.write(d.toString()));
            });
        }).connect(config);
    } catch (e) {
        console.error(e);
    }
}

main();

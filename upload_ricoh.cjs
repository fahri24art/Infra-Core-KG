const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');

async function main() {
    const sftp = new Client();
    try {
        console.log('[SFTP] Connecting to Power Asset Server (192.168.1.66)...');
        await sftp.connect({
            host: '192.168.1.66',
            port: 22,
            username: 'root',
            password: 'Nevergiveup572*'
        });

        const localFile = 'F:/TCF Project Infra/APP_Power_Asset/backend/routes/ricoh.js';
        const remoteFile = '/opt/power_asset/backend/routes/ricoh.js';

        console.log('[SFTP] Uploading ricoh.js...');
        await sftp.put(localFile, remoteFile);
        console.log('[SFTP] Upload complete!');
        
        await sftp.end();

        console.log('[SSH] Restarting PM2 backend...');
        const conn = new SSHClient();
        conn.on('ready', () => {
            conn.exec('pm2 restart power-asset', (err, stream) => {
                if (err) throw err;
                stream.on('close', () => {
                    console.log('PM2 restarted successfully');
                    conn.end();
                }).on('data', (data) => {
                    console.log(data.toString());
                });
            });
        }).connect({
            host: '192.168.1.66',
            port: 22,
            username: 'root',
            password: 'Nevergiveup572*'
        });

    } catch (err) {
        console.error(err);
    }
}

main();

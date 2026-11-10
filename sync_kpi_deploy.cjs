const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');

async function main() {
    const sftp = new Client();
    try {
        console.log('[SFTP] Connecting to 192.168.1.66...');
        await sftp.connect({
            host: '192.168.1.66',
            port: 22,
            username: 'root',
            password: 'Nevergiveup572*'
        });

        // 1. Upload network.js backend
        const localNetwork = 'F:/TCF Project Infra/APP_Power_Asset/backend/routes/network.js';
        const remoteNetwork = '/opt/power_asset/backend/routes/network.js';
        console.log('[SFTP] Uploading network.js...');
        await sftp.put(localNetwork, remoteNetwork);

        // 2. Upload dist
        const localDist = 'F:/TCF Project Infra/APP_Power_Asset/dist';
        const remoteDist = '/opt/power_asset/dist';
        console.log('[SFTP] Clearing remote dist...');
        try {
            await sftp.rmdir(remoteDist, true);
        } catch (e) {
            console.log('Remote dist clear skipped or non-existent.');
        }

        console.log('[SFTP] Uploading dist folder...');
        await sftp.uploadDir(localDist, remoteDist);
        console.log('[SFTP] Upload complete!');
        
        await sftp.end();

        // 3. Restart PM2
        console.log('[SSH] Restarting PM2 power-asset...');
        const conn = new SSHClient();
        conn.on('ready', () => {
            conn.exec('pm2 restart power-asset', (err, stream) => {
                if (err) throw err;
                stream.on('close', () => {
                    console.log('[SSH] PM2 restart completed!');
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
        console.error('Deployment error:', err);
    }
}

main();

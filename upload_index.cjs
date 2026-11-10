const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');

async function main() {
    const sftp = new Client();
    try {
        console.log('[SFTP] Connecting...');
        await sftp.connect({
            host: '192.168.1.66',
            port: 22,
            username: 'root',
            password: 'Nevergiveup572*'
        });

        console.log('[SFTP] Uploading backend/index.js...');
        await sftp.fastPut('F:/TCF Project Infra/APP_Power_Asset/backend/index.js', '/opt/power_asset/backend/index.js');
        console.log('[SFTP] Upload complete!');
        await sftp.end();

        console.log('[SSH] Restarting PM2...');
        const conn = new SSHClient();
        conn.on('ready', () => {
            conn.exec('pm2 restart power-asset power_asset_bot_1 power_asset_bot_2 power_asset_bot_3', (err, stream) => {
                if (err) throw err;
                stream.on('close', () => {
                    console.log('PM2 restarted successfully');
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
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
main();

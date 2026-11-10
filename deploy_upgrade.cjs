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

        console.log('[SFTP] Uploading backend routes...');
        await sftp.fastPut('F:/TCF Project Infra/APP_Power_Asset/backend/routes/assets.js', '/opt/power_asset/backend/routes/assets.js');
        await sftp.fastPut('F:/TCF Project Infra/APP_Power_Asset/backend/routes/tickets.js', '/opt/power_asset/backend/routes/tickets.js');
        await sftp.fastPut('F:/TCF Project Infra/APP_Power_Asset/backend/routes/raw_documents.js', '/opt/power_asset/backend/routes/raw_documents.js');
        await sftp.fastPut('F:/TCF Project Infra/APP_Power_Asset/backend/routes/uptime_kuma.js', '/opt/power_asset/backend/routes/uptime_kuma.js');
        await sftp.fastPut('F:/TCF Project Infra/APP_Power_Asset/backend/index.js', '/opt/power_asset/backend/index.js');
        await sftp.fastPut('F:/TCF Project Infra/APP_Power_Asset/backend/whatsapp_bot.js', '/opt/power_asset/backend/whatsapp_bot.js');
        
        console.log('[SFTP] Uploading migration file...');
        await sftp.fastPut('F:/TCF Project Infra/APP_Power_Asset/backend/migrations/20261007072000_create_asset_upgrade_requests.js', '/opt/power_asset/backend/migrations/20261007072000_create_asset_upgrade_requests.js');
        await sftp.fastPut('F:/TCF Project Infra/APP_Power_Asset/backend/migrations/20261007105500_create_raw_documents.js', '/opt/power_asset/backend/migrations/20261007105500_create_raw_documents.js');
        
        console.log('[SFTP] Upload complete!');
        await sftp.end();

        console.log('[SSH] Connecting to run migration and restart PM2...');
        const conn = new SSHClient();
        conn.on('ready', () => {
            console.log('[SSH] Connected! Running migration...');
            conn.exec('cd /opt/power_asset/backend && npx knex migrate:latest --env production', (err, stream) => {
                if (err) throw err;
                
                stream.on('data', (data) => console.log(data.toString()));
                stream.stderr.on('data', (data) => console.error(data.toString()));

                stream.on('close', (code) => {
                    console.log(`[SSH] Migration finished with code ${code}. Restarting PM2...`);
                    conn.exec('pm2 restart power-asset power_asset_bot_1 power_asset_bot_2 power_asset_bot_3', (err, stream2) => {
                        if (err) throw err;
                        stream2.on('close', () => {
                            console.log('PM2 restarted successfully');
                            conn.end();
                            process.exit(0);
                        });
                    });
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

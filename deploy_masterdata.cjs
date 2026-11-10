const Client = require('ssh2-sftp-client');
const { Client: SshClient } = require('ssh2');

async function main() {
    const sftp = new Client();
    try {
        console.log('[SFTP] Connecting...');
        await sftp.connect({
            host: '192.168.1.66',
            port: 22,
            username: 'tcf',
            password: 'nevergiveup'
        });

        console.log('Uploading index.js...');
        await sftp.fastPut('backend/index.js', '/opt/power_asset/backend/index.js');
        
        console.log('Uploading global_configurator.js...');
        await sftp.fastPut('backend/routes/global_configurator.js', '/opt/power_asset/backend/routes/global_configurator.js');

        // Also we should run migrations on the server just in case
        console.log('Uploading migrations...');
        await sftp.uploadDir('backend/migrations', '/opt/power_asset/backend/migrations');

        console.log('Backend files uploaded successfully!');
    } catch (err) {
        console.error('SFTP Error:', err);
    } finally {
        sftp.end();
    }

    const conn = new SshClient();
    conn.on('ready', () => {
        console.log('Running migrations on server...');
        conn.exec('cd /opt/power_asset/backend && npx knex migrate:latest && pm2 restart power-asset', (err, stream) => {
            stream.on('data', d => process.stdout.write(d.toString())).on('close', () => {
                conn.end();
                process.exit(0);
            });
        });
    }).connect({ host: '192.168.1.66', port: 22, username: 'tcf', password: 'nevergiveup' });
}

main();

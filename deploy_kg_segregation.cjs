const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');
const path = require('path');
const fs = require('fs');

async function deploy() {
    const sftp = new Client();
    const sshConfig = {
        host: '192.168.1.66',
        port: 22,
        username: 'root',
        password: 'Nevergiveup572*'
    };

    try {
        console.log('[Deploy] Connecting to Power Asset Production (192.168.1.66)...');
        await sftp.connect(sshConfig);

        await sftp.fastPut('backend/routes/portal.js', '/opt/power_asset/backend/routes/portal.js');
        await sftp.fastPut('backend/routes/uptime_kuma.js', '/opt/power_asset/backend/routes/uptime_kuma.js');
        await sftp.fastPut('backend/routes/auth.js', '/opt/power_asset/backend/routes/auth.js');
        await sftp.fastPut('backend/routes/assets.js', '/opt/power_asset/backend/routes/assets.js');
        await sftp.fastPut('backend/routes/budgeting.js', '/opt/power_asset/backend/routes/budgeting.js');
        if (fs.existsSync('backend/data/budget_store.json')) {
            await sftp.fastPut('backend/data/budget_store.json', '/opt/power_asset/backend/data/budget_store.json');
        }
        await sftp.fastPut('backend/services/hardwareDiff.js', '/opt/power_asset/backend/services/hardwareDiff.js');
        if (fs.existsSync('backend/index.js')) {
            await sftp.fastPut('backend/index.js', '/opt/power_asset/backend/index.js');
        }

        console.log('[Deploy] Uploading compiled frontend dist bundle...');
        await sftp.uploadDir('dist', '/opt/power_asset/dist');

        console.log('[Deploy] All files uploaded successfully!');
        await sftp.end();

        console.log('[SSH] Restarting power-asset PM2...');
        const conn = new SSHClient();
        conn.on('ready', () => {
            conn.exec('pm2 restart power-asset', (err, stream) => {
                if (err) throw err;
                stream.on('data', d => process.stdout.write(d.toString()));
                stream.stderr.on('data', d => process.stderr.write(d.toString()));
                stream.on('close', code => {
                    console.log(`[SSH] power-asset restarted with exit code ${code}`);
                    conn.end();
                    process.exit(0);
                });
            });
        }).connect(sshConfig);

    } catch (err) {
        console.error('[Deploy Error]:', err.message);
        if (sftp) sftp.end();
        process.exit(1);
    }
}

deploy();

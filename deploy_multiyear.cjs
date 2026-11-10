const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');
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
        console.log('[Deploy] Connecting to 192.168.1.66...');
        await sftp.connect(sshConfig);

        console.log('[Deploy] Uploading updated budgeting router...');
        const routeBuf = fs.readFileSync('backend/routes/budgeting.js');
        await sftp.put(routeBuf, '/opt/power_asset/backend/routes/budgeting.js');

        console.log('[Deploy] Uploading updated budget_store.json...');
        const storeBuf = fs.readFileSync('backend/data/budget_store.json');
        await sftp.put(storeBuf, '/opt/power_asset/backend/data/budget_store.json');

        if (fs.existsSync('../_Scripts/generate_budget_excel.py')) {
            console.log('[Deploy] Uploading generate_budget_excel.py...');
            await sftp.mkdir('/opt/power_asset/_Scripts', true).catch(() => {});
            await sftp.put(fs.readFileSync('../_Scripts/generate_budget_excel.py'), '/opt/power_asset/_Scripts/generate_budget_excel.py');
        }

        console.log('[Deploy] Uploading dist bundle...');
        await sftp.uploadDir('dist', '/opt/power_asset/dist');

        await sftp.end();
        console.log('[Deploy] SFTP complete!');

        console.log('[SSH] Restarting power-asset PM2...');
        const conn = new SSHClient();
        conn.on('ready', () => {
            conn.exec('pm2 restart power-asset', (err, stream) => {
                stream.on('data', d => console.log(d.toString()));
                stream.on('close', code => {
                    console.log(`[SSH] power-asset restarted with exit code ${code}`);
                    conn.end();
                    process.exit(0);
                });
            });
        }).connect(sshConfig);
    } catch (err) {
        console.error('Deploy error:', err.message);
        if (sftp) sftp.end();
        process.exit(1);
    }
}

deploy();

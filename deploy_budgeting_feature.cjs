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

        // Ensure remote directories
        await sftp.mkdir('/opt/power_asset/backend/routes', true);
        await sftp.mkdir('/opt/power_asset/backend/services/downloads', true);
        await sftp.mkdir('/opt/power_asset/backend/data', true);
        await sftp.mkdir('/opt/power_asset/backend/exports', true);
        await sftp.mkdir('/opt/power_asset/_Scripts', true);

        console.log('[Deploy] Uploading backend files...');
        await sftp.fastPut('backend/routes/budgeting.js', '/opt/power_asset/backend/routes/budgeting.js');
        await sftp.fastPut('backend/data/budget_store.json', '/opt/power_asset/backend/data/budget_store.json');
        await sftp.fastPut('backend/services/hardwareDiff.js', '/opt/power_asset/backend/services/hardwareDiff.js');
        await sftp.fastPut('backend/services/downloads/PowerAsset_Agent_SG.ps1', '/opt/power_asset/backend/services/downloads/PowerAsset_Agent_SG.ps1');
        await sftp.fastPut('backend/services/downloads/PowerAsset_Agent_KG.ps1', '/opt/power_asset/backend/services/downloads/PowerAsset_Agent_KG.ps1');
        await sftp.fastPut('backend/index.js', '/opt/power_asset/backend/index.js');
        await sftp.fastPut('../_Scripts/generate_budget_excel.py', '/opt/power_asset/_Scripts/generate_budget_excel.py');
        await sftp.fastPut('../FORM REGULAR BUDGET PT TCF Y2026.xlsx', '/opt/power_asset/FORM REGULAR BUDGET PT TCF Y2026.xlsx');

        console.log('[Deploy] Uploading frontend dist bundle...');
        await sftp.uploadDir('dist', '/opt/power_asset/dist');

        console.log('[Deploy] All files uploaded successfully!');
        await sftp.end();

        console.log('[SSH] Restarting power-asset PM2...');
        const conn = new SSHClient();
        conn.on('ready', () => {
            conn.exec('pm2 restart power-asset', (err, stream) => {
                if (err) throw err;
                stream.on('data', d => process.stdout.write(d.toString()));
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

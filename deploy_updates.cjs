const Client = require('ssh2-sftp-client');
const { Client: SshClient } = require('ssh2');

async function main() {
    const sftp = new Client();
    try {
        console.log('[SFTP] Connecting...');
        await sftp.connect({
            host: '192.168.1.66',
            port: 22,
            username: 'root',
            password: 'nevergiveup'
        });

        // Ensure directories exist
        await sftp.mkdir('/opt/power_asset/backend/services/downloads', true);
        await sftp.mkdir('/opt/power_asset/dist/ict/downloads', true);
        await sftp.mkdir('/opt/power_asset/dist/downloads', true);

        console.log('Uploading agents.js...');
        await sftp.fastPut('backend/routes/agents.js', '/opt/power_asset/backend/routes/agents.js');

        console.log('Uploading Agent SG script to all paths...');
        await sftp.fastPut('public/PowerAsset_Agent_SG.ps1', '/opt/power_asset/backend/services/downloads/PowerAsset_Agent_SG.ps1');
        await sftp.fastPut('public/PowerAsset_Agent_SG.ps1', '/opt/power_asset/dist/ict/downloads/PowerAsset_Agent_SG.ps1');
        await sftp.fastPut('public/PowerAsset_Agent_SG.ps1', '/opt/power_asset/dist/downloads/PowerAsset_Agent_SG.ps1');
        await sftp.fastPut('public/PowerAsset_Agent_SG.ps1', '/opt/power_asset/dist/PowerAsset_Agent_SG.ps1');

        console.log('Uploading Agent KG script to all paths...');
        await sftp.fastPut('public/PowerAsset_Agent_KG.ps1', '/opt/power_asset/backend/services/downloads/PowerAsset_Agent_KG.ps1');
        await sftp.fastPut('public/PowerAsset_Agent_KG.ps1', '/opt/power_asset/dist/ict/downloads/PowerAsset_Agent_KG.ps1');
        await sftp.fastPut('public/PowerAsset_Agent_KG.ps1', '/opt/power_asset/dist/downloads/PowerAsset_Agent_KG.ps1');
        await sftp.fastPut('public/PowerAsset_Agent_KG.ps1', '/opt/power_asset/dist/PowerAsset_Agent_KG.ps1');

        console.log('Uploading batch installer...');
        await sftp.fastPut('public/Install_PowerAsset_Agent.bat', '/opt/power_asset/backend/services/downloads/Install_PowerAsset_Agent.bat');
        await sftp.fastPut('public/Install_PowerAsset_Agent.bat', '/opt/power_asset/dist/ict/downloads/Install_PowerAsset_Agent.bat');

        console.log('All files uploaded successfully!');
    } catch (err) {
        console.error('SFTP Error:', err);
    } finally {
        sftp.end();
    }

    const conn = new SshClient();
    conn.on('ready', () => {
        conn.exec('pm2 restart power-asset', (err, stream) => {
            stream.on('data', d => process.stdout.write(d.toString())).on('close', () => {
                conn.end();
                process.exit(0);
            });
        });
    }).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });
}

main();

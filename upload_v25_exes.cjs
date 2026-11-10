const Client = require('ssh2-sftp-client');

async function main() {
    const sftp = new Client();
    try {
        console.log('[SFTP] Connecting to Power Asset Server (192.168.1.66)...');
        await sftp.connect({
            host: '192.168.1.66',
            port: 22,
            username: 'root',
            password: 'nevergiveup'
        });
        console.log('[SFTP] Connected successfully.');

        console.log('[SFTP] Uploading TCF_Agent_Setup_SG_V25.exe...');
        await sftp.fastPut('TCF_Agent_Setup_SG_V25.exe', '/opt/power_asset/backend/TCF_Agent_Setup_SG_V25.exe');
        console.log('[SFTP] SG V25.exe uploaded successfully.');

        console.log('[SFTP] Uploading TCF_Agent_Setup_KG_V25.exe...');
        await sftp.fastPut('TCF_Agent_Setup_KG_V25.exe', '/opt/power_asset/backend/TCF_Agent_Setup_KG_V25.exe');
        console.log('[SFTP] KG V25.exe uploaded successfully.');

        console.log('[SFTP] All V25 EXEs deployed to server successfully!');
    } catch (err) {
        console.error('[SFTP] Error:', err);
    } finally {
        sftp.end();
    }
}

main();

const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');

const sftp = new Client();

async function main() {
    try {
        console.log('[SFTP] Connecting to Power Asset Server (192.168.1.66)...');
        await sftp.connect({
            host: '192.168.1.66',
            port: 22,
            username: 'root',
            password: 'Nevergiveup572*'
        });

        const localDist = 'F:/TCF Project Infra/APP_Power_Asset/dist';
        const remoteDist = '/opt/power_asset/dist';

        console.log('[SFTP] Uploading dist folder...');
        await sftp.uploadDir(localDist, remoteDist);
        
        console.log('[SFTP] Upload complete!');
        await sftp.end();

        console.log('[SSH] Restarting ONLY power-asset PM2 service...');
        const conn = new SSHClient();
        conn.on('ready', () => {
            conn.exec('pm2 restart power-asset', (err, stream) => {
                if (err) throw err;
                stream.on('close', (code) => {
                    console.log(`[SSH] power-asset restarted safely with exit code ${code}`);
                    conn.end();
                    process.exit(0);
                }).on('data', (data) => {
                    console.log(`STDOUT: ${data}`);
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

const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');

const sftp = new Client();
const ssh = new SSHClient();

async function main() {
    try {
        console.log('[SFTP] Connecting...');
        await sftp.connect({
            host: '192.168.1.66',
            port: 22,
            username: 'root',
            password: 'Nevergiveup572*'
        });

        await sftp.put('F:/TCF Project Infra/APP_Power_Asset/backend/count_all.js', '/opt/power_asset/backend/count_all.js');
        await sftp.end();

        ssh.on('ready', () => {
            ssh.exec('cd /opt/power_asset/backend && node count_all.js', (err, stream) => {
                if (err) throw err;
                stream.on('close', (code, signal) => {
                    ssh.end();
                }).on('data', (data) => {
                    console.log('STDOUT: ' + data);
                }).stderr.on('data', (data) => {
                    console.log('STDERR: ' + data);
                });
            });
        }).connect({
            host: '192.168.1.66',
            port: 22,
            username: 'root',
            password: 'Nevergiveup572*'
        });

    } catch (e) {
        console.error(e);
    }
}
main();

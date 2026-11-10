const { Client } = require('ssh2');
const fs = require('fs');

const config = fs.readFileSync('./Caddyfile_migrated.conf', 'utf8');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- SSH Connection Ready (192.168.1.3)');

    const remoteTemp = '/tmp/Caddyfile.migrated';
    const remoteDest = '/etc/caddy/Caddyfile';

    conn.sftp((err, sftp) => {
        if (err) throw err;
        const stream = sftp.createWriteStream(remoteTemp);
        stream.on('close', () => {
            console.log(`--- Uploaded migrated Caddyfile to ${remoteTemp} ---`);

            // Move and Reload
            const cmd = `echo "nevergiveup" | sudo -S mv ${remoteTemp} ${remoteDest} && echo "nevergiveup" | sudo -S systemctl reload caddy`;
            conn.exec(cmd, (err, execStream) => {
                if (err) throw err;
                execStream.on('close', (code) => {
                    console.log(`--- Caddy Reloaded with Legacy Sites (Exit Code: ${code}) ---`);
                    conn.end();
                }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
            });
        });
        stream.end(config);
    });
}).on('error', (err) => {
    console.error('SSH Error to .3:', err.message);
}).connect({
    host: '192.168.1.3',
    port: 22,
    username: 'tcf',
    password: 'nevergiveup',
    readyTimeout: 15000
});

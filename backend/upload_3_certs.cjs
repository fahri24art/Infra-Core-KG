const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- SSH Connection Ready (192.168.1.3)');

    conn.sftp((err, sftp) => {
        if (err) throw err;
        const localFile = './letsencrypt_70.tar.gz';
        const remoteFile = '/tmp/letsencrypt_70.tar.gz';

        console.log(`--- Uploading ${localFile} to ${remoteFile} ---`);
        sftp.fastPut(localFile, remoteFile, (err) => {
            if (err) throw err;
            console.log('--- Upload Complete ---');

            // Extract on 1.3
            const cmd = 'echo "nevergiveup" | sudo -S tar -xzvf /tmp/letsencrypt_70.tar.gz -C /';
            conn.exec(cmd, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code) => {
                    console.log(`--- Archive Extracted (Exit Code: ${code}) ---`);
                    conn.end();
                }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
            });
        });
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

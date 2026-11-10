const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- SSH Connection Ready (192.168.1.70)');

    // Archive /etc/letsencrypt preserving symlinks as real files (-h) to simplify transfer
    // Actually, preserving symlinks is better to keep the structure. Let's use tar normally.
    const cmd = 'echo "nevergiveup" | sudo -S tar -czvf /tmp/letsencrypt.tar.gz /etc/letsencrypt';
    let output = '';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`--- Archive Created (Exit Code: ${code}) ---`);
            conn.end();
        }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
    });
}).on('error', (err) => {
    console.error('SSH Error to .70:', err.message);
}).connect({
    host: '192.168.1.70',
    port: 22,
    username: 'tcf',
    password: 'nevergiveup',
    readyTimeout: 15000
});

const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('echo "nevergiveup" | sudo -S pm2 ls; echo "---"; ls -la /opt/; echo "---"; ls -la /home/tcf/', (err, stream) => {
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
            conn.end();
            process.exit(0);
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '192.168.1.17',
    port: 22,
    username: 'tcf',
    password: 'nevergiveup'
});

const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- SSH Connection Ready (192.168.1.3)');

    const cmd = 'echo "nevergiveup" | sudo -S netstat -tlpn';
    let output = '';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`--- NETSTAT RESULTS (Exit Code: ${code}) ---`);
            console.log(output);
            conn.end();
        }).on('data', d => output += d).stderr.on('data', d => output += d);
    });
}).on('error', (err) => {
    console.error('SSH Error:', err.message);
}).connect({
    host: '192.168.1.3',
    port: 22,
    username: 'tcf',
    password: 'nevergiveup',
    readyTimeout: 15000
});

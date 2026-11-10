const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- SSH Connection Ready (192.168.1.3)');

    // Verbose curl to see headers
    const cmd = 'curl -v -X POST http://localhost/api/login 2>&1';
    let output = '';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => output += d);
        stream.on('close', () => {
            console.log('--- Verbose Curl Output START ---');
            console.log(output);
            console.log('--- Verbose Curl Output END ---');
            conn.end();
        });
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

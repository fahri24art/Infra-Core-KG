const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- SSH Connection Ready (192.168.1.3)');

    const cmd = 'ls -l /var/www/html/infra-guard/backend/app/';
    let output = '';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => output += d);
        stream.on('close', () => {
            console.log('--- LS RESULT ---');
            console.log(output);
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

const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- Connected to 192.168.1.3 ---');

    const cmd = 'pm2 show infra-guard-api';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', d => out += d);
        stream.on('stderr', d => out += d);
        stream.on('close', () => {
            console.log('--- PM2 Show Output ---');
            console.log(out);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err.message);
}).connect({
    host: 'localhost',
    username: 'tcf',
    password: 'nevergiveup'
});

const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('--- Connected to 192.168.1.3 ---');

    // Check all listeners and caddy service logs
    const cmd = 'sudo netstat -tlpn && sudo journalctl -u caddy -n 100 --no-pager';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.write('nevergiveup\n');
        let out = '';
        stream.on('data', d => out += d);
        stream.on('stderr', d => out += d);
        stream.on('close', () => {
            console.log('--- Diagnostic Output ---');
            console.log(out);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err.message);
}).connect({
    host: '192.168.1.3',
    username: 'tcf',
    password: 'nevergiveup'
});

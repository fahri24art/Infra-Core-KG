const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    conn.exec('curl -k -I https://192.168.1.3:8443 ; curl -k -I http://192.168.1.3/security', (err, stream) => {
        let stdout = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('close', () => {
            console.log('--- HTTP HEADERS FROM 192.168.1.3:8443 ---');
            console.log(stdout);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });

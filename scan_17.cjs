const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const cmd = `python3 -c "
import socket
target = '192.168.1.17'
ports = [22, 80, 443, 1514, 1515, 55000, 5601, 8443, 9200]
for p in ports:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2)
    res = s.connect_ex((target, p))
    print(f'Port {p}: {\"OPEN\" if res == 0 else \"CLOSED/TIMEOUT\"}')
    s.close()
"`;
    conn.exec(cmd, (err, stream) => {
        let stdout = '';
        let stderr = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('stderr', e => stderr += e.toString());
        stream.on('close', () => {
            console.log('--- PORT SCAN 192.168.1.17 FROM 192.168.1.66 ---');
            console.log(stdout);
            console.log('--- STDERR ---');
            console.log(stderr);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });

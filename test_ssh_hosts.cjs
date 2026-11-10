const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const cmd = `python3 -c "
import subprocess

ips = ['192.168.1.3', '192.168.1.7', '192.168.1.17', '192.168.1.18', '192.168.1.29', '192.168.1.33', '192.168.1.70', '192.168.1.122']
for ip in ips:
    c = f'sshpass -p nevergiveup ssh -o StrictHostKeyChecking=no -o ConnectTimeout=2 root@{ip} hostname'
    res = subprocess.run(c, shell=True, capture_output=True, text=True)
    print(f'IP {ip}: {res.stdout.strip()} (err: {res.stderr.strip()})')
"`;
    conn.exec(cmd, (err, stream) => {
        let stdout = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('close', () => {
            console.log('--- SSH LOGIN TEST ---');
            console.log(stdout);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });

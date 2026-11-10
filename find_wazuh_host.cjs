const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const script = `python3 -c "
import subprocess

ips = ['192.168.1.5', '192.168.1.6', '192.168.1.7', '192.168.1.8', '192.168.1.17', '192.168.1.18', '192.168.1.19', '192.168.1.20', '192.168.1.24', '192.168.1.25', '192.168.1.29', '192.168.1.33', '192.168.1.35', '192.168.1.40', '192.168.1.60', '192.168.1.68', '192.168.1.69', '192.168.1.86', '192.168.1.91', '192.168.1.92', '192.168.1.99', '192.168.1.101', '192.168.1.103', '192.168.1.110', '192.168.1.122', '192.168.1.133']

for ip in ips:
    cmd = f'sshpass -p \"nevergiveup\" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=2 root@{ip} \"which wazuh-passwords-tool.sh ; docker ps 2>/dev/null | grep -i wazuh ; systemctl status wazuh-indexer 2>/dev/null | grep Active\"'
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.stdout.strip():
        print(f'=== WAZUH FOUND ON {ip} ===\\n{res.stdout}')
"`;
    conn.exec(script, (err, stream) => {
        let stdout = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('close', () => {
            console.log('--- WAZUH HOST SEARCH RESULTS ---');
            console.log(stdout);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });

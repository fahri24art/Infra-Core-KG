const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('[SSH] Connected to 192.168.1.66');
    const cmd = `python3 -c "
import socket
import concurrent.futures

def check_wazuh(ip):
    for port in [1514, 1515, 55000]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.0)
            res = s.connect_ex((ip, port))
            s.close()
            if res == 0:
                print(f'FOUND WAZUH PORT {port} ON IP: {ip}')
        except:
            pass

ips = [f'192.168.1.{i}' for i in range(1, 255)]
with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
    executor.map(check_wazuh, ips)
"`;
    conn.exec(cmd, (err, stream) => {
        let stdout = '';
        let stderr = '';
        stream.on('data', d => stdout += d.toString());
        stream.on('stderr', e => stderr += e.toString());
        stream.on('close', () => {
            console.log('--- WAZUH PORT SCAN RESULTS (192.168.1.1-254) ---');
            console.log(stdout);
            console.log('--- STDERR ---');
            console.log(stderr);
            conn.end();
            process.exit(0);
        });
    });
}).connect({ host: '192.168.1.66', port: 22, username: 'root', password: 'nevergiveup' });

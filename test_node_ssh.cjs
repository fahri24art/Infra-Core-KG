const { Client } = require('ssh2');

const ips = ['192.168.1.3', '192.168.1.7', '192.168.1.17', '192.168.1.18', '192.168.1.29', '192.168.1.33', '192.168.1.70', '192.168.1.122'];
const passwords = ['nevergiveup', 'admin', 'root', 'Tcf@2024', 'Tcf@2025', 'Tcf@2026', '123456'];

async function testIp(ip, pass) {
    return new Promise((resolve) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.exec('hostname ; docker ps 2>/dev/null | grep -i wazuh ; systemctl status wazuh-indexer 2>/dev/null | head -n 5', (err, stream) => {
                let stdout = '';
                stream.on('data', d => stdout += d.toString());
                stream.on('close', () => {
                    console.log(`[SUCCESS] Connected to ${ip} with password '${pass}'!`);
                    console.log('Output:\n' + stdout);
                    conn.end();
                    resolve(true);
                });
            });
        }).on('error', () => {
            resolve(false);
        }).connect({ host: ip, port: 22, username: 'root', password: pass, readyTimeout: 2000 });
    });
}

async function main() {
    console.log('Testing SSH connections across LAN IPs...');
    for (const ip of ips) {
        for (const pass of passwords) {
            const ok = await testIp(ip, pass);
            if (ok) break;
        }
    }
    console.log('SSH scan complete.');
    process.exit(0);
}

main();
